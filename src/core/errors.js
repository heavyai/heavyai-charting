export function Exception(msg) {
  const _msg = msg || "Unexpected internal error"

  this.message = _msg

  this.toString = function() {
    return _msg
  }
  this.stack = new Error().stack
}

Exception.prototype = Object.create(Error.prototype)
Exception.prototype.constructor = Exception

export function InvalidStateException() {
  Exception.apply(this, arguments)
}

InvalidStateException.prototype = Object.create(Exception.prototype)
InvalidStateException.prototype.constructor = InvalidStateException

export function BadArgumentException() {
  Exception.apply(this, arguments)
}

BadArgumentException.prototype = Object.create(Exception.prototype)
BadArgumentException.prototype.constructor = BadArgumentException
