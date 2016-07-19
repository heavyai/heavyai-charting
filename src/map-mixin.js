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
    var _useLonLat = false;
    _chart._minCoord = null;
    _chart._maxCoord = null;
    _chart._reProjMapbox = true;

    var _arr = [[180, -85], [-180, 85]];
    var _llb = _mapboxgl.LngLatBounds.convert(_arr);

    _chart.useLonLat = function(useLonLat) {
       if (!arguments.length) 
          return _useLonLat;
       _useLonLat = useLonLat; 
    }
    _chart.map = function() { // just a getter - don't let user set map
        return _map;
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

   _chart.conv4326To900913X = function (x) {
      return x *111319.490778;
   }

   _chart.conv4326To900913Y = function (y) {
      return 6378136.99911 * Math.log(Math.tan(.00872664626 * y + .785398163397));
   }

   _chart.conv4326To900913 = function (coord) {
      return [_chart.conv4326To900913X(coord[0]), _chart.conv4326To900913Y(coord[1])];
    }

    function onStyleLoad(e) {
      _chart.render();
    }

    function onLoad(e){
      if (_chart.initGeocoder()) {
        _chart.initGeocoder()();
        var attributions = document.createElement('div');
          attributions.className = 'mapboxgl-attribution';
          attributions.innerHTML = '<span>©</span> <a href="https://www.mapbox.com/about/maps/">Mapbox</a> <span>©</span> <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';
        _chart.root()[0][0].appendChild(attributions);
      }

      dc.enableRefresh();
      _chart.renderAsync();

      //$('body').trigger('loadGrid');
    }

    function onMapMove(e) {

        if (e === undefined)
            return;
        //if (_xDim !== null && _yDim != null) {
            if (e.type == 'moveend' && _lastMapMoveType == 'moveend')  //workaround issue where mapbox gl intercepts click events headed for other widgets (in particular, table) and fires moveend events.  If we see two moveend events in a row, we know this event is spurious
                return;
            _lastMapMoveType = e.type;
            var curTime = (new Date).getTime();
            var bounds = _map.getBounds();
            if (!_useLonLat) {
               _chart._minCoord = _chart.conv4326To900913([bounds._sw.lng, bounds._sw.lat]);
               _chart._maxCoord = _chart.conv4326To900913([bounds._ne.lng, bounds._ne.lat]);
            }
            else {
               _chart._minCoord = [bounds._sw.lng, bounds._sw.lat];
               _chart._maxCoord = [bounds._ne.lng, bounds._ne.lat];
            }
            //var bounds = _map.getBounds();
            //var minCoord = _chart.conv4326To900913([bounds._sw.lng, bounds._sw.lat]);
            //var maxCoord = _chart.conv4326To900913([bounds._ne.lng, bounds._ne.lat]);
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
            if (_xDim !== null && _yDim != null) {
                _xDim.filter([_chart._minCoord[0],_chart._maxCoord[0]]);
                _yDim.filter([_chart._minCoord[1],_chart._maxCoord[1]]);
                dc.redrawAll();
            }
            else {
                _chart._projectionFlag = true;
                _chart.redrawAsync();
            }
        //}
    }

    _chart.mapStyle = function(style) {
        if (!arguments.length)
            return _mapStyle;
        _mapStyle = style;
        if (!!_map) {
            _map.setStyle(_mapStyle);
            if (typeof _chart.resetLayer !== "undefined")
               _chart.resetLayer();
            //_chart.render();
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
        //var svg = $('<svg class="map-svg"></svg>').appendTo(mapContainer);
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

    function initMap() {
        _mapboxgl.accessToken = _mapboxAccessToken;
        _map = new _mapboxgl.Map({
          container: _mapId, // container id
          style: _mapStyle,
          interactive: true,
          center: _center, // starting position
          zoom: _zoom, // starting zoom
          maxBounds: _llb,
          preserveDrawingBuffer: true
        });
        _map.dragRotate.disable();
        _map.touchZoomRotate.disableRotation();

        _map.on('load', onLoad);
        //_map.style.on('load', onStyleLoad);
        _map.on('style.load', onStyleLoad);
        _map.on('move', onMapMove);
        _map.on('moveend', onMapMove);

        _mapInitted = true;
    }

    _chart.on('preRender', function(chart) {

        _chart.root().select('.mapboxgl-ctrl-bottom-right').remove();

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
            onMapMove(); //to reset filter
        }
    });

    initMap();

    return _chart;
}

/******************************************************************************
 * END EXTEND: dc.mapMixin                                                    *
 * ***************************************************************************/
