import coordinateGridRasterMixin from "../mixins/coordinate-grid-raster-mixin"
import mapMixin from "../mixins/map-mixin"
import baseMixin from "../mixins/base-mixin"
import scatterMixin from "../mixins/scatter-mixin"
import { rasterDrawMixin } from "../mixins/raster-draw-mixin"
import { lastFilteredSize } from "../core/core-async"

export default function rasterChart(parent, useMap, chartGroup, _mapboxgl) {
  let _chart = null

  const _useMap = useMap !== undefined ? useMap : false

  const parentDivId = parent.attributes.id.value

  const browser = detectBrowser()
  function detectBrowser() {
    // from SO: http://bit.ly/1Wd156O
    const isOpera =
      (Boolean(window.opr) && Boolean(opr.addons)) ||
      Boolean(window.opera) ||
      navigator.userAgent.indexOf(" OPR/") >= 0
    const isFirefox = typeof InstallTrigger !== "undefined"
    const isSafari =
      Object.prototype.toString
        .call(window.HTMLElement)
        .indexOf("Constructor") > 0
    const isIE = /* @cc_on!@*/ false || Boolean(document.documentMode)
    const isEdge = !isIE && Boolean(window.StyleMedia)
    const isChrome = Boolean(window.chrome) && Boolean(window.chrome.webstore)
    return { isOpera, isFirefox, isSafari, isIE, isEdge, isChrome }
  }

  if (_useMap) {
    _chart = mapMixin(baseMixin({}), parentDivId, _mapboxgl, true, false)
  } else {
    _chart = scatterMixin(
      coordinateGridRasterMixin({}, _mapboxgl, browser),
      _mapboxgl,
      true
    )
  }

  // unset predefined mandatory attributes
  _chart._mandatoryAttributes([])

  let _con = window.hasOwnProperty("con") ? con : null
  const _imageOverlay = null
  let _renderBoundsMap = {}
  let _layerNames = {}
  let _layers = []
  let _hasBeenRendered = false

  let _x = null
  let _y = null
  const _xScaleName = "x"
  const _yScaleName = "y"

  let _usePixelRatio = false
  let _pixelRatio = 1

  let _minPopupShapeBoundsArea = 16 * 16
  let _popupSearchRadius = 2
  const _popupDivClassName = "map-popup"
  let _popupDisplayable = true

  _chart.popupDisplayable = function(displayable) {
    _popupDisplayable = Boolean(displayable)
  }

  _chart.x = function(x) {
    if (!arguments.length) {
      return _x
    }
    _x = x
    return _chart
  }

  _chart.y = function(_) {
    if (!arguments.length) {
      return _y
    }
    _y = _
    return _chart
  }

  _chart._resetRenderBounds = function() {
    _renderBoundsMap = {}
  }

  _chart._resetLayers = function() {
    _layers = []
    _layerNames = {}
  }

  _chart.pushLayer = function(layerName, layer) {
    if (_layerNames[layerName]) {
      throw new Error('A layer with name "' + layerName + '" already exists.')
    } else if (!layerName.match(/^\w+$/)) {
      throw new Error(
        "A layer name can only have alpha numeric characters (A-Z, a-z, 0-9, or _)"
      )
    }

    _layers.push(layerName)
    _layerNames[layerName] = layer
    return _chart
  }

  _chart.popLayer = function() {
    const layerName = _layers.pop()
    const layer = _layerNames[layerName]
    delete _layerNames[layerName]
    return layer
  }

  _chart.popAllLayers = function() {
    const poppedLayers = _layers.map(layerName => {
      const layer = _layerNames[layerName]
      delete _layerNames[layerName]
      return layer
    })
    _layers = []
    return poppedLayers
  }

  _chart.getLayer = function(layerName) {
    return _layerNames[layerName]
  }

  _chart.getAllLayers = function() {
    return Object.keys(_layerNames).map(k => _layerNames[k])
  }

  _chart.getLayerAt = function(idx) {
    const layerName = _layers[idx]
    return _layerNames[layerName]
  }

  _chart.getLayers = function() {
    return _layers.map(layerName => _layerNames[layerName])
  }

  _chart.getLayerNames = function() {
    return _layers
  }

  _chart.xRangeFilter = function(filter) {
    for (const layerName in _layerNames) {
      const layer = _layerNames[layerName]
      // layer.xDim() & layer.xDim().filter(filter)
    }
  }

  _chart.yRangeFilter = function(filter) {
    for (const layerName in _layerNames) {
      const layer = _layerNames[layerName]
      // layer.yDim() && layer.yDim().filter(filter)
    }
  }

  _chart.destroyChart = function() {
    for (const layerName in _layerNames) {
      const layer = _layerNames[layerName]
      layer.destroyLayer(_chart)
    }

    this.map().remove()
    if (this.legend()) {
      this.legend().removeLegend()
    }
  }

  _chart.con = function(_) {
    if (!arguments.length) {
      return _con
    }
    _con = _
    return _chart
  }

  // TODO(croot): pixel ratio should probably be configured on the backend
  // rather than here to deal with scenarios where data is used directly
  // in pixel-space.
  _chart.usePixelRatio = function(usePixelRatio) {
    if (!arguments.length) {
      return _usePixelRatio
    }

    _usePixelRatio = Boolean(usePixelRatio)
    if (_usePixelRatio) {
      _pixelRatio = window.devicePixelRatio || 1
    } else {
      _pixelRatio = 1
    }

    return _chart
  }

  _chart._getPixelRatio = function() {
    return _pixelRatio
  }

  _chart.setSample = function() {
    _layers.forEach(layerName => {
      const layer = _layerNames[layerName]
      if (layer && typeof layer.setSample === "function") {
        layer.setSample()
      }
    })
  }

  _chart.setDataAsync((group, callbacks) => {
    const bounds = _chart.getDataRenderBounds()
    _chart._updateXAndYScales(bounds)
    const heatLayers = _chart.getLayerNames().filter(
      layerName => _chart.getLayer(layerName).type === "heatmap"
    )

    if (heatLayers.length) {
      Promise.all(
        heatLayers.map(layerId => {
          const layer = _chart.getLayer(layerId)
          if (layer.getState().encoding.color.scale.domain === "auto") {
            return layer.getColorDomain(_chart).then(domain => {
              layer.colorDomain(domain)
              return domain
            })
          } else {
            return Promise.resolve(layer.getState().encoding.color.scale.domain)
          }
        })
      ).then(allBounds => {
        _chart._vegaSpec = genLayeredVega(_chart)
        const nonce = _chart
          .con()
          .renderVega(
            _chart.__dcFlag__,
            JSON.stringify(_chart._vegaSpec),
            {},
            callbacks
          )
        _chart.colors().domain(allBounds[0])
        _renderBoundsMap[nonce] = bounds
      })
    } else {
      _chart._vegaSpec = genLayeredVega(_chart)
      const nonce = _chart
        .con()
        .renderVega(
          _chart.__dcFlag__,
          JSON.stringify(_chart._vegaSpec),
          {},
          callbacks
        )
      _renderBoundsMap[nonce] = bounds
    }
  })

  _chart.data(group => {
    if (_chart.dataCache !== null) {
      return _chart.dataCache
    }

    const bounds = _chart.getDataRenderBounds()
    _chart._updateXAndYScales(bounds)

    _chart._vegaSpec = genLayeredVega(
      _chart,
      group,
      lastFilteredSize(group.getCrossfilterId())
    )

    const result = _chart
      .con()
      .renderVega(_chart.__dcFlag__, JSON.stringify(_chart._vegaSpec))

    _renderBoundsMap[result.nonce] = bounds
    return result
  })

  _chart._getXScaleName = function() {
    return _xScaleName
  }

  _chart._getYScaleName = function() {
    return _yScaleName
  }

  _chart._updateXAndYScales = function(renderBounds) {
    // renderBounds should be in this order - top left, top-right, bottom-right, bottom-left
    const useRenderBounds =
      renderBounds &&
      renderBounds.length === 4 &&
      renderBounds[0] instanceof Array &&
      renderBounds[0].length === 2

    if (_x === null) {
      _x = d3.scale.linear()
    }

    if (_y === null) {
      _y = d3.scale.linear()
    }

    if (useRenderBounds) {
      if (typeof _chart.useLonLat === "function" && _chart.useLonLat()) {
        _x.domain([
          _chart.conv4326To900913X(renderBounds[0][0]),
          _chart.conv4326To900913X(renderBounds[1][0])
        ])
        _y.domain([
          _chart.conv4326To900913Y(renderBounds[2][1]),
          _chart.conv4326To900913Y(renderBounds[0][1])
        ])
      } else {
        _x.domain([renderBounds[0][0], renderBounds[1][0]])
        _y.domain([renderBounds[2][1], renderBounds[0][1]])
      }
    } else {
      const layers = getLayers()
      const xRanges = []
      const yRanges = []

      for (layer in layers) {
        let xDim = layer.xDim(),
          yDim = layer.yDim()
        if (xDim) {
          var range = xDim.getFilter()
          if (range !== null) {
            xRanges.push(range)
          }
        }
        if (yDim) {
          var range = yDim.getFilter()
          if (range !== null) {
            yRanges.push(range)
          }
        }
      }

      if (xRanges.length) {
        const xRange = xRanges.reduce(
          (prevVal, currVal) => [
            Math.min(prevVal[0], currVal[0]),
            Math.max(prevVal[1], currVal[1])
          ],
          [Number.MAX_VALUE, -Number.MAX_VALUE]
        )

        if (typeof _chart.useLonLat === "function" && _chart.useLonLat()) {
          _x.domain([
            _chart.conv4326To900913X(xRange[0]),
            _chart.conv4326To900913X(xRange[1])
          ])
        } else {
          _x.domain(xRange)
        }
      } else {
        _x.domain([0.001, 0.999])
      }

      if (yRanges.length) {
        const yRange = yRanges.reduce(
          (prevVal, currVal) => [
            Math.min(prevVal[0], currVal[0]),
            Math.max(prevVal[1], currVal[1])
          ],
          [Number.MAX_VALUE, -Number.MAX_VALUE]
        )

        if (typeof _chart.useLonLat === "function" && _chart.useLonLat()) {
          _y.domain([
            _chart.conv4326To900913X(yRange[0]),
            _chart.conv4326To900913X(yRange[1])
          ])
        } else {
          _y.domain(yRange)
        }
      } else {
        _y.domain([0.001, 0.999])
      }
    }
  }

  _chart._determineScaleType = function(scale) {
    const scaleType = null
    if (scale.rangeBand !== undefined) {
      return "ordinal"
    }
    if (scale.exponent !== undefined) {
      return "power"
    }
    if (scale.base !== undefined) {
      return "log"
    }
    if (scale.quantiles !== undefined) {
      return "quantiles"
    }
    if (scale.interpolate !== undefined) {
      return "linear"
    }
    return "quantize"
  }

  function removeOverlay(overlay) {
    _chart._removeOverlay(overlay)
  }

  _chart._doRender = function(data, redraw, doNotForceData) {
    if (!data && Boolean(!doNotForceData)) {
      data = _chart.data()
    }

    if (_chart.isLoaded()) {
      if (Object.keys(data).length) {
        _chart._setOverlay(
          data.image,
          _renderBoundsMap[data.nonce],
          data.nonce,
          browser,
          Boolean(redraw)
        )
        _hasBeenRendered = true
      } else {
        _chart._setOverlay(null, null, null, browser, Boolean(redraw))
      }
    }
  }

  _chart._doRedraw = function() {
    _chart._doRender(null, true)
  }

  _chart.minPopupShapeBoundsArea = function(minPopupShapeBoundsArea) {
    if (!arguments.length) {
      return _minPopupShapeBoundsArea
    }
    _minPopupShapeBoundsArea = minPopupShapeBoundsArea
    return _chart
  }

  _chart.popupSearchRadius = function(popupSearchRadius) {
    if (!arguments.length) {
      return _popupSearchRadius
    }
    _popupSearchRadius = popupSearchRadius
    return _chart
  }

  _chart.getClosestResult = function getClosestResult(point, callback) {
    const height =
      typeof _chart.effectiveHeight === "function"
        ? _chart.effectiveHeight()
        : _chart.height()
    const pixelRatio = _chart._getPixelRatio() || 1
    const pixel = new TPixel({
      x: Math.round(point.x * pixelRatio),
      y: Math.round((height - point.y) * pixelRatio)
    })

    if (!point) {
      return
    }

    let cnt = 0
    const layerObj = {}
    _layers.forEach(layerName => {
      const layer = _layerNames[layerName]
      if (
        layer.getPopupAndRenderColumns &&
        layer.hasPopupColumns &&
        layer.hasPopupColumns()
      ) {
        layerObj[layerName] = layer.getPopupAndRenderColumns(_chart)
        ++cnt
      }
    })

    // TODO best to fail, skip cb, or call cb wo args?
    if (!cnt) {
      return
    }

    return _chart.con().getResultRowForPixel(
      _chart.__dcFlag__,
      pixel,
      layerObj,
      [
        function(err, results) {
          if (err) {
            throw new Error(
              `getResultRowForPixel failed with message: ${err.message}`
            )
          } else {
            return callback(results[0])
          }
        }
      ],
      Math.ceil(_popupSearchRadius * pixelRatio)
    )
  }

  _chart.displayPopup = function displayPopup(result, animate) {
    if (
      !_popupDisplayable ||
      !result ||
      !result.row_set ||
      !result.row_set.length
    ) {
      return
    }
    if (_chart.select("." + _popupDivClassName).empty()) {
      // only one popup at a time
      const layer = _layerNames[result.vega_table_name]
      if (layer && layer.areResultsValidForPopup(result.row_set)) {
        const mapPopup = _chart
          .root()
          .append("div")
          .attr("class", _popupDivClassName)
        layer.displayPopup(
          _chart,
          mapPopup,
          result,
          _minPopupShapeBoundsArea,
          animate
        )
      }
    }
  }

  _chart.hidePopup = function hidePopup(animate) {
    const popupElem = _chart.select("." + _popupDivClassName)
    if (!popupElem.empty()) {
      for (let i = 0; i < _layers.length; ++i) {
        const layerName = _layers[i]
        const layer = _layerNames[layerName]
        if (layer && layer.isPopupDisplayed(_chart)) {
          // TODO(croot): can this be improved? I presume only
          // one popup can be shown at a time
          if (animate) {
            layer.hidePopup(_chart, () => {
              _chart.select("." + _popupDivClassName).remove()
            })
          } else {
            _chart.select("." + _popupDivClassName).remove()
          }
          break
        }
      }
    }
  }

  return _chart.anchor(parent, chartGroup)
}

function valuesOb(obj) {
  return Object.keys(obj).map(key => obj[key])
}

function genLayeredVega(chart) {
  const pixelRatio = chart._getPixelRatio()
  const width =
    (typeof chart.effectiveWidth === "function"
      ? chart.effectiveWidth()
      : chart.width()) * pixelRatio
  const height =
    (typeof chart.effectiveHeight === "function"
      ? chart.effectiveHeight()
      : chart.height()) * pixelRatio

  const xdom = chart.x().domain()
  const ydom = chart.y().domain()

  const data = []

  let scales = [
    {
      name: chart._getXScaleName(),
      type: chart._determineScaleType(chart.x()),
      domain: chart.x().domain(),
      range: "width"
    },
    {
      name: chart._getYScaleName(),
      type: chart._determineScaleType(chart.y()),
      domain: chart.y().domain(),
      range: "height"
    }
  ]
  const marks = []

  chart.getLayerNames().forEach(layerName => {
    const layerVega = chart.getLayer(layerName).genVega(chart, layerName)

    data.push(layerVega.data)
    scales = scales.concat(layerVega.scales)
    marks.push(layerVega.mark)
  })

  const vegaSpec = {
    width: Math.round(width),
    height: Math.round(height),
    data,
    scales,
    marks
  }
  console.log(JSON.stringify(vegaSpec, null, 2))
  return vegaSpec
  /*
  {
  "width": 2118,
  "height": 1178,
  "data": [
    {
      "name": "polytable1",
      "format": "polys",
      "shapeColGroup": "mapd",
      "sql": "SELECT zipcodes.rowid,AVG(contributions_donotmodify.amount) AS avgContrib FROM contributions_donotmodify,zipcodes WHERE contributions_donotmodify.amount IS NOT NULL AND contributions_donotmodify.contributor_zipcode = zipcodes.ZCTA5CE10 GROUP BY zipcodes.rowid ORDER BY avgContrib DESC"
    },
    {
      "name": "table1",
      "sql": "SELECT goog_x,goog_y,lang as color,followers as size,tweets_nov_feb.rowid FROM tweets_nov_feb WHERE (goog_x >= -19793718 AND goog_x <= 19926188) AND (goog_y >= -8000000 AND goog_y <= 8000000) AND  MOD(tweets_nov_feb.rowid * 265445761, 4294967296) < 3778891624 LIMIT 500000"
    },
    {
      "name": "table2",
      "sql": "SELECT merc_x,merc_y,recipient_party as color,contributions_donotmodify.rowid FROM contributions_donotmodify LIMIT 500000"
    }
  ],
  "scales": [
    {
      "name": "x",
      "type": "linear",
      "domain": [
        -19793718,
        19926188
      ],
      "range": "width"
    },
    {
      "name": "y",
      "type": "linear",
      "domain": [
        -8000000,
        8000000
      ],
      "range": "height"
    },
    {
      "name": "polytable1_fillColor",
      "type": "quantize",
      "domain": [
        0,
        5000
      ],
      "range": [
        "#115f9a",
        "#1984c5",
        "#22a7f0",
        "#48b5c4",
        "#76c68f",
        "#a6d75b",
        "#c9e52f",
        "#d0ee11",
        "#d0f400"
      ],
      "default": "green",
      "nullValue": "#CACACA"
    },
    {
      "name": "table1_size",
      "type": "linear",
      "domain": [
        0,
        5000
      ],
      "range": [
        4,
        24
      ],
      "clamp": true
    },
    {
      "name": "table1_fillColor",
      "type": "ordinal",
      "domain": [
        "en",
        "pt",
        "es",
        "in",
        "und",
        "ja",
        "tr",
        "fr",
        "tl",
        "ru",
        "ar"
      ],
      "range": [
        "#27aeef",
        "#ea5545",
        "#87bc45",
        "#b33dc6",
        "#f46a9b",
        "#ede15b",
        "#bdcf32",
        "#ef9b20",
        "#4db6ac",
        "#edbf33",
        "#7c4dff"
      ],
      "default": "#80DEEA",
      "nullValue": "#CACACA"
    },
    {
      "name": "table2_fillColor",
      "type": "ordinal",
      "domain": [
        "D",
        "R"
      ],
      "range": [
        "blue",
        "red"
      ],
      "default": "green",
      "nullValue": "#CACACA"
    }
  ],
  "marks": [
    {
      "type": "polys",
      "from": {
        "data": "polytable1"
      },
      "properties": {
        "x": {
          "scale": "x",
          "field": "x"
        },
        "y": {
          "scale": "y",
          "field": "y"
        },
        "fillColor": {
          "scale": "polytable1_fillColor",
          "field": "avgContrib"
        },
        "strokeColor": "white",
        "strokeWidth": 0,
        "lineJoin": "miter",
        "miterLimit": 10
      }
    },
    {
      "type": "points",
      "from": {
        "data": "table1"
      },
      "properties": {
        "x": {
          "scale": "x",
          "field": "goog_x"
        },
        "y": {
          "scale": "y",
          "field": "goog_y"
        },
        "size": {
          "scale": "table1_size",
          "field": "size"
        },
        "fillColor": {
          "scale": "table1_fillColor",
          "field": "color"
        }
      }
    },
    {
      "type": "points",
      "from": {
        "data": "table2"
      },
      "properties": {
        "x": {
          "scale": "x",
          "field": "merc_x"
        },
        "y": {
          "scale": "y",
          "field": "merc_y"
        },
        "size": 4,
        "fillColor": {
          "scale": "table2_fillColor",
          "field": "color"
        }
      }
    }
  ]
}
  */
}
