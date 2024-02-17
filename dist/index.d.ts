/// <reference types="node" />
import { FSWatcher, WatchOptions } from "chokidar";
import { extract, PackOptions } from 'tar-fs';
import * as fs from 'fs';
type FileSystem = typeof fs;
export declare class TarSync {
    /**
     * A map storing paths currently being processed to avoid duplicate processing.
     */
    private static readonly locks;
    /**
     * A map storing paths for which archiving is pending due to a current processing taking place.
     */
    private static readonly pending;
    private fsWatcher;
    /**
     * The file system watcher instance.
     */
    get watcher(): FSWatcher;
    private readonly startWatching;
    private readonly stopWatching;
    private readonly verbose;
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
        outPath: string;
        triggerOnEvents: ('add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir' | 'all')[];
        watcherOpts: WatchOptions;
        tarOpts: PackOptions;
        extension: string;
        fs: FileSystem;
        verbose: boolean;
    }>);
    /**
     * Start synchronization with directory
     */
    start(): Promise<void>;
    /**
     * Stop synchronization with directory.
     */
    stop(): Promise<void>;
    private logVerbose;
}
export { extract };
