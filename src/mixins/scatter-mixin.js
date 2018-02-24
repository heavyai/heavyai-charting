import { utils } from "../utils/utils"
import { rasterDrawMixin } from "./raster-draw-mixin"

function extend(destination, source) {
  for (const k in source) {
    if (source.hasOwnProperty(k)) {
      destination[k] = source[k]
    }
  }
  return destination
}

export default function scatterMixin(_chart, _mapboxgl, mixinDraw = true) {
  var _mapboxgl = typeof mapboxgl === "undefined" ? _mapboxgl : mapboxgl

  _chart._xDimName = null
  _chart._yDimName = null
  let _xDim = null
  let _yDim = null

  let _xRange = null
  let _yRange = null

  const _map = {
    remove() {
      _chart._destroyScatterPlot()
    },
    resize() {
      // noop
      // TODO(croot): send any events to notify the user of a change?
    }
  }

  // add event functionality to our dummy _map object
  extend(_map, _mapboxgl.Evented.prototype)

  _chart.map = function() {
    // just a getter - don't let user set map
    // this is to appease bubbleRasterChart
    // which was initially only setup to
    // do renders with mapbox (hence the name 'map')
    return _map
  }

  function addDimAndRange(dim, dims, ranges) {
    if (dim) {
      dims.push(dim)
      const range = dim.getFilter()
      if (range !== null) {
        range.forEach(rangesArray => {
          ranges.push(rangesArray)
        })
      }
    }
  }

  function initializeXYDimsAndRanges(chart) {
    const xDims = []
    const yDims = []
    const xRanges = []
    const yRanges = []

    addDimAndRange(chart.xDim(), xDims, xRanges)
    addDimAndRange(chart.yDim(), yDims, yRanges)

    if (typeof chart.getLayers === "function") {
      _chart.getLayers().forEach(layer => {
        if (typeof layer.xDim === "function") {
          addDimAndRange(layer.xDim(), xDims, xRanges)
        }

        if (typeof layer.yDim === "function") {
          addDimAndRange(layer.yDim(), yDims, yRanges)
        }
      })
    }

    return {
      xDims,
      yDims,
      xRanges,
      yRanges
    }
  }

  _chart.getDataRenderBounds = function() {
    const dimRangeData = initializeXYDimsAndRanges(_chart)
    const xRanges = dimRangeData.xRanges
    const yRanges = dimRangeData.yRanges

    if (!xRanges.length) {
      // default to a 0-1 range
      _xRange = [0, 1]

      // TODO(croot): automatically determine the min/max of the x dimension
      // If we do this, we should cache the x scale and only
      // do this if the scale or dimension has changed
    } else {
      _xRange = xRanges.reduce(
        (prevVal, currVal) => [
          Math.min(prevVal[0], currVal[0]),
          Math.max(prevVal[1], currVal[1])
        ],
        [Number.MAX_VALUE, -Number.MAX_VALUE]
      )

      if (_chart.elasticX()) {
        const xPadding = _chart.xAxisPadding()
        _xRange[0] = utils.subtract(_xRange[0], xPadding) || 0
        _xRange[1] = utils.add(_xRange[1], xPadding) || 0
      }
    }

    if (!yRanges.length) {
      // default to a 0-1 range
      _yRange = [0, 1]

      // TODO: automatically determine the min/max of the y dimension?
      // If we do this, we should cache the y scale and only
      // do this if the scale or dimension has changed
    } else {
      _yRange = yRanges.reduce(
        (prevVal, currVal) => [
          Math.min(prevVal[0], currVal[0]),
          Math.max(prevVal[1], currVal[1])
        ],
        [Number.MAX_VALUE, -Number.MAX_VALUE]
      )

      if (_chart.elasticY()) {
        const yPadding = _chart.yAxisPadding()
        _yRange[0] = utils.subtract(_yRange[0], yPadding) || 0
        _yRange[1] = utils.add(_yRange[1], yPadding) || 0
      }
    }

    const bounds = _chart._fitToMaxBounds([
      [_xRange[0], _yRange[0]],
      [_xRange[1], _yRange[1]]
    ])
    _xRange[0] = bounds[0][0]
    _xRange[1] = bounds[1][0]
    _yRange[0] = bounds[0][1]
    _yRange[1] = bounds[1][1]

    const renderBounds = [
      [_xRange[0], _yRange[1]], // top left
      [_xRange[1], _yRange[1]], // top right
      [_xRange[1], _yRange[0]], // bottom right
      [_xRange[0], _yRange[0]]
    ] // bottom left

    return renderBounds
  }

  _chart.xRange = function() {
    return _xRange
  }

  _chart.yRange = function() {
    return _yRange
  }

  _chart.xDim = function(xDim) {
    if (!arguments.length) {
      return _xDim
    }
    _xDim = xDim
    if (_xDim) {
      _chart._xDimName = _xDim.value()[0]
    }

    // force a refresh of the render bounds,
    // this currently doesn't improve anything.
    // We'd want to do this if we do a min/max
    // query during the getDataRenderBounds()
    // function
    _xRange = null
    return _chart
  }

  _chart.yDim = function(yDim) {
    if (!arguments.length) {
      return _yDim
    }
    _yDim = yDim
    if (_yDim) {
      _chart._yDimName = _yDim.value()[0]
    }

    // force a refresh of the render bounds
    // this currently doesn't improve anything.
    // We'd want to do this if we do a min/max
    // query during the getDataRenderBounds()
    // function
    _yRange = null
    return _chart
  }

  _chart._setOverlay = function(data, bounds, nonce, browser, redraw) {
    if (bounds === undefined) {
      return
    }

    let blob = null

    if (data) {
      if (browser.isSafari || browser.isIE || browser.isEdge) {
        blob = utils.b64toBlob(data, "image/png")
        var blobUrl = URL.createObjectURL(blob)
      } else {
        var blobUrl = "data:image/png;base64," + data
      }
    }

    _chart._drawScatterPlot(!redraw, blobUrl, bounds, nonce)
  }

  _chart.isLoaded = function() {
    return _xRange && _yRange
  }

  if (mixinDraw) {
    _chart = rasterDrawMixin(_chart)
  }

  return _chart
}
