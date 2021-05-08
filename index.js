const yauzl = require('yauzl')
const EventEmitter = require('events')
const duplexify = require('duplexify')
const concat = require('concat-stream')
const once = require('once')
const path = require('path')
const fs = require('fs')

const noop = () => {}

const defaultReaddirOpts = {
  encoding: 'utf8',
  withFileTypes: false
}

class Raz extends EventEmitter {
  constructor (path, cb) {
    super()
    cb = cb ? once(cb) : noop
    this.path = path
    this._state = 'opening'
    this._files = []
    yauzl.open(this.path, { autoClose: false }, (err, zipfile) => {
      if (err) {
        this._state = 'error'
        this._error = err
        this.emit('error', err)
        return cb(err)
      }
      this._state = 'reading'
      this._zipfile = zipfile
      this._entries = {}
      zipfile.on('entry', entry => {
        this._files.push(entry.fileName)
        // Ignore directory entries
        if (/\/$/.test(entry.fileName)) return
        this._entries[entry.fileName] = entry
      })
      zipfile.on('error', err => {
        this._state = 'error'
        this._error = err
        zipfile.close()
        this.emit('error', err)
        cb(err)
      })
      zipfile.on('end', () => {
        this._state = 'ready'
        this.emit('ready')
        cb()
      })
    })
  }

  _onReady (fn) {
    switch (this._state) {
      case 'error':
        process.nextTick(fn, this._error || new Error('Unknown error'))
        break
      case 'opening':
      case 'reading':
        this.once('ready', onready)
        this.once('error', onerror)
        break
      case 'ready':
        process.nextTick(fn)
        break
      case 'closed':
        process.nextTick(fn, new Error('File has already been closed'))
        break
    }

    function onready () {
      this.removeListener('error', onerror)
      fn()
    }

    function onerror (err) {
      this.removeListener('ready', onready)
      fn(err)
    }
  }

  createReadStream (fileName, opts) {
    opts = opts || {}
    if (typeof opts === 'string') opts = { encoding: opts }
    const dup = duplexify()
    dup.setWritable(null)
    this._onReady(err => {
      if (err) return dup.destroy(err)
      const entry = this._entries[fileName]
      if (!entry) return dup.destroy(new Error('NotFound: ' + fileName))
      this._zipfile.openReadStream(entry, (err, rs) => {
        if (err) return dup.destroy(err)
        if (opts.encoding) dup.setEncoding(opts.encoding)
        dup.setReadable(rs)
      })
    })
    return dup
  }

  readFile (fileName, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts
      opts = undefined
    }
    cb = once(cb)
    const rs = this.createReadStream(fileName, opts)
    rs.on('error', cb)
    rs.pipe(concat(data => cb(null, data)))
  }

  readdir (filePath, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts
      opts = undefined
    }
    opts = Object.assign({}, defaultReaddirOpts, opts)
    const relPath = path.resolve('/', filePath).slice(1)
    console.log('relpath', relPath)
    this._onReady(err => {
      if (err) return cb(err)
      const ents = new Map()
      for (const f of this._files) {
        if (relPath && !f.startsWith(relPath + '/')) continue
        const parts = (relPath ? f.slice(relPath.length + 1) : f).split('/')
        if (!parts[0]) continue
        const type =
          parts.length === 1
            ? fs.constants.UV_DIRENT_FILE
            : fs.constants.UV_DIRENT_DIR
        ents.set(parts[0], type)
      }
      const result = [...ents].map(([name, type]) => {
        return opts.withFileTypes ? new fs.Dirent(name, type) : name
      })
      cb(null, result)
    })
  }

  close () {
    this._state = 'closed'
    if (!this._zipfile) return
    this._zipfile.close()
  }
}

module.exports = Raz
