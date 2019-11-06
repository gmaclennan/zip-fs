const yauzl = require('yauzl')
const EventEmitter = require('events')
const duplexify = require('duplexify')
const concat = require('concat-stream')
const once = require('once')

const noop = () => {}

class Raz extends EventEmitter {
  constructor (path, cb) {
    super()
    cb = cb ? once(cb) : noop
    this.path = path
    this._state = 'opening'
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
    if (typeof opts === 'function') cb = opts
    cb = once(cb)
    const rs = this.createReadStream(fileName, opts)
    rs.on('error', cb)
    rs.pipe(concat(data => cb(null, data)))
  }

  close () {
    this._state = 'closed'
    if (!this._zipfile) return
    this._zipfile.close()
  }
}

module.exports = Raz
