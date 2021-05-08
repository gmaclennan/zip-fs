const fs = require('fs')
const path = require('path')
const yazl = require('yazl')

const ws = fs.createWriteStream(path.join(__dirname, '../test/readdir.zip'))
const zipfile = new yazl.ZipFile()

zipfile.outputStream.pipe(ws).on('close', function () {
  console.log('done')
})
zipfile.addBuffer(Buffer.from('Hello World'), 'a.txt')
zipfile.addBuffer(Buffer.from('Hello World'), 'folder1/b.txt')
zipfile.addEmptyDirectory('folder2')
zipfile.addBuffer(Buffer.from('Hello World'), 'folder1extra/c.txt')
zipfile.end()
