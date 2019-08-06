/**
 * As part of the initiative to upggrade our Mapbox dependency, these
 * functions have been copied from our forked version of Mapbox so that Mapbox
 * can be updated independently
 * - See [FE-8035]
 */

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
