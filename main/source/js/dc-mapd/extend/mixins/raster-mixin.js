/******************************************************************************
 * EXTEND: dc.rasterMixin                                                     *
 * ***************************************************************************/

dc.rasterMixin = function(_chart) {
    _chart._vegaSpec = {};

     _chart._resetVegaSpec = function() {
      _chart._vegaSpec.width = _chart.width();
      _chart._vegaSpec.height = _chart.height();
      _chart._vegaSpec.data = [
        {
            "name": "table"
        }
      ];
      _chart._vegaSpec.scales = [];
      _chart._vegaSpec.marks = [];
    }

    /* _determineScaleType because there is no way to determine the scale type
     * in d3 except for looking to see what member methods exist for it
     */

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
