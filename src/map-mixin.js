/******************************************************************************
 * EXTEND: dc.mapMixin                                                        *
 * ***************************************************************************/

dc.mapMixin = function (_chart, chartDivId, _mapboxgl) {
    var _mapboxgl = typeof mapboxgl === 'undefined' ? _mapboxgl : mapboxgl
    var _map = null;
    var _mapboxAccessToken = 'pk.eyJ1IjoibWFwZCIsImEiOiJjaWV1a3NqanYwajVsbmdtMDZzc2pneDVpIn0.cJnk8c2AxdNiRNZWtx5A9g';
    var _lastWidth = null;
    var _lastHeight = null;
    var _mapId = chartDivId;

    _chart._xDimName = null;
    _chart._yDimName = null;
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
    var _initGeocoder = null;
    var _colorBy = null;
    var _mouseLeave = false;
    var _useLonLat = true;
    _chart._minCoord = null;
    _chart._maxCoord = null;
    _chart._reProjMapbox = true;

    var _arr = [[180, -85], [-180, 85]];
    var _llb = _mapboxgl.LngLatBounds.convert(_arr);

    _chart.useLonLat = function(useLonLat) {
       if (!arguments.length)
          return _useLonLat;
       _useLonLat = useLonLat;
       return _chart;
    }
    _chart.map = function() {
        return _map;
    }

    _chart.getDataRenderBounds = function() {
        var bounds = _map.getBounds();
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

    _chart.initGeocoder = function(initGeocoder) {
        if (!arguments.length)
            return _initGeocoder;
        _initGeocoder = initGeocoder;
        return _chart;
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

    function onStyleLoad(e) {
      _chart.renderAsync();
    }

    function onLoad(e){
      if (_chart.initGeocoder()) {
        _chart.initGeocoder()();
      }

      var mapboxlogo = document.createElement('a');
        mapboxlogo.className = 'mapbox-maplogo';
        mapboxlogo.href = 'http://mapbox.com/about/maps';
        mapboxlogo.target = '_blank';
        mapboxlogo.innerHTML = 'Mapbox';

      _chart.root()[0][0].appendChild(mapboxlogo);

      dc.enableRefresh();
      _chart.renderAsync();
    }

    function onMapMove(e) {
        if ((e.type === 'moveend' && _lastMapMoveType === 'moveend') || !_hasRendered) {
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
            dc.redrawAllAsync()
              .catch(function(error) {
                dc.resetRedrawStack()
                console.log("on move event redrawall error:", error)
              });
        } else if (redrawall) {
            dc.redrawAllAsync()
              .catch(function(error) {
                dc.resetRedrawStack()
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
        if (_mapInitted)
            _map.setCenter(_center);
    }

    _chart.zoom = function(_) {
        if (!arguments.length) {
            _zoom = _map.getZoom();
            return _zoom;
        }
        _zoom = _;
        if (_mapInitted)
            _map.setZoom(_zoom);
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
            var blob = dc.utils.b64toBlob(data, 'image/png');
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
                paint: {"raster-opacity": 0.85}
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
        _mapboxgl.accessToken = _mapboxAccessToken;
        _map = new _mapboxgl.Map({
          container: _mapId, // container id
          style: _mapStyle,
          interactive: true,
          center: _center, // starting position
          zoom: _zoom, // starting zoom
          maxBounds: _llb,
          preserveDrawingBuffer: true,
          attributionControl: true
        });
        _map.dragRotate.disable();
        _map.touchZoomRotate.disableRotation();

        _map.on('load', onLoad);
        _map.on('style.load', onStyleLoad);
        _map.on('move', onMapMove);
        _map.on('moveend', onMapMove);

        _mapInitted = true;
    }


    _chart.on('postRender', function() {
      _hasRendered = true
    })

    _chart.on('preRender', function(chart) {

        var width = chart.width();
        var height = chart.height();
        if (!_mapInitted) {
          initMap();
        }

        if (width !== _lastWidth || height !== _lastHeight) {
            _chart.root().select("#" + _mapId + " canvas")
              .attr('width', width)
              .attr('height',height);

            _lastWidth = width;
            _lastHeight = height;
            _map.resize();
        }
    });

    initMap();

    return _chart;
}

/******************************************************************************
 * END EXTEND: dc.mapMixin                                                    *
 * ***************************************************************************/
