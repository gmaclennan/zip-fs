# random-access-zip

[![Github CI](https://github.com/gmaclennan/random-access-zip/workflows/NODE%20CI/badge.svg)](https://github.com/gmaclennan/random-access-zip/actions)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![npm](https://img.shields.io/npm/v/random-access-zip?style=flat-square)](https://npmjs.org/package/random-access-zip)

> Extract individual files from a zipfile on disk

I wanted a way to read individual files efficiently from a zipfile without extracting the whole zipfile, and couldn't find an existing library with an API that I liked. Uses [`yauzl`](https://github.com/thejoshwolfe/yauzl) under the hood. This might be slow for zip files with hundreds of entries, because it reads through the entire central directory before returning any files. The entire central directory is also stored in memory, but the zipfile is not stored in memory and files are streamed from disk, so memory usage should be low. See all the [limitations of `yauzl`](https://github.com/thejoshwolfe/yauzl#limitations) which also apply to this library.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Install

```sh
npm install random-access-zip
```

## Usage

Works similarly to `fs.createReadStream()` and `fs.readFile()`.

```js
const Raz = require("random-access-zip");

const zip = new Raz("my_zip_file.zip");

const rs = zip.createReadStream("a.txt", "utf8");
// Pipe to console
rs.pipe(process.stdout);
// Cleanup after
rs.on("end", () => zip.close());
```

## API

### `const zip = new RandomAccessZip(path[, cb])`

Create a new random access zipfile reader for a zipfile at `path`. The optional callback will be called when the zipfile is ready to read, or if there is an error reading the zipfile. However, you do not need to wait for this in order to call the read methods.

### zip.createReadStream(filename[, opts])

Returns a ReadableStream with the contents of the file `filename` in the zipfile. `opts` can be a string encoding option, or an object with the property `opts.encoding`. If no encoding is specified, then the raw buffer is returned.

### zip.readFile(filename[, opts], callback)

`callback` is passed two arguments `(err, data)` where `data` is the contents of the file `filename` in the zipfile. `opts` can be a string encoding option, or an object with the property `opts.encoding`. If no encoding is specified, then the raw buffer is returned.

### zip.close()

Close the zipfile (cleans up the file descriptor).

## Maintainers

[@gmaclennan](https://github.com/gmaclennan)

## Contributing

PRs accepted.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

MIT © 2019 Gregor MacLennan
