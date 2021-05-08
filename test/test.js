const test = require('tape')
const fs = require('fs')
const path = require('path')
const concat = require('concat-stream')
const ZipFs = require('../')

test('Read tests for good zip files', t => {
  const files = fs.readdirSync(path.join(__dirname, 'success'))
  const zips = files.filter(filename => /\.zip$/.test(filename))

  zips.forEach(filename => {
    t.test('-> Checking read of ' + filename, t => {
      const zipFilename = path.join(__dirname, 'success', filename)
      const expectedFilename = path.join(
        zipFilename.replace(/\.zip$/, ''),
        'a.txt'
      )
      const zip = new ZipFs(zipFilename, err =>
        t.error(err, 'No error when opening zipfile')
      )

      t.test('  -> Read stream as buffer', t => {
        t.plan(1)
        const rs = zip.createReadStream('a.txt')
        rs.on('error', t.fail)
        const expectedBuf = fs.readFileSync(expectedFilename)
        rs.pipe(
          concat(data => t.deepEqual(data, expectedBuf, 'File contents match'))
        )
      })

      t.test('  -> Read stream as utf8 encoding', t => {
        t.plan(1)
        const rs = zip.createReadStream('a.txt', { encoding: 'utf8' })
        rs.on('error', t.fail)
        const expectedBuf = fs.readFileSync(expectedFilename, 'utf8')
        rs.pipe(
          concat(data => t.deepEqual(data, expectedBuf, 'File contents match'))
        )
      })

      t.test('  -> Read stream as utf8 encoding (opts as string)', t => {
        t.plan(1)
        const rs = zip.createReadStream('a.txt', 'utf8')
        rs.on('error', t.fail)
        const expectedBuf = fs.readFileSync(expectedFilename, 'utf8')
        rs.pipe(
          concat(data => t.deepEqual(data, expectedBuf, 'File contents match'))
        )
      })

      t.test('  -> Read as buffer', t => {
        t.plan(2)
        const expectedBuf = fs.readFileSync(expectedFilename)
        zip.readFile('a.txt', (err, data) => {
          t.error(err, 'Error is null')
          t.deepEqual(data, expectedBuf, 'File contents match')
        })
      })

      t.test('  -> Read as utf8', t => {
        t.plan(2)
        const expectedBuf = fs.readFileSync(expectedFilename, 'utf8')
        zip.readFile('a.txt', { encoding: 'utf8' }, (err, data) => {
          t.error(err, 'Error is null')
          t.equal(data, expectedBuf, 'File contents match')
        })
      })

      t.test('  -> Read as utf8 (opts as string)', t => {
        t.plan(2)
        const expectedBuf = fs.readFileSync(expectedFilename, 'utf8')
        zip.readFile('a.txt', 'utf8', (err, data) => {
          t.error(err, 'Error is null')
          t.equal(data, expectedBuf, 'File contents match')
        })
      })

      t.test('  -> Emits error reading missing file', t => {
        t.plan(3)
        const rs = zip.createReadStream('c.txt', 'utf8')
        rs.on('error', err => {
          t.ok(err instanceof Error, 'Throws an error')
          t.ok(
            /NotFound/.test(err.message),
            'Error message includes "NotFound"'
          )
        })
        rs.on('close', () => t.pass('Emits close event'))
      })

      t.test('cleanup', t => {
        zip.close()
        t.end()
      })

      t.end()
    })
  })
})

test('Bad zipfile tests', t => {
  const badZips = fs
    .readdirSync(path.join(__dirname, 'failure'))
    .concat('does_not_exist.zip')

  badZips.forEach(filename => {
    const filepath = path.join(__dirname, 'failure', filename)
    t.test('Testing bad zip: ' + filename, t => {
      t.plan(3)
      const zip = new ZipFs(filepath, err => {
        t.ok(err instanceof Error, 'Callback called with error')
      })
      const rs = zip.createReadStream('a.txt')
      rs.on('error', err => {
        t.ok(err instanceof Error, 'Readstream emits error')
      })
      rs.on('data', data => t.fail('should not emit data events'))
      zip.readFile('a.txt', err => {
        t.ok(err instanceof Error, 'Callback called with error')
      })
    })
  })
})

const expectedRoot = ['a.txt', 'folder1', 'folder2', 'folder1extra'].sort()
const expectedFolder1 = ['b.txt']

test('readdir root', t => {
  t.plan(5)
  const zip = new ZipFs(path.join(__dirname, './readdir.zip'), err =>
    t.error(err, 'No error when opening zipfile')
  )
  zip.readdir('/', (err, files) => {
    t.error(err, 'No error')
    t.deepEqual(files.sort(), expectedRoot)
  })
  zip.readdir('.', (err, files) => {
    t.error(err, 'No error')
    t.deepEqual(files.sort(), expectedRoot)
  })
})

test('readdir nested folder', t => {
  t.plan(9)
  const zip = new ZipFs(path.join(__dirname, './readdir.zip'), err =>
    t.error(err, 'No error when opening zipfile')
  )
  zip.readdir('folder1', (err, files) => {
    t.error(err, 'No error')
    t.deepEqual(files.sort(), expectedFolder1)
  })
  zip.readdir('./folder1', (err, files) => {
    t.error(err, 'No error')
    t.deepEqual(files.sort(), expectedFolder1)
  })
  zip.readdir('/folder1', (err, files) => {
    t.error(err, 'No error')
    t.deepEqual(files.sort(), expectedFolder1)
  })
  zip.readdir('folder1/', (err, files) => {
    t.error(err, 'No error')
    t.deepEqual(files.sort(), expectedFolder1)
  })
})

test('readdir empty folder', t => {
  const zip = new ZipFs(path.join(__dirname, './readdir.zip'), err =>
    t.error(err, 'No error when opening zipfile')
  )
  zip.readdir('./folder2', (err, files) => {
    t.error(err, 'No error')
    t.deepEqual(files, [])
    t.end()
  })
})

test('readdir dirent', t => {
  const zip = new ZipFs(path.join(__dirname, './readdir.zip'), err =>
    t.error(err, 'No error when opening zipfile')
  )
  zip.readdir('/', { withFileTypes: true }, (err, files) => {
    t.error(err, 'No error')
    files.sort()
    t.equal(files[0].name, 'a.txt')
    t.true(files[0].isFile())
    t.equal(files[1].name, 'folder1')
    t.true(files[1].isDirectory())
    t.equal(files[2].name, 'folder2')
    t.true(files[2].isDirectory())
    t.equal(files[3].name, 'folder1extra')
    t.true(files[3].isDirectory())
    t.end()
  })
})

// TODO: Tests for closind and cleaning up file descriptors
