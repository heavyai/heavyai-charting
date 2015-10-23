/******************************************************************************
 * EXTEND: dc.mapChart                                                        *
 * ***************************************************************************/

dc.mapChart = function(parent, chartGroup) {
  //var _chart = dc.mapMixin(dc.baseMixin({}));
  var _chart = dc.coordinateGridMixin({});

  return _chart.anchor(parent, chartGroup);
}

/******************************************************************************
 * END EXTEND: dc.mapChart                                                    *
 * ***************************************************************************/

