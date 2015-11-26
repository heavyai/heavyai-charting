/* ****************************************************************************
 * OVERRIDE: dc.legend
 * ***************************************************************************/
dc.legendContinuous = function () {
    var LABEL_GAP = 2;
    var _legend = {},
        _parent,
        _x = 0,
        _y = 0,
        _itemHeight = 12,
        _gap = 5,
        _horizontal = false,
        _legendWidth = 560,
        _itemWidth = 70,
        _autoItemWidth = false;

    var _g;

/* OVERRIDE -----------------------------------------------------------------*/
    var _wrapper;
    var _lock;
    var _lockable = true;
    var _isLocked = false;
/* --------------------------------------------------------------------------*/

    _legend.parent = function (p) {
        if (!arguments.length) {
            return _parent;
        }
        _parent = p;
        return _legend;
    };

    _legend.render = function () {

/* OVERRIDE -----------------------------------------------------------------*/
        _parent.root().select('.legend-cont').remove();

        _wrapper = _parent.root().append('div')
            .attr('class', 'legend-cont')
            .style('display', _parent.colorByExpr() === null ? 'none': 'block');

        var title = _wrapper.append('div')
            .attr('class', 'legend-title')
            .text(_parent.colorByExpr());

        var legendGroup = _wrapper.append('div')
            .attr('class', 'legend-group');

        if (_lockable) {
            generateLock();
        } 

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

        legendGroup.selectAll('.legend-item:first-child .legend-label, .legend-item:last-child .legend-label')
            .append('div')
            .attr('class', 'legend-input')
            .append('input')
            .attr('value', function(d){ return d ? d.value : 0;})
            .on('focus', function(){ this.select();})
            .on('change', onChange);

    };

    function legendItemHeight () {
        return _gap + _itemHeight;
    }

    _legend.x = function (x) {
        if (!arguments.length) {
            return _x;
        }
        _x = x;
        return _legend;
    };

    _legend.y = function (y) {
        if (!arguments.length) {
            return _y;
        }
        _y = y;
        return _legend;
    };

    _legend.gap = function (gap) {
        if (!arguments.length) {
            return _gap;
        }
        _gap = gap;
        return _legend;
    };

    _legend.itemHeight = function (itemHeight) {
        if (!arguments.length) {
            return _itemHeight;
        }
        _itemHeight = itemHeight;
        return _legend;
    };

    _legend.horizontal = function (horizontal) {
        if (!arguments.length) {
            return _horizontal;
        }
        _horizontal = horizontal;
        return _legend;
    };

    _legend.legendWidth = function (legendWidth) {
        if (!arguments.length) {
            return _legendWidth;
        }
        _legendWidth = legendWidth;
        return _legend;
    };

    _legend.itemWidth = function (itemWidth) {
        if (!arguments.length) {
            return _itemWidth;
        }
        _itemWidth = itemWidth;
        return _legend;
    };

    _legend.autoItemWidth = function (autoItemWidth) {
        if (!arguments.length) {
            return _autoItemWidth;
        }
        _autoItemWidth = autoItemWidth;
        return _legend;
    };
/* OVERRIDE -----------------------------------------------------------------*/
    function generateLock () {
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
        return _lock;
    }

    function toggleLock() {
        _isLocked = _isLocked ? false : true;
        _lock.classed('js-isLocked', _isLocked);

        if (_isLocked) {
            _parent.legendLock()();
        } else {
            _parent.legendUnlock()(true);
        }
        
    }

    function onChange () {
        var startVal = _wrapper.select('.legend-item:first-child .legend-input input')[0][0].value;
        var endVal = _wrapper.select('.legend-item:last-child .legend-input input')[0][0].value;

        _parent.legendInputChange()([startVal,endVal], _parent.colors().range().length);
    
        _isLocked = true;
        _lock.classed('js-isLocked', _isLocked);
    }

/* --------------------------------------------------------------------------*/

    return _legend;
};
/* ****************************************************************************
 * END OVERRIDE: dc.legend
 * ***************************************************************************/

