import { FSWatcher, watch, WatchOptions } from "chokidar"
import { pack, extract, PackOptions } from 'tar-fs'
import * as fs from 'fs';


type FileSystem = typeof fs;

export class TarSync {

    /** 
     * A map storing paths currently being processed to avoid duplicate processing.
     */
    private static readonly locks: Map<string, void> = new Map()

    /** 
     * A map storing paths for which archiving is pending due to a current processing taking place.
     */
    private static readonly pending: Map<string, void> = new Map()


    private fsWatcher: FSWatcher | undefined;

    /** 
     * The file system watcher instance.
     */
    get watcher() {
        return this.fsWatcher
    }

    private readonly startWatching: () => Promise<void>

    private readonly stopWatching: () => Promise<void>

    private readonly verbose: boolean = false;


    /**
     * Constructs an instance of TarSync.
     * @param {string} path - The path to the directory to be synchronized.
     * @param {Object} [options] - Optional configuration options.
     * @param {('add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir' | 'all')[]} [options.triggerOnEvents] - Array of events to trigger synchronization. Default is ['add', 'change', 'unlink'].
     * @param {WatchOptions} [options.watcherOpts] - Options to be passed to the file system watcher: chokidar.
     * @param {PackOptions} [options.tarOpts] - Options to be passed to the tar packer: tar-fs.
     * @param {string} [options.extension] - The extension of the TAR archive files. Default is 'tar'.
     * @param {FileSystem} [options.fs] - File system module to be used. Default is Node.js built-in 'fs' module.
     */
    constructor(path: string, options?: Partial<{
        outPath: string,
        triggerOnEvents: ('add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir' | 'all')[],
        watcherOpts: WatchOptions,
        tarOpts: PackOptions,
        extension: string,
        fs: FileSystem,
        verbose: boolean
    }>) {

        this.verbose = options?.verbose ? options.verbose : false;
        let extension = 'tar'
        let tiggerOnEvents: Set<string> = new Set()
        if (options?.triggerOnEvents) {
            options.triggerOnEvents.forEach((event) => tiggerOnEvents.add(event))
        } else {
            ["add", "change", "unlink"].forEach(event => tiggerOnEvents.add(event))
        }
        if (options?.extension) {
            extension = options.extension
        }
        const fileSystem: FileSystem = options?.fs ? options.fs : fs


        /**
         * Archives the directory asynchronously into a TAR file.
         * @returns {Promise<void>} A Promise that resolves once the archiving process completes successfully.
         */
        const archiveDir = (): Promise<void> => {
            return new Promise(async (resolve, reject) => {
                if (TarSync.locks.has(path)) {
                    TarSync.pending.set(path)
                    return resolve()
                }
                let outputPath = path
                if(options?.outPath){
                    outputPath = options.outPath 
                }
                outputPath = outputPath + '.' + extension
                const outputTmpPath = outputPath + "~"
                const stream = fileSystem.createWriteStream(outputTmpPath)
                stream.on('close', async () => {
                    TarSync.locks.delete(path)
                    if (TarSync.pending.has(path)) {
                        TarSync.pending.delete(path)
                        this.logVerbose("Fulfilling pending request",path)
                        try{
                            await archiveDir()
                        }catch(err){
                            return reject(err)
                        }
                    }
                    try {
                        const exists = fileSystem.existsSync(outputTmpPath)
                        if (!exists) {
                            this.logVerbose(outputTmpPath,"does not exist")
                            return reject(outputTmpPath + " does not exist")
                        }
                        this.logVerbose("Renaming",outputTmpPath,"=>",outputPath)
                        fileSystem.renameSync(outputTmpPath, outputPath)
                    } catch (err) {
                        return reject(err)
                    }
                    return resolve()
                })

                stream.on("error", (err) => {
                    this.logVerbose("Error on stream close")
                    return reject(err)
                })

                stream.on("pipe", () => {
                    this.logVerbose("Packing",path,"to",outputTmpPath)
                })
                TarSync.locks.set(path)
                pack(path, { ...options?.tarOpts }).pipe(stream)
            })
        }


        /**
         * Initializes the directory synchronization process by reading the directory contents and archiving it.
         * @returns {Promise<void>} A Promise that resolves once the initialization completes successfully.
         */
        const init = (): Promise<void> => {
            return new Promise((resolve, reject) => {
                fileSystem.readdir(path, {}, async (err, files) => {
                    if (err) {
                        return reject(err)
                    }
                    try {
                        await archiveDir()
                    } catch (err) {
                        console.log(err)
                        return reject(err)
                    }
                    return resolve()
                })
            })
        }

        const defaultOptions: WatchOptions = {
            ignorePermissionErrors: true,
            awaitWriteFinish: true
        }



        this.startWatching = (): Promise<void> =>  {
            return new Promise(async (resolve,reject) => {
                try{
                    await init()
                    this.fsWatcher = watch(path, {
                        ...defaultOptions, ...options?.watcherOpts
                    })
                    tiggerOnEvents.forEach(event => {
                        this.fsWatcher?.on(event, async (path) => {
                            this.logVerbose(`Event trigger: ${event} | ${path}`)
                            try{
                                await archiveDir()
                            }catch(err){}
                        })
                    });
                    return resolve()
                }catch(err){
                    return reject("Failed init: "+err)
                }
            })
        }

        this.stopWatching = () => {
            return new Promise((resolve, reject) => {
                if(!this.fsWatcher){
                    return resolve()
                }
                this.fsWatcher.close().then(() => {
                    TarSync.locks.delete(path)
                    TarSync.pending.delete(path)
                    return resolve()
                })
            })
        }

    }


    /** 
     * Start synchronization with directory
     */
    public start() {
        return this.startWatching()
    }

    /** 
     * Stop synchronization with directory.
     */
    public stop() {
        return this.stopWatching()
    }

    private logVerbose(...message: string[]): void {
        if (!this.verbose) {
            return
        }
        console.log(`[TAR-SYNC] ${message.join(' ')}`);
    }

}


export { extract }
