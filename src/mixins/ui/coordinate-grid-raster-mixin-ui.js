"use strict"

import { redrawAllAsync } from "../../core/core-async"

/* istanbul ignore next */
function bindAll(funcNames, thisArg) {
  funcNames.forEach(funcName => {
    if (!thisArg[funcName]) {
      return
    }
    thisArg[funcName] = thisArg[funcName].bind(thisArg)
  })
}

/* istanbul ignore next */
function isInChart(chart, container, e, mousePos) {
  const width = chart.effectiveWidth()
  const height = chart.effectiveHeight()
  const margins = chart.margins()
  const left = margins.left
  const top = margins.top
  const rect = container.getBoundingClientRect()

  e = e.touches ? e.touches[0] : e

  const diffX = e.clientX - left - rect.left - container.clientLeft
  const diffY = e.clientY - top - rect.top - container.clientTop

  if (mousePos) {
    mousePos.x = diffX
    mousePos.y = diffY
  }

  return diffX >= 0 && diffX < width && diffY >= 0 && diffY < height
}

/* istanbul ignore next */
class BaseHandler {
  constructor(
    chart,
    container,
    dataBounds,
    dataScale,
    dataOffset,
    filterDimensionCB,
    chartRedrawCB,
    mapboxglModule
  ) {
    this._chart = chart
    this._map = chart.map()
    this._container = container
    this._currDataBounds = dataBounds
    this._scale = dataScale
    this._offset = dataOffset
    this._filterDimensionCB = filterDimensionCB
    this._chartRedrawCB = chartRedrawCB
    this._mapboxglModule = mapboxglModule
  }

  isEnabled() {
    return Boolean(this._enabled)
  }

  isActive() {
    return Boolean(this._active)
  }

  enable() {
    if (this.isEnabled()) {
      return
    }

    this._enable()
    this._enabled = true
  }

  disable() {
    if (!this.isEnabled()) {
      return
    }

    this._disable()
    this._enabled = false
  }

  _fireEvent(type, e, eventMetaData) {
    if (!eventMetaData) {
      eventMetaData = {}
    }
    eventMetaData.originalEvent = e

    return this._map.fire(type, eventMetaData)
  }
}

/* istanbul ignore next */
function testProp(props, docStyle) {
  for (let i = 0; i < props.length; i = i + 1) {
    if (props[i] in docStyle) {
      return props[i]
    }
  }
}

/* istanbul ignore next */
function createHTMLElement(tagName, className, container) {
  const el = document.createElement(tagName)
  if (className) {
    el.className = className
  }
  if (container) {
    container.appendChild(el)
  }
  return el
}

/* istanbul ignore next */
class BoxZoomHandler extends BaseHandler {
  constructor(
    chart,
    container,
    dataBounds,
    dataScale,
    dataOffset,
    filterDimensionsCB,
    chartRedrawCB,
    mapboxglModule
  ) {
    super(
      chart,
      container,
      dataBounds,
      dataScale,
      dataOffset,
      filterDimensionsCB,
      chartRedrawCB,
      mapboxglModule
    )
    this._startBoxZoomPos = null
    this._boxZoomBox = null
    const docStyle = document.documentElement.style
    this._selectProp = testProp(
      ["userSelect", "MozUserSelect", "WebkitUserSelect", "msUserSelect"],
      docStyle
    )
    this._transformProp = testProp(["transform", "WebkitTransform"], docStyle)

    bindAll(["onBoxZoom", "onMouseMove", "onMouseUp", "onKeyDown"], this)
  }

  _enable() {
    this._container.addEventListener("mousedown", this.onBoxZoom)
  }

  _disable() {
    if (this._active) {
      this._finish()
      this._fireEvent("boxzoomcancel", {})
    }
    this._container.removeEventListener("mousedown", this.onBoxZoom)
  }

  _enableDrag() {
    if (this._selectProp) {
      document.documentElement.style[this._selectProp] = this._userSelect
    }
  }

