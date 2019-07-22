/**
 * As part of the initiative to upggrade our Mapbox dependency, these
 * functions have been copied from our forked version of Mapbox so that Mapbox
 * can be updated independently
 * - See [FE-8035]
 */

const base64ToArrayBuffer = function(base64) {
  // from SO: http://bit.ly/2fGowUT
  const binaryString = window.atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

const getArrayBuffer = function(url, callback) {
  if (url.slice(0, 22) === "data:image/png;base64,") {
    return callback(null, base64ToArrayBuffer(url.slice(22)))
  } else {
    const xhr = new XMLHttpRequest()
    xhr.open("GET", url, true)
    xhr.responseType = "arraybuffer"
    xhr.onerror = function(e) {
      callback(e)
    }
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
        callback(null, xhr.response)
      } else {
        callback(new Error(xhr.statusText))
      }
    }
    xhr.send()
    return xhr
  }
}

export const getImage = function(url, callback) {
  return getArrayBuffer(url, (err, imgData) => {
    if (err) {
      return callback(err)
    }
    const img = new window.Image()
    img.onload = () => {
      callback(null, img)
      ;(window.URL || window.webkitURL).revokeObjectURL(img.src)
    }

    const blob = new Blob([new Uint8Array(imgData)], { type: "image/png" })
    img.src = (window.URL || window.webkitURL).createObjectURL(blob)
    img.getData = () => {
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")
      canvas.width = img.width
      canvas.height = img.height
      context.drawImage(img, 0, 0)
      return context.getImageData(0, 0, img.width, img.height).data
    }
    return img
  })
}

/**
 * Provides a function that outputs milliseconds: either performance.now()
 * or a fallback to Date.now()
 */
const now = (function() {
  if (window.performance && window.performance.now) {
    return window.performance.now.bind(window.performance)
  } else {
    return Date.now.bind(Date)
  }
})()

const frame = function(fn) {
  const frameFn =
    window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame
  return frameFn(fn)
}

export const timed = function(fn, dur, ctx) {
  if (!dur) {
    fn.call(ctx, 1)
    return null
  }

  let abort = false
  const start = now()

  function tick(now) {
    if (abort) {
      return
    }
    now = now()

    if (now >= start + dur) {
      fn.call(ctx, 1)
    } else {
      fn.call(ctx, (now - start) / dur)
      frame(tick)
    }
  }

  frame(tick)

  return function() {
    abort = true
  }
}
