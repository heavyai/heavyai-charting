/******************************************************************************
 * EXTEND: dc.rasterMixin                                                     *
 * ***************************************************************************/

dc.rasterMixin = function(_chart) {
    _chart._vegaSpec = {};
    var _sampling = false;
    var _tableName = null;
    var _popupColumns = [];
    var _popupSearchRadius = 0;
    var _popupFunction = null;
    var _colorBy = null;
    var _mouseLeave = false;

    _chart.popupSearchRadius = function (popupSearchRadius) {
        if (!arguments.length)
            return _popupSearchRadius;
        _popupSearchRadius = popupSearchRadius;
        return _chart;
    }
    _chart._resetVegaSpec = function() {
        _chart._vegaSpec.width = Math.round(_chart.width());
        _chart._vegaSpec.height = Math.round(_chart.height());

        _chart._vegaSpec.data = [
          {
              "name": "table",
              "sql": "select x, y from tweets;"
          }
        ];
        if (!!_tableName)
            _chart._vegaSpec.data[0].dbTableName = _tableName;

        _chart._vegaSpec.scales = [];
        _chart._vegaSpec.marks = [];
    }

    _chart.popupColumns = function(popupColumns) {
        if (!arguments.length)
            return _popupColumns;
        _popupColumns = popupColumns;
        return _chart;
    }

    _chart.tableName = function(tableName) {
        if (!arguments.length)
            return _tableName;
        _tableName = tableName;
        return _chart;
    }

    /* _determineScaleType because there is no way to determine the scale type
     * in d3 except for looking to see what member methods exist for it
     */

    _chart.sampling = function(setting) { // setting should be true or false
        if (!arguments.length)
            return _sampling;
    
        if (setting && !_sampling) // if wasn't sampling
            dc._sampledCount++;
        else if (!setting && _sampling)
            dc._sampledCount--;
        _sampling = setting;
        if (_sampling == false)
            _chart.dimension().samplingRatio(null); // unset sampling
        return _chart;
    }

    _chart.setSample = function() {
        if (_sampling) {
            if (dc._lastFilteredSize == null)
                _chart.dimension().samplingRatio(null);
            else {
                _chart.dimension().samplingRatio(Math.min(_chart.cap()/dc._lastFilteredSize, 1.0))
            }
        }
    }
    _chart._determineScaleType = function(scale) {
        var scaleType = null;
        if (scale.rangeBand !== undefined)
            return "ordinal";
        if (scale.exponent !== undefined)
            return "power";
        if (scale.base !== undefined)
            return "log";
        if (scale.quantiles !== undefined)
            return "quantiles";
        if (scale.interpolate !== undefined)
            return "linear";
        return "quantize";
    }

    _chart.vegaSpec = function(_) {
      if (!arguments.length)
        return _chart._vegaSpec;
      _chart._vegaSpec = _;
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
    //_chart.setDataAsync(function(group,callbacks) {
    //    callbacks.pop()();
    //});

    //_chart.data(function (group) {
    //    return;
    //});

    var debouncePopUp = debounce(function(e){
        showPopup(e, _chart.popupSearchRadius())
    }, 250);

    d3.select(_chart._map._canvasContainer.parentNode)
        .on('mouseleave', function(){ _mouseLeave = true; })
        .on('mouseenter', function(){ _mouseLeave = false; });


    _chart._map.on('zoom click', function(e){
      debouncePopUp(e);
    })

    _chart._map.on('mousemove', function(e){
      debouncePopUp(e);
      hidePopup();
    })

    function showPopup(e, pixelRadius) {

        if (_mouseLeave) {
          return;
        }
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

        columns.push(_chart._xDimName);
        columns.push(_chart._yDimName);

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

            var xPixel = _chart.x()(nearestPoint.row_set[0][_chart._xDimName]);
                      // || _chart.x()(nearestPoint.row_set[0][_chart._xDimName.split('.')[1]]);
            var yPixel = (height - _chart.y()(nearestPoint.row_set[0][_chart.yDimName]));
                      // || (height - _chart.y()(nearestPoint.row_set[0][_chart.yDimName.split('.')[1]]));
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

          };
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
        if(key !== _chart.yDimName && key !== _chart._xDimName){
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


    return _chart;
}

/******************************************************************************
 * END EXTEND: dc.rasterMixin                                                 *
 * ***************************************************************************/