  _disableDrag() {
    if (this._selectProp) {
      this._userSelect = document.documentElement.style[this._selectProp]
      document.documentElement.style[this._selectProp] = "none"
    }
  }

  onBoxZoom(e) {
    // make sure the mouse position is in the
    // chart
    const pos = new this._mapboxglModule.Point(0, 0)
    if (!isInChart(this._chart, this._container, e, pos)) {
      return
    }

    if (!(e.shiftKey && e.button === 0)) {
      return
    }

    document.addEventListener("mousemove", this.onMouseMove, false)
    document.addEventListener("keydown", this.onKeyDown, false)
    document.addEventListener("mouseup", this.onMouseUp, false)

    this._disableDrag()

    this._startBoxZoomPos = pos
    this._active = true
  }

  onMouseMove(e) {
    const p0 = this._startBoxZoomPos
    const p1 = new this._mapboxglModule.Point(0, 0)

    if (!isInChart(this._chart, this._container, e, p1) && !this._active) {
      return
    }

    if (!this._boxZoomBox) {
      const rootNode = this._chart.root().node()
      this._boxZoomBox = createHTMLElement("div", "mapboxgl-boxzoom", rootNode)
      rootNode.classList.add("mapboxgl-crosshair")
      this._fireEvent("boxzoomstart", e)
    }

    const minX = Math.min(p0.x, p1.x)
    const maxX = Math.max(p0.x, p1.x)
    const minY = Math.min(p0.y, p1.y)
    const maxY = Math.max(p0.y, p1.y)

    const margins = this._chart.margins()

    this._boxZoomBox.style[this._transformProp] = `translate(${minX +
      margins.left}px,${minY + margins.top}px)`
    this._boxZoomBox.style.width = `${maxX - minX}px`
    this._boxZoomBox.style.height = `${maxY - minY}px`
  }

  onMouseUp(e) {
    if (e.button !== 0) {
      return
    }

    const p0 = this._startBoxZoomPos
    const p1 = new this._mapboxglModule.Point(0, 0)
    if (!isInChart(this._chart, this._container, e, p1) && !this._active) {
      return
    }

    this._finish()

    if (p0.x === p1.x && p0.y === p1.y) {
      this._fireEvent("boxzoomcancel", e)
    } else {
      const startPos = this._chart.unproject(p0)
      const endPos = this._chart.unproject(p1)

      let xmin = Math.min(startPos.x, endPos.x)
      let xmax = Math.max(startPos.x, endPos.x)

      let ymin = Math.min(startPos.y, endPos.y)
      let ymax = Math.max(startPos.y, endPos.y)

      const bounds = this._chart._fitToMaxBounds(
        [[xmin, ymin], [xmax, ymax]],
        true
      )
      xmin = bounds[0][0]
      xmax = bounds[1][0]
      ymin = bounds[0][1]
      ymax = bounds[1][1]

      this._fireEvent("movestart", e)
      this._fireEvent("zoomstart", e)

      const startminx = this._currDataBounds[0][0]
      const startmaxx = this._currDataBounds[0][1]
      const endminx = xmin
      const endmaxx = xmax

      const startminy = this._currDataBounds[1][0]
      const startmaxy = this._currDataBounds[1][1]
      const endminy = ymin
      const endmaxy = ymax

      const diffminx = endminx - startminx
      const diffmaxx = endmaxx - startmaxx
      const diffminy = endminy - startminy
      const diffmaxy = endmaxy - startmaxy

      const duration = 500
      this._active = true

      const ease = this._mapboxglModule.util.bezier(0.25, 0.1, 0.25, 1)

      const abortFunc = this._mapboxglModule.util.browser.timed(t => {
        this._perFrameFunc(
          e,
          ease(t),
          startminx,
          diffminx,
          startmaxx,
          diffmaxx,
          startminy,
          diffminy,
          startmaxy,
          diffmaxy
        )
        if (t === 1) {
          this._boxZoomFinished(e, xmin, xmax, ymin, ymax)
        }
      }, duration)
    }
  }

