/******************************************************************************
 * OVERRIDE: dc.marginMixin                                                   *
 * ***************************************************************************/
dc.marginMixin = function (_chart) {

/* OVERRIDE ---------------------------------------------------------------- */
    var _margin = { top: 10, right: 50, bottom: 48, left: 60 };
/* ------------------------------------------------------------------------- */

    _chart.margins = function (margins) {
        if (!arguments.length) {
            return _margin;
        }
        _margin = margins;
        return _chart;
    };

    _chart.effectiveWidth = function () {
        return _chart.width() - _chart.margins().left - _chart.margins().right;
    };

    _chart.effectiveHeight = function () {
        return _chart.height() - _chart.margins().top - _chart.margins().bottom;
    };

    return _chart;
};
/******************************************************************************
 * END OVERRIDE: dc.marginMixin                                               *
 * ***************************************************************************/

