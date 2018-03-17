import d3 from "d3"
import { override } from "../core/core"
/**
 * Cap is a mixin that groups small data elements below a _cap_ into an *others* grouping for both the
 * Row and Pie Charts.
 *
 * The top ordered elements in the group up to the cap amount will be kept in the chart, and the rest
 * will be replaced with an *others* element, with value equal to the sum of the replaced values. The
 * keys of the elements below the cap limit are recorded in order to filter by those keys when the
 * others* element is clicked.
 * @name capMixin
 * @memberof dc
 * @mixin
 * @param {Object} _chart
 * @return {dc.capMixin}
 */
export default function capMixin(_chart) {
  let _cap
  let _ordering = "desc"

  let _othersLabel = "Others"

  let _othersGrouper = function(topRows) {
    let topRowsSum = d3.sum(topRows, _chart.valueAccessor()),
      allRows = _chart.group().all(),
      allRowsSum = d3.sum(allRows, _chart.valueAccessor()),
      topKeys = topRows.map(_chart.keyAccessor()),
      allKeys = allRows.map(_chart.keyAccessor()),
      topSet = d3.set(topKeys),
      others = allKeys.filter(d => !topSet.has(d))
    if (allRowsSum > topRowsSum) {
      return topRows.concat([
        { others, key: _othersLabel, value: allRowsSum - topRowsSum }
      ])
    }
    return topRows
  }

  _chart._mandatoryAttributes().push("cap")

  _chart.cappedKeyAccessor = function(d, i) {
    if (d.others) {
      /* OVERRIDE ---------------------------------------------------------------- */
      return d.key0
      /* ------------------------------------------------------------------------- */
    }
    return _chart.keyAccessor()(d, i)
  }

  _chart.cappedValueAccessor = function(d, i) {
    if (d.others) {
      return d.value
    }
    return _chart.valueAccessor()(d, i)
  }

  /* OVERRIDE EXTEND --------------------------------------------------------- */
  _chart.ordering = function(order) {
    _chart.expireCache()
    if (!order) {
      return _ordering
    }
    _ordering = order
    return _chart
  }

  _chart.setDataAsync((group, callback) => {
    function resultCallback(error, result) {
      if (error) {
        callback(error)
        return
      }
      const rows = _chart._computeOrderedGroups(result)
      if (_othersGrouper) {
        callback(null, _othersGrouper(rows))
      } else {
        callback(null, rows)
      }
    }

    if (_cap === undefined) {
      if (_chart.dataCache != null) {
        callback(null, _chart._computeOrderedGroups(_chart.dataCache))
      } else {
        group.allAsync((error, result) => {
          if (error) {
            callback(error)
            return
          }
          callback(null, _chart._computeOrderedGroups(result))
        })
      }
    } else if (_chart.dataCache != null) {
      resultCallback(null, _chart.dataCache)
    } else if (_ordering === "desc") {
      return group
        .topAsync(_cap)
        .then(result => {
          resultCallback(null, result)
        })
        .catch(error => {
          resultCallback(error)
        })
    } else if (_ordering === "asc") {
      group.bottomAsync(_cap, undefined, undefined, resultCallback) // ordered by crossfilter group order (default value)
    }
  })

  _chart.expireCache = function() {
    _chart.dataCache = null
  }

  _chart.data(group => {
    if (!_chart.dataCache) {
      console.warn("Empty dataCache. Please fetch new data")
    }
    if (_cap === undefined) {
      return _chart._computeOrderedGroups(_chart.dataCache)
    } else {
      const rows = _chart.dataCache
      if (_othersGrouper) {
        return _othersGrouper(rows)
      }
      return rows
    }
  })

  /* ------------------------------------------------------------------------- */

  /**
   * Get or set the count of elements to that will be included in the cap.
   * @name cap
   * @memberof dc.capMixin
   * @instance
   * @param {Number} [count=Infinity]
   * @return {Number}
   * @return {dc.capMixin}
   */
  _chart.cap = function(count) {
    if (!arguments.length) {
      return _cap
    }
    _cap = count
    _chart.expireCache()
    return _chart
  }

  /**
   * Get or set the label for *Others* slice when slices cap is specified
   * @name othersLabel
   * @memberof dc.capMixin
   * @instance
   * @param {String} [label="Others"]
   * @return {String}
   * @return {dc.capMixin}
   */
  _chart.othersLabel = function(label) {
    if (!arguments.length) {
      return _othersLabel
    }
    _othersLabel = label
    return _chart
  }

  /**
   * Get or set the grouper function that will perform the insertion of data for the *Others* slice
   * if the slices cap is specified. If set to a falsy value, no others will be added. By default the
   * grouper function computes the sum of all values below the cap.
   * @name othersGrouper
   * @memberof dc.capMixin
   * @instance
   * @example
   * // Default others grouper
   * chart.othersGrouper(function (topRows) {
   *    var topRowsSum = d3.sum(topRows, _chart.valueAccessor()),
   *        allRows = _chart.group().all(),
   *        allRowsSum = d3.sum(allRows, _chart.valueAccessor()),
   *        topKeys = topRows.map(_chart.keyAccessor()),
   *        allKeys = allRows.map(_chart.keyAccessor()),
   *        topSet = d3.set(topKeys),
   *        others = allKeys.filter(function (d) {return !topSet.has(d);});
   *    if (allRowsSum > topRowsSum) {
   *        return topRows.concat([{'others': others, 'key': _othersLabel, 'value': allRowsSum - topRowsSum}]);
   *    }
   *    return topRows;
   * });
   * // Custom others grouper
   * chart.othersGrouper(function (data) {
   *     // compute the value for others, presumably the sum of all values below the cap
   *     var othersSum  = yourComputeOthersValueLogic(data)
   *
   *     // the keys are needed to properly filter when the others element is clicked
   *     var othersKeys = yourComputeOthersKeysArrayLogic(data);
   *
   *     // add the others row to the dataset
   *     data.push({'key': 'Others', 'value': othersSum, 'others': othersKeys });
   *
   *     return data;
   * });
   * @param {Function} [grouperFunction]
   * @return {Function}
   * @return {dc.capMixin}
   */
  _chart.othersGrouper = function(grouperFunction) {
    if (!arguments.length) {
      return _othersGrouper
    }
    _othersGrouper = grouperFunction
    return _chart
  }

  override(_chart, "onClick", d => {
    if (d.others) {
      _chart.filter([d.others])
    }
    if (_chart._onClick) {
      _chart._onClick(d)
    }
  })

  return _chart
}
