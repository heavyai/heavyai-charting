/******************************************************************************
 * OVERRIDE: dc.dataGrid                                                      *
 * ***************************************************************************/
dc.dataGrid = function (parent, chartGroup) {
    var LABEL_CSS_CLASS = 'dc-grid-label';
    var ITEM_CSS_CLASS = 'dc-grid-item';
    var GROUP_CSS_CLASS = 'dc-grid-group';
    var GRID_CSS_CLASS = 'dc-grid-top';

    var _chart = dc.baseMixin({});

    var _size = 999; // shouldn't be needed, but you might
    var _html = function (d) { return 'you need to provide an html() handling param:  ' + JSON.stringify(d); };
    var _sortBy = function (d) {
        return d;
    };
    var _order = d3.ascending;
    var _beginSlice = 0, _endSlice;

    var _htmlGroup = function (d) {
        return '<div class=\'' + GROUP_CSS_CLASS + '\'><h1 class=\'' + LABEL_CSS_CLASS + '\'>' +
            _chart.keyAccessor()(d) + '</h1></div>';
    };

    _chart._doRender = function () {
        _chart.selectAll('div.' + GRID_CSS_CLASS).remove();

        renderItems(renderGroups());

        return _chart;
    };

    function renderGroups () {
        var groups = _chart.root().selectAll('div.' + GRID_CSS_CLASS)
                .data(nestEntries(), function (d) {
                    return _chart.keyAccessor()(d);
                });

        var itemGroup = groups
                .enter()
                .append('div')
                .attr('class', GRID_CSS_CLASS);

        if (_htmlGroup) {
            itemGroup
                .html(function (d) {
                    return _htmlGroup(d);
                });
        }

        groups.exit().remove();
        return itemGroup;
    }

    function nestEntries () {
        var entries = _chart.dimension().top(_size);

        return d3.nest()
            .key(_chart.group())
            .sortKeys(_order)
            .entries(entries.sort(function (a, b) {
                return _order(_sortBy(a), _sortBy(b));
            }).slice(_beginSlice, _endSlice));
    }

    function renderItems (groups) {
        var items = groups.order()
                .selectAll('div.' + ITEM_CSS_CLASS)
                .data(function (d) {
                    return d.values;
                });

        items.enter()
            .append('div')
            .attr('class', ITEM_CSS_CLASS)
            .html(function (d) {
                return _html(d);
            });

        items.exit().remove();

        return items;
    }

    _chart._doRedraw = function () {
        return _chart._doRender();
    };

    _chart.beginSlice = function (beginSlice) {
        if (!arguments.length) {
            return _beginSlice;
        }
        _beginSlice = beginSlice;
        return _chart;
    };

    _chart.endSlice = function (endSlice) {
        if (!arguments.length) {
            return _endSlice;
        }
        _endSlice = endSlice;
        return _chart;
    };

    _chart.size = function (size) {
        if (!arguments.length) {
            return _size;
        }
        _size = size;
        return _chart;
    };

    _chart.html = function (html) {
        if (!arguments.length) {
            return _html;
        }
        _html = html;
        return _chart;
    };

    _chart.htmlGroup = function (htmlGroup) {
        if (!arguments.length) {
            return _htmlGroup;
        }
        _htmlGroup = htmlGroup;
        return _chart;
    };

    _chart.sortBy = function (sortByFunction) {
        if (!arguments.length) {
            return _sortBy;
        }
        _sortBy = sortByFunction;
        return _chart;
    };

    _chart.order = function (order) {
        if (!arguments.length) {
            return _order;
        }
        _order = order;
        return _chart;
    };

    return _chart.anchor(parent, chartGroup);
};
/******************************************************************************
 * END OVERRIDE: dc.dataGrid                                                  *
 * ***************************************************************************/

