/******************************************************************************
 * EXTEND: dc.mapMixin                                                        *
 * ***************************************************************************/

dc.mapMixin = function (_chart, chartDivId) {

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

    var _arr = [[180, -85], [-180, 85]];
    var _llb = mapboxgl.LngLatBounds.convert(_arr);

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

    function conv4326To900913 (coord) {
      var transCoord = [0.0,0.0];
      transCoord[0] = coord[0] * 111319.49077777777778;
      transCoord[1] = Math.log(Math.tan((90.0 + coord[1]) * 0.00872664625997)) * 6378136.99911215736947;
      return transCoord;
    }

    function onStyleLoad(e) {
       console.log("style load");
      _chart.render();
    }

    function onLoad(e){
       console.log("load");
      if (_chart.initGeocoder()) {
        _chart.initGeocoder()();
      }

      dc.enableRefresh();
      _chart.render();

      //$('body').trigger('loadGrid');
    }

    function onMapMove(e) {
        if (e === undefined)
            return;
        if (_xDim !== null && _yDim != null) {
            if (e.type == 'moveend' && _lastMapMoveType == 'moveend')  //workaround issue where mapbox gl intercepts click events headed for other widgets (in particular, table) and fires moveend events.  If we see two moveend events in a row, we know this event is spurious
                return;
            _lastMapMoveType = e.type;
            var curTime = (new Date).getTime();
            var bounds = _map.getBounds();
            var minCoord = conv4326To900913([bounds._sw.lng, bounds._sw.lat]);
            var maxCoord = conv4326To900913([bounds._ne.lng, bounds._ne.lat]);
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
            _xDim.filter([minCoord[0],maxCoord[0]]);
            _yDim.filter([minCoord[1],maxCoord[1]]);
            dc.redrawAll();
        }
    }

    _chart.mapStyle = function(style) {
        if (!arguments.length)
            return _mapStyle;
        _mapStyle = style;
        if (!!_map) {
            _map.setStyle(_mapStyle);
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


    function initMap() {
        mapboxgl.accessToken = _mapboxAccessToken;
        _map = new mapboxgl.Map({
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