  onKeyDown(e) {
    if (e.keyCode === 27) {
      this._finish()
      this._fireEvent("boxzoomcancel", e)
    }
  }

  _boxZoomFinished(e, xmin, xmax, ymin, ymax) {
    this._fireEvent("zoomend", e)
    this._fireEvent("moveend", e)

    this._filterDimensionCB([xmin, xmax], [ymin, ymax])

    // upon box zoom, elasticity is turned off
    this._chart.elasticX(false)
    this._chart.elasticY(false)

    const bounds = [[xmin, ymax], [xmax, ymax], [xmax, ymin], [xmin, ymin]]

    redrawAllAsync(this._chart.chartGroup())

    this._active = false
    this._fireEvent("boxzoomend", e, {
      boxZoomBounds: bounds
    })
  }

  _perFrameFunc(
    e,
    t,
    startminx,
    diffminx,
    startmaxx,
    diffmaxx,
    startminy,
    diffminy,
    startmaxy,
    diffmaxy
  ) {
    const xrange = [startminx + t * diffminx, startmaxx + t * diffmaxx]

    const yrange = [startminy + t * diffminy, startmaxy + t * diffmaxy]

    const xDiff = xrange[1] - xrange[0]
    const yDiff = yrange[1] - yrange[0]
    const xBoundsDiff = this._currDataBounds[0][1] - this._currDataBounds[0][0]
    const yBoundsDiff = this._currDataBounds[1][1] - this._currDataBounds[1][0]
    const xBoundsScale = xDiff / xBoundsDiff
    const yBoundsScale = yDiff / yBoundsDiff

    this._scale[0] = xBoundsScale
    this._scale[1] = yBoundsScale
    this._offset[0] = (xrange[0] - this._currDataBounds[0][0]) / xBoundsDiff
    this._offset[1] = (yrange[0] - this._currDataBounds[1][0]) / yBoundsDiff

    this._filterDimensionCB(xrange, yrange)

    this._chart._updateXAndYScales(this._chart.getDataRenderBounds())
    this._chartRedrawCB()

    this._fireEvent("move", e)
  }

  _finish() {
    this._active = false

    document.removeEventListener("mousemove", this.onMouseMove, false)
    document.removeEventListener("keydown", this.onKeyDown, false)
    document.removeEventListener("mouseup", this.onMouseUp, false)

    const rootNode = this._chart.root().node()
    rootNode.classList.remove("mapboxgl-crosshair")

    if (this._boxZoomBox) {
      this._boxZoomBox.parentNode.removeChild(this._boxZoomBox)
      this._boxZoomBox = null
    }

    this._enableDrag()
  }
}

/* istanbul ignore next */
class ScrollZoomHandler extends BaseHandler {
  constructor(
    chart,
    container,
    dataBounds,
    dataScale,
    dataOffset,
    filterDimensionsCB,
    chartRedrawCB,
    mapboxglModule,
    browser
  ) {
    super(
      chart,
      container,
      dataBounds,
      dataScale,
      dataOffset,
      filterDimensionsCB,
      chartRedrawCB,
      mapboxglModule
    )
    this._startWheelPos = null
    this._wheelType = null
    this._lastWheelVal = 0
    this._singularWheelTimeout = null
    this._wheelTimeout = null
    this._browser = browser

    bindAll(["_onSingularWheelTimeout", "_onWheelTimeout", "onWheel"], this)
  }

  _onSingularWheelTimeout() {
    this._wheelType = "wheel"
    this._wheelZoom(true, -this._lastWheelVal)
  }

  _onWheelTimeout() {
    this._wheelZoom(true, -this._lastWheelVal)
  }

  // enable() {
  //   super.enable()
  //   console.log(`CROOT - scrollZoom enable ${this._enabled} ${this.isEnabled()}`)
  //   console.trace()
  // }

  // disable() {
  //   super.disable()
  //   console.log(`CROOT - scrollZoom disable ${this._enabled} ${this.isEnabled()}`)
  //   console.trace()
  // }

  _enable() {
    this._container.addEventListener("wheel", this.onWheel)
    this._container.addEventListener("mousewheel", this.onWheel)
  }

