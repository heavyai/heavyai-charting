/******************************************************************************
 * EXTEND: dc.mapMixin                                                        *
 * ***************************************************************************/

dc.mapMixin = function (_chart) {

    var _map = null;
    var _mapboxAccessToken = 'pk.eyJ1IjoibWFwZCIsImEiOiJjaWV1a3NqanYwajVsbmdtMDZzc2pneDVpIn0.cJnk8c2AxdNiRNZWtx5A9g';
    var _lastWidth = null;
    var _lastHeight = null;
    //var _mapId = "widget" + parseInt($(_chart.anchor()).attr("id").match(/(\d+)$/)[0], 10);
    var id = _chart.chartID() - 2;
    var _mapId = "widget" + id; // TODO: make less brittle (hardwired now to having two charts before point map
    _chart._map = null;
    var _mapInitted = false;
    var _xDim = null;
    var _yDim = null;
    var _lastMapMoveType = 'moveend';
    var _lastMapUpdateTime = 0;
    var _mapUpdateInterval = 100; //default


    _chart.xDim = function(xDim) {
        if (!arguments.length)
            return _xDim;
        _xDim = xDim;
        return _chart;
    }

    _chart.yDim = function(yDim) {
        if (!arguments.length)
            return _yDim;
        _yDim = yDim;
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

    function onMapMove(e) {
        if (_xDim !== null && _yDim != null) {
            if (e !== undefined && e.type == 'movend' && _lastMapMoveType == 'moveend')  //workaround issue where mapbox gl intercepts click events headed for other widgets (in particular, table) and fires moveend events.  If we see two moveend events in a row, we know this event is spurious
                return;
            if (e !== undefined)
                _lastMapMoveType = e.type;
            var curTime = (new Date).getTime();
            var bounds = _chart._map.getBounds();
            var minCoord = conv4326To900913([bounds._sw.lng, bounds._sw.lat]);
            var maxCoord = conv4326To900913([bounds._ne.lng, bounds._ne.lat]);
            if (e !== undefined && e.type == 'move') {
                if (curTime - _lastMapUpdateTime < _mapUpdateInterval) {
                    if (_chart.resizeImage !== undefined) {
                        //_chart.resizeImage(minCoord, maxCoord);
                    }
                    return; 
                }
            }
            _lastMapUpdateTime = curTime;
            _xDim.filter([minCoord[0],maxCoord[0]]);
            _yDim.filter([minCoord[1],maxCoord[1]]);
            dc.redrawAll();
        }
    }

    function initMap() {
        mapboxgl.accessToken = _mapboxAccessToken;
        _chart._map = new mapboxgl.Map({
          container: _mapId, // container id
          style: 'mapbox://styles/mapbox/dark-v8',
          interactive: true,
          center: [-74.50, 40], // starting position
          zoom: 4 // starting zoom
        });
        _chart._map.on('move', onMapMove);
        _chart._map.on('moveend', onMapMove);
        _mapInitted = true;
    }

    _chart.on('preRender', function(chart) {
        var width = chart.width();
        var height = chart.height();
        if (!_mapInitted)
            initMap();
        if (width !== _lastWidth || height !== _lastHeight) {
            $("#" + _mapId + " canvas").width(width).height(height);
            _lastWidth = width;
            _lastHeight = height;
            _chart._map.resize();
            onMapMove(); //to reset filter
        }
    });
    initMap();

    return _chart;
}

/******************************************************************************
 * END EXTEND: dc.mapMixin                                                    *
 * ***************************************************************************/
