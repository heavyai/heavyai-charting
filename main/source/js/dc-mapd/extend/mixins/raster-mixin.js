/******************************************************************************
 * EXTEND: dc.rasterMixin                                                     *
 * ***************************************************************************/

dc.rasterMixin = function(_chart) {
    _chart._vegaSpec = {};
    var _sampling = false;
    var _tableName = null;
    var _popupColumns = [];
    var _popupSearchRadius = 0;

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
    //_chart.setDataAsync(function(group,callbacks) {
    //    callbacks.pop()();
    //});

    //_chart.data(function (group) {
    //    return;
    //});
    return _chart;
}

/******************************************************************************
 * END EXTEND: dc.rasterMixin                                                 *
 * ***************************************************************************/
