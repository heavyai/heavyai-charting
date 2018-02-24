export const logger = {}

logger.enableDebugLog = false

/* istanbul ignore next */
logger.warn = function(msg) {
  if (console) {
    if (console.warn) {
      console.warn(msg)
    } else if (console.log) {
      console.log(msg)
    }
  }

  return logger
}

/* istanbul ignore next */
logger.debug = function(msg) {
  if (logger.enableDebugLog && console) {
    if (console.debug) {
      console.debug(msg)
    } else if (console.log) {
      console.log(msg)
    }
  }

  return logger
}

/* istanbul ignore next */
logger.deprecate = function(fn, msg) {
  // Allow logging of deprecation
  let warned = false
  function deprecated() {
    if (!warned) {
      logger.warn(msg)
      warned = true
    }
    return fn.apply(this, arguments)
  }
  return deprecated
}
