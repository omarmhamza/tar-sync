# tar-sync

tar-sync automates tar archive creation and synchronization with directory changes. It uses [chokidar](https://www.npmjs.com/package/chokidar) for monitoring directory changes and  [tar-fs](https://www.npmjs.com/package/tar-fs) for creating tar archives.



## Motivation
The motivation behind developing tar-sync stemmed from the need for a reliable solution to synchronize a folder with a tarball file.


## Features
- Automatically creates tar archives from directory changes
- Robust: Capable of handling concurrent changes without corrupting data

## Use Cases
- Backup Solution: Automatically create tar archives of critical data for regular backups.
- Versioning and History: Maintain a history of changes made to a directory by creating tar archives.
- Sharing and Distribution: Easily share snapshots of directories by packaging them into tar archives.


##  Example

Install tar-sync 

```
npm install tar-sync
```

Import tar-sync and start with the path of the directory
```ts
const { TarSync } = require("tar-sync")

new TarSync("./test-folder").start()

new TarSync("./test-folder").stop() // Call stop when you want to stop sync changes
```
or

```ts
import { TarSync } from "tar-sync";

new TarSync("./test-folder").start()

new TarSync("./test-folder").stop() // Call stop when you want to stop sync changes

```

a tar file ./test-folder.tar should be generated.

Using with options:

```ts
import { TarSync } from "tar-sync";

// Example usage with custom options
const options = {
    outPath: "./output",                    // Specifies the output path for the tar archive
    triggerOnEvents: ['add', 'change'],     // Triggers the creation of a tar archive on 'add' and 'change' events
    watcherOpts: {},                        // Additional options for configuring the watcher
    tarOpts: {},                            // Additional options for configuring the tar creation process
    extension: ".tar",                      // Specifies the file extension for the tar archive
    fs: yourCustomFileSystemImplementation, // Specifies the file system implementation to use such as graceful-fs
    verbose: true                           // Enables verbose logging
};


new TarSync("./test-folder",options).start()
```

## Support
For any issues, bugs, or feature requests, please submit an issue on GitHub.

## License
tar-sync is licensed under the MIT License.

## Contributing
Contributions are welcome! Feel free to fork the repository and submit a pull request with your changes.