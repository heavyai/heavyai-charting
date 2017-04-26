import baseMixin from "../mixins/base-mixin"
import capMixin from "../mixins/cap-mixin"
import colorMixin from "../mixins/color-mixin"
import coordinateGridRasterMixin from "../mixins/coordinate-grid-raster-mixin"
import d3 from "d3"
import {lastFilteredSize} from "../core/core-async"
import mapMixin from "../mixins/map-mixin"
import rasterMixin from "../mixins/raster-mixin"
import scatterMixin from "../mixins/scatter-mixin"
import legend from "../chart-addons/legend"
import {utils} from "../utils/utils"

export default function bubbleRasterChart (parent, useMap, chartGroup, _mapboxgl) {
  let _chart = null

  const _useMap = useMap !== undefined ? useMap : false

  const parentDivId = parent.attributes.id.value

  const browser = detectBrowser()
  function detectBrowser () { // from SO: http://bit.ly/1Wd156O
    const isOpera = (Boolean(window.opr) && Boolean(opr.addons)) || Boolean(window.opera) || navigator.userAgent.indexOf(" OPR/") >= 0
    const isFirefox = typeof InstallTrigger !== "undefined"
    const isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf("Constructor") > 0
    const isIE = /* @cc_on!@*/false || Boolean(document.documentMode)
    const isEdge = !isIE && Boolean(window.StyleMedia)
    const isChrome = Boolean(window.chrome) && Boolean(window.chrome.webstore)
    return {isOpera, isFirefox, isSafari, isIE, isEdge, isChrome}
  }

  if (_useMap) {
    _chart = rasterMixin(mapMixin(colorMixin(capMixin(baseMixin({}))), parentDivId, _mapboxgl, true, false))
  } else {
    _chart = rasterMixin(scatterMixin(capMixin(coordinateGridRasterMixin({}, _mapboxgl, browser)), _mapboxgl, true), parentDivId, chartGroup)
  }

  const _imageOverlay = null
  let _x = null
  let _y = null
  let _defaultColor = "#22A7F0"
  let _nullColor = "#cacaca" // almost background grey
  let _renderBoundsMap = {}
  let _r = 1 // default radius 5
  let _dynamicR = null
  let _hasBeenRendered = false
  const counter = 0

  let _usePixelRatio = false
  let _pixelRatio = 1

  _chart.x = function (x) {
    if (!arguments.length) {
      return _x
    }
    _x = x
    return _chart
  }

  _chart.y = function (_) {
    if (!arguments.length) {
      return _y
    }
    _y = _
    return _chart
  }

  _chart.r = function (_) {
    if (!arguments.length) {
      return _r
    }
    _r = _
    return _chart
  }

  _chart.dynamicR = function (_) {
    if (!arguments.length) {
      return _dynamicR
    }
    _dynamicR = _
    return _chart
  }

  _chart.defaultColor = function (_) {
    if (!arguments.length) {
      return _defaultColor
    }
    _defaultColor = _
    return _chart
  }

  _chart.nullColor = function (_) {
    if (!arguments.length) {
      return _nullColor
    }
    _nullColor = _
    return _chart
  }

  _chart._resetRenderBounds = function () {
    _renderBoundsMap = {}
  }

  _chart.destroyChart = function () {
    this.sampling(false)
    this.xDim().dispose()
    this.yDim().dispose()
    this.map().remove()
    if (this.legend()) {
      this.legend().removeLegend()
    }
  }

    // TODO(croot): pixel ratio should probably be configured on the backend
    // rather than here to deal with scenarios where data is used directly
    // in pixel-space.
  _chart.usePixelRatio = function (usePixelRatio) {
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

  _chart._getPixelRatio = function () {
    return _pixelRatio
  }

  _chart.colors("#22A7F0") // set constant as picton blue as default

  function getXYRange () {
    if (_useMap) { return Promise.resolve() }
    return Promise.all([
      _chart.getMinMax(_chart.xDim().value()[0]),
      _chart.getMinMax(_chart.yDim().value()[0])
    ]).then((values) => {
      _chart.filter([values[0], values[1]])
      return [values[0], values[1]]
    })
  }

  function basicColorAccessor (d) {
    return (d || d === 0) ? d.color || d.val || d : null
  }

  function customColorAccessor (d) {
    return _chart.colorDomain().includes(String(d[key0])) ? d.key0 : "Default"
  }

  function getMinMaxOrTopColors (color) {
    if (utils.isQuantitative(color.type)) {
      return _chart.getMinMax(color.value)
    } else if (utils.isOrdinal(color.type)) {
      return _chart.getTopValues(color.value)
    } else {
      return Promise.resolve()
    }
  }

  function getColorData () {
    if (_chart.colorBy() && !_chart.colorBy().domain) {
      return getMinMaxOrTopColors(_chart.colorBy()).then((bounds) => {

        const scale = d3.scale.ordinal().domain(bounds).range(["#ea5545", "#bdcf32", "#b33dc6", "#ef9b20", "#87bc45", "#f46a9b", "#ace5c7", "#ede15b", "#836dc5", "#86d87f", "#27aeef"])
        _chart.colors(scale).colorAccessor(customColorAccessor)

        _chart.colorBy(Object.assign({}, _chart.colorBy(), {
          domain: bounds
        }))

        _chart
                   .legend(legend())
                   .legend()
                   .setKey("key0")


        return bounds
      })
    } else {
      return Promise.resolve()
    }
  }

  function getSizeData () {
    if (_chart.sizeBy() && !_chart.sizeBy().domain) {
      return _chart.getMinMax(_chart.sizeBy().value).then((bounds) => {
        const DEFAULT_SIZE_RANGE = [3, 10]
        _chart.sizeBy(Object.assign({}, _chart.sizeBy(), {
          domain: bounds
        }))
        _chart.r(d3.scale.linear().domain(bounds).range(DEFAULT_SIZE_RANGE))
        return bounds
      })
    } else {
      return Promise.resolve()
    }
  }

  function preData () {
    return Promise.all([
      getXYRange(),
      getColorData(),
      getSizeData()
    ]).then((values) => {
      if (typeof values[0] === "undefined" && typeof values[1] === "undefined" && typeof values[2] === "undefined") {
        return
      }

      _chart._invokePreDataListener({
        range: values[0],
        color: values[1],
        size: values[2]
      })
    })
  }

  _chart.setDataAsync((group, callbacks) => preData().then(() => {
    const bounds = _chart.getDataRenderBounds()
    _chart._updateXAndYScales(bounds)

    let sql
    if (group.type === "dimension") {
      sql = group.writeTopQuery(_chart.cap(), undefined, true)
    } else {
      sql = group.writeTopQuery(_chart.cap(), undefined, false, true)
    }

    _chart._vegaSpec = genVegaSpec(_chart, sql, lastFilteredSize(group.getCrossfilterId()))
    const nonce = _chart.con().renderVega(_chart.__dcFlag__, JSON.stringify(_chart._vegaSpec), {}, callbacks)

    _renderBoundsMap[nonce] = bounds
  }))

  _chart.data((group) => {

    if (_chart.dataCache !== null) {
      return _chart.dataCache
    }

    const bounds = _chart.getDataRenderBounds()
    _chart._updateXAndYScales(bounds)

    let sql
    if (group.type === "dimension") {
      sql = group.writeTopQuery(_chart.cap(), undefined, true)
    } else {
      sql = group.writeTopQuery(_chart.cap(), undefined, false, true)
    }

    _chart._vegaSpec = genVegaSpec(_chart, sql, lastFilteredSize(group.getCrossfilterId()))

    const result = _chart.con().renderVega(_chart.__dcFlag__, JSON.stringify(_chart._vegaSpec), {})

    _renderBoundsMap[result.nonce] = bounds
    return result
  })

  _chart._updateXAndYScales = function (renderBounds) {
        // renderBounds should be in this order - top left, top-right, bottom-right, bottom-left
    const useRenderBounds = (renderBounds && renderBounds.length === 4 && renderBounds[0] instanceof Array && renderBounds[0].length === 2)

    if (_chart.xDim() !== null && _chart.yDim() !== null) {
      if (_x === null) {
        _x = d3.scale.linear()
      }
      let xRange = _chart.xDim().getFilter()
      if (useRenderBounds) {
        if (typeof _chart.useLonLat === "function" && _chart.useLonLat()) {
          _x.domain([_chart.conv4326To900913X(renderBounds[0][0]), _chart.conv4326To900913X(renderBounds[1][0])])
        } else {
          _x.domain([renderBounds[0][0], renderBounds[1][0]])
        }

      } else if (xRange !== null) {
        xRange = xRange[0] // First element of range because range filter can theoretically support multiple ranges
        if (typeof _chart.useLonLat === "function" && _chart.useLonLat()) {
          _x.domain([_chart.conv4326To900913X(xRange[0]), _chart.conv4326To900913X(xRange[1])])
        } else {
          _x.domain(xRange)
        }
      } else {
        _x.domain([0.001, 0.999])
      }

      if (_y === null) {
        _y = d3.scale.linear()
      }
      let yRange = _chart.yDim().getFilter()
      if (useRenderBounds) {
        if (typeof _chart.useLonLat === "function" && _chart.useLonLat()) {
          _y.domain([_chart.conv4326To900913Y(renderBounds[2][1]), _chart.conv4326To900913Y(renderBounds[0][1])])
        } else {
          _y.domain([renderBounds[2][1], renderBounds[0][1]])
        }
      } else if (yRange !== null) {
        yRange = yRange[0] // First element of range because range filter can theoretically support multiple ranges
        if (typeof _chart.useLonLat === "function" && _chart.useLonLat()) {
          _y.domain([_chart.conv4326To900913Y(yRange[0]), _chart.conv4326To900913Y(yRange[1])])
        } else {
          _y.domain(yRange)
        }
      } else {
        _y.domain([0.001, 0.999])
      }
    }
  }

  function removeOverlay (overlay) {
    _chart._removeOverlay(overlay)
  }

  _chart._doRender = function (data, redraw, doNotForceData) {
    if (!data && Boolean(!doNotForceData)) { data = _chart.data() }

    if (_chart.isLoaded()) {
      if (Object.keys(data).length) {
        _chart._setOverlay(data.image, _renderBoundsMap[data.nonce], data.nonce, browser, Boolean(redraw))
        _hasBeenRendered = true
      } else {
        _chart._setOverlay(null, null, null, browser, Boolean(redraw))
      }
    }
  }

  _chart._doRedraw = function () {
    _chart._doRender(null, true)
  }

  return _chart.anchor(parent, chartGroup)
}

function genVegaSpec (chart, sqlstr, lastFilteredSize) {
  const pixelRatio = chart._getPixelRatio()
  const width = (typeof chart.effectiveWidth === "function" ? chart.effectiveWidth() : chart.width()) * pixelRatio
  const height = (typeof chart.effectiveHeight === "function" ? chart.effectiveHeight() : chart.height()) * pixelRatio
  const vegaSpec = {
    data: [{
      name: "table",
      sql: sqlstr
    }],
    height: Math.round(height),
    marks: [{
      type: "points",
      from: {data: "table"},
      properties: {
        x: {scale: "x", field: "x"},
        y: {scale: "y", field: "y"}
      }
    }],
    scales: [
      {name: "x", type: chart._determineScaleType(chart.x()), domain: chart.x().domain(), range: "width"},
      {name: "y", type: chart._determineScaleType(chart.y()), domain: chart.y().domain(), range: "height"}
    ],
    width: Math.round(width)
  }

  if (chart.tableName()) { vegaSpec.data[0].dbTableName = chart.tableName() }

  if (chart.colors().domain && chart.colors().domain().length && chart.colors().range().length) {
    vegaSpec.scales.push({name: "color", type: chart._determineScaleType(chart.colors()), domain: chart.colors().domain().filter(notNull), range: chart.colors().range(), default: chart.defaultColor(), nullValue: chart.nullColor()})
    vegaSpec.marks[0].properties.fillColor = {scale: "color", field: "color"}
  } else {
    vegaSpec.marks[0].properties.fillColor = {value: chart.colors()() || chart.defaultColor()}
  }

  if (typeof chart.r() === "function") {
    const rscale = chart.r()
    let scaleRange = rscale.range()
    if (pixelRatio !== 1) {
      scaleRange = scaleRange.map((rangeVal) => rangeVal * pixelRatio)
    }
    vegaSpec.scales.push({name: "size", type: chart._determineScaleType(chart.r()), domain: chart.r().domain(), range: scaleRange, clamp: true})
    vegaSpec.marks[0].properties.size = {scale: "size", field: "size"}
  } else if (chart.dynamicR() !== null && chart.sampling() && typeof lastFilteredSize !== "undefined" && lastFilteredSize !== null) { // @TODO don't tie this to sampling - meaning having a dynamicR will also require count to be computed first by dc
    const rangeCap = chart.cap() !== Infinity ? chart.cap() : lastFilteredSize
    const dynamicRange = Math.min(lastFilteredSize, rangeCap) < 1500000 ? chart.dynamicR().range : [1, 1]
    const dynamicRScale = d3.scale.sqrt().domain(chart.dynamicR().domain).range(dynamicRange).clamp(true)
    vegaSpec.marks[0].properties.size = {value: Math.round(dynamicRScale(Math.min(lastFilteredSize, rangeCap)) * pixelRatio)}
  } else {
    const rval = chart.r() * pixelRatio
    vegaSpec.marks[0].properties.size = {value: rval}
  }

  return vegaSpec
}

function notNull (value) { return value != null /* double-equals also catches undefined */ }
