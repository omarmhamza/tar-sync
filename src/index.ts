import { FSWatcher, watch, WatchOptions } from "chokidar"
import { pack, PackOptions } from 'tar-fs'
import * as fs from 'fs';


type FileSystem = typeof fs;

export class TarSync {

    private static readonly locks: Map<string, void> = new Map()
    private static readonly pending: Map<string, void> = new Map()


    private fsWatcher: FSWatcher;

    get watcher(){
        return this.fsWatcher
    }

    private readonly startWatching: () => Promise<void>

    private readonly stopWatching: () => Promise<void>



    constructor(path: string, options?: Partial<{
        triggerOnEvents: ('add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir' | 'all')[],
        watcherOpts: WatchOptions,
        tarOpts: PackOptions,
        extension: string,
        fs: FileSystem
    }>) {


        let extension = 'tar'
        let tiggerOnEvents: Set<string> = new Set()
        if(options?.triggerOnEvents){
            options.triggerOnEvents.forEach((event) => tiggerOnEvents.add(event))
        }else{
            ["add","change","unlink"].forEach(event => tiggerOnEvents.add(event))
        }
        if (options?.extension) {
            extension = options.extension
        }
        const fileSystem: FileSystem = options?.fs ? options.fs : fs


        async function archiveDir(): Promise<void> {
            return new Promise(async (resolve, reject) => {
                console.log("stat", "pending", TarSync.pending.size, "locks", TarSync.locks)
                if (TarSync.locks.has(path)) {
                    console.log("pending")
                    TarSync.pending.set(path)
                    return resolve()
                }
                const actualPath = path + '.' + extension
                const tmpPath = actualPath + "~"
                const stream = fileSystem.createWriteStream(tmpPath)
                stream.on('close', async () => {
                    console.log("wrriten", "pending", TarSync.pending.size, "locks", TarSync.locks)
                    TarSync.locks.delete(path)
                    if (TarSync.pending.has(path)) {
                        TarSync.pending.delete(path)
                        await archiveDir()
                    }
                    try {
                        const exists = fileSystem.existsSync(tmpPath)
                        if (!exists) {
                            return resolve()
                        }
                        fileSystem.renameSync(tmpPath, actualPath)
                    } catch (err) {
                        return reject(err)
                    }
                    return resolve()
                })

                stream.on("error", (err) => {
                    return reject(err)
                })
                TarSync.locks.set(path)
                pack(path, { ...options?.tarOpts }).pipe(stream)
            })
        }


        function init(): Promise<void> {
            return new Promise((resolve, reject) => {
                fileSystem.readdir(path, {}, async (err, files) => {
                    if (err) {
                        return resolve()
                    }
                    try {
                        await archiveDir()
                    } catch (err) {
                        console.log(err)
                    }
                    return resolve()
                })
            })
        }

        const defaultOptions: WatchOptions = {
            ignorePermissionErrors: true,
            awaitWriteFinish: true
        }
    


        this.startWatching = () => init().then(() => {
            this.fsWatcher = watch(path, {
                ...defaultOptions, ...options?.watcherOpts
            })
            tiggerOnEvents.forEach(event => {
                console.log("event",event)
                this.fsWatcher.on(event, async () => await archiveDir())
            });
        })

        this.stopWatching = () => {
            return new Promise((resolve,reject) => {
                this.fsWatcher.close().then(() => {
                    return resolve()
                })
            })
        }

    }

    public start(){
        return this.startWatching()
    }

    public stop(){
        return this.stopWatching()
    }

}