  _disable() {
    this._container.removeEventListener("wheel", this.onWheel)
    this._container.removeEventListener("mousewheel", this.onWheel)
  }

  onWheel(e) {
    let value = 0

    // make sure the mouse position is in the
    // chart
    const pos = new this._mapboxglModule.Point(0, 0)
    if (!isInChart(this._chart, this._container, e, pos)) {
      return
    }

    if (e.type === "wheel") {
      value = e.deltaY
      // Firefox doubles the values on retina screens...
      if (
        this._browser.isFirefox &&
        e.deltaMode === window.WheelEvent.DOM_DELTA_PIXEL
      ) {
        value = value / (window.devicePixelRatio || 1)
      }

      if (e.deltaMode === window.WheelEvent.DOM_DELTA_LINE) {
        value = value * 40
      }
    } else if (e.type === "mousewheel") {
      value = -e.wheelDeltaY
      if (this._browser.isSafari) {
        value = value / 3
      }
    }

    const now = Date.now()
    const timeDelta = now - (this._time || 0)

    this._startWheelPos = pos
    this._time = now

    if (value !== 0 && value % 4.000244140625 === 0) {
      // This one is definitely a mouse wheel event.
      this._wheelType = "wheel"

      // Normalize this value to match trackpad.
      value = Math.floor(value / 4)
    } else if (value !== 0 && Math.abs(value) < 4) {
      // This one is definitely a trackpad event because it is so small.
      this._wheelType = "trackpad"
    } else if (timeDelta > 400) {
      // This is likely a new scroll action.
      this._wheelType = null
      this._lastWheelVal = value

      // Start a timeout in case this was a singular event, and dely it by up to 40ms.
      this._singularWheelTimeout = setTimeout(this._onSingularWheelTimeout, 40)
    } else if (!this._wheelType) {
      // This is a repeating event, but we don"t know the type of event just yet.
      // If the delta per time is small, we assume it"s a fast trackpad; otherwise we switch into wheel mode.
      this._wheelType = Math.abs(timeDelta * value) < 200 ? "trackpad" : "wheel"
    }

    // Slow down zoom if shift key is held for more precise zooming
    if (e.shiftKey && value) {
      value = value / 4
    }

    // Only fire the callback if we actually know what type of scrolling device the user uses.
    if (this._wheelType) {
      // Make sure our delayed event isn"t fired again, because we accumulate
      // the previous event (which was less than 40ms ago) into this event.
      if (this._singularWheelTimeout) {
        clearTimeout(this._singularWheelTimeout)
        this._singularWheelTimeout = null
        value = value + this._lastWheelVal
      }

      this._lastWheelVal = value

      if (this._wheelTimeout) {
        clearTimeout(this._wheelTimeout)
        this._wheelTimeout = null
      }

      // Start a timeout to do a full re-render when the scrolling event
      // is finished. Set it at an arbitrary timeout - 50ms
      this._wheelTimeout = setTimeout(this._onWheelTimeout, 50)

      this._wheelZoom(false, -value, e)
    }

    e.preventDefault()
  }

