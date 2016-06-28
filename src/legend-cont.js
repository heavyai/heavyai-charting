dc.legendCont = function (data) {
    var LABEL_GAP = 2;
    var _legend = {},
        _parent,
        _legendTitle = '',
        _chartType = '';
    var _wrapper;
    var _lock;
    var _isLocked = false;

    _legend.parent = function (p) {
        if (!arguments.length) {
            return _parent;
        }
        _parent = p;
        return _legend;
    };

    _legend.legendTitle = function (_) {
        if (!arguments.length) {
            return _legendTitle;
        }
        _legendTitle = _;
        return _legend;
    };

    _legend.chartType = function (_) {
        if (!arguments.length) {
            return _chartType;
        }
        _chartType = _;
        return _legend;
    };

    _legend.removeLegend = function () {
        _parent.root().select('.legend-cont').remove();
        _parent.legend(null);
    }

    _legend.render = function () {
        _parent.root().select('.legend-cont').remove();

        _wrapper = _parent.root().append('div')
            .attr('class', 'legend-cont');

        var title = _wrapper.append('div')
            .attr('class', 'legend-title')
            .append('span')
            .text(_legendTitle);

        var legendGroup = _wrapper.append('div')
            .attr('class', 'legend-group');

        initLock();

        var legendables = _parent.legendablesContinuous();

        var itemEnter = legendGroup.selectAll('.legend-item')
            .data(legendables)
            .enter()
            .append('div')
            .attr('class', 'legend-item');

        itemEnter.append('div')
            .attr('class', 'legend-swatch')
            .style('background-color', function (d) {return d ? d.color : '#e2e2e2';});

        itemEnter.append('div')
            .attr('class', 'legend-label')
            .append('span')
            .text(function(d) { return d ? d.value : 0;})

        legendGroup.selectAll('.legend-item:first-child , .legend-item:last-child')
            .on('mouseenter', function() {
                var item = d3.select(this);
                var w = item.select('span').node().getBoundingClientRect().width + 8;
                item.select('.legend-input input').style('width', w + 'px');
            })
            .selectAll('.legend-label')
            .append('div')
            .attr('class', 'legend-input')
            .append('input')
            .attr('value', function(d){ return d ? d.value : 0;})
            .on('click', function(){  
                this.select();
                var item =  d3.select(this.parentNode.parentNode);
                item.classed('active', true);

                var w = item.select('span').node().getBoundingClientRect().width + 8;
                item.select('.legend-input input').style('width', w + 'px');
            })
            .on('blur', function(){
                d3.select(this.parentNode.parentNode).classed('active', false);
            })
            .on('change', onChange);
    };

    function initLock () {    
        _lock = _wrapper.append('div').attr('class', 'legend-lock')
            .classed('js-isLocked', _isLocked)
            .on('click', toggleLock);

        _lock.append('svg')
            .attr('class', 'svg-icon')
            .classed('icon-lock', true)
            .attr('viewBox', '0 0 48 48')
            .append('use')
            .attr('xlink:href', '#icon-lock');
        _lock.append('svg')
            .attr('class', 'svg-icon')
            .classed('icon-unlock', true)
            .attr('viewBox', '0 0 48 48')
            .append('use')
            .attr('xlink:href', '#icon-unlock');
        
        if (!_isLocked) {
            _parent.on("preRender.color", function(chart) {
                chart.colorDomain(d3.extent(data ? data : chart.data(), chart.colorAccessor()));
            });
            _parent.on("preRedraw.color", function(chart) {
                chart.colorDomain(d3.extent(data ? data : chart.data(), chart.colorAccessor()));
            });
        } else {
            _parent.on("preRender.color", null);
            _parent.on("preRedraw.color", null);
        }
    }

    function toggleLock() {
        _isLocked = !_isLocked;

        if (!_isLocked) {
            // must use .dataAsync
            _parent.colorDomain(d3.extent(_parent.data(), _parent.colorAccessor()));  
        }
        _parent.redraw();
    }

    function onChange (e) {
        var parseVal = function(val) {
            return parseFloat(val.replace(/,/g, ''));
        }
        var currVal = d3.select(this).attr('value');
        var startVal = parseVal(_wrapper.select('.legend-item:first-child .legend-input input').node().value);
        var endVal = parseVal(_wrapper.select('.legend-item:last-child .legend-input input').node().value);

        if (!isNaN(startVal) && !isNaN(endVal)) {
            _isLocked = true;
            _parent.colorDomain([startVal, endVal])
                .on("preRedraw.color", null)
                .redraw();
        } else {
            d3.select(this).property('value', currVal);
        }
    }

    return _legend;
};

