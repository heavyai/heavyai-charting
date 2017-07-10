import rasterMixin from "../mixins/raster-mixin"
import mapMixin from "../mixins/map-mixin"
import colorMixin from "../mixins/color-mixin"
import capMixin from "../mixins/cap-mixin"
import baseMixin from "../mixins/base-mixin"

/* istanbul ignore next */
export default function polyRasterChart (parent, useMap, chartGroup, _mapboxgl) {

  console.warn("The polyRasterChart is deprecated and will be removed in a coming release. Please use the rasterChart instead")

  const chart = rasterMixin(mapMixin(colorMixin(capMixin(baseMixin({}))), parent.attributes.id.value, _mapboxgl, false))
  const layer = {isActive: false, name: "overlay_polygons"}
  let renderBoundsMap = {}
  const hasBeenRendered = false

  let _usePixelRatio = false
  let _pixelRatio = 1

  chart.opacity = createGetterSetter(chart, 0.85)

  chart.borderColor = createGetterSetter(chart, "white")

  chart.borderWidth = createGetterSetter(chart, 0.5)

  chart.polyJoin = createGetterSetter(chart, {table: "states", keysColumn: "STATE_ABBR"}, polyJoinValidator)

  // TODO(croot): pixel ratio should probably be configured on the backend
  // rather than here to deal with scenarios where data is used directly
  // in pixel-space.
  chart.usePixelRatio = function (usePixelRatio) {
    if (!arguments.length) {
      return _usePixelRatio
    }

    _usePixelRatio = Boolean(usePixelRatio)
    if (_usePixelRatio) {
      _pixelRatio = window.devicePixelRatio || 1
    } else {
      _pixelRatio = 1
    }

    return chart
  }

  chart._getPixelRatio = function () {
    return _pixelRatio
  }


  chart.resetLayer = function () {
    renderBoundsMap = {}
    layer.isActive = false
  }

  chart.setDataAsync((group, callback) => {
    const bounds = chart.map().getBounds()
    const renderBounds = [
      valuesOb(bounds.getNorthWest()),
      valuesOb(bounds.getNorthEast()),
      valuesOb(bounds.getSouthEast()),
      valuesOb(bounds.getSouthWest())
    ]

    let sql
    if (group.type === "dimension") {
      sql = group.writeTopQuery(chart.cap(), 0, true)
    } else {
      sql = group.writeTopQuery(chart.cap(), 0, false, true)
    }
    chart._resetVegaSpec()

    genPolyVegaSpec(
      sql,
      chart._vegaSpec,
      renderBounds.map(chart.conv4326To900913),
      chart.colors(),
      chart.polyJoin(),
      {strokeColor: chart.borderColor(), strokeWidth: chart.borderWidth() * _pixelRatio}
    )
    const nonce = chart.con().renderVega(1, JSON.stringify(chart._vegaSpec), {}, callback)
    renderBoundsMap[nonce] = renderBounds
  })

  chart._doRenderAsync = function () {
    chart.dataAsync((error, data) => {
      if (Object.keys(data).length && chart.map()._loaded) {
        setOverlay(data.image, renderBoundsMap[data.nonce], chart.map(), layer, chart.opacity())
      }
    })
  }

  chart._doRender = chart._doRenderAsync

  chart._doRedraw = chart._doRender

  return chart.anchor(parent, chartGroup)
}

/* istanbul ignore next */
function genPolyVegaSpec (sqlstr, vegaSpec, mapBoundsMerc, color, polyJoin, stroke) {
  const xDomain = [mapBoundsMerc[0][0], mapBoundsMerc[2][0]] // northwest x, southeast x
  const yDomain = [mapBoundsMerc[2][1], mapBoundsMerc[0][1]] // southeast y, northwest y
  const xScale = {name: "x", type: "linear", domain: xDomain, range: "width"}
  const yScale = {name: "y", type: "linear", domain: yDomain, range: "height"}
  const colorScale = {name: "color", type: "linear", domain: color.domain(), range: color.range()}
  vegaSpec.scales = [xScale, yScale, colorScale]
  vegaSpec.marks = [{
    type: "polys",
    from: {data: "table"},
    properties: Object.assign({
      x: {scale: "x", field: "x"},
      y: {scale: "y", field: "y"},
      fillColor: {scale: "color", field: "val"}
    }, stroke.strokeColor && stroke.strokeWidth ? stroke : {})
  }]
  vegaSpec.data = [{
    name: "table",
    format: "polys",
    sql: sqlstr,
    dbTableName: polyJoin.table,
    polysKey: polyJoin.keysColumn,
    shapeColGroup: "mapd"
  }]
}

/* istanbul ignore next */
function setOverlay (data, bounds, map, layer, opacity) {
  if (typeof data === "undefined") { throw new Error("Data is undefined") }
  const browser = detectBrowser()
  const blobUrl = browser.isSafari || browser.isIE || browser.isEdge ? URL.createObjectURL(b64toBlob(data, "image/png")) : "data:image/png;base64," + data
  if (layer.isActive) {
    const imageSrc = map.getSource(layer.name)
    imageSrc.updateImage({
      url: blobUrl,
      coordinates: bounds
    })
  } else {
    layer.isActive = true
    map.addSource(layer.name, {
      type: "image",
      url: blobUrl,
      coordinates: bounds
    })
    map.addLayer({
      id: layer.name,
      source: layer.name,
      type: "raster",
      paint: {"raster-opacity": opacity, "raster-fade-duration": 0}
    })
  }
}

/* istanbul ignore next */
function detectBrowser () { // from SO: http://bit.ly/1Wd156O
  const isOpera = (Boolean(window.opr) && Boolean(opr.addons)) || Boolean(window.opera) || navigator.userAgent.indexOf(" OPR/") >= 0
  const isFirefox = typeof InstallTrigger !== "undefined"
  const isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf("Constructor") > 0
  const isIE = /* @cc_on!@*/false || Boolean(document.documentMode)
  const isEdge = !isIE && Boolean(window.StyleMedia)
  const isChrome = Boolean(window.chrome) && Boolean(window.chrome.webstore)
  return {isOpera, isFirefox, isSafari, isIE, isEdge, isChrome}
}

/* istanbul ignore next */
function b64toBlob (b64Data, contentType, sliceSize) {
  contentType = contentType || ""
  sliceSize = sliceSize || 512
  const byteCharacters = atob(b64Data)
  const byteArrays = []
  for (let offset = 0; offset < byteCharacters.length; offset = offset + sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize)
    const byteNumbers = new Array(slice.length)
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    byteArrays.push(byteArray)
  }
  return new Blob(byteArrays, {type: contentType})
}

/* istanbul ignore next */
function valuesOb (obj) { return Object.keys(obj).map((key) => obj[key]) }

/* istanbul ignore next */
function createGetterSetter (chainableObject, oldVal, validator) {
  validator = validator || identity
  return function (newVal) {
    oldVal = newVal ? validator(newVal) : oldVal
    return newVal ? chainableObject : oldVal
  }
}

/* istanbul ignore next */
function identity (x) { return x }

/* istanbul ignore next */
function polyJoinValidator (newPolyJoin) {
  if (typeof newPolyJoin.table === "string" && typeof newPolyJoin.keysColumn === "string") {
    return newPolyJoin
  } else {
    throw new Error(".polyJoin takes {table: STRING, keysColumn: STRING}.")
  }
}
