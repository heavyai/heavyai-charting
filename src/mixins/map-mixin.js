import d3 from "d3"
import {redrawAllAsync, resetRedrawStack} from "../core/core-async"
import {utils} from "../utils/utils"
import {mapDrawMixin} from "./map-draw-mixin"
import {rasterDrawMixin} from "./raster-draw-mixin"

function valuesOb (obj) { return Object.keys(obj).map((key) => obj[key]) }

export default function mapMixin (_chart, chartDivId, _mapboxgl, mixinDraw = true) {
  const DEFAULT_ZOOM_LEVEL = 15
  const EASE_DURATION_MS = 1500
  const SMALL_AMOUNT = 0.00001 // Mapbox doesn't like coords being exactly on the edge.
  const LONMAX = 180 - SMALL_AMOUNT
  const LONMIN = -180 + SMALL_AMOUNT
  const LATMAX = 90 - SMALL_AMOUNT
  const LATMIN = -90 + SMALL_AMOUNT

  var _mapboxgl = typeof _mapboxgl === "undefined" ? mapboxgl : _mapboxgl
  let _map = null
  let _mapboxAccessToken = "pk.eyJ1IjoibWFwZCIsImEiOiJjaWV1a3NqanYwajVsbmdtMDZzc2pneDVpIn0.cJnk8c2AxdNiRNZWtx5A9g"
  let _lastWidth = null
  let _lastHeight = null
  const _mapId = chartDivId

  _chart._xDimName = null
  _chart._yDimName = null
  let hasAppliedInitialBounds = false
  let _hasRendered = false
  let _activeLayer = null
  let _mapInitted = false
  let _xDim = null
  let _yDim = null
  let _lastMapMoveType = null
  let _lastMapUpdateTime = 0
  let _isFirstMoveEvent = true
  let _mapUpdateInterval = 100 // default
  let _mapStyle = "mapbox://styles/mapbox/light-v8"
  let _center = [0, 30]
  let _zoom = 1
  let _attribLocation = "bottom-right"
  const _popupFunction = null
  let _colorBy = null
  const _mouseLeave = false
  let _useLonLat = true
  _chart._minCoord = null
  _chart._maxCoord = null
  _chart._reProjMapbox = true

  const _arr = [[-180, -85], [180, 85]]

  const _llb = _mapboxgl.LngLatBounds.convert(_arr)

  let _geocoder = null

  const _minMaxCache = {}
  let _interactionsEnabled = true

  _chart.useLonLat = function (useLonLat) {
    if (!arguments.length) { return _useLonLat }
    _useLonLat = useLonLat
    return _chart
  }
  _chart.map = function () {
    return _map
  }

  _chart.enableInteractions = function (enableInteractions, opts = {}) {
    if (!arguments.length) {
      return _interactionsEnabled
    }

    const mapboxInteractionProps = ["scrollZoom", "boxZoom", "dragRotate", "dragPan", "keyboard", "doubleClickZoom", "touchZoomRotate"]
    _interactionsEnabled = Boolean(enableInteractions)

    if (_mapInitted) {
      mapboxInteractionProps.forEach(prop => {
        if (_map[prop]) {
          const enable = (typeof opts[prop] !== "undefined" ? Boolean(opts[prop]) : _interactionsEnabled)
          if (enable) {
            _map[prop].enable()
          } else {
            _map[prop].disable()

            if (prop === "dragPan") {
                            // force a clear of the current event state on the map
                            // to fully disable pans
              _map[prop]._onMouseUp({
                button: 0
              })
            }
          }
        }
      })
    }
    return _chart
  }

  _chart.getDataRenderBounds = function () {
    const bounds = _map.getBounds()

    if (!hasAppliedInitialBounds) {
      _chart.setFilterBounds(bounds)
    }

    let renderBounds = [valuesOb(bounds.getNorthWest()),
      valuesOb(bounds.getNorthEast()),
      valuesOb(bounds.getSouthEast()),
      valuesOb(bounds.getSouthWest())]

    if (!_useLonLat) {
      renderBounds = [
        _chart.conv4326To900913(renderBounds[0]),
        _chart.conv4326To900913(renderBounds[1]),
        _chart.conv4326To900913(renderBounds[2]),
        _chart.conv4326To900913(renderBounds[3])
      ]
    }
    hasAppliedInitialBounds = true
    return renderBounds
  }

  _chart.xDim = function (xDim) {
    if (!arguments.length) { return _xDim }
    _xDim = xDim
    if (_xDim) {
      _chart._xDimName = _xDim.value()[0]
    }
    return _chart
  }

  _chart.yDim = function (yDim) {
    if (!arguments.length) { return _yDim }
    _yDim = yDim
    if (_yDim) {
      _chart._yDimName = _yDim.value()[0]
    }
    return _chart
  }

  _chart.resetLayer = function () {
    if (typeof _chart._resetRenderBounds === "function") {
      _chart._resetRenderBounds()
    }

    _activeLayer = null
  }

  _chart.colorBy = function (_) {
    if (!arguments.length) { return _colorBy }
    _colorBy = _
    return _chart
  }

  _chart.mapUpdateInterval = function (mapUpdateInterval) {
    if (!arguments.length) { return _mapUpdateInterval }
    _mapUpdateInterval = mapUpdateInterval
    return _chart
  }

  _chart.conv900913To4326X = function (x) {
    return x / 111319.490778
  }

  _chart.conv900913To4326Y = function (y) {
    return 57.295779513 * (2 * Math.atan(Math.exp(y / 6378136.99911)) - 1.570796327)
  }

  _chart.conv900913To4326 = function (coord) {
    return [_chart.conv900913To4326X(coord[0]), _chart.conv900913To4326Y(coord[1])]
  }

  _chart.conv4326To900913X = function (x) {
    return x * 111319.490778
  }

  _chart.conv4326To900913Y = function (y) {
    return 6378136.99911 * Math.log(Math.tan(0.00872664626 * y + 0.785398163397))
  }

  _chart.conv4326To900913 = function (coord) {
    return [_chart.conv4326To900913X(coord[0]), _chart.conv4326To900913Y(coord[1])]
  }

  function onLoad (e) {
    _map.addControl(new _mapboxgl.AttributionControl(), _attribLocation)

    const mapboxlogo = document.createElement("a")
    mapboxlogo.className = "mapbox-maplogo"
    mapboxlogo.href = "http://mapbox.com/about/maps"
    mapboxlogo.target = "_blank"
    mapboxlogo.innerHTML = "Mapbox"

    _chart.root()[0][0].appendChild(mapboxlogo)

    if (_geocoder) {
      initGeocoder()
    }
  }

  function onMapMove (e) {
    if ((e.type === "moveend" && _lastMapMoveType === "moveend") || !_hasRendered || e.skipRedraw) {
      return
    }

    _lastMapMoveType = e.type
    const curTime = (new Date()).getTime()

    const bounds = _map.getBounds()

    if (!_useLonLat) {
      _chart._minCoord = _chart.conv4326To900913([bounds._sw.lng, bounds._sw.lat])
      _chart._maxCoord = _chart.conv4326To900913([bounds._ne.lng, bounds._ne.lat])
    } else {
      _chart._minCoord = [bounds._sw.lng, bounds._sw.lat]
      _chart._maxCoord = [bounds._ne.lng, bounds._ne.lat]
    }

    if (e.type === "move") {
      if (_isFirstMoveEvent) {
        _lastMapUpdateTime = curTime
        _isFirstMoveEvent = false
      }
      if (_mapUpdateInterval === Infinity || (curTime - _lastMapUpdateTime < _mapUpdateInterval)) {
        return
      }
    } else if (e.type === "moveend") {
      _isFirstMoveEvent = true
    }
    _lastMapUpdateTime = curTime

    let redrawall = false
    if (typeof _chart.getLayers === "function") {

      _chart.getLayers().forEach((layer) => {
        if (typeof layer.xDim === "function" && typeof layer.yDim === "function") {
          const xdim = layer.xDim()
          const ydim = layer.yDim()
          if (xdim !== null && ydim !== null) {
            redrawall = true
            xdim.filter([_chart._minCoord[0], _chart._maxCoord[0]])
            ydim.filter([_chart._minCoord[1], _chart._maxCoord[1]])
          }
        }
      })

    }

    if (_xDim !== null && _yDim !== null) {
      _xDim.filter([_chart._minCoord[0], _chart._maxCoord[0]])
      _yDim.filter([_chart._minCoord[1], _chart._maxCoord[1]])
      redrawAllAsync()
              .catch((error) => {
                resetRedrawStack()
                console.log("on move event redrawall error:", error)
              })
    } else if (redrawall) {
      redrawAllAsync()
              .catch((error) => {
                resetRedrawStack()
                console.log("on move event redrawall error:", error)
              })
    } else {
      _chart._projectionFlag = true
      _chart.redrawAsync()
    }
  }

  _chart.mapStyle = function (style) {
    if (!arguments.length) { return _mapStyle }
    _mapStyle = style
    if (_map) {
      _map.setStyle(_mapStyle)
      if (typeof _chart.resetLayer !== "undefined") { _chart.resetLayer() }
    }

    return _chart
  }

  _chart.mapboxToken = function (mapboxToken) {
    if (!arguments.length) {
      return _mapboxAccessToken
    }
    _mapboxAccessToken = mapboxToken
    return _chart
  }

  _chart.center = function (_) {
    if (!arguments.length) {
      _center = _map.getCenter()
      return _center
    }
    _center = _
    if (_mapInitted) {
      _map.setCenter(_center)
    }
    return _chart
  }

  _chart.zoom = function (_) {
    if (!arguments.length) {
      _zoom = _map.getZoom()
      return _zoom
    }
    _zoom = _
    if (_mapInitted) {
      _map.setZoom(_zoom)
    }
    return _chart
  }

  _chart.attribLocation = function (_) {
    if (!arguments.length) {
      return _attribLocation
    }
    _attribLocation = _
    return _chart
  }

  _chart.resetSvg = function () {
    if (_chart.svg()) { _chart.svg().remove() }
    const mapContainer = d3.select(_chart.map().getCanvasContainer())
    const svg = mapContainer.append("svg").attr("class", "poly-svg")
    svg
            .attr("width", _chart.width())
            .attr("height", _chart.height())
    _chart.svg(svg)
  }

  _chart.mapProject = function (input) {
        // keep both methods before now until we can establish performance
        // profiles of each - seem about equally fast at first glance
    if (_chart._reProjMapbox == false) {
      const xDiff = (this._maxCoord[0] - this._minCoord[0])
      const yDiff = (this._maxCoord[1] - this._minCoord[1])
      var projectedPoint = this.conv4326To900913(input)
      return [(projectedPoint[0] - this._minCoord[0]) / xDiff * this.width(), (1.0 - ((projectedPoint[1] - this._minCoord[1]) / yDiff)) * (this.height())]
    } else {
      var projectedPoint = this.map().project(input)
      return [projectedPoint.x, projectedPoint.y]
    }
  }

  _chart._setOverlay = function (data, bounds, browser, redraw) {
    const map = _chart.map()

    let boundsToUse = bounds
    if (boundsToUse === undefined) {
      return
    } else if (!_useLonLat) {
      boundsToUse = [
        _chart.conv900913To4326(bounds[0]),
        _chart.conv900913To4326(bounds[1]),
        _chart.conv900913To4326(bounds[2]),
        _chart.conv900913To4326(bounds[3])
      ]
    }

    if (browser.isSafari || browser.isIE || browser.isEdge) {
      const blob = utilss.b64toBlob(data, "image/png")
      var blobUrl = URL.createObjectURL(blob)
    } else {
      var blobUrl = "data:image/png;base64," + data
    }

    if (!_activeLayer) {
      _activeLayer = "_points"
      const toBeAddedOverlay = "overlay" + _activeLayer
      map.addSource(toBeAddedOverlay, {
        type: "image",
        url: blobUrl,
        coordinates: boundsToUse
      })
      map.addLayer({
        id: toBeAddedOverlay,
        source: toBeAddedOverlay,
        type: "raster",
        paint: {"raster-opacity": 0.85, "raster-fade-duration": 0}
      })
    } else {
      const overlayName = "overlay" + _activeLayer
      const imageSrc = map.getSource(overlayName)
      imageSrc.updateImage({
        url: blobUrl,
        coordinates: boundsToUse
      })
    }
  }

  _chart._removeOverlay = function () {
    const map = _chart.map()

    const overlay = "overlay" + _activeLayer
    map.removeLayer(overlay)
    map.removeSource(overlay)
  }

  _chart.isLoaded = function () {
    return _map._loaded && _map.style._loaded
  }

  function initMap () {
    if (_mapInitted) { return }
    _mapboxgl.accessToken = _mapboxAccessToken

    _chart.root()
            .style("width", _chart.width() + "px")
            .style("height", _chart.height() + "px")

    _map = new _mapboxgl.Map({
      container: _mapId, // container id
      style: _mapStyle,
      interactive: true,
      center: _center, // starting position
      zoom: _zoom, // starting zoom
      maxBounds: _llb,
      preserveDrawingBuffer: true,
      attributionControl: false
    })

    _map.dragRotate.disable()
    _map.touchZoomRotate.disableRotation()
    _chart.addMapListeners()
    _mapInitted = true
    _chart.enableInteractions(_interactionsEnabled)
  }

  _chart.addMapListeners = function () {
    _map.on("move", onMapMove)
    _map.on("moveend", onMapMove)
  }

  _chart.removeMapListeners = function () {
    _map.off("move", onMapMove)
    _map.off("moveend", onMapMove)
  }

  _chart.on("postRender", () => {
    _hasRendered = true
  })

  _chart.on("preRender", (chart) => {
    const width = chart.width()
    const height = chart.height()

    if (width !== _lastWidth || height !== _lastHeight) {
      _chart.root().select("#" + _mapId + " canvas")
              .attr("width", width)
              .attr("height", height)

      _lastWidth = width
      _lastHeight = height
      _map.resize()
    }
  })


  function getMinMax (value) {
    return _chart.crossfilter().groupAll().reduce([
        {expression: value, agg_mode: "min", name: "minimum"},
        {expression: value, agg_mode: "max", name: "maximum"}
    ]).valuesAsync(true, true)
        .then((bounds) => [
          bounds.minimum,
          bounds.maximum
        ])
  }

  function createRangeMinMaxPromises (promises, value) {
    if (!_minMaxCache[value]) {
      return promises.concat(
                getMinMax(value).then((bounds) => {
                  _minMaxCache[value] = bounds
                })
            )
    } else {
      return promises
    }
  }

  let _fitInitialBounds

  _chart.fitInitialBounds = function (callback) {
    if (!arguments.length) {
      _fitInitialBounds()
    }
    _fitInitialBounds = callback
    return _chart
  }

  function init (_bounds) {
    return Promise.resolve()
  }

  _chart.init = function (bounds) {
    if (_mapInitted) { return }

    let styleLoaded = false
    let loaded = false

    initMap()

    return new Promise((resolve, reject) => {
      _map.on("load", (e) => {
        onLoad(e)
        loaded = true
        if (styleLoaded) {
          init(bounds).then(() => {
            resolve(_chart)
          })
        }
      })

      _map.on("style.load", () => {
        styleLoaded = true
        if (loaded) {
          init(bounds).then(() => {
            resolve(_chart)
          })
        }
      })
    })
  }

  _chart.setFilterBounds = function (bounds) {
    if (!_useLonLat) {
      _chart._minCoord = _chart.conv4326To900913([bounds._sw.lng, bounds._sw.lat])
      _chart._maxCoord = _chart.conv4326To900913([bounds._ne.lng, bounds._ne.lat])
    } else {
      _chart._minCoord = [bounds._sw.lng, bounds._sw.lat]
      _chart._maxCoord = [bounds._ne.lng, bounds._ne.lat]
    }

    _chart.getLayers().forEach((layer) => {
      if (typeof layer.xDim === "function" && typeof layer.yDim === "function") {
        const xdim = layer.xDim()
        const ydim = layer.yDim()
        if (xdim !== null && ydim !== null) {
          xdim.filter([_chart._minCoord[0], _chart._maxCoord[0]])
          ydim.filter([_chart._minCoord[1], _chart._maxCoord[1]])
        }
      }
    })
  }

  function boundsRoughlyEqual (a, b) {
    return (
        a.getSouthWest().lat === b.getSouthWest().lat || a.getSouthWest().lng === b.getSouthWest().lng || a.getNorthEast().lat === b.getNorthEast().lat || a.getNorthEast().lng === b.getNorthEast().lng
    )
  }

  _chart.geocoder = function (geocoder) {
    if (!arguments.length) {
      return _geocoder
    }
    if (typeof geocoder.locate !== "function") {
      throw new Error("Geocoder must have a location function")
    }
    _geocoder = geocoder
    return _chart
  }

  function initGeocoder () {
    _chart.root()
            .append("input")
            .attr("type", "text")
            .attr("placeholder", "Zoom to")
            .classed("geocoder-input", true)
            .style("top", "5px")
            .style("right", "5px")
            .style("float", "right")
            .style("position", "absolute")
            .on("keydown", function () {
              if (d3.event.key === "Enter" || d3.event.keyCode === 13) {
                _geocoder
                        .locate(this.value)
                        .then(zoomToLocation)
              }
            })
  }

  function zoomToLocation (data) {
    if (data.bounds) {
      const sw = data.bounds.sw
      const ne = data.bounds.ne
      _map.fitBounds([sw, ne], {
        linear: true,
        duration: EASE_DURATION_MS
      })
    } else {
      const center = data.center
      _map.setCenter(center)
      _map.setZoom(DEFAULT_ZOOM_LEVEL)
    }
  }

  if (mixinDraw) {
    _chart = rasterDrawMixin(_chart)
  }

  return _chart
}