  _wheelZoom(doFullRender, delta, e) {
    if (!doFullRender && delta === 0) {
      return
    }

    if (delta !== 0) {
      // Scale by sigmoid of scroll wheel delta.
      let scale = 2 / (1 + Math.exp(-Math.abs(delta / 100)))
      if (delta < 0 && scale !== 0) {
        scale = 1 / scale
      }

      scale = 1 / scale

      let xRange = this._chart.xRange()
      let yRange = this._chart.yRange()

      if (xRange === null) {
        xRange = [0, 0]
      }

      if (yRange === null) {
        yRange = [0, 0]
      }

      const wheelData = this._chart.unproject(this._startWheelPos)

      let xDiff = scale * (xRange[1] - xRange[0])
      let yDiff = scale * (yRange[1] - yRange[0])

      // we want to keep wheelData where it is in pixel space,
      // so we need to extrapolate from there to get the data bounds
      // of the window

      // NOTE: the following is currently only designed
      // to work with linear scales.

      // TODO(croot): come up with a generic extrapolation
      // technique for any scale.

      const width = this._chart.effectiveWidth()
      const height = this._chart.effectiveHeight()

      let xmin = wheelData.x - xDiff * (this._startWheelPos.x / width)
      let xmax = xmin + xDiff

      let ymin =
        wheelData.y - yDiff * ((height - this._startWheelPos.y - 1) / height)
      let ymax = ymin + yDiff

      const bounds = this._chart._fitToMaxBounds(
        [[xmin, ymin], [xmax, ymax]],
        true
      )
      xmin = bounds[0][0]
      ymin = bounds[0][1]
      xmax = bounds[1][0]
      ymax = bounds[1][1]

      xDiff = xmax - xmin
      yDiff = ymax - ymin

      const xBoundsDiff =
        this._currDataBounds[0][1] - this._currDataBounds[0][0]
      const yBoundsDiff =
        this._currDataBounds[1][1] - this._currDataBounds[1][0]
      const xBoundsScale = xDiff / xBoundsDiff
      const yBoundsScale = yDiff / yBoundsDiff

      this._scale[0] = xBoundsScale
      this._scale[1] = yBoundsScale
      this._offset[0] = (xmin - this._currDataBounds[0][0]) / xBoundsDiff
      this._offset[1] = (ymin - this._currDataBounds[1][0]) / yBoundsDiff

      this._filterDimensionCB([xmin, xmax], [ymin, ymax])
      this._fireEvent("zoom", e)
      this._fireEvent("move", e)
    }

    // upon zoom, elasticity is turned off
    this._chart.elasticX(false)
    this._chart.elasticY(false)

    if (doFullRender) {
      redrawAllAsync(this._chart.chartGroup())
    } else {
      this._chart._updateXAndYScales(this._chart.getDataRenderBounds())
      this._chartRedrawCB()
    }
  }
}

/* istanbul ignore next */
class DragPanHandler extends BaseHandler {
  constructor(
    chart,
    container,
    dataBounds,
    dataScale,
    dataOffset,
    filterDimensionsCB,
    chartRedrawCB,
    mapboxglModule
  ) {
    super(
      chart,
      container,
      dataBounds,
      dataScale,
      dataOffset,
      filterDimensionsCB,
      chartRedrawCB,
      mapboxglModule
    )
    this._dragInertia = []
    this._startDragPos = null
    this._dragPos = null

    bindAll(["onDrag", "onMove", "onTouchEnd", "onMouseUp"], this)
  }

  _enable() {
    this._container.addEventListener("mousedown", this.onDrag)
    this._container.addEventListener("touchstart", this.onDrag)
  }

  _disable() {
    this._container.removeEventListener("mousedown", this.onDrag)
    this._container.removeEventListener("touchstart", this.onDrag)

    document.removeEventListener("touchmove", this.onMove)
    document.removeEventListener("touchend", this.onTouchEnd)
    document.removeEventListener("mousemove", this.onMove)
    document.removeEventListener("mouseup", this.onMouseUp)

    if (this._active) {
      this._active = false
      this._fireEvent("dragend", {})
      this._fireEvent("moveend", {})
    }
  }

  onDrag(e) {
    if (this._ignoreEvent(e)) {
      return
    }

    // make sure the mouse position is in the chart
    const pos = new this._mapboxglModule.Point(0, 0)
    if (!isInChart(this._chart, this._container, e, pos)) {
      return
    }

    if (this._active) {
      return
    }

    if (e.touches) {
      document.addEventListener("touchmove", this.onMove)
      document.addEventListener("touchend", this.onTouchEnd)
    } else {
      document.addEventListener("mousemove", this.onMove)
      document.addEventListener("mouseup", this.onMouseUp)
    }

    this._active = false
    this._startDragPos = this._dragPos = pos
    this._dragInertia = [[Date.now(), this._dragPos]]
  }

