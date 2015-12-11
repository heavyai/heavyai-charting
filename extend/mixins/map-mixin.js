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

    var _popupFunction = function(result, height){
      var context={
        googX: (_chart.x()(result.row_set[0][_xDimName]) - 14) + 'px',
        googY: (height - _chart.y()(result.row_set[0][_yDimName]) - 14) + 'px',
        data: result.row_set[0],
        clickX: result.pixel.x + 'px',
        clickY: (height - result.pixel.y) + 'px',
      };

      Handlebars.registerHelper("formatPopupText", function(obj) {
        var result = "<div>";
        _.each(obj, function(value, key){
          if(key !== _yDimName && key !== _xDimName){
              result += '<div class="popup-text-wrapper"><span><strong>' + key + '</strong>: ' + value +'</span></div>'
          }
        })

      result += "</div>"
      return result;
      });

      return MyApp.templates.pointMapPopup(context);
    }

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
      dc.enableRefresh();
      _chart.render();
      $('body').trigger('loadGrid');
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

    function initMap() {
        mapboxgl.accessToken = _mapboxAccessToken;
        _chart._map = new mapboxgl.Map({
          container: _mapId, // container id
          style: _mapStyle,
          interactive: true,
          center: [0, 50], // starting position
          zoom: 1, // starting zoom
        });
        _chart._map.dragRotate.disable();


        initGeocoder();

        _chart._map.on('load', onLoad);
        _chart._map.on('move', onMapMove);
        _chart._map.on('moveend', onMapMove);

        $('#' + chartDivId).on('mousewheel', '.popup-hide-div, .popup-container', 
          function(){
            $('.popup-container').remove()
            $('.point-highlight-add').parent().remove()
          })
         
         function showPopUp(e, pixelRadius) {
            var height = $(e.target._container).height()
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
              if(!$('.popup-highlight').length){

                _chart.x().range([0, _chart.width() -1])
                _chart.y().range([0, _chart.height() -1])

                var height = $('#' + _mapId).height()

                var theCompiledHtml = _popupFunction(result[closestResult], height, _chart, _xDimName, _yDimName);
               
                $('#' + _mapId).append(theCompiledHtml)

              }
            }]);

        }

        var debouncePopUp = _.debounce(function(e){
            showPopUp(e, _chart.popupSearchRadius())
        }, 250)

        _chart._map.on('zoom click', function(e){
          debouncePopUp(e);          
        })

        _chart._map.on('mousemove', function(e){
          debouncePopUp(e);

          if($('.popup-hide-div').length){

            $('.popup-container').addClass('popup-remove').bind('oanimationend animationend webkitAnimationEnd', function() { 
               $(this).remove();
              });
            $('.point-highlight-add').addClass('point-highlight-remove').bind('oanimationend animationend webkitAnimationEnd', function() { 
               $(this).parent().remove();
            });
          }
        })
        _mapInitted = true;
    }

    function initGeocoder() {
      _chart.geocoder = new Geocoder();
      _chart.geocoder.init(_chart._map);
      _chart.geocoderInput = $('<input class="geocoder-input" type="text" placeholder="Zoom to"></input>')
        .appendTo($('#' + _mapId));
      _chart.geocoderInput.css({
          top: '5px',
          right: '5px'
        });

      _chart.geocoderInput.dblclick(function() {
        return false;
      });

      _chart.geocoderInput.keyup(function(e) {
        if(e.keyCode === 13) {
          _chart.geocoder.geocode(_chart.geocoderInput.val());
        }
      });
    }

    _chart.on('preRender', function(chart) {
        
        $('.mapboxgl-ctrl-bottom-right').remove();

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
