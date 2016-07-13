dc.countWidget = function (parent, chartGroup) {
    var _formatNumber = d3.format(",");
    var _chart = dc.baseMixin({});
    var _countLabel = 'rows';

    _chart.isCountChart = function() { return true; } // override for count chart

    _chart.formatNumber = function (formatter) {
        if (!arguments.length) {
            return _formatNumber;
        }
        _formatNumber = formatter;
        return _chart;
    };

    _chart.countLabel = function (_) {
        if (!arguments.length) {
            return _countLabel;
        }
        _countLabel = _;
        return _chart;
    };

    _chart.setDataAsync(function(group,callbacks) {
        group.valueAsync(callbacks);
    });

    _chart._doRender = function (val) {
        _chart.dimension().size(function(err, tot) {
            var all = _formatNumber(tot);
            var selected = _formatNumber(val);

            var wrapper = _chart.root()
                .style('width', 'auto')
                .style('height', 'auto')
                .html('')
                .append('div')
                .attr('class', 'count-widget');

            wrapper.append('span')
                .attr('class', 'count-selected')
                .classed('not-filtered', selected === all)
                .text(selected === '-0' ? 0 : selected);

            wrapper.append('span')
                .classed('not-filtered', selected === all)
                .text(' of ');

            wrapper.append('span')
                .attr('class', 'count-all')
                .text(all);

            wrapper.append('span')
                .attr('class', 'count-label')
                .text(' ' + _countLabel);
        });

        return _chart;
    };

    _chart._doRedraw = function (val) {
        return _chart._doRender(val);
    };

    return _chart.anchor(parent, chartGroup);
};
