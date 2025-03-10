import d3 from "d3"
import * as _ from "lodash"
import { redrawAllAsync, resetRedrawStack } from "../core/core-async"
import { utils } from "../utils/utils"
import { rasterDrawMixin } from "./raster-draw-mixin"
import RulerControl from "@mapbox-controls/ruler"

function valuesOb(obj) {
  return Object.keys(obj).map(key => obj[key])
}

export default function mapMixin(
  _chart,
  chartDivId,
  _mapboxgl,
  mixinDraw = true
) {
  const DEFAULT_ZOOM_LEVEL = 15
  const EASE_DURATION_MS = 1500
  const SMALL_AMOUNT = 0.00001 // Mapbox doesn't like coords being exactly on the edge.
  const LONMAX = 180 - SMALL_AMOUNT
  const LONMIN = -180 + SMALL_AMOUNT
  const LATMAX = 85 - SMALL_AMOUNT
  const LATMIN = -85 + SMALL_AMOUNT
  const MAP_UNITS = {
    METRIC: "metric",
    IMPERIAL: "imperial"
  }

  var _mapboxgl = typeof _mapboxgl === "undefined" ? mapboxgl : _mapboxgl
  let _map = null
  let _mapboxAccessToken = null
  let _lastWidth = null
  let _lastHeight = null
  const _mapId = chartDivId

  _chart._xDimName = null
  _chart._yDimName = null
  _chart._viewBoxDimName = null
  let hasAppliedInitialBounds = false
  let _hasRendered = false
  let _activeLayer = null
  let _mapInitted = false
  let _xDim = null
  let _yDim = null
  let _viewBoxDim = null
  let _lastMapMoveType = null
  let _lastMapUpdateTime = 0
  let _isFirstMoveEvent = true
  let _mapUpdateInterval = 100 // default
  let _mapStyle = "mapbox://styles/mapbox/light-v9"
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

  let _clientClickX = null
  let _clientClickY = null

  const _arr = [
    [LONMIN, LATMIN],
    [LONMAX, LATMAX]
  ]

  const _llb = _mapboxgl.LngLatBounds.convert(_arr)
  let _initialBounds = _llb

  let _geocoder = null
  let _mapUnits = MAP_UNITS.METRIC

  const _minMaxCache = {}
  let _interactionsEnabled = true
  let _shouldRedrawAll = false
  let _forceResize = false
  let _overlayDrawerOpen = false

  _chart.useLonLat = function(useLonLat) {
    if (!arguments.length) {
      return _useLonLat
    }
    _useLonLat = useLonLat
    return _chart
  }
  _chart.map = function() {
    return _map
  }

  let _lonMin = LONMIN
  let _lonMax = LONMAX
  let _latMin = LATMIN
  let _latMax = LATMAX
  _chart.lonMin = function(lonMin) {
    if (lonMin !== undefined) {
      _lonMin = lonMin
    }
    return _lonMin
  }

  _chart.lonMax = function(lonMax) {
    if (lonMax !== undefined) {
      _lonMax = lonMax
    }
    return _lonMax
  }

  _chart.latMin = function(latMin) {
    if (latMin !== undefined) {
      _latMin = latMin
    }
    return _latMin
  }

  _chart.latMax = function(latMax) {
    if (latMax !== undefined) {
      _latMax = latMax
    }
    return _latMax
  }

  _chart.maxBounds = function(bounds) {
    if (bounds !== undefined) {
      _chart.lonMin(bounds[0][0])
      _chart.latMin(bounds[0][1])
      _chart.lonMax(bounds[1][0])
      _chart.latMax(bounds[1][1])
    }
    return _mapboxgl.LngLatBounds.convert([
      [_chart.lonMin(), _chart.latMin()],
      [_chart.lonMax(), _chart.latMax()]
    ])
  }

  _chart.setInitialBounds = function(newBounds) {
    _initialBounds = newBounds
  }

  _chart.setShouldRedrawAll = function(newShouldRedrawAll) {
    _shouldRedrawAll = newShouldRedrawAll
  }

  _chart.forceResize = function(forceResize) {
    if (forceResize !== undefined) {
      _forceResize = forceResize
    }
    return _forceResize
  }

  _chart.overlayDrawerOpen = function(overlayDrawerOpen) {
    if (overlayDrawerOpen !== undefined) {
      _overlayDrawerOpen = overlayDrawerOpen
    }
    return _overlayDrawerOpen
  }

  function makeBoundsArrSafe([[lowerLon, lowerLat], [upperLon, upperLat]]) {
    return [
      [Math.max(LONMIN, lowerLon), Math.max(LATMIN, lowerLat)],
      [Math.min(LONMAX, upperLon), Math.min(LATMAX, upperLat)]
    ]
  }

  _chart.convertBounds = function(arr) {
    if (!_mapboxgl) {
      throw new Error(`Cannot convert bounds: mapboxgl uninitialized.`)
    }
    return _mapboxgl.LngLatBounds.convert(makeBoundsArrSafe(arr))
  }

  _chart.enableInteractions = function(enableInteractions, opts = {}) {
    if (!arguments.length) {
      return _interactionsEnabled
    }

    const mapboxInteractionProps = [
      "scrollZoom",
      "boxZoom",
      "dragPan",
      "keyboard",
      "doubleClickZoom"
    ]
    _interactionsEnabled = Boolean(enableInteractions)

    if (_mapInitted) {
      mapboxInteractionProps.forEach(prop => {
        if (_map[prop]) {
          const enable =
            typeof opts[prop] !== "undefined"
              ? Boolean(opts[prop])
              : _interactionsEnabled
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

  _chart.getDataRenderBounds = function() {
    const bounds = _map.getBounds()

    if (!hasAppliedInitialBounds) {
      _chart.setFilterBounds(bounds)
    }

    let renderBounds = [
      valuesOb(bounds.getNorthWest()),
      valuesOb(bounds.getNorthEast()),
      valuesOb(bounds.getSouthEast()),
      valuesOb(bounds.getSouthWest())
    ]

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

  _chart.xDim = function(xDim) {
    if (!arguments.length) {
      return _xDim
    }
    _xDim = xDim
    if (_xDim) {
      _chart._xDimName = _xDim.value()[0]
    }
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
    return _chart
  }

  _chart.viewBoxDim = function(viewBoxDim) {
    if (!arguments.length) {
      return _viewBoxDim
    }
    _viewBoxDim = viewBoxDim
    if (_viewBoxDim) {
      _chart._viewBoxDimName = _viewBoxDim.value()[0]
    }
    return _chart
  }

  _chart.resetLayer = function() {
    if (typeof _chart._resetRenderBounds === "function") {
      _chart._resetRenderBounds()
    }

    _activeLayer = null
  }

  _chart.colorBy = function(_) {
    if (!arguments.length) {
      return _colorBy
    }
    _colorBy = _
    return _chart
  }

  _chart.mapUpdateInterval = function(mapUpdateInterval) {
    if (!arguments.length) {
      return _mapUpdateInterval
    }
    _mapUpdateInterval = mapUpdateInterval
    return _chart
  }

  _chart.conv900913To4326X = function(x) {
    return x / 111319.490778
  }

  _chart.conv900913To4326Y = function(y) {
    return (
      57.295779513 * (2 * Math.atan(Math.exp(y / 6378136.99911)) - 1.570796327)
    )
  }

  _chart.conv900913To4326 = function(coord) {
    return [
      _chart.conv900913To4326X(coord[0]),
      _chart.conv900913To4326Y(coord[1])
    ]
  }

  _chart.conv4326To900913X = function(x) {
    return x * 111319.490778
  }

  _chart.conv4326To900913Y = function(y) {
    return (
      6378136.99911 * Math.log(Math.tan(0.00872664626 * y + 0.785398163397))
    )
  }

  _chart.conv4326To900913 = function(coord) {
    return [
      _chart.conv4326To900913X(coord[0]),
      _chart.conv4326To900913Y(coord[1])
    ]
  }

  function onLoad(e) {
    if (_geocoder) {
      initGeocoder()
    }
    initMouseLatLonCoordinate()
  }

  // if shiftToZoom is enabled, then we've added an event handler on mouseDown.
  // if we click while holding shift, then enable the zoom/pan handlers. And if not,
  // disable them.
  //
  // and why don't we just do it in the move handler? Because once we've disabled drag, we need
  // a way to re-enable it. Ideally, we'd just stop the event from firing the default actions, but
  // that doesn't seem to handle it. So here we are.
  function onMouseDownCheckForShiftToZoom(e) {
    _map.boxZoom.disable()
    if (!e.originalEvent.shiftKey) {
      _map.scrollZoom.disable()
      _map.dragPan.disable()
    } else {
      _map.scrollZoom.enable()
      _map.dragPan.enable()
    }
  }

  function onMapMove(e) {
    if (
      _chart.shiftToZoom() &&
      ((e.originalEvent && !e.originalEvent.shiftKey) || e.type === "moveend")
    ) {
      _map.scrollZoom.disable()
      _map.dragPan.disable()
      return
    } else {
      _map.dragPan.enable()
      _map.scrollZoom.enable()
    }

    if (
      (e.type === "moveend" && _lastMapMoveType === "moveend") ||
      !_hasRendered ||
      e.skipRedraw
    ) {
      return
    }

    _lastMapMoveType = e.type
    const curTime = new Date().getTime()

    const bounds = _map.getBounds()

    if (!_useLonLat) {
      _chart._minCoord = _chart.conv4326To900913([
        bounds._sw.lng,
        bounds._sw.lat
      ])
      _chart._maxCoord = _chart.conv4326To900913([
        bounds._ne.lng,
        bounds._ne.lat
      ])
    } else {
      _chart._minCoord = [bounds._sw.lng, bounds._sw.lat]
      _chart._maxCoord = [bounds._ne.lng, bounds._ne.lat]
    }

    if (e.type !== "moveend") {
      if (_isFirstMoveEvent) {
        _lastMapUpdateTime = curTime
        _isFirstMoveEvent = false
      }
      if (
        _mapUpdateInterval === Infinity ||
        curTime - _lastMapUpdateTime < _mapUpdateInterval
      ) {
        return
      }
    } else if (e.type === "moveend") {
      _isFirstMoveEvent = true
    }
    _lastMapUpdateTime = curTime

    let redrawall = _shouldRedrawAll
    if (typeof _chart.getLayers === "function") {
      _chart.getLayers().forEach(layer => {
        if (
          typeof layer.xDim === "function" &&
          typeof layer.yDim === "function"
        ) {
          const xdim = layer.xDim()
          const ydim = layer.yDim()
          if (xdim !== null && ydim !== null) {
            redrawall = true
            xdim.filter([_chart._minCoord[0], _chart._maxCoord[0]])
            ydim.filter([_chart._minCoord[1], _chart._maxCoord[1]])
          }
        } else if (
          typeof layer.viewBoxDim === "function" &&
          layer.getState().data.length < 2
        ) {
          // spatial filter on only single data source
          const viewBoxDim = layer.viewBoxDim()
          if (viewBoxDim !== null) {
            redrawall = true
            viewBoxDim.filterST_Min_ST_Max({
              lonMin: bounds._sw.lng,
              lonMax: bounds._ne.lng,
              latMin: bounds._sw.lat,
              latMax: bounds._ne.lat
            })
          }
        }
      })
    }

    // when in doubt, setTimeout
    // defer the redraw calls to the next tick of the event loop, so that the drag handler has woken up and updated the filters.
    // this is a band-aid and should be fixed in the future.
    setTimeout(() => {
      if (_xDim !== null && _yDim !== null) {
        _xDim.filter([_chart._minCoord[0], _chart._maxCoord[0]])
        _yDim.filter([_chart._minCoord[1], _chart._maxCoord[1]])
        // when bbox changes, we send bbox filter change event to the event listener in immerse where we decide whether or not
        // to update other charts bbox filter and their map extent based on their linkedZoomEnabled flag
        redrawAllAsync(_chart.chartGroup()).catch(error => {
          resetRedrawStack()
          console.log("on move event redrawall error:", error)
        })
      } else if (redrawall) {
        // when bbox changes, we send bbox filter change event to the event listener in immerse where we decide whether or not
        // to update other charts bbox filter and their map extent based on their linkedZoomEnabled flag
        redrawAllAsync(_chart.chartGroup()).catch(error => {
          resetRedrawStack()
          console.log("on move event redrawall error:", error)
        })
      } else if (_viewBoxDim !== null && layer.getState().data.length < 2) {
        // spatial filter on only single data source
        _viewBoxDim.filterST_Min_ST_Max({
          lonMin: _chart._minCoord[0],
          lonMax: _chart._maxCoord[0],
          latMin: _chart._minCoord[1],
          latMax: _chart._maxCoord[1]
        })
        // when bbox changes, we send bbox filter change event to the event listener in immerse where we decide whether or not
        // to update other charts bbox filter and their map extent based on their linkedZoomEnabled flag
        redrawAllAsync(_chart.chartGroup()).catch(error => {
          resetRedrawStack()
          console.log("on move event redrawall error:", error)
        })
      } else {
        _chart._projectionFlag = true
        _chart.redrawAsync()
      }
    }, 0)
  }

  // Force the map to display the mapbox logo
  const showMapLogo = () => {
    const logos = document.querySelectorAll(".mapboxgl-ctrl-logo")
    logos.forEach(logo => {
      if (logo.parentElement) {
        logo.parentElement.style.display = "block"
      }
    })
  }

  // Finds rendered layer from the given map style layers
  function getRenderLayer(activeLayer, cb) {
    _map.getStyle().layers.forEach(layer => {
      if (!layer.id.includes(activeLayer)) {
        return
      }

      cb(layer)
    })
  }

  // When mapbox map basemap gets changed, basically changes the style of the map (_map.setStyle(_mapStyle)),
  // the render layer is deleted, so we need to save the render layer source and layer from the old style
  // in savedLayers and savedSource and reapply to the newly styled map in _map.on("style.load", ...)
  let savedLayers = []
  let savedSources = {}

  _chart.mapStyle = function(style) {
    if (!arguments.length) {
      return _mapStyle
    }
    _mapStyle = style
    if (_map) {
      if (!_activeLayer) {
        _activeLayer = "_points"
      }
      const toBeAddedOverlay = "overlay" + _activeLayer

      getRenderLayer(toBeAddedOverlay, layer => {
        if (!savedSources[layer.source]) {
          savedSources[layer.source] = _map.getSource(layer.source).serialize()
          savedLayers.push(layer)
        }
      })

      _map.setStyle(_mapStyle)
      if (typeof _chart.resetLayer !== "undefined") {
        _chart.resetLayer()
      }
    }

    return _chart
  }

  _chart.mapboxToken = function(mapboxToken) {
    if (!arguments.length) {
      return _mapboxAccessToken
    }
    _mapboxAccessToken = mapboxToken
    return _chart
  }

  _chart.center = function(_) {
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

  _chart.zoom = function(_) {
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

  _chart.attribLocation = function(_) {
    if (!arguments.length) {
      return _attribLocation
    }
    _attribLocation = _
    return _chart
  }

  _chart.resetSvg = function() {
    if (_chart.svg()) {
      _chart.svg().remove()
    }
    if (_chart.map()) {
      const mapContainer = d3.select(_chart.map().getCanvasContainer())
      const svg = mapContainer.append("svg").attr("class", "poly-svg")
      svg.attr("width", _chart.width()).attr("height", _chart.height())
      _chart.svg(svg)
    }
  }

  _chart.mapProject = function(input) {
    // keep both methods before now until we can establish performance
    // profiles of each - seem about equally fast at first glance
    if (_chart._reProjMapbox == false) {
      const xDiff = this._maxCoord[0] - this._minCoord[0]
      const yDiff = this._maxCoord[1] - this._minCoord[1]
      var projectedPoint = this.conv4326To900913(input)
      return [
        ((projectedPoint[0] - this._minCoord[0]) / xDiff) * this.width(),
        (1.0 - (projectedPoint[1] - this._minCoord[1]) / yDiff) * this.height()
      ]
    } else {
      var projectedPoint = this.map().project(input)
      return [projectedPoint.x, projectedPoint.y]
    }
  }

  _chart._setOverlay = function({ data, bounds, browser, redraw }) {
    const map = _chart.map()

    const allMapboxCanvasContainer = document.getElementsByClassName(
      "mapboxgl-canvas-container"
    )
    const chartIdFromCanvasContainer = _chart.selectAll(
      ".mapboxgl-canvas-container"
    )[0].parentNode.id

    const chartMapboxCanvasContainer = _.filter(
      allMapboxCanvasContainer,
      mbcc =>
        mbcc.parentNode.id === chartIdFromCanvasContainer ||
        mbcc.parentNode.parentNode.id === chartIdFromCanvasContainer
    )

    const allMapboxCanvas = document.getElementsByClassName("mapboxgl-canvas")
    const chartIdFromCanvas = _chart.selectAll(".mapboxgl-canvas")[0].parentNode
      .id

    const chartMapboxCanvas = _.filter(
      allMapboxCanvas,
      mbc =>
        mbc.parentNode.id === chartIdFromCanvas ||
        mbc.parentNode.parentNode.id === chartIdFromCanvas
    )

    if (chartMapboxCanvasContainer.length > 1) {
      // we use only one canvas for the chart map, thus remove extra
      chartMapboxCanvasContainer[0].remove()
    }
    if (chartMapboxCanvas.length > 1) {
      chartMapboxCanvas[0].remove()
    }

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
      const blob = utils.b64toBlob(data, "image/png")
      var blobUrl = URL.createObjectURL(blob)
    } else {
      var blobUrl = "data:image/png;base64," + data
    }

    function setSourceAndAddLayer(toBeAddedOverlay) {
      const firstSymbolLayerId = getFirstSymbolLayerId()
      map.addSource(toBeAddedOverlay, {
        type: "image",
        url: blobUrl,
        coordinates: boundsToUse
      })
      map.addLayer(
        {
          id: toBeAddedOverlay,
          source: toBeAddedOverlay,
          type: "raster",
          paint: { "raster-opacity": 1, "raster-fade-duration": 0 }
        },
        firstSymbolLayerId
      )
    }

    if (!_activeLayer) {
      _activeLayer = "_points"
      const toBeAddedOverlay = "overlay" + _activeLayer
      if (!map.getSource(toBeAddedOverlay)) {
        setSourceAndAddLayer(toBeAddedOverlay)
      }
    } else {
      const overlayName = "overlay" + _activeLayer
      const imageSrc = map.getSource(overlayName)
      if (imageSrc) {
        imageSrc.updateImage({
          url: blobUrl,
          coordinates: boundsToUse
        })
      } else {
        // for some reason, the source is lost some of the time, so adding it again FE-9833
        setSourceAndAddLayer(overlayName)
      }
    }
  }

  _chart._removeOverlay = function() {
    const map = _chart.map()

    const overlay = "overlay" + _activeLayer
    map.removeLayer(overlay)
    map.removeSource(overlay)
  }

  _chart.isLoaded = function() {
    return _map._loaded && _map.style && _map.style._loaded
  }

  function initMap() {
    if (_mapInitted) {
      return
    }
    _mapboxgl.accessToken = _mapboxAccessToken

    _chart
      .root()
      .style("width", _chart.width() + "px")
      .style("height", _chart.height() + "px")

    _map = new _mapboxgl.Map({
      container: _mapId, // container id
      style: _mapStyle,
      interactive: true,
      center: _center, // starting position
      zoom: _zoom, // starting zoom
      maxBounds: _chart.maxBounds(),
      preserveDrawingBuffer: true,
      attributionControl: false,
      logoPosition: "bottom-right"
    }).fitBounds([_initialBounds._sw, _initialBounds._ne], {
      linear: true,
      duration: 0
    })

    _map.dragRotate.disable()
    _map.touchZoomRotate.disableRotation()

    const rulerControl = new RulerControl({
      linePaint: {
        "line-color": "#999",
        "line-width": 2
      },
      units: _mapUnits === MAP_UNITS.METRIC ? "kilometers" : "miles",
      labelFormat: value => {
        if (_mapUnits === MAP_UNITS.IMPERIAL) {
          return value < 1
            ? `${(value * 5280).toFixed()} ft`
            : `${value.toFixed(2)} mi`
        } else {
          return value < 1
            ? `${(value * 1000).toFixed()} m`
            : `${value.toFixed(2)} km`
        }
      }
    })

    _map.addControl(rulerControl, "bottom-right")

    _chart.root().on("keydown", () => {
      if (d3.event.key === "Escape" || d3.event.key === 27) {
        if (rulerControl?.isActive) {
          rulerControl.deactivate()
        }
      }
    })
    _map.addControl(new _mapboxgl.NavigationControl(), "bottom-right")
    _map.addControl(new _mapboxgl.AttributionControl(), _attribLocation)
    _map.addControl(
      new _mapboxgl.ScaleControl({
        maxWidth: 80,
        unit: _mapUnits ?? MAP_UNITS.METRIC
      }),
      "bottom-right"
    )
    _chart.addMapListeners()
    _mapInitted = true
    _chart.enableInteractions(_interactionsEnabled)
    if (_chart.shiftToZoom()) {
      _map.on("mousedown", onMouseDownCheckForShiftToZoom)
    }
  }

  _chart.addMapListeners = function() {
    _map.on("moveend", onMapMove)
    _map.on("sourcedata", showMapLogo)
    // if we're using shiftToZoom, then add on explicit drag/wheel events.
    // otherwise, do it as we did before with a single "move"
    //
    // we need the separate wheel event so we can hop in and disable it from within the handler
    if (_chart.shiftToZoom()) {
      _map.on("drag", onMapMove)
      _map.on("wheel", onMapMove)
    } else {
      _map.on("move", onMapMove)
    }
  }

  _chart.removeMapListeners = function() {
    _map.off("move", onMapMove)
    _map.off("moveend", onMapMove)
  }

  _chart.on("postRender", () => {
    _hasRendered = true
  })

  _chart.on("preRender", chart => {
    const width = chart.width()
    const height = chart.height()

    if (width !== _lastWidth || height !== _lastHeight || _forceResize) {
      _chart
        .root()
        .select("#" + _mapId + " canvas")
        .attr("width", width)
        .attr("height", height)

      _lastWidth = width
      _lastHeight = height

      // this is a dumb hack, but it works and there doesn't seem to be another sensible way.
      // problem is, mapbox looks to the size of "mapboxgl-canvas-container" to determine the
      // render size of the canvas, regardless of what we feed it above. if there is an overlay
      // drawer open, even if it sits at a higher z-index, the canvas size will be calculated
      // according to the container's visible width. thus, force the canvas container to be the
      // size of the chart (which ignores the overlay), and reset it once mapbox is done resizing
      if (_overlayDrawerOpen) {
        _chart
          .root()
          .select(`#${_mapId} .mapboxgl-canvas-container`)
          .style("width", `${width}px`)
        _map.resize()
        _chart
          .root()
          .select(`#${_mapId} .mapboxgl-canvas-container`)
          .style("width", "auto")
      } else {
        _map.resize()
      }

      if (_forceResize) {
        _forceResize = false
      }
    }
  })

  function getFirstSymbolLayerId() {
    let firstSymbolId = null
    const currentStyle = _map.getStyle()

    // Streets and Outdoors styles are sets of layers thus only need to make the street label layer on top of heavyai layer
    if (
      currentStyle.name === "Mapbox Outdoors" ||
      currentStyle.name === "Mapbox Streets"
    ) {
      firstSymbolId = "road-label-large"
    } else {
      const layers = currentStyle.layers
      for (let i = 0; i < layers.length; ++i) {
        if (layers[i].type === "symbol") {
          firstSymbolId = layers[i].id
          break
        }
      }
    }

    return firstSymbolId
  }

  function getMinMax(value) {
    return _chart
      .crossfilter()
      .groupAll()
      .reduce([
        { expression: value, agg_mode: "min", name: "minimum" },
        { expression: value, agg_mode: "max", name: "maximum" }
      ])
      .valuesAsync(true, true)
      .then(bounds => [bounds.minimum, bounds.maximum])
  }

  function createRangeMinMaxPromises(promises, value) {
    if (!_minMaxCache[value]) {
      return promises.concat(
        getMinMax(value).then(bounds => {
          _minMaxCache[value] = bounds
        })
      )
    } else {
      return promises
    }
  }

  let _fitInitialBounds

  _chart.fitInitialBounds = function(callback) {
    if (!arguments.length) {
      _fitInitialBounds()
    }
    _fitInitialBounds = callback
    return _chart
  }

  function init(_bounds) {
    return Promise.resolve()
  }

  _chart.init = function(bounds) {
    if (_mapInitted) {
      return
    }

    let styleLoaded = false
    let loaded = false

    _mapboxgl.accessToken = _mapboxAccessToken
    if (!_mapboxgl.supported()) {
      throw { name: "WebGL", message: "WebGL Not Enabled" }
    } else {
      initMap()
    }

    return new Promise((resolve, reject) => {
      _map.on("load", e => {
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

      _map.on("styledata", () => {
        // reapplying the previous style's render layer to the new style layer when basemap gets changed
        const firstSymbolLayerId = getFirstSymbolLayerId()

        if (savedLayers.length) {
          Object.entries(savedSources).forEach(([id, source]) => {
            if (!_map.getSource(source) && !_map.getSource(id)) {
              _map.addSource(id, source)
              savedLayers.forEach(layer => {
                _map.addLayer(layer, firstSymbolLayerId)
              })
              savedLayers = []
              savedSources = {}
            }
          })
        }
      })

      _map.on("mousedown", event => {
        _clientClickX = event.point.x
        _clientClickY = event.point.y
      })

      _map.on("mouseup", event => {
        // Make sure that the user is clicking to filter, and not dragging or panning the map
        if (
          _clientClickX === event.point.x &&
          _clientClickY === event.point.y
        ) {
          _chart.getClosestResult(
            event.point,
            result => {
              const data = { rowid: result.row_id[0], ...result.row_set[0] }
              if (data.rowid === -1) {
                return
              }

              _chart.getLayerNames().forEach(layerName => {
                const layer = _chart.getLayer(layerName)
                if (typeof layer.onClick === "function") {
                  layer.onClick(_chart, data, event.originalEvent)
                }
              })
            },
            true
          )
        }
      })
      _map.on("mousemove", e => {
        // Show mouse position (lat and lon) on the map
        const lon = e.lngLat.lng.toFixed(8)
        const lat = e.lngLat.lat.toFixed(8)
        const latLonContainer = _map
          .getContainer()
          .getElementsByClassName("latLonCoordinate")[0]
        if (latLonContainer) {
          latLonContainer.classList.add("visible")
          latLonContainer.innerHTML = `Lon: ${lon} </br> Lat: ${lat}`
        }
      })

      // remove the mouse lat lon container from map when mouse is out
      _map.on("mouseout", e => {
        const latLonContainer = _map
          .getContainer()
          .getElementsByClassName("latLonCoordinate")[0]

        if (latLonContainer) {
          latLonContainer.classList.remove("visible")
        }
      })
    })
  }

  _chart.setFilterBounds = function(bounds) {
    if (!_useLonLat) {
      _chart._minCoord = _chart.conv4326To900913([
        bounds._sw.lng,
        bounds._sw.lat
      ])
      _chart._maxCoord = _chart.conv4326To900913([
        bounds._ne.lng,
        bounds._ne.lat
      ])
    } else {
      _chart._minCoord = [bounds._sw.lng, bounds._sw.lat]
      _chart._maxCoord = [bounds._ne.lng, bounds._ne.lat]
    }

    _chart.getLayers().forEach(layer => {
      if (
        typeof layer.xDim === "function" &&
        typeof layer.yDim === "function"
      ) {
        const xdim = layer.xDim()
        const ydim = layer.yDim()
        if (xdim !== null && ydim !== null) {
          xdim.filter([_chart._minCoord[0], _chart._maxCoord[0]])
          ydim.filter([_chart._minCoord[1], _chart._maxCoord[1]])
        }
      }
    })
  }

  function boundsRoughlyEqual(a, b) {
    return (
      a.getSouthWest().lat === b.getSouthWest().lat ||
      a.getSouthWest().lng === b.getSouthWest().lng ||
      a.getNorthEast().lat === b.getNorthEast().lat ||
      a.getNorthEast().lng === b.getNorthEast().lng
    )
  }

  _chart.geocoder = function(geocoder) {
    if (!arguments.length) {
      return _geocoder
    }
    if (typeof geocoder.locate !== "function") {
      throw new Error("Geocoder must have a location function")
    }
    _geocoder = geocoder
    return _chart
  }

  function initGeocoder() {
    _chart
      .root()
      .append("input")
      .attr("type", "text")
      .attr("placeholder", "Zoom to")
      .classed("geocoder-input", true)
      .style("top", "5px")
      .style("right", "5px")
      .style("float", "right")
      .style("position", "absolute")
      .on("keydown", function() {
        if (d3.event.key === "Enter" || d3.event.keyCode === 13) {
          _geocoder.locate(this.value).then(_chart.zoomToLocation)
        }
      })
  }

  _chart.mapUnits = function(units) {
    if (!arguments.length) {
      return _mapUnits
    }
    _mapUnits = units
    return _mapUnits
  }

  // Mouse position (lat and lon) container
  function initMouseLatLonCoordinate() {
    _chart
      .root()
      .append("div")
      .classed("latLonCoordinate", true)
  }

  function validateBounds(data) {
    const sw = data.bounds.sw
    const ne = data.bounds.ne
    /* eslint-disable operator-linebreak */
    return (
      !isNaN(sw[0]) &&
      !isNaN(ne[0]) &&
      !isNaN(sw[1]) &&
      !isNaN(ne[1]) &&
      sw[0] <= ne[0] &&
      sw[1] <= ne[1] &&
      sw[0] >= LONMIN &&
      sw[0] <= LONMAX &&
      sw[1] >= LATMIN &&
      sw[1] <= LATMAX &&
      ne[0] >= LONMIN &&
      ne[0] <= LONMAX &&
      ne[1] >= LATMIN &&
      ne[1] <= LATMAX
    )
    /* eslint-enable operator-linebreak */
  }

  _chart.zoomToLocation = function(data) {
    if (!_mapInitted) {
      return _chart
    }
    if (data.bounds && data.zoom === undefined) {
      if (validateBounds(data)) {
        _map.fitBounds([data.bounds.sw, data.bounds.ne], {
          linear: true,
          duration: EASE_DURATION_MS,
          maxZoom: data?.maxZoom ?? 22,
          padding: data?.padding ?? 0
        })
      }
    } else {
      _map.setZoom(data.zoom || DEFAULT_ZOOM_LEVEL)
      const center = data.center
      _map.setCenter(center)
    }
    return _chart
  }

  if (mixinDraw) {
    _chart = rasterDrawMixin(_chart)
  }

  return _chart
}
