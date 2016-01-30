/******************************************************************************
 * EXTEND: dc.mapMixin                                                        *
 * ***************************************************************************/

dc.mapMixin = function (_chart, chartDivId) {

    var _map = null;
    var _mapboxAccessToken = 'pk.eyJ1IjoibWFwZCIsImEiOiJjaWV1a3NqanYwajVsbmdtMDZzc2pneDVpIn0.cJnk8c2AxdNiRNZWtx5A9g';
    var _lastWidth = null;
    var _lastHeight = null;
    var _mapId = chartDivId;

    _chart._map = null;
    var _mapInitted = false;
    var _xDim = null;
    var _yDim = null;
    var _xDimName = null;
    var _yDimName = null;
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

    var _arr = [[180, -85], [-180, 85]];
    var _llb = mapboxgl.LngLatBounds.convert(_arr);

    _chart.xDim = function(xDim) {
        if (!arguments.length)
            return _xDim;
        _xDim = xDim;
        if(_xDim){
          _xDimName = _xDim.value()[0];
        }
        return _chart;
    }

    _chart.yDim = function(yDim) {
        if (!arguments.length)
            return _yDim;
        _yDim = yDim;
        if(_yDim){
          _yDimName = _yDim.value()[0];
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

    _chart.popupFunction = function(popupFunction) {
        if (!arguments.length)
            return _popupFunction;
        _popupFunction = popupFunction;
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

    function onLoad(e){

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
            var bounds = _chart._map.getBounds();
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
        if (!!_chart._map) 
            _chart._map.setStyle(_mapStyle);
        return _chart;
    }

    _chart.center = function (_) {
        if (!arguments.length) {
            _center = _chart._map.getCenter();
            return _center;
        }
        _center = _;
        if (_mapInitted)
            _chart._map.setCenter(_center);
    }

    _chart.zoom = function(_) {
        if (!arguments.length) {
            _zoom = _chart._map.getZoom();
            return _zoom;
        }
        _zoom = _;
        if (_mapInitted)
            _chart._map.setZoom(_zoom);
    }


    function initMap() {
        mapboxgl.accessToken = _mapboxAccessToken;
        _chart._map = new mapboxgl.Map({
          container: _mapId, // container id
          style: _mapStyle,
          interactive: true,
          center: _center, // starting position
          zoom: _zoom, // starting zoom
          maxBounds: _llb,
          preserveDrawingBuffer: true
        });
        _chart._map.dragRotate.disable();
        _chart._map.touchZoomRotate.disableRotation();

        _chart._map.on('load', onLoad);
        _chart._map.on('move', onMapMove);
        _chart._map.on('moveend', onMapMove); 

        var debouncePopUp = debounce(function(e){
            showPopup(e, _chart.popupSearchRadius())
        }, 250);

        _chart._map.on('zoom click', function(e){
          debouncePopUp(e);          
        })

        _chart._map.on('mousemove', function(e){
          debouncePopUp(e);
          hidePopup();
        })

        _mapInitted = true;
    }

    function showPopup(e, pixelRadius) {

        var height = _chart.height();
        var y = Math.round(height - e.point.y);
        var x = Math.round(e.point.x);
        var tPixels = [];

        var pixelRadiusSquared = pixelRadius * pixelRadius;

        for (var xOffset = -pixelRadius; xOffset <= pixelRadius; xOffset++) { 
            for (var yOffset = -pixelRadius; yOffset <= pixelRadius; yOffset++) { 
                if (xOffset*xOffset + yOffset*yOffset <= pixelRadiusSquared) {
                    tPixels.push(new TPixel({x:x+xOffset, y:y+yOffset}));
                }
            }
        }

        var columns = _chart.popupColumns().slice();

        if(!columns.length){
          return;
        }

        columns.push(_xDimName);
        columns.push(_yDimName);

        con.getRowsForPixels(tPixels, _chart.tableName(), columns, [function(result){
          var closestResult = null;
          var closestSqrDistance = Infinity;
          for (var r = 0; r < result.length; r++) {
            if(result[r].row_set.length){
              var sqrDist = (x-result[r].pixel.x)*(x-result[r].pixel.x) + (y-result[r].pixel.y)*(y-result[r].pixel.y);
              if (sqrDist < closestSqrDistance) {
                  closestResult = r;
                  closestSqrDistance = sqrDist;
              }
            }
          }
          if (closestResult === null)
            return;

          if(_chart.select('.map-popup').empty()){

            _chart.x().range([0, _chart.width() -1]);
            _chart.y().range([0, _chart.height() -1]);

            var nearestPoint = result[closestResult];

            var xPixel = _chart.x()(nearestPoint.row_set[0][_xDimName]);
            var yPixel = (height - _chart.y()(nearestPoint.row_set[0][_yDimName]));
            var data = nearestPoint.row_set[0];

            var mapPopup = _chart.root().append('div')
              .attr('class', 'map-popup');
   
            mapPopup.append('div')
              .attr('class', 'map-point-wrap')
              .append('div')
              .attr('class', 'map-point')
              .style({left: xPixel + 'px', top: yPixel + 'px'})
              .append('div')
              .attr('class', 'map-point-gfx')
              .style('background', function(){

                var matchIndex = null;

                if (_colorBy) {

                    _chart.colors().domain().forEach(function(d, i){ 

                      if (d === data[_colorBy] ) {
                        matchIndex = i;
                      }

                    });
                }
                
                return matchIndex ? _chart.colors().range()[matchIndex] : '#27aeef';

              });

            var offsetBridge = 0;

            mapPopup.append('div')
              .attr('class', 'map-popup-wrap')
              .style({left: xPixel + 'px', top: yPixel + 'px'})
              .append('div')
              .attr('class', 'map-popup-box')
              .html(_chart.popupFunction() ? _popupFunction(data) : renderPopupHTML(data))
              .style('left', function(){
                var boxWidth = d3.select(this).node().getBoundingClientRect().width;
                var overflow = _chart.width() - (xPixel + boxWidth/2) < 0  ? _chart.width() - (xPixel + boxWidth/2) - 6 : (xPixel - boxWidth/2 < 0 ? -(xPixel - boxWidth/2 ) + 6 : 0); 
                offsetBridge = boxWidth/2 - overflow;
                return overflow + 'px';
              })
              .classed('pop-down', function(){
                var boxHeight = d3.select(this).node().getBoundingClientRect().height;
                return yPixel - (boxHeight + 12) < 8 ;
              })
              .append('div')
              .attr('class', 'map-popup-bridge')
              .style('left', function(){
                return offsetBridge + 'px';
              });

            _chart.root().on('mousewheel', hidePopup);

          } 

        }]);

    }

    function hidePopup() {

        if (!_chart.select('.map-popup').empty()) {
            _chart.select('.map-popup-wrap')
              .classed('removePopup', true)
              .on('animationend', function(){
                _chart.select('.map-popup').remove();
              });

            _chart.select('.map-point')
              .classed('removePoint', true);
        }
    }

    function renderPopupHTML(data) {

      var html = '';
      for (var key in data) {
        if(key !== _yDimName && key !== _xDimName){
              html += '<div class="map-popup-item"><span class="popup-item-key">' + key + ':</span><span class="popup-item-val"> ' + data[key] +'</span></div>'
        }
      }
      return html;
    } 

    function debounce(func, wait, immediate) {
      
      var timeout;
      
      return function() {
        var context = this, args = arguments;
        var later = function() {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
      };

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
