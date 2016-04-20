/******************************************************************************
 * EXTEND: dc.rasterMixin                                                     *
 * ***************************************************************************/

dc.rasterMixin = function(_chart) {
    var _con = window.hasOwnProperty('con') ? con : null;
    var _sampling = false;
    var _tableName = null;
    var _popupColumns = [];
    var _popupColumnsMapped = {};
    var _popupSearchRadius = 0;
    var _popupFunction = null;
    var _colorBy = null;
    var _mouseLeave = false // used by displayPopup to maybe return early
    d3.select(_chart.map()._canvasContainer.parentNode)
    .on('mouseleave', function(){ _mouseLeave = true; })
    .on('mouseenter', function(){ _mouseLeave = false; });

    _chart.popupSearchRadius = function (popupSearchRadius) {
        if (!arguments.length){ return _popupSearchRadius; }
        _popupSearchRadius = popupSearchRadius;
        return _chart;
    }

    _chart._resetVegaSpec = function() {
        _chart._vegaSpec.width = Math.round(_chart.width());
        _chart._vegaSpec.height = Math.round(_chart.height());
        _chart._vegaSpec.data = [{
            "name": "table",
            "sql": "select x, y from tweets;"
        }];
        if (!!_tableName) { _chart._vegaSpec.data[0].dbTableName = _tableName; }
        _chart._vegaSpec.scales = [];
        _chart._vegaSpec.marks = [];
    }

    _chart.con = function(_) {
        if(!arguments.length){ return _con; }
        _con = _;
        return _chart;
    }

    _chart.popupColumns = function(popupColumns) {
        if (!arguments.length) { return _popupColumns; }
        _popupColumns = popupColumns;
        return _chart;
    }

    _chart.popupColumnsMapped = function(popupColumnsMapped) {
        if (!arguments.length) { return _popupColumnsMapped; }
        _popupColumnsMapped = popupColumnsMapped;
        return _chart;
    }

    _chart.tableName = function(tableName) {
        if (!arguments.length) { return _tableName; }
        _tableName = tableName;
        return _chart;
    }

    _chart.popupFunction = function(popupFunction) {
      if (!arguments.length){ return _popupFunction; }
      _popupFunction = popupFunction;
      return _chart;
    }

    // _determineScaleType because there is no way to determine the scale type
    // in d3 except for looking to see what member methods exist for it
    _chart.sampling = function(isSetting) { // isSetting should be true or false
        if (!arguments.length) { return _sampling; }
        if (isSetting && !_sampling) {// if wasn't sampling
            dc._sampledCount++;
        } else if (!isSetting && _sampling) {
            dc._sampledCount--;
        }
        _sampling = isSetting;
        if (_sampling === false) {
            _chart.dimension().samplingRatio(null); // unset sampling
        }
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
        if (scale.rangeBand !== undefined){ return "ordinal"; }
        if (scale.exponent !== undefined){ return "power"; }
        if (scale.base !== undefined){ return "log"; }
        if (scale.quantiles !== undefined){ return "quantiles"; }
        if (scale.interpolate !== undefined){ return "linear"; }
        return "quantize";
    }

    _chart.vegaSpec = function(_) {
        if (!arguments.length) { return _chart._vegaSpec; }
        _chart._vegaSpec = _;
        return _chart;
    }

    _chart.colorBy = function(_) {
        if (!arguments.length) { return _colorBy; }
        _colorBy = _;
        return _chart;
    }

    _chart.getClosestResult = function getClosestResult (point, callback) {
        var points = nearestPoints(point, _chart.height(), _chart.popupSearchRadius())
        var tableName = _chart.tableName()
        var columns = getColumnsWithPoints()
        // TODO best to fail, skip cb, or call cb wo args?
        if (!points.length || !tableName || !columns.length ) { return; }
        return _con.getRowsForPixels(points, tableName, columns, [function(results){
            var closestResult = getClosestRow(point.x, point.y, results)
            return callback(closestResult)
        }])
    }

    _chart.displayPopup = function displayPopup (result) {
      if(_mouseLeave || !result || !result.row_set || !result.row_set.length){ return }
      var data = result.row_set[0];
      var mappedData = mapDataViaColumns(data, _popupColumnsMapped)
      if( Object.keys(mappedData).length === 2 ) { return } // xPoint && yPoint
      var offsetBridge = 0;
      _chart.x().range([0, _chart.width() - 1]);
      _chart.y().range([0, _chart.height() - 1]);
      var xPixel = _chart.x()(data.xPoint);
      var yPixel = (_chart.height() - _chart.y()(data.yPoint));
      var mapPopup = _chart.root().append('div').attr('class', 'map-popup');
      mapPopup.append('div')
      .attr('class', 'map-point-wrap')
      .append('div')
      .attr('class', 'map-point')
      .style({left: xPixel + 'px', top: yPixel + 'px'})
      .append('div')
      .attr('class', 'map-point-gfx')
      .style('background', colorPopupBackground(data));
      mapPopup.append('div')
      .attr('class', 'map-popup-wrap')
      .style({left: xPixel + 'px', top: yPixel + 'px'})
      .append('div')
      .attr('class', 'map-popup-box')
      .html(_chart.popupFunction() ? _popupFunction(mappedData) : renderPopupHTML(mappedData))
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
    }

    _chart.hidePopup = function hidePopup() {
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

    _chart._vegaSpec = {};

    return _chart;

    function nearestPoints (point, height, r) {
        var y = Math.round(height - point.y);
        var x = Math.round(point.x);
        var points = [];
        var rSquared = r * r;
        for (var xOffset = -r; xOffset <= r; xOffset++) {
            for (var yOffset = -r; yOffset <= r; yOffset++) {
                if (xOffset*xOffset + yOffset*yOffset <= rSquared) {
                    points.push(new TPixel({x:x+xOffset, y:y+yOffset}));
                }
            }
        }
        return points
    }

    function getClosestRow (x, y, results) {
        var closestResult = null;
        var closestSqrDistance = Infinity;
        for (var i = 0; i < results.length; i++) {
            var result = results[i]
            if (result.row_set.length){
                var xDistance = (x - result.pixel.x)
                var yDistance = (y - result.pixel.y)
                var sqrDist = xDistance * xDistance + yDistance * yDistance
                if (sqrDist < closestSqrDistance) {
                    closestResult = result;
                    closestSqrDistance = sqrDist;
                }
            }
        }
        return closestResult
    }

    function getColumnsWithPoints () {
        var columns = _chart.popupColumns().slice();
        columns.push(_chart._xDimName + " as xPoint");
        columns.push(_chart._yDimName + " as yPoint");
        return columns
    }

    function renderPopupHTML(data) {
      var html = '';
      for (var key in data) {
        if(key !== "xPoint" && key !== "yPoint"){
          html += '<div class="map-popup-item"><span class="popup-item-key">' + key + ':</span><span class="popup-item-val"> ' + data[key] +'</span></div>'
        }
      }
      return html;
    }

    function colorPopupBackground (data) {
      var MAPD_BLUE = '#27aeef'
      var _colorBy = _chart.colorBy()
      if (_colorBy) {
        var matchIndex = null;
        _chart.colors().domain().forEach(function(d, i){
          if (d === data[_colorBy] ) {
            matchIndex = i;
          }
        });
      }
      return matchIndex ? _chart.colors().range()[matchIndex] : MAPD_BLUE;
    }

    function mapDataViaColumns (data, _popupColumnsMapped) {
      var newData = {}
      for (var key in data) {
        var newKey = _popupColumnsMapped[key] || key
        newData[newKey] = data[key]
      }
      return newData
    }
}

/******************************************************************************
 * END EXTEND: dc.rasterMixin                                                 *
 * ***************************************************************************/
