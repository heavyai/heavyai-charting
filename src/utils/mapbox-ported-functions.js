// SPDX-FileCopyrightText: Copyright (c) 2016, Mapbox
// SPDX-License-Identifier: BSD-3-Clause

// eslint-disable-next-line spaced-comment
/*!
 * Portions derived from the former OmniSci fork of Mapbox GL JS, previously
 * pinned at commit 35231362c7b6f2b63590fd184a38d8ac15fdf57d.
 *
 * Copyright (c) 2016, Mapbox
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * * Neither the name of Mapbox GL JS nor the names of its contributors may be
 *   used to endorse or promote products derived from this software without
 *   specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

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
