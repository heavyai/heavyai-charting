var dc = require("../../mapdc")
import d3 from "d3"
export default function mapdTable (parent, chartGroup) {
    var _chart = dc.baseMixin({});
    var _tableWrapper = null;

    var _size = 50;
    var _offset = 0;
    var _scrollTop = 0;
    var _pauseAutoLoad = false;

    var _filteredColumns = {};
    var _columnFilterMap = {};
    var _tableFilter = null;
    var _sortColumn = null;
    var _dimOrGroup = null;
    var _isGroupedData = false;
    var _allowUngroupedSort = false;

    var _table_events = ['sort']
    var _listeners = d3.dispatch.apply(d3, _table_events)
    var _on = _chart.on.bind(_chart)

    _chart.on = function (event, listener) {
        if (_table_events.indexOf(event) === -1) {
            _on(event, listener)
        } else {
            _listeners.on(event, listener);
        }
        return _chart;
    };

    _chart._invokeSortListener = function (f) {
        if (f !== "undefined") {
            _listeners.sort(_chart, f);
        }
    };

    _chart.resetTable = function(){
        _chart.root().html('');
    }

    _chart.tableFilter = function (_) {
        if (!arguments.length) {
            return _tableFilter;
        }
        _tableFilter = _;
        return _chart;
    };

    _chart.sortColumn = function (_) {
        if (!arguments.length) {
            return _sortColumn;
        }
        _sortColumn = _;
        return _chart;
    };

    _chart.tableWrapper = function (_) {
        if (!arguments.length) {
            return _tableWrapper;
        }
        _tableWrapper = _;
        return _chart;
    };

    var addRowsCallback = function(err, data){
        if (data.length > 0) {
            _pauseAutoLoad = false;
            _chart.dataCache = _chart.dataCache.concat(data);
            _chart._doRedraw();
        }
    }

    _chart.addRows = function(){
        _pauseAutoLoad = true;

        _offset += _size;

        getData("async", _size, _offset, addRowsCallback);
    }

    _chart.setDataAsync(function(group, callback) {
        var size = resetTableStateReturnSize();
        getData("async", size, 0, callback);
    });

    _chart.data(function() {
        if (!_chart.dataCache) {
            var size = resetTableStateReturnSize();
            _chart.dataCache = getData("sync", size, 0, null);
         }
        return _chart.dataCache;
    });

    function getData(method, size, offset, callback) {
        _isGroupedData = _chart.dimension().value()[0];

        _dimOrGroup =  _isGroupedData ? _chart.group() : _chart.dimension();

        _dimOrGroup.order(_sortColumn ? _sortColumn.col.name : null);

        var sortFuncName = _sortColumn && _sortColumn.order === 'asc' ? 'bottomAsync' : 'topAsync';

        if (method === 'sync') {
            return _dimOrGroup[sortFuncName.replace('Async', '')](size, 0);
        } else {
            _dimOrGroup[sortFuncName](size, offset, undefined, callback);
        }
    }


    function resetTableStateReturnSize() {
        _pauseAutoLoad = false;

        if (!_isGroupedData && _tableWrapper) {
            _tableWrapper.select('.md-table-scroll').node().scrollTop = 0;
        }
        var size = _size;

        if (_isGroupedData) {
            size = _offset !==0 ? _offset : size;
        } else {
            _offset = 0;
        }
        return size;
    }

    _chart.addFilteredColumn = function(columnName) {
      _filteredColumns[columnName] = null;
    };

    _chart.removeFilteredColumn = function(columnName) {
      delete _filteredColumns[columnName];
    };

    _chart.clearFilteredColumns = function() {
      _filteredColumns = {};
    };

    _chart.getFilteredColumns = function() {
      return _filteredColumns;
    };

    _chart.clearTableFilter = function () {
        _columnFilterMap = {};
        _chart.clearFilteredColumns();
        _tableFilter.filter();
    };

    _chart._doRender = function () {

        if (!_tableWrapper) {
            _chart.resetTable();
            _tableWrapper = _chart.root().append('div')
                .attr('class', 'md-table-wrapper');

            _tableWrapper.append('div')
                .attr('class', 'md-header-spacer');

            _tableWrapper.append('div')
                .attr('class', 'md-table-scroll')
                .append('table');

            _tableWrapper.append('div')
                .attr('class', 'md-table-header')
        }

        renderTable();

        if (_isGroupedData) {
            _tableWrapper.select('.md-table-scroll').node().scrollTop = _scrollTop;
        }

        if (!_pauseAutoLoad) {
            shouldLoadMore();
        }

        return _chart;
    };

    function shouldLoadMore() {
        var scrollDivNode = _tableWrapper.select('.md-table-scroll').node();
        var tableNode = _tableWrapper.select('table').node();
        if (tableNode.scrollHeight > 0 && tableNode.scrollHeight <= scrollDivNode.scrollTop + scrollDivNode.getBoundingClientRect().height + 18) {
            _chart.addRows();
        }
    }

    function renderTable() {

        var data = _chart.data();

        var table = _chart.tableWrapper().select('table').html('');

        if (data.length === 0) {
            return;
        }

        var cols = [];

        if (_isGroupedData) {
            _chart.dimension().value().forEach(function(d, i){
                cols.push({expression: d, name: 'key'+i });
            });
            _chart.group().reduce().forEach(function(d){
                if (d.expression) {
                    cols.push({expression: d.expression, name: d.name, agg_mode: d.agg_mode });
                }
            });

        } else {
            cols = _chart.dimension().getProjectOn().map(function(d){
                var splitStr = d.split(' as ');
                return {expression: splitStr[0], name: splitStr[1]};
            });
        }

        var tableHeader = table.append('tr').selectAll('th')
            .data(cols)
            .enter();

        tableHeader.append('th')
            .text(function(d){ return (d.agg_mode ? d.agg_mode.toUpperCase() : '') + ' ' + d.expression });

        var tableRows = table.selectAll('.table-row')
            .data(data)
            .enter();

        var rowItem = tableRows.append('tr')
            .attr("class", function(d){
                var tableRowCls = "table-row ";
                if (_isGroupedData) {
                    tableRowCls += "grouped-data ";

                    if (_chart.hasFilter()) {
                        var keyArray = []
                        for (var key in d) {
                            if (d.hasOwnProperty(key) && key.includes('key')) {
                               keyArray.push(d[key])
                            }
                        }
                        tableRowCls += !_chart.hasFilter(keyArray) ^ _chart.filtersInverse()  ? 'deselected' : 'selected'
                    }
                }
                return tableRowCls;
            });

        cols.forEach(function(col, i){
            rowItem.append('td')
                .text(function(d){
                    return d[col.name];
                })
                .classed('filtered', col.expression in _filteredColumns)
                .on('click', function(d){
                    if (_isGroupedData) {
                        _chart.onClick(d);
                    }
                    else if (col.expression in _filteredColumns) {
                        clearColFilter(col.expression);
                    } else {
                        filterCol(col.expression, d[col.name]);
                    }
                });
        });

        var dockedHeader = _chart.tableWrapper().select('.md-table-header').html('')
            .append('div')
            .attr('class', 'docked-table-header')
            .style('left', function(){
               return '-' + _tableWrapper.select('.md-table-scroll').node().scrollLeft + 'px';
            });

        _chart.tableWrapper().select('.md-table-scroll')
            .on('scroll', function(){
                dockedHeader.style('left',  '-' + d3.select(this).node().scrollLeft + 'px');

                var tableScrollElm = d3.select(this).node();

                if (!_pauseAutoLoad) {
                    var scrollHeight = tableScrollElm.scrollTop + tableScrollElm.getBoundingClientRect().height;

                    if (tableScrollElm.scrollTop > _scrollTop && table.node().scrollHeight <= scrollHeight + scrollHeight/5) {
                        _chart.addRows();
                    }
                }

                _scrollTop = tableScrollElm.scrollTop;
            });

        table.selectAll('th')
            .each(function(d, i){
                var headerItem = dockedHeader.append('div')
                    .attr('class','table-header-item')
                    .classed('isFiltered', function(){
                        return d.expression in _filteredColumns;
                    });

                var sortLabel = headerItem.append('div')
                    .attr('class', 'table-sort')
                    .classed('disabled', !_isGroupedData)
                    .classed('active', _sortColumn ? _sortColumn.index === i : false)
                    .classed(_sortColumn ? _sortColumn.order : '',  true)
                    .on('click', function(){
                        _tableWrapper.selectAll('.table-sort')
                            .classed('active asc desc', false);

                        if (_sortColumn && _sortColumn.index === i) {
                            _sortColumn =  _sortColumn.order === 'desc' ? {index: i, col: d,  order: 'asc'} : null;
                        } else {
                            _sortColumn =  {index: i, col: d, order: 'desc'};
                        }

                        _chart._invokeSortListener(_sortColumn)
                        dc.redrawAll();
                    })
                    .style('width', d3.select(this).node().getBoundingClientRect().width + 'px');


                var textSpan = sortLabel.append('span')
                    .text((d.agg_mode ? d.agg_mode.toUpperCase() : '') + ' ' + d.expression);

                var sortButton = sortLabel.append('div')
                    .attr('class', 'sort-btn');


                sortButton.append('svg')
                    .attr('class', 'svg-icon')
                    .classed('icon-sort', true)
                    .attr('viewBox', '0 0 48 48')
                    .append('use')
                    .attr('xlink:href', '#icon-sort');

                sortButton.append('svg')
                    .attr('class', 'svg-icon')
                    .classed('icon-sort-arrow', true)
                    .attr('viewBox', '0 0 48 48')
                    .append('use')
                    .attr('xlink:href', '#icon-arrow1');

                var unfilterButton = headerItem.append('div')
                    .attr('class', 'unfilter-btn')
                    .attr('data-expr', d.expression)
                    .on('click', function(){
                        clearColFilter(d3.select(this).attr('data-expr'));
                    })
                    .style('left', textSpan.node().getBoundingClientRect().width + (_isGroupedData ? 20 : 8) + 'px')
                    .append('svg')
                    .attr('class', 'svg-icon')
                    .classed('icon-unfilter', true)
                    .attr('viewBox', '0 0 48 48')
                    .append('use')
                    .attr('xlink:href', '#icon-unfilter');
            });

    }

    function filterCol(expr, val) {

      var dateFormat = d3.time.format.utc("%Y-%m-%d");
      var timeFormat = d3.time.format.utc("%Y-%m-%d %H:%M:%S");

      if (Object.prototype.toString.call(val) === '[object Date]') {
        val = "DATE '" + dateFormat(val) + "'";
      }
      else if (val && typeof val === 'string') {
          val = "'" + val.replace(/'/g, "''") + "'";
      }

      _chart.addFilteredColumn(expr);
      _columnFilterMap[expr] = val;
      _tableFilter.filter(computeTableFilter(_columnFilterMap));

      dc.redrawAll();
    }


    function clearColFilter(expr) {
      delete _columnFilterMap[expr];
      _chart.removeFilteredColumn(expr);
      _tableFilter.filter(computeTableFilter(_columnFilterMap));
      dc.redrawAll();
    }

    function computeTableFilter (columnFilterMap) { // should use class variables?
        var filter = "";
        var subFilterExpression = null;

        for (var expr in columnFilterMap) {
          if (columnFilterMap[expr] === "null") { // null gets translated to "null" by this point
            subFilterExpression = expr + " IS null";
          }
          else {
            subFilterExpression = expr + " = " + columnFilterMap[expr];
          }

          if (filter == "") {
            filter += subFilterExpression;
          }
          else {
            filter += " AND " + subFilterExpression;
          }
        }
        return filter;
    }

    _chart._doRedraw = function () {
        return _chart._doRender();
    };

    _chart.size = function (size) {
        if (!arguments.length) {
            return _size;
        }
        _size = size;
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
