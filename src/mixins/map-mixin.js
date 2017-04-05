import d3 from "d3"
import {redrawAllAsync, resetRedrawStack} from "../core/core-async"
import {utils} from "../utils/utils"
import {mapDrawMixin} from "./map-draw-mixin"
import {rasterDrawMixin} from "./raster-draw-mixin"

function valuesOb (obj) { return Object.keys(obj).map(function (key) { return obj[key]; }) }

export default function mapMixin (_chart, chartDivId, _mapboxgl, mixinDraw = true, useMapboxDraw = true) {
    var DEFAULT_ZOOM_LEVEL = 15
    var EASE_DURATION_MS = 1500
    var SMALL_AMOUNT = 0.00001 // Mapbox doesn't like coords being exactly on the edge.
    var LONMAX = 90 - SMALL_AMOUNT
    var LONMIN = -90 + SMALL_AMOUNT
    var LATMAX = 90 - SMALL_AMOUNT
    var LATMIN = -90 + SMALL_AMOUNT

    var _mapboxgl = typeof _mapboxgl === 'undefined' ? mapboxgl : _mapboxgl
    var _map = null;
    var _mapboxAccessToken = 'pk.eyJ1IjoibWFwZCIsImEiOiJjaWV1a3NqanYwajVsbmdtMDZzc2pneDVpIn0.cJnk8c2AxdNiRNZWtx5A9g';
    var _lastWidth = null;
    var _lastHeight = null;
    var _mapId = chartDivId;

    _chart._xDimName = null;
    _chart._yDimName = null;
    var hasAppliedInitialBounds = false;
    var initialBounds = null;
    var _hasRendered = false;
    var _activeLayer = null;
    var _mapInitted = false;
    var _xDim = null;
    var _yDim = null;
    var _lastMapMoveType = null;
    var _lastMapUpdateTime = 0;
    var _isFirstMoveEvent = true;
    var _mapUpdateInterval = 100; //default
    var _mapStyle = 'mapbox://styles/mapbox/light-v8';
    var _center = [0,30];
    var _zoom = 1;
    var _popupFunction = null;
    var _colorBy = null;
    var _mouseLeave = false;
    var _useLonLat = true;
    _chart._minCoord = null;
    _chart._maxCoord = null;
    _chart._reProjMapbox = true;

    var _arr = [[-180, -85], [180, 85]];

    var _llb = _mapboxgl.LngLatBounds.convert(_arr);

    var _geocoder = null

    var _minMaxCache = {}
    var _interactionsEnabled = true

    _chart.useLonLat = function(useLonLat) {
       if (!arguments.length)
          return _useLonLat;
       _useLonLat = useLonLat;
       return _chart;
    }
    _chart.map = function() {
        return _map;
    }

    _chart.enableInteractions = function(enableInteractions, opts = {}) {
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

    _chart.getDataRenderBounds = function() {
        var bounds = hasAppliedInitialBounds || !initialBounds ?  _map.getBounds() : initialBounds;

        var renderBounds = [valuesOb(bounds.getNorthWest()),
                            valuesOb(bounds.getNorthEast()),
                            valuesOb(bounds.getSouthEast()),
                            valuesOb(bounds.getSouthWest())]

        if (!_useLonLat) {
            renderBounds = [
                _chart.conv4326To900913(renderBounds[0]),
                _chart.conv4326To900913(renderBounds[1]),
                _chart.conv4326To900913(renderBounds[2]),
                _chart.conv4326To900913(renderBounds[3])
            ];
        }
        hasAppliedInitialBounds = true
        return renderBounds;
    }

    _chart.xDim = function(xDim) {
        if (!arguments.length)
            return _xDim;
        _xDim = xDim;
        if(_xDim){
          _chart._xDimName = _xDim.value()[0];
        }
        return _chart;
    }

    _chart.yDim = function(yDim) {
        if (!arguments.length)
            return _yDim;
        _yDim = yDim;
        if(_yDim){
          _chart._yDimName = _yDim.value()[0];
        }
        return _chart;
    }

    _chart.resetLayer = function() {
        if (typeof _chart._resetRenderBounds === 'function') {
            _chart._resetRenderBounds();
        }

        _activeLayer = null;
    }

    _chart.colorBy = function(_) {
        if (!arguments.length)
            return _colorBy;
        _colorBy = _;
        return _chart;
    }

    _chart.mapUpdateInterval = function (mapUpdateInterval) {
        if (!arguments.length)
            return _mapUpdateInterval;
        _mapUpdateInterval = mapUpdateInterval;
        return _chart;
    }

    _chart.conv900913To4326X = function (x) {
       return x / 111319.490778;
    }

    _chart.conv900913To4326Y = function (y) {
        return 57.295779513 * (2 * Math.atan(Math.exp(y / 6378136.99911)) - 1.570796327);
    }

   _chart.conv900913To4326 = function (coord) {
      return [_chart.conv900913To4326X(coord[0]), _chart.conv900913To4326Y(coord[1])];
    }

    _chart.conv4326To900913X = function (x) {
       return x * 111319.490778;
    }

    _chart.conv4326To900913Y = function (y) {
       return 6378136.99911 * Math.log(Math.tan(.00872664626 * y + .785398163397));
    }

   _chart.conv4326To900913 = function (coord) {
      return [_chart.conv4326To900913X(coord[0]), _chart.conv4326To900913Y(coord[1])];
    }

    function onLoad(e){
      _map.addControl(new _mapboxgl.AttributionControl());

      var mapboxlogo = document.createElement('a');
        mapboxlogo.className = 'mapbox-maplogo';
        mapboxlogo.href = 'http://mapbox.com/about/maps';
        mapboxlogo.target = '_blank';
        mapboxlogo.innerHTML = 'Mapbox';

      _chart.root()[0][0].appendChild(mapboxlogo);

      if (_geocoder) {
          initGeocoder()
      }
    }

    function onMapMove(e) {
        if ((e.type === 'moveend' && _lastMapMoveType === 'moveend') || !_hasRendered || e.skipRedraw) {
          return;
        }

        _lastMapMoveType = e.type;
        var curTime = (new Date).getTime();

        var bounds = _map.getBounds();

        if (!_useLonLat) {
           _chart._minCoord = _chart.conv4326To900913([bounds._sw.lng, bounds._sw.lat]);
           _chart._maxCoord = _chart.conv4326To900913([bounds._ne.lng, bounds._ne.lat]);
        } else {
           _chart._minCoord = [bounds._sw.lng, bounds._sw.lat];
           _chart._maxCoord = [bounds._ne.lng, bounds._ne.lat];
        }

        if (e.type === 'move') {
            if (_isFirstMoveEvent) {
                _lastMapUpdateTime = curTime;
                _isFirstMoveEvent = false;
            }
            if (_mapUpdateInterval === Infinity || (curTime - _lastMapUpdateTime < _mapUpdateInterval)) {
                return;
            }
        }
        else if (e.type === 'moveend') {
            _isFirstMoveEvent = true;
        }
        _lastMapUpdateTime = curTime;

        var redrawall = false;
        if (typeof _chart.getLayers === "function") {
            _chart.getLayers().forEach(function(layer) {
                if (typeof layer.xDim === "function" &&
                    typeof layer.yDim === "function") {
                    var xdim = layer.xDim();
                    var ydim = layer.yDim();
                    if (xdim !== null && ydim !== null) {
                        redrawall = true;
                        xdim.filter([_chart._minCoord[0],_chart._maxCoord[0]]);
                        ydim.filter([_chart._minCoord[1],_chart._maxCoord[1]]);
                    }
                }
            });
        }

        if (_xDim !== null && _yDim !== null) {
            _xDim.filter([_chart._minCoord[0],_chart._maxCoord[0]]);
            _yDim.filter([_chart._minCoord[1],_chart._maxCoord[1]]);
            redrawAllAsync()
              .catch(function(error) {
                resetRedrawStack()
                console.log("on move event redrawall error:", error)
              });
        } else if (redrawall) {
            redrawAllAsync()
              .catch(function(error) {
                resetRedrawStack()
                console.log("on move event redrawall error:", error)
              });
        } else {
            _chart._projectionFlag = true;
            _chart.redrawAsync();
        }
    }

    _chart.mapStyle = function(style) {
        if (!arguments.length)
            return _mapStyle;
        _mapStyle = style;
        if (!!_map) {
            _map.setStyle(_mapStyle);
            if (typeof _chart.resetLayer !== "undefined")
               _chart.resetLayer();
        }

        return _chart;
    }

    _chart.center = function (_) {
        if (!arguments.length) {
            _center = _map.getCenter();
            return _center;
        }
        _center = _;
        if (_mapInitted) {
            _map.setCenter(_center);
        }
        return _chart
    }

    _chart.zoom = function(_) {
        if (!arguments.length) {
            _zoom = _map.getZoom();
            return _zoom;
        }
        _zoom = _;
        if (_mapInitted) {
            _map.setZoom(_zoom);
        }
        return _chart
    }

    _chart.resetSvg = function () {
        if (_chart.svg())
            _chart.svg().remove();
        var mapContainer = d3.select(_chart.map().getCanvasContainer());
        var svg = mapContainer.append('svg').attr('class', 'poly-svg');
        svg
            .attr('width', _chart.width())
            .attr('height', _chart.height());
        _chart.svg(svg);
    }

    _chart.mapProject = function(input) {
        // keep both methods before now until we can establish performance
        // profiles of each - seem about equally fast at first glance
        if (_chart._reProjMapbox == false) {
            var xDiff = (this._maxCoord[0] - this._minCoord[0]);
            var yDiff = (this._maxCoord[1] - this._minCoord[1]);
            var projectedPoint = this.conv4326To900913(input);
            return [(projectedPoint[0] - this._minCoord[0]) / xDiff * this.width(), (1.0 - ((projectedPoint[1] - this._minCoord[1]) / yDiff)) * (this.height())];
        }
        else {
            var projectedPoint = this.map().project(input);
            return [projectedPoint.x, projectedPoint.y];
        }
   }

    _chart._setOverlay = function(data, bounds, browser, redraw) {
        var map = _chart.map();

        var boundsToUse = bounds;
        if (boundsToUse === undefined) {
            return;
        } else if (!_useLonLat) {
            boundsToUse = [
                _chart.conv900913To4326(bounds[0]),
                _chart.conv900913To4326(bounds[1]),
                _chart.conv900913To4326(bounds[2]),
                _chart.conv900913To4326(bounds[3])
            ];
        }

        if(browser.isSafari || browser.isIE || browser.isEdge){
            var blob = utilss.b64toBlob(data, 'image/png');
            var blobUrl = URL.createObjectURL(blob);
        } else {
            var blobUrl = 'data:image/png;base64,' + data;
        }

        if (!_activeLayer) {
            _activeLayer = "_points";
            var toBeAddedOverlay = "overlay" + _activeLayer;
            map.addSource(toBeAddedOverlay,{
                type: "image",
                url: blobUrl,
                coordinates: boundsToUse
            });
            map.addLayer({
                id: toBeAddedOverlay,
                source: toBeAddedOverlay,
                type: "raster",
                paint: {"raster-opacity": 0.85, "raster-fade-duration": 0}
            });
        } else {
            var overlayName = "overlay" + _activeLayer;
            var imageSrc = map.getSource(overlayName);
            imageSrc.updateImage({
                url: blobUrl,
                coordinates: boundsToUse
            });
        }
    }

    _chart._removeOverlay = function() {
        var map = _chart.map();

        var overlay = "overlay" + _activeLayer;
        map.removeLayer(overlay);
        map.removeSource(overlay);
    }

    _chart.isLoaded = function() {
        return _map._loaded;
    }

    function initMap() {
        if (_mapInitted) return
        _mapboxgl.accessToken = _mapboxAccessToken;

        _chart.root()
            .style('width', _chart.width() + "px")
            .style('height', _chart.height() + "px")

        _map = new _mapboxgl.Map({
          container: _mapId, // container id
          style: _mapStyle,
          interactive: true,
          center: _center, // starting position
          zoom: _zoom, // starting zoom
          maxBounds: _llb,
          preserveDrawingBuffer: true,
          attributionControl: false
        });

        _map.dragRotate.disable();
        _map.touchZoomRotate.disableRotation();
        _chart.addMapListeners()
        _mapInitted = true;
        _chart.enableInteractions(_interactionsEnabled)
    }

    _chart.addMapListeners = function () {
        _map.on('move', onMapMove);
        _map.on('moveend', onMapMove);
    }

    _chart.removeMapListeners = function () {
        _map.off('move', onMapMove);
        _map.off('moveend', onMapMove);
    }

    _chart.on('postRender', function () {
        if (_hasRendered) return
        _hasRendered = true
        var boundsChanged = initialBounds && !boundsRoughlyEqual(initialBounds, _map.getBounds())
        if ((boundsChanged || !initialBounds) && _xDim && _yDim) {
            _chart.setFilterBounds(_map.getBounds())
            redrawAllAsync()
        }
    })

    _chart.on('preRender', function(chart) {
        var width = chart.width();
        var height = chart.height();

        if (width !== _lastWidth || height !== _lastHeight) {
            _chart.root().select("#" + _mapId + " canvas")
              .attr('width', width)
              .attr('height', height);

            _lastWidth = width;
            _lastHeight = height;
            _map.resize();
        }
    });

    _chart.initialBounds = function(bounds) {
        if (!arguments.length) {
            return initialBounds
        }

        var latMaxSafe = bounds.latMax < LATMAX ? bounds.latMax : LATMAX
        var latMinSafe = bounds.latMin > LATMIN ? bounds.latMin : LATMIN
        var lonMaxSafe = bounds.lonMax < LONMAX ? bounds.lonMax : LONMAX
        var lonMinSafe = bounds.lonMin > LONMIN ? bounds.lonMin : LONMIN

        var sw = new _mapboxgl.LngLat(lonMinSafe, latMinSafe)
        var ne = new _mapboxgl.LngLat(lonMaxSafe, latMaxSafe)

        initialBounds = new _mapboxgl.LngLatBounds(sw, ne)
        _chart.setFilterBounds(initialBounds)

        return _chart
    }

    function getMinMax (value) {
      return _chart.crossfilter().groupAll().reduce([
        {expression: value, agg_mode: "min", name: "minimum"},
        {expression: value, agg_mode: "max", name: "maximum"}
      ]).valuesAsync(true, true)
        .then(function(bounds) {
          return [
            bounds["minimum"],
            bounds["maximum"]
          ]
        })
    }

    function createRangeMinMaxPromises (promises, value) {
        if (!_minMaxCache[value]) {
            return promises.concat(
                getMinMax(value).then(function (bounds) {
                  _minMaxCache[value] = bounds
                })
            )
        } else {
            return promises
        }
    }

    var _fitInitialBounds

    _chart.fitInitialBounds = function (callback) {
        if (!arguments.length) {
            _fitInitialBounds()
        }
        _fitInitialBounds = callback
        return _chart
    }

    function init (_bounds) {
      if (!_bounds) return Promise.resolve()

      var xValue = _xDim.value()[0]
      var yValue = _yDim.value()[0]

      if (Array.isArray(_bounds) && Array.isArray(_bounds[0]) && Array.isArray(_bounds[1])) {
        _minMaxCache[xValue] = _bounds[0]
        _minMaxCache[yValue] = _bounds[1]
      }

      return Promise.all(
          [xValue, yValue].reduce(createRangeMinMaxPromises, [])
      ).then(function () {
          _chart.fitInitialBounds(function () {
              if (!initialBounds) {
                  var lonMin = _minMaxCache[xValue][0]
                  var lonMax = _minMaxCache[xValue][1]
                  var latMin = _minMaxCache[yValue][0]
                  var latMax = _minMaxCache[yValue][1]
                  var sw = new _mapboxgl.LngLat(lonMin > LONMIN ? lonMin : LONMIN, latMin > LATMIN ? latMin : LATMIN)
                  var ne = new _mapboxgl.LngLat(lonMax < LONMAX ? lonMax : LONMAX, latMax < LATMAX ? latMax : LATMAX)
                  var lonLatBounds = new _mapboxgl.LngLatBounds(sw, ne)
                  _map.fitBounds(lonLatBounds, {linear: true, duration: 0})
              }
          })
      })
    }

    _chart.init = function (bounds) {
        if (_mapInitted) return;

        var styleLoaded = false;
        var loaded = false;

        initMap()

        return new Promise(function (resolve, reject) {
            _map.on('load', function (e) {
                onLoad(e);
                loaded = true;
                if (styleLoaded) {
                    init(bounds).then(function() {
                        resolve(_chart);
                    })
                }
            })

            _map.on('style.load', function () {
                styleLoaded = true;
                if (loaded) {
                    init(bounds).then(function() {
                        resolve(_chart);
                    })
                }
            })
        })
    };

    _chart.setFilterBounds = function (bounds) {
        if (!_useLonLat) {
           _chart._minCoord = _chart.conv4326To900913([bounds._sw.lng, bounds._sw.lat]);
           _chart._maxCoord = _chart.conv4326To900913([bounds._ne.lng, bounds._ne.lat]);
        } else {
           _chart._minCoord = [bounds._sw.lng, bounds._sw.lat];
           _chart._maxCoord = [bounds._ne.lng, bounds._ne.lat];
        }

          _xDim.filter([_chart._minCoord[0],_chart._maxCoord[0]]);
          _yDim.filter([_chart._minCoord[1],_chart._maxCoord[1]]);
    }

    function boundsRoughlyEqual(a, b) {
      return (
        a.getSouthWest().lat === b.getSouthWest().lat ||
        a.getSouthWest().lng === b.getSouthWest().lng ||
        a.getNorthEast().lat === b.getNorthEast().lat ||
        a.getNorthEast().lng === b.getNorthEast().lng
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
            .append('input')
            .attr('type', 'text')
            .attr('placeholder', 'Zoom to')
            .classed('geocoder-input', true)
            .style('top', '5px')
            .style('right', '5px')
            .style('float', 'right')
            .style('position', 'absolute')
            .on('keydown', function () {
                if (d3.event.key === "Enter" || d3.event.keyCode === 13) {
                    _geocoder
                        .locate(this.value)
                        .then(zoomToLocation)
                }
            })
    }

    function zoomToLocation (data) {
        if (data.bounds) {
            var sw = data.bounds.sw
            var ne = data.bounds.ne
            _map.fitBounds([sw, ne], {
                linear: true,
                duration: EASE_DURATION_MS
            });
        } else {
            var center = data.center
            _map.setCenter(center);
            _map.setZoom(DEFAULT_ZOOM_LEVEL)
        }
    }

    if (mixinDraw) {
        if (useMapboxDraw) {
            _chart = mapDrawMixin(_chart, _mapboxgl, MapboxDraw)
        } else {
            _chart = rasterDrawMixin(_chart)
        }
    }

    return _chart;
}
