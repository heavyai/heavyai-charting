/**
 * As part of the initiative to upgrade our Mapbox dependency, these
 * functions have been copied from our forked version of Mapbox so that Mapbox
 * can be updated independently
 * - See [FE-8035]
 */

import UnitBezier from "@mapbox/unitbezier"

/**
 * Given given (x, y), (x1, y1) control points for a bezier curve,
 * return a function that interpolates along that curve.
 *
 * @param p1x control point 1 x coordinate
 * @param p1y control point 1 y coordinate
 * @param p2x control point 2 x coordinate
 * @param p2y control point 2 y coordinate
 * @private
 */
export function bezier(p1x, p1y, p2x, p2y) {
  const bezier = new UnitBezier(p1x, p1y, p2x, p2y)
  return function(t) {
    return bezier.solve(t)
  }
}
/**
 * Provides a function that outputs milliseconds: either performance.now()
 * or a fallback to Date.now()
 */
const Now = (function() {
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
  const start = Now()

  function tick(now) {
    if (abort) {
      return
    }
    now = Now()

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
