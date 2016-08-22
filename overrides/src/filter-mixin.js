import {isArrayOfObjects, normalizeArray} from "./formatting-helpers"

const noop = () => {} // eslint-disable-line no-empty-function

export function addFilterHandler (filters, filter) {
  if (isArrayOfObjects(filter)) {
    filters.push(filter.map(f => f.value))
  } else {
    filters.push(filter)
  }
  return filters
}

export function hasFilterHandler (filters, filter) {
  if (filter === null || typeof filter === "undefined") {
    return filters.length > 0
  } else if (Array.isArray(filter)) {
    filter = filter.map(normalizeArray)
    return filters.some(f => filter <= f && filter >= f)
  } else {
    return filters.some(f => filter <= f && filter >= f)
  }
}

export function filterHandlerWithChartContext (_chart) {
  return function filterHandler (dimension, filters) {
    if (dimension.type === "crossfilter") {
      return filters
    }
    if (filters.length === 0) {
      dimension.filterAll(_chart.softFilterClear())
    } else if (_chart.hasOwnProperty("rangeFocused")) {
      dimension.filterMulti(filters, _chart.rangeFocused(), _chart.filtersInverse())
    } else {
      dimension.filterMulti(filters, undefined, _chart.filtersInverse()) // eslint-disable-line no-undefined
    }
    return filters
  }
}

export default function filterMixin (_chart) {
  let _filters = []
  let softFilterClear = false
  let areFiltersInverse = false
  let _hasFilterHandler = noop

  _chart.filters = function () {
    return _filters
  }

  _chart.replaceFilter = function (_) {
    _filters = []
    _chart.filter(_)
  }

  _chart.softFilterClear = function (val) {
    if (!arguments.length) {
      return softFilterClear
    }
    softFilterClear = val
    return _chart
  }

  _chart.filtersInverse = function (isInverse) {
    if (!arguments.length) {
      return areFiltersInverse
    }
    areFiltersInverse = isInverse
    return _chart
  }

  /**
   * Clear all filters associated with this chart
   *
   * The same can be achieved by calling {@link #dc.baseMixin+filter chart.filter(null)}.
   * @name filterAll
   * @memberof dc.baseMixin
   * @instance
   * @return {dc.baseMixin}
   */
  _chart.filterAll = function (_softFilterClear) {
    if (_softFilterClear) {
      _chart.softFilterClear(true)
    } else {
      _chart.softFilterClear(false)
    }
    return _chart.filter(null)
  }

  _chart.filterHandler(filterHandlerWithChartContext(_chart))

  _chart.addFilterHandler(addFilterHandler)

  _chart.hasFilter = function (filter) {
    return _hasFilterHandler(_filters, filter)
  }

  _chart.hasFilterHandler = function (handler) {
    if (!arguments.length) {
      return _hasFilterHandler
    }
    _hasFilterHandler = handler
    return _chart
  }

  _chart.hasFilterHandler(hasFilterHandler)

  function applyFilters () {
    if (_chart.dimension() && _chart.dimension().filter) {
      const fs = _chart.filterHandler()(_chart.dimension(), _filters)
      _filters = fs ? fs : _filters
    }
  }

  _chart.filter = function (filter, isFilterInverse) {
    if (!arguments.length) {
      return _filters.length > 0 ? _filters[0] : null
    }
    isFilterInverse = typeof isFilterInverse === "undefined" ? false : isFilterInverse
    if (isFilterInverse !== _chart.filtersInverse()) {
      _filters = _chart.resetFilterHandler()(_filters)
      _chart.filtersInverse(isFilterInverse)
    }

    if (filter instanceof Array && filter[0] instanceof Array && !filter.isFiltered) {
      filter[0].forEach(d => {
        if (_chart.hasFilter(d)) {
          _chart.removeFilterHandler()(_filters, d)
        } else {
          _chart.addFilterHandler()(_filters, d)
        }
      })
    } else if (filter === null || Array.isArray(filter) && filter.length === 0) {
      _filters = _chart.resetFilterHandler()(_filters)
    } else if (_chart.hasFilter(filter)) {
      _chart.removeFilterHandler()(_filters, filter)
    } else {
      _chart.addFilterHandler()(_filters, filter)
    }

    applyFilters()
    _chart._invokeFilteredListener(filter, isFilterInverse)

    if (_chart.root() !== null && _chart.hasFilter()) {
      _chart.turnOnControls()
    } else {
      _chart.turnOffControls()
    }

    return _chart
  }

  return _chart
}