  onMove(e) {
    // make sure the mouse position is in the chart
    if (this._ignoreEvent(e)) {
      return
    }

    const pos = new this._mapboxglModule.Point(0, 0)
    if (!isInChart(this._chart, this._container, e, pos) && !this._active) {
      return
    }

    if (!this._active) {
      this._active = true
      this._fireEvent("dragstart", e)
      this._fireEvent("movestart", e)
    }

    // TODO(croot): stop other animated pans/zooms here if/when
    // they're supported.
    this._drainInertiaBuffer()
    this._dragInertia.push([Date.now(), pos])

    let xRange = this._chart.xRange()
    if (xRange === null) {
      xRange = [0, 0]
    }

    let yRange = this._chart.yRange()
    if (yRange === null) {
      yRange = [0, 0]
    }

    const prevPos = this._chart.unproject(this._dragPos)
    const currPos = this._chart.unproject(pos)

    let deltaX = currPos.x - prevPos.x
    let deltaY = currPos.y - prevPos.y

    let xmin = xRange[0] - deltaX
    let xmax = xRange[1] - deltaX

    let ymin = yRange[0] - deltaY
    let ymax = yRange[1] - deltaY

    const bounds = this._chart._fitToMaxBounds(
      [[xmin, ymin], [xmax, ymax]],
      true
    )
    deltaX = deltaX + (xmin - bounds[0][0])
    deltaY = deltaY + (ymin - bounds[0][1])
    xmin = bounds[0][0]
    ymin = bounds[0][1]
    xmax = bounds[1][0]
    ymax = bounds[1][1]

    const xBoundsDiff = this._currDataBounds[0][1] - this._currDataBounds[0][0]
    const yBoundsDiff = this._currDataBounds[1][1] - this._currDataBounds[1][0]

    this._offset[0] -= deltaX / xBoundsDiff
    this._offset[1] -= deltaY / yBoundsDiff

    this._filterDimensionCB([xmin, xmax], [ymin, ymax])

    // upon pan, elasticity is turned off
    this._chart.elasticX(false)
    this._chart.elasticY(false)

    this._chart._updateXAndYScales(this._chart.getDataRenderBounds())
    this._chartRedrawCB()

    this._fireEvent("drag", e)
    this._fireEvent("move", e)

    this._dragPos = pos

    e.preventDefault()
  }

  _onUp(e) {
    if (!this._active) {
      return
    }

    this._active = false
    this._fireEvent("dragend", e)
    this._drainInertiaBuffer()

    const finish = () => {
      redrawAllAsync(this._chart.chartGroup())
      this._fireEvent("moveend", e)
    }

    const inertia = this._dragInertia
    if (inertia.length < 2) {
      finish()
      return
    }

    const last = inertia[inertia.length - 1]
    const first = inertia[0]
    const flingOffset = last[1].sub(first[1])
    const flingDuration = (last[0] - first[0]) / 1000

    if (flingDuration === 0 || last[1].equals(first[1])) {
      finish()
      return
    }

    const inertiaLinearity = 0.3
    const inertiaEasing = this._mapboxglModule.util.bezier(
      0,
      0,
      inertiaLinearity,
      1
    )
    const inertiaMaxSpeed = 1400 // pixels/second
    const inertiaDeceleration = 2500 // pixels/second squared

    // calculate px/s velocity & adjust for increased initial animation speed when easing out
    const velocity = flingOffset.mult(inertiaLinearity / flingDuration)
    let speed = velocity.mag() // pixels/sec

    if (speed > inertiaMaxSpeed) {
      speed = inertiaMaxSpeed
      velocity._unit()._mult(speed)
    }

    const duration = speed / (inertiaDeceleration * inertiaLinearity)
    const offset = velocity.mult(-duration / 2)

    finish()

    // TODO(croot):
    // Do the animated ease-out of the pan like mapbox
  }

  onTouchEnd(e) {
    // TODO(croot): check that the event is in the chart window?
    if (this._ignoreEvent(e)) {
      return
    }
    this._onUp(e)
    document.removeEventListener("touchmove", this.onMove)
    document.removeEventListener("touchend", this.onTouchEnd)
  }

