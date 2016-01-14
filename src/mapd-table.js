dc.mapdTable = function (parent, chartGroup) {

    var _chart = dc.baseMixin({});
    var _tableWrapper = null;

    var _size = 25;
    var _columns = [];
    var _order = d3.ascending;


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


    _chart.setDataAsync(function(group, callbacks) {
        if (_order === d3.ascending) {
            _chart.dimension().bottomAsync(_size, undefined, undefined, callbacks);
        }
        else {
            _chart.dimension().topAsync(_size, undefined, undefined, callbacks);
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

        renderTable();

        return _chart;
    };


    function renderTable() {

        var data = _chart.dimension().top(_size);

        var keys = [];
        for (var key in data[0]) {      
            if (data[0].hasOwnProperty(key) && key.indexOf('col') >= 0) keys.push(key);
        }

        var table = _chart.tableWrapper().select('table').html('');

        var tableHeader = table.append('tr').selectAll('th')
            .data(keys)
            .enter();

        tableHeader.append('th')
            .text(function(d, i){
                return _columns[i];
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
                    onClickCell(_columns[index],d[key], typeof d[key]); 

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
                dockedHeader.style('left', function(){
                   return '-' + _tableWrapper.select('.md-table-scroll').node().scrollLeft + 'px';
                });
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
                    .on('click', function(){
                        _tableWrapper.selectAll('.table-sort')
                            .classed('active asc desc', false);

                        if (_sortColumn && _sortColumn.index === i) {

                            _sortColumn =  _sortColumn.order === 'desc' ? {index: i , order: 'asc'} : null;

                        } else {
                            _sortColumn =  {index: i, order: 'desc'};
                        }

                        var elm = d3.select(this);
                        
                        elm.classed('active', _sortColumn ? true: false)
                            .classed(_sortColumn ? _sortColumn.order : '',  true);

                    })
                    .style('width', d3.select(this).node().getBoundingClientRect().width + 'px');


                var textSpan = sortLabel.append('span')
                    .text(_columns[i]);

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

    function onClickCell(name, value, type) {

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
