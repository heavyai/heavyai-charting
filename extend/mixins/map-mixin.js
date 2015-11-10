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

    // get the widget's div and it's sections
    var $widgetDiv   = $('#' + _mapId);
    var $panelHeader = $($widgetDiv.children()[0]);
    var $panelBody   = $($widgetDiv.children()[1]);

    // calculate the height of the map
    var height = $widgetDiv.height() - $panelHeader.height();

    // set the id and height of the panel body
    $panelBody.attr('id', _mapId + '-body');
    $panelBody.height(height);

    _chart._map = null;
    var _mapInitted = false;
    var _xDim = null;
    var _yDim = null;
    var _xDimName = null;
    var _yDimName = null;    
    var _lastMapMoveType = null;
    var _lastMapUpdateTime = 0;
    var _mapUpdateInterval = 100; //default
    var _mouseClickCoords = {};
    var _chartVariables = [];


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
            if (e !== undefined && e.type == 'moveend' && _lastMapMoveType == 'moveend')  //workaround issue where mapbox gl intercepts click events headed for other widgets (in particular, table) and fires moveend events.  If we see two moveend events in a row, we know this event is spurious
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
          container: _mapId + '-body', // container id
          style: 'mapbox://styles/mapbox/dark-v8',
          interactive: true,
          center: [-74.50, 40], // starting position
          zoom: 4 // starting zoom
        });

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
    };

        initGeocoder();

        _chart._map.on('move', onMapMove);
        _chart._map.on('moveend', onMapMove);
         function showPopUp(e) {
            // _mouseClickCoords = {x: e.originalEvent.x, y: e.originalEvent.y};
            var height = $(e.target._container).height()
            var y = Math.round(height - e.point.y);
            var x = Math.round(e.point.x);
            var tpixel = new TPixel({x:x, y:y});
            var widgetId = Number(_mapId.match(/\d+/g))

            // _xDimVariable = $('#select2-xCoordPicker' + widgetId + '-container').text()
            // _yDimVariable = $('#select2-yCoordPicker' + widgetId + '-container').text()



            var columns = chartWidgets[widgetId].chartObject.projectArray.slice();

            if(!columns.length){
              return;
            }

            columns.push(_xDimName);
            columns.push(_yDimName);
            
            con.getRowsForPixels([tpixel], _chart.tableName(), columns, [function(result){

              if(result[0].row_set.length){

                _chart.x().range([0, _chart.width() -1])
                _chart.y().range([0, _chart.height() -1])

                var height = $('#' + _mapId).find('.mapboxgl-map').height()

                var context={
                  googX: (_chart.x()(result[0].row_set[0][_xDimName]) - 14) + 'px',
                  googY: (height - _chart.y()(result[0].row_set[0][_yDimName]) - 14) + 'px',
                  data: result[0].row_set[0],
                  clickX: result[0].pixel.x + 'px',
                  clickY: (height - result[0].pixel.y) + 'px',
                };

                Handlebars.registerHelper("formatPopupText", function(obj) {
                  var result = "<div>";
                  _.each(obj, function(value, key){
                    if(key !== _yDimName && key !== _xDimName){
                        result += '<div><span><strong>' + key + '</strong>:' + value +'</span></div>'
                    }
                  })

                result += "</div>"
                return result;
                });

                var theCompiledHtml = MyApp.templates.pointMapPopup(context);
                $('#' + _mapId).find('.mapboxgl-map').append(theCompiledHtml)
              }
            }]);

        }

        var debouncePopUp = debounce(function(e){
            showPopUp(e)
        }, 250)

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
        .appendTo($('#' + _mapId  + '-body'));
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
