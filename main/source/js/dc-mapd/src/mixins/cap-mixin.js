/******************************************************************************
 * OVERRIDE: dc.capMixin                                                      *
 * ***************************************************************************/
dc.capMixin = function (_chart) {

    var _cap = Infinity;

    var _othersLabel = 'Others';

    var _othersGrouper = function (topRows) {
        var topRowsSum = d3.sum(topRows, _chart.valueAccessor()),
            allRows = _chart.group().all(),
            allRowsSum = d3.sum(allRows, _chart.valueAccessor()),
            topKeys = topRows.map(_chart.keyAccessor()),
            allKeys = allRows.map(_chart.keyAccessor()),
            topSet = d3.set(topKeys),
            others = allKeys.filter(function (d) {return !topSet.has(d);});
        if (allRowsSum > topRowsSum) {
            return topRows.concat([{'others': others, 'key': _othersLabel, 'value': allRowsSum - topRowsSum}]);
        }
        return topRows;
    };

    _chart.cappedKeyAccessor = function (d, i) {
        if (d.others) {

/* OVERRIDE ---------------------------------------------------------------- */
            return d.key0;
/* ------------------------------------------------------------------------- */

        }
        return _chart.keyAccessor()(d, i);
    };

    _chart.cappedValueAccessor = function (d, i) {
        if (d.others) {
            return d.value;
        }
        return _chart.valueAccessor()(d, i);
    };

/* OVERRIDE EXTEND --------------------------------------------------------- */
    _chart.setDataAsync(function(group, callbacks) {
      if (_cap === Infinity) {
          group.allAsync(callbacks);
      }
      else {
          group.topAsync(_cap, undefined, callbacks)
      }
    });

    if (!dc.async) {
      _chart.data(function (group) {
          if (_cap === Infinity) {
            if (_chart.dataCache != null)
              return _chart._computeOrderedGroups(_chart.dataCache);
            else
              return _chart._computeOrderedGroups(group.all());
          } else {
            var topRows = null
            if (_chart.dataCache != null)
                topRows = _chart.dataCache;
            else
              topRows = group.top(_cap); // ordered by crossfilter group order (default value)
             topRows = _chart._computeOrderedGroups(topRows); // re-order using ordering (default key)
              if (_othersGrouper) {
                  return _othersGrouper(topRows);
              }
              return topRows;
          }
      });
    }
    else {
      _chart.data(function(group, callbacks) {
          if (_cap === Infinity) {
            callbacks.push(_chart.computeOrderedGroups.bind(this));
            group.allAsync(callbacks);
            return;
          }
          else {
            callbacks.push(capCallback.bind(this));
          }
        });

      _chart.capCallback = function(data, callbacks) {
        var topRows = _chart._computeOrderedGroups(data);
        if (_othersGrouper) {
          return _othersGrouper(topRows);
        }
        return topRows;
      }
    }
/* ------------------------------------------------------------------------- */

    _chart.cap = function (count) {
        if (!arguments.length) {
            return _cap;
        }
        _cap = count;
        return _chart;
    };

    _chart.othersLabel = function (label) {
        if (!arguments.length) {
            return _othersLabel;
        }
        _othersLabel = label;
        return _chart;
    };

    _chart.othersGrouper = function (grouperFunction) {
        if (!arguments.length) {
            return _othersGrouper;
        }
        _othersGrouper = grouperFunction;
        return _chart;
    };

    dc.override(_chart, 'onClick', function (d) {
        if (d.others) {
            _chart.filter([d.others]);
        }
        _chart._onClick(d);
    });

    return _chart;
};
/******************************************************************************
 * END OVERRIDE: dc.capMixin                                                  *
 * ***************************************************************************/

