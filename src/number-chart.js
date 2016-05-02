dc.numberChart = function (parent, chartGroup) {
    var _formatNumber = d3.format(",");
    var _chart = dc.baseMixin({});
    var _colors = '#22a7f0';
    var _fontSize = null;
    var _chartWidth = null;

    _chart.formatNumber = function (formatter) {
        if (!arguments.length) {
            return _formatNumber;
        }
        _formatNumber = formatter;
        return _chart;
    };

    _chart.colors = function (_) {
        if (!arguments.length) {
            return _colors;
        }
        _colors = _;
        return _chart;
    };

    _chart.getColor = function (selected, all) {
        return typeof _colors === 'string' ? _colors : _colors[0];
    }

    _chart.setDataAsync(function(group,callbacks) {
        group.valueAsync(callbacks);
    });

    _chart._doRender = function () {
        
        var val = null;
        if (_chart.dataCache != null)
            val = _chart.dataCache;
        else{
            val = _chart.group().value();
        }

        var selected = _formatNumber(parseFloat(val.toFixed(2)));
        
        var wrapper = _chart.root().html('')
            .append('div')
            .attr('class', 'number-chart-wrapper');

        wrapper.append('span')
            .attr('class', 'number-chart-number')
            .style('color', _chart.getColor)
            .style('font-size', function(d){
                return Math.max(Math.floor(_chart.height()/5), 32) + 'px';
            })
            .text(selected === '-0' ? 0 : selected)
            .style('font-size', function(d){
                var width = d3.select(this).node().getBoundingClientRect().width;
                var calcFontSize = parseInt(d3.select(this).node().style.fontSize.replace(/\D/g,''));

                if (width > _chart.width() - 64) {
                    calcFontSize = Math.max(calcFontSize * ((_chart.width() - 64)/width), 32);
                }

                _fontSize = !_fontSize || _chartWidth < _chart.width() ? calcFontSize : Math.min(_fontSize, calcFontSize); 

                _chartWidth = _chart.width();
                
                return  _fontSize + 'px';
            });

        return _chart;
    };

    _chart._doRedraw = function () {
        return _chart._doRender();
    };

    return _chart.anchor(parent, chartGroup);
};
