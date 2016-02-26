dc.mapdTable = function (parent, chartGroup) {

    var _chart = dc.baseMixin({});
    var _tableWrapper = null;

    var _size = 25;
    var _offset = 0;
    var _debounce = false;
    var _columns = [];

    var _filteredColumns = {};
    var _columnFilterMap = {};
    var _tableFilter = null;

    var _sortColumn = null;

    _chart.columnFilterMap = function (_) {
        if (!arguments.length) {
            return _columnFilterMap;
        }
        _columnFilterMap = _;
        return _chart;
    };

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

    var addRowsCallback = function(data){
        _chart.dataCache = _chart.dataCache.concat(data)
        _chart._doRedraw();
        _debounce = false;
    }

    _chart.addRows = function(){

        _offset += _size;
        _chart.dimension().topAsync(_size, _offset, undefined, [addRowsCallback]);
        _debounce = true;

    }

    _chart.data(function() {

        if (!_chart.dataCache) {

            _chart.dataCache = _sortColumn ? (_sortColumn.order === 'desc' ? _chart.dimension().order(_sortColumn.col).top(_size + _offset, 0) : _chart.dimension().order(_sortColumn.col).bottom(_size + _offset, 0)) : _chart.dimension().order(null).top(_size + _offset, 0);
        }

        return _chart.dataCache;
    });

    _chart.setDataAsync(function(group,callbacks) {
        
        _offset = 0;

        if (_sortColumn) {

            if (_sortColumn.order === 'desc') {
                _chart.dimension().order(_sortColumn.col).topAsync(_size, _offset, undefined, callbacks);
            } else {
                _chart.dimension().order(_sortColumn.col).bottomAsync(_size, _offset, undefined, callbacks);
            }

        } else {
            _chart.dimension().order(null).topAsync(_size, _offset, undefined, callbacks);
        }
        if (_tableWrapper) {
            _tableWrapper.select('.md-table-scroll').node().scrollTop = 0;
        }

    });

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
    }

    _chart._doRender = function () {
        
        if (!_tableWrapper) {
            _tableWrapper = _chart.root().append('div')
                .attr('class',  'md-table-wrapper');

            _tableWrapper.append('div')
                .attr('class', 'md-header-spacer');

            _tableWrapper.append('div')
                .attr('class', 'md-table-scroll')
                .append('table');

            _tableWrapper.append('div')
                .attr('class',  'md-table-header')
        }

        _debounce = false;

        renderTable();

        return _chart;
    };


    function renderTable() {

        var data = _chart.data();

        var table = _chart.tableWrapper().select('table').html('');

        if (data.length === 0) {
            return;
        }


        var keys = _chart.dimension().getProjectOn();
        

        var tableHeader = table.append('tr').selectAll('th')
            .data(keys)
            .enter();

        tableHeader.append('th')
            .text(function(d){
                
                return d.split(' as')[0];
            })

        var tableRows = table.selectAll('.table-row')
            .data(data)
            .enter();


        var rowItem = tableRows.append('tr');

        keys.forEach(function(key, i){
            rowItem.append('td')
                .text(function(d){
                    return d[key];
                })
                .attr('data-index', i)
                .on('click', function(d) {
                    
                    var index = parseInt(d3.select(this).attr('data-index'))
                    onClickCell(_columns[index],d[key], typeof d[key], index); 

                })
                .classed('filtered', function(){
                    return _columns[i] in _filteredColumns;
                });
        });

        var dockedHeader = _chart.tableWrapper().select('.md-table-header').html('')
            .append('div')
            .attr('class', 'docked-table-header')
            .style('left', function(){
               return '-' + _tableWrapper.select('.md-table-scroll').node().scrollLeft + 'px';
            });;


        _chart.tableWrapper().select('.md-table-scroll')
            .on('scroll', function(){

                dockedHeader.style('left',  '-' + d3.select(this).node().scrollLeft + 'px');

                var scrollHeight = d3.select(this).node().scrollTop + d3.select(this).node().getBoundingClientRect().height;

                if (!_debounce && table.node().scrollHeight <=  scrollHeight + scrollHeight/5) {
                    _chart.addRows();
                }

            });

        table.selectAll('th')
            .each(function(d, i){
                var headerItem = dockedHeader.append('div')
                    .attr('class','table-header-item')
                    .classed('isFiltered', function(){
                        return _columns[i] in _filteredColumns;
                    });

                var sortLabel = headerItem.append('div')
                    .attr('class', 'table-sort')
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

                        dc.redrawAll();

                    })
                    .style('width', d3.select(this).node().getBoundingClientRect().width + 'px');


                var textSpan = sortLabel.append('span')
                    .text(d.split(' as')[0]);

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
                    .attr('data-index', i)
                    .on('click', function(){
                        var index = parseInt(d3.select(this).attr('data-index'))

                        _chart.removeFilteredColumn(_columns[index]);
                        clearColFilter(index); 
                    })
                    .style('left', textSpan.node().getBoundingClientRect().width + 20 + 'px')
                    .append('svg')
                    .attr('class', 'svg-icon')
                    .classed('icon-unfilter', true)
                    .attr('viewBox', '0 0 48 48')
                    .append('use')
                    .attr('xlink:href', '#icon-unfilter');

            });

    }


 

    function onClickCell(name, value, type, index) {

      var val = value;
      var dateFormat = d3.time.format.utc("%Y-%m-%d");
      var timeFormat = d3.time.format.utc("%Y-%m-%d %H:%M:%S");

      if (Object.prototype.toString.call(val) === '[object Date]') {

        val = "DATE '" + dateFormat(val) + "'";

      }
      else if (type === 'string') {
        if (val !== null) {
          val = "'" + val.replace(/'/g, "''") + "'";
        }
      }

      _chart.addFilteredColumn(name);
      _columnFilterMap[name] = val;

      _tableFilter.filter(computeTableFilter(_columnFilterMap));

      dc.redrawAll();

    }


    function clearColFilter(columnId) {
      
      var expr = _columns[columnId];
      delete _columnFilterMap[expr];
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

  
    _chart.columns = function (columns) {
        if (!arguments.length) {
            return _columns;
        }
        _columns = columns;
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
