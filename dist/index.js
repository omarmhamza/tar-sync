"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extract = exports.TarSync = void 0;
const chokidar_1 = require("chokidar");
const tar_fs_1 = require("tar-fs");
Object.defineProperty(exports, "extract", { enumerable: true, get: function () { return tar_fs_1.extract; } });
const fs = require("fs");
class TarSync {
    /**
     * The file system watcher instance.
     */
    get watcher() {
        return this.fsWatcher;
    }
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
    constructor(path, options) {
        this.verbose = false;
        this.verbose = (options === null || options === void 0 ? void 0 : options.verbose) ? options.verbose : false;
        let extension = 'tar';
        let tiggerOnEvents = new Set();
        if (options === null || options === void 0 ? void 0 : options.triggerOnEvents) {
            options.triggerOnEvents.forEach((event) => tiggerOnEvents.add(event));
        }
        else {
            ["add", "change", "unlink"].forEach(event => tiggerOnEvents.add(event));
        }
        if (options === null || options === void 0 ? void 0 : options.extension) {
            extension = options.extension;
        }
        const fileSystem = (options === null || options === void 0 ? void 0 : options.fs) ? options.fs : fs;
        /**
         * Archives the directory asynchronously into a TAR file.
         * @returns {Promise<void>} A Promise that resolves once the archiving process completes successfully.
         */
        const archiveDir = () => {
            return new Promise(async (resolve, reject) => {
                if (TarSync.locks.has(path)) {
                    TarSync.pending.set(path);
                    return resolve();
                }
                let outputPath = path;
                if (options === null || options === void 0 ? void 0 : options.outPath) {
                    outputPath = options.outPath;
                }
                outputPath = outputPath + '.' + extension;
                const outputTmpPath = outputPath + "~";
                const stream = fileSystem.createWriteStream(outputTmpPath);
                stream.on('close', async () => {
                    TarSync.locks.delete(path);
                    if (TarSync.pending.has(path)) {
                        TarSync.pending.delete(path);
                        this.logVerbose("Fulfilling pending request", path);
                        try {
                            await archiveDir();
                        }
                        catch (err) {
                            return reject(err);
                        }
                    }
                    try {
                        const exists = fileSystem.existsSync(outputTmpPath);
                        if (!exists) {
                            this.logVerbose(outputTmpPath, "does not exist");
                            return reject(outputTmpPath + " does not exist");
                        }
                        this.logVerbose("Renaming", outputTmpPath, "=>", outputPath);
                        fileSystem.renameSync(outputTmpPath, outputPath);
                    }
                    catch (err) {
                        return reject(err);
                    }
                    return resolve();
                });
                stream.on("error", (err) => {
                    this.logVerbose("Error on stream close");
                    return reject(err);
                });
                stream.on("pipe", () => {
                    this.logVerbose("Packing", path, "to", outputTmpPath);
                });
                TarSync.locks.set(path);
                (0, tar_fs_1.pack)(path, { ...options === null || options === void 0 ? void 0 : options.tarOpts }).pipe(stream);
            });
        };
        /**
         * Initializes the directory synchronization process by reading the directory contents and archiving it.
         * @returns {Promise<void>} A Promise that resolves once the initialization completes successfully.
         */
        const init = () => {
            return new Promise((resolve, reject) => {
                fileSystem.readdir(path, {}, async (err, files) => {
                    if (err) {
                        return reject(err);
                    }
                    try {
                        await archiveDir();
                    }
                    catch (err) {
                        console.log(err);
                        return reject(err);
                    }
                    return resolve();
                });
            });
        };
        const defaultOptions = {
            ignorePermissionErrors: true,
            awaitWriteFinish: true
        };
        this.startWatching = () => {
            return new Promise(async (resolve, reject) => {
                try {
                    await init();
                    this.fsWatcher = (0, chokidar_1.watch)(path, {
                        ...defaultOptions, ...options === null || options === void 0 ? void 0 : options.watcherOpts
                    });
                    tiggerOnEvents.forEach(event => {
                        this.fsWatcher.on(event, async () => {
                            try {
                                await archiveDir();
                            }
                            catch (err) { }
                        });
                    });
                    return resolve();
                }
                catch (err) {
                    return reject("Failed init: " + err);
                }
            });
        };
        this.stopWatching = () => {
            return new Promise((resolve, reject) => {
                this.fsWatcher.close().then(() => {
                    TarSync.locks.delete(path);
                    TarSync.pending.delete(path);
                    return resolve();
                });
            });
        };
    }
    /**
     * Start synchronization with directory
     */
    start() {
        return this.startWatching();
    }
    /**
     * Stop synchronization with directory.
     */
    stop() {
        return this.stopWatching();
    }
    logVerbose(...message) {
        if (!this.verbose) {
            return;
        }
        console.log(`[TAR-SYNC] ${message.join(' ')}`);
    }
}
exports.TarSync = TarSync;
/**
 * A map storing paths currently being processed to avoid duplicate processing.
 */
TarSync.locks = new Map();
/**
 * A map storing paths for which archiving is pending due to a current processing taking place.
 */
TarSync.pending = new Map();