  onMouseUp(e) {
    // TODO(croot): check that the event is in the chart window?
    if (this._ignoreEvent(e)) {
      return
    }
    this._onUp(e)
    document.removeEventListener("mousemove", this.onMove)
    document.removeEventListener("mouseup", this.onMouseUp)
  }

  _ignoreEvent(e) {
    const map = this._chart.map()
    if (map.boxZoom && map.boxZoom.isActive()) {
      return true
    }

    if (e.touches) {
      return e.touches.length > 1
    } else {
      if (e.ctrlKey) {
        return true
      }
      const buttons = 1
      const button = 0
      return e.type === "mousemove"
        ? e.buttons & (buttons === 0)
        : e.button !== button
    }
  }

  _drainInertiaBuffer() {
    const now = Date.now()
    const cutoff = 160 // msec

    if (this._dragInertia) {
      while (
        this._dragInertia.length > 0 &&
        now - this._dragInertia[0][0] > cutoff
      ) {
        this._dragInertia.shift()
      }
    }
  }
}

/* istanbul ignore next */
export default function bindEventHandlers(
  chart,
  container,
  dataBounds,
  dataScale,
  dataOffset,
  filterDimensionsCB,
  chartRedrawCB,
  browser,
  mapboxglModule,
  enableInteractions
) {
  const map = chart.map()
  let startPos = null
  let tapped = null

  map.scrollZoom = new ScrollZoomHandler(
    chart,
    container,
    dataBounds,
    dataScale,
    dataOffset,
    filterDimensionsCB,
    chartRedrawCB,
    mapboxglModule,
    browser
  )
  map.boxZoom = new BoxZoomHandler(
    chart,
    container,
    dataBounds,
    dataScale,
    dataOffset,
    filterDimensionsCB,
    chartRedrawCB,
    mapboxglModule
  )
  map.dragPan = new DragPanHandler(
    chart,
    container,
    dataBounds,
    dataScale,
    dataOffset,
    filterDimensionsCB,
    chartRedrawCB,
    mapboxglModule
  )

  container.addEventListener("mouseout", onMouseOut, false)
  container.addEventListener("mousedown", onMouseDown, false)
  container.addEventListener("mouseup", onMouseUp, false)
  container.addEventListener("mousemove", onMouseMove, false)
  container.addEventListener("touchstart", onTouchStart, false)
  container.addEventListener("touchend", onTouchEnd, false)
  container.addEventListener("touchmove", onTouchMove, false)
  container.addEventListener("touchcancel", onTouchCancel, false)
  container.addEventListener("click", onClick, false)
  container.addEventListener("dblclick", onDblClick, false)

  function destroyAllEvents() {
    container.removeEventListener("mouseout", onMouseOut)
    container.removeEventListener("mousedown", onMouseDown)
    container.removeEventListener("mouseup", onMouseUp)
    container.removeEventListener("mousemove", onMouseMove)
    container.removeEventListener("touchstart", onTouchStart)
    container.removeEventListener("touchend", onTouchEnd)
    container.removeEventListener("touchmove", onTouchMove)
    container.removeEventListener("touchcancel", onTouchCancel)
    container.removeEventListener("click", onClick)
    container.removeEventListener("dblclick", onDblClick)
  }

  function onMouseOut(e) {
    const pos = new mapboxglModule.Point(0, 0)
    if (isInChart(chart, container, e, pos)) {
      fireMouseEvent("mouseout", e, pos)
    }
  }

  function onMouseDown(e) {
    // TODO(croot): if we support animated
    // pans/zooms, we want to stop any currently
    // running animation here first:

    const pos = new mapboxglModule.Point(0, 0)
    if (isInChart(chart, container, e, pos)) {
      startPos = pos
      fireMouseEvent("mousedown", e, pos)
    }
  }

  function onMouseUp(e) {
    const pos = new mapboxglModule.Point(0, 0)
    fireMouseEvent("mouseup", e, pos)
  }

  function onMouseMove(e) {
    const pos = new mapboxglModule.Point(0, 0)
    if (isInChart(chart, container, e, pos)) {
      if (map.dragPan && map.dragPan.isActive()) {
        return
      }

      let target = e.toElement || e.target
      while (target && target !== container) {
        target = target.parentNode
      }
      if (target !== container) {
        return
      }

      fireMouseEvent("mousemove", e, pos)
    }
  }

  function onTouchStart(e) {
    if (isInChart(chart, container, e)) {
      // TODO(croot): if we support animated
      // pans/zooms, we want to stop any currently
      // running animation here first:
      if (
        (map.dragPan && map.dragPan.isActive()) ||
        (map.bozZoom && map.boxZoom.isActive())
      ) {
        return
      }

      fireTouchEvent("touchstart", e)

      if (!e.touches || e.touches.length > 1) {
        return
      }

      if (tapped) {
        clearTimeout(tapped)
        tapped = null
        fireMouseEvent("dblclick", e)
      } else {
        tapped = setTimeout(onTouchTimeout, 300)
      }
    }
  }

  function onTouchMove(e) {
    if (isInChart(chart, container, e)) {
      fireTouchEvent("touchmove", e)
    }
  }

  function onTouchEnd(e) {
    if (isInChart(chart, container, e)) {
      fireTouchEvent("touchend", e)
    }
  }

  function onTouchCancel(e) {
    if (isInChart(chart, container, e)) {
      fireTouchEvent("touchcancel", e)
    }
  }

  function onTouchTimeout() {
    tapped = null
  }

  function onClick(e) {
    const pos = new mapboxglModule.Point(0, 0)
    if (isInChart(chart, container, e, pos)) {
      if (pos.equals(startPos)) {
        fireMouseEvent("click", e, pos)
      }
    }
  }

  function onDblClick(e) {
    const pos = new mapboxglModule.Point(0, 0)
    if (isInChart(chart, container, e, pos)) {
      fireMouseEvent("dblclick", e, pos)
      e.preventDefault()
    }
  }

  function fireMouseEvent(type, e, pos) {
    return map.fire(type, {
      dataCoord: chart.unproject(pos),
      point: pos,
      originalEvent: e
    })
  }

  function touchPos(touchContainer, e) {
    const rect = touchContainer.getBoundingClientRect()
    const points = []
    const margins = chart.margins()

    for (let i = 0; i < e.touches.length; i = i + 1) {
      // TODO(croot): should we only add points that are
      // within the container?
      points.push(
        new mapboxglModule.Point(
          e.touches[i].clientX -
            margins.left -
            rect.left -
            touchContainer.clientLeft,
          e.touches[i].clientY -
            margins.top -
            rect.top -
            touchContainer.clientTop
        )
      )
    }
    return points
  }

  function fireTouchEvent(type, e) {
    const touches = touchPos(container, e)
    const singular = touches.reduce(
      (prev, curr, i, arr) => prev.add(curr.div(arr.length)),
      new mapboxglModule.Point(0, 0)
    )

    return map.fire(type, {
      dataCoord: chart.unproject(singular),
      point: singular,
      dataCoords: touches.map(t => chart.unproject(t), this),
      points: touches,
      originalEvent: e
    })
  }

  function enableInteractionsInternal() {
    map.scrollZoom.enable()
    map.boxZoom.enable()
    // NOTE: box zoom must be enabled before dragPan
    map.dragPan.enable()
  }

  function disableInteractionsInternal() {
    map.dragPan.disable()
    map.boxZoom.disable()
    map.scrollZoom.disable()
  }

  const rtn = {
    enableInteractions: () => {
      enableInteractionsInternal()
    },

    disableInteractions: () => {
      disableInteractionsInternal()
    },

    destroy: () => {
      destroyAllEvents()
      disableInteractionsInternal()
    },

    getInteractionPropNames: () => ["scrollZoom", "boxZoom", "dragPan"]
  }

  if (enableInteractions) {
    rtn.enableInteractions()
  }

  return rtn
}
