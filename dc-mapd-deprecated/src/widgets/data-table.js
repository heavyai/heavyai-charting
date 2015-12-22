/******************************************************************************
 * OVERRIDE: dc.dataTable                                                     *
 * ***************************************************************************/
dc.dataTable = function (parent, chartGroup) {
    var LABEL_CSS_CLASS = 'dc-table-label';
    var ROW_CSS_CLASS = 'dc-table-row';
    var COLUMN_CSS_CLASS = 'dc-table-column';
    var GROUP_CSS_CLASS = 'dc-table-group';
    var HEAD_CSS_CLASS = 'dc-table-head';

    var _chart = dc.baseMixin({});

    var _size = 25;
    var _columns = [];
    var _sortBy = function (d) {
        return d;
    };
    var _order = d3.ascending;
    var _showGroups = true;

/* OVERRIDE ---------------------------------------------------------------- */
    var _filteredColumns = {};
    var _sampling = false;
/* ------------------------------------------------------------------------- */

/* OVERRIDE EXTEND --------------------------------------------------------- */ 
    _chart.setDataAsync(function(group,callbacks) {
        if (_order === d3.ascending) {
            _chart.dimension().bottomAsync(_size, undefined, undefined, callbacks);
        }
        else {
            _chart.dimension().topAsync(_size, undefined, undefined, callbacks);
        }
    });

    _chart.sampling = function(setting) { // setting should be true or false
        if (!arguments.length) 
            return _sampling;
        if (setting && !_sampling) // if wasn't sampling
            dc._sampledCount++;
        else if (!setting && _sampling)
            dc._sampledCount--;
        _sampling = setting;
        if (_sampling == false)
            _chart.dimension().samplingRatio(null); // unset sampling
        return _chart;
    }

    _chart.addFilteredColumn = function(columnName) {
      _filteredColumns[columnName] = null;
    }

    _chart.removeFilteredColumn = function(columnName) {
      delete _filteredColumns[columnName];
    }

    _chart.clearFilteredColumns = function() {
      _filteredColumns = {};
    }

    _chart.getFilteredColumns = function() {
      return _filteredColumns;
    }

    _chart.addFilterIcons = function(headGroup) {
      for (var c = 0; c < _columns.length; c++) {
        if (_columns[c] in _filteredColumns) {

         $("th", headGroup)
           .eq(c)
           .addClass('column-filtered')
           .append('<div class="column-filter-clear" id="table-column-filter-clear_' + c + '" title="Clear filter" style="cursor:pointer"><i class="fa fa-filter"></i><i class="fa fa-times clear-times-icon" style="margin-left:-3px"></i></div>');

         $("#table-column-filter-clear_" + c).click(function () {
           var columnId = $(this).attr('id').split('_')[1];
           _chart.removeFilteredColumn(_columns[columnId]);
           $(_chart).trigger("column-filter-clear", [columnId]);
           //_chart.redraw();
          });
        }
      }
    }

    _chart.setSample = function () {
        if (_sampling) {
            if (dc._lastFilteredSize == null)
                _chart.dimension().samplingRatio(null);
            else {
                _chart.dimension().samplingRatio(Math.min(_size/dc._lastFilteredSize, 1.0))
            }
        }
    }
/* ------------------------------------------------------------------------- */

    _chart._doRender = function () {
        _chart.selectAll('tbody').remove();

        renderRows(renderGroups());

        return _chart;
    };

    _chart._doColumnValueFormat = function (v, d) {

/* OVERRIDE ---------------------------------------------------------------- */
      if (typeof v === 'string') {
        if (Object.prototype.toString.call(d[v]) === '[object Date]') {
          // below we check to see if time falls evenly on a date - if so don't
          // ouput hours minutes and seconds
          // Might be better to do this by the type of the variable
          var epoch = d[v].getTime() * 0.001;
          if (epoch % 86400 == 0) {
            return moment.utc(d[v]).format('ddd, MMM D YYYY');
          }
          return moment.utc(d[v]).format('ddd, MMM D YYYY, h:mm:ss a');
          //return d[v].toUTCString().slice(0, -4);
        } else {
          return $('<p>' + d[v] +'</p>').linkify().html();
        }
      } else if (typeof v === 'function') {
        return v(d);
      } else { // object - use fn (element 2)
        return v.format(d);
      }
/* ------------------------------------------------------------------------- */

    };

    _chart._doColumnHeaderFormat = function (d) {
        // if 'function', convert to string representation
        // show a string capitalized
        // if an object then display it's label string as-is.
        return (typeof d === 'function') ?
                _chart._doColumnHeaderFnToString(d) :
                ((typeof d === 'string') ?

/* OVERRIDE ---------------------------------------------------------------- */
                 _chart._covertToAlias(d) : String(d.label));
/* ------------------------------------------------------------------------- */

    };

/* OVERRIDE ---------------------------------------------------------------- */
    _chart._covertToAlias = function (s) {
        return aliases[s];
    };
/* ------------------------------------------------------------------------- */

    _chart._doColumnHeaderFnToString = function (f) {
        // columnString(f) {
        var s = String(f);
        var i1 = s.indexOf('return ');
        if (i1 >= 0) {
            var i2 = s.lastIndexOf(';');
            if (i2 >= 0) {
                s = s.substring(i1 + 7, i2);
                var i3 = s.indexOf('numberFormat');
                if (i3 >= 0) {
                    s = s.replace('numberFormat', '');
                }
            }
        }
        return s;
    };

    function renderGroups () {
        var bAllFunctions = true;
        _columns.forEach(function (f) {
            bAllFunctions = bAllFunctions & (typeof f === 'function');
        });

        if (!bAllFunctions) {
            _chart.selectAll('th').remove();

/* OVERRIDE ---------------------------------------------------------------- */
            _chart.selectAll('thead').remove();
            var header = _chart.root().append('thead');
/* ------------------------------------------------------------------------- */

            var headcols = header.selectAll('th')
                .data(_columns);

            var headGroup = headcols
                .enter()
                .append('th');

            headGroup
                .attr('class', HEAD_CSS_CLASS)
                    .html(function (d) {
                        return (_chart._doColumnHeaderFormat(d));

                    });
        }

        var groups = _chart.root().selectAll('tbody')
            .data(nestEntries(), function (d) {
                return _chart.keyAccessor()(d);
            });

        var rowGroup = groups
            .enter()
            .append('tbody');

        if (_showGroups === true) {
            rowGroup
                .append('tr')
                .attr('class', GROUP_CSS_CLASS)
                    .append('td')
                    .attr('class', LABEL_CSS_CLASS)
                    .attr('colspan', _columns.length)
                    .html(function (d) {
                        return _chart.keyAccessor()(d);
                    });
        }

        groups.exit().remove();

/* OVERRIDE ---------------------------------------------------------------- */
        _chart.addFilterIcons(headGroup);
/* ------------------------------------------------------------------------- */

        return rowGroup;
    }

    function nestEntries () {
        var entries;

/* OVERRIDE ---------------------------------------------------------------- */
        if (_chart.dataCache != null) {
            entries = _chart.dataCache;
        } else {
            if (_order === d3.ascending) {
                entries = _chart.dimension().bottom(_size);
            } else {
                entries = _chart.dimension().top(_size);
            }
        }
/* ------------------------------------------------------------------------- */

        return d3.nest()
            .key(_chart.group())
            .sortKeys(_order)
            .entries(entries.sort(function (a, b) {
                return _order(_sortBy(a), _sortBy(b));
            }));
    }

    function renderRows (groups) {
        var rows = groups.order()
            .selectAll('tr.' + ROW_CSS_CLASS)
            .data(function (d) {
                return d.values;
            });

/* OVERRIDE ---------------------------------------------------------------- */
        //var startTime = new Date();
/* ------------------------------------------------------------------------- */

        var rowEnter = rows.enter()
            .append('tr')
            .attr('class', ROW_CSS_CLASS);

        _columns.forEach(function (v, i) {
            rowEnter.append('td')
                .attr('class', COLUMN_CSS_CLASS + ' _' + i)
                .html(function (d) {

/* OVERRIDE ---------------------------------------------------------------- */
                    //return _chart._doColumnValueFormat(v, d);
                    var aliasedColumn = "col" + i;
                    //return "<span>" + _chart._doColumnValueFormat(aliasedColumn, d) + "</span>";
                    return _chart._doColumnValueFormat(aliasedColumn, d);
/* ------------------------------------------------------------------------- */

                });
        });

        rows.exit().remove();

        return rows;
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

    _chart.sortBy = function (sortBy) {
        if (!arguments.length) {
            return _sortBy;
        }
        _sortBy = sortBy;
        return _chart;
    };

    _chart.order = function (order) {
        if (!arguments.length) {
            return _order;
        }
        _order = order;
        return _chart;
    };

/* TODO: --------------------------------------------------------------------*/
// This was either removed or did not exist before dc.mapd.js was written.
    _chart.showGroups = function (showGroups) {
        if (!arguments.length) {
            return _showGroups;
        }
        _showGroups = showGroups;
        return _chart;
    };
/* --------------------------------------------------------------------------*/

    return _chart.anchor(parent, chartGroup);
};
/******************************************************************************
 * END OVERRIDE: dc.dataTable                                                 *
 * ***************************************************************************/
