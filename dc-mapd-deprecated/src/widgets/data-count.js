
/******************************************************************************
 * OVERRIDE: dc.dataCount                                                     *
 * ***************************************************************************/
dc.dataCount = function (parent, chartGroup) {
    var _formatNumber = d3.format(',d');
    var _chart = dc.baseMixin({});
    var _html = {some: '', all: ''};

/* OVERRIDE ---------------------------------------------------------------- */
    _chart.isCountChart = function() { return true; } // override for count chart
/* ------------------------------------------------------------------------- */

    _chart.html = function (options) {
        if (!arguments.length) {
            return _html;
        }
        if (options.all) {
            _html.all = options.all;
        }
        if (options.some) {
            _html.some = options.some;
        }
        return _chart;
    };

    _chart.formatNumber = function (formatter) {
        if (!arguments.length) {
            return _formatNumber;
        }
        _formatNumber = formatter;
        return _chart;
    };

/* OVERRIDE EXTEND --------------------------------------------------------- */
    _chart.setDataAsync(function(group,callbacks) {
        group.valueAsync(callbacks);
    });
/* ------------------------------------------------------------------------- */

    _chart._doRender = function () {
        // ok to call size b/c will hit cache every time
        var tot = _chart.dimension().size();

/* OVERRIDE ---------------------------------------------------------------- */
        var val = null;
        if (_chart.dataCache != null)
            val = _chart.dataCache;
        else{
/* ------------------------------------------------------------------------- */

             val = _chart.group().value();
        }

/* OVERRIDE ---------------------------------------------------------------- */
        dc._lastFilteredSize = val;
/* ------------------------------------------------------------------------- */

        var all = _formatNumber(tot);
        var selected = _formatNumber(val);

        if ((tot === val) && (_html.all !== '')) {
            _chart.root().html(_html.all.replace('%total-count', all).replace('%filter-count', selected));
        } else if (_html.some !== '') {
            _chart.root().html(_html.some.replace('%total-count', all).replace('%filter-count', selected));
        } else {
            _chart.selectAll('.total-count').text(all);

/* OVERRIDE ---------------------------------------------------------------- */
            _chart.selectAll('.filter-count')
              .classed('dark-text', (all !== selected))
              .text(selected);
/* ------------------------------------------------------------------------- */
        }
        return _chart;
    };

    _chart._doRedraw = function () {
        return _chart._doRender();
    };

    return _chart.anchor(parent, chartGroup);
};
/******************************************************************************
 * END OVERRIDE: dc.dataCount                                                 *
 * ***************************************************************************/
