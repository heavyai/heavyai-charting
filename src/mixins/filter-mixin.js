import {
  isArrayOfObjects,
  normalizeArrayByValue
} from "../utils/formatting-helpers"
import { events } from "../core/events"

const noop = () => {} // eslint-disable-line no-empty-function

export function addFilterHandler(filters, filter) {
  if (isArrayOfObjects(filter)) {
    filters.push(filter.map(f => (f === null ? null : f.value)))
  } else {
    filters.push(filter)
  }
  return filters
}

/**
 * hasFilterHandler
 * - if testValue is undefined, checks to see if the chart has any active filters
 * - if testValue is defined, checks to see if that testValue passes the active filter
 *
 * @param {*} filters - the chart's current filter
 * @param {*} testValue - a value being tested to see if it passes the filter
 *
 *  - If chart values are not binned:
 *      - Params will be an array of values
 *      - e.g. [4,22,100] - and values 4, 22, and 100 will be selected in table chart
 *        with all other values deselected
 *  - If chart values are binned, params will be an array of arrays
 *      - Inner arrays will represent a range of values
 *      - e.g. [[19,27]] - the bin with values from 19 to 27 will be selected, with
 *        all others being deselected
 */
export function hasFilterHandler(filters, testValue) {
  if (typeof testValue === "undefined") {
    return filters.length > 0
  } else {
    return testIfValueWithinFilters(filters, testValue)
  }
}

function testIfValueWithinFilters(filters, testValue) {
  testValue = Array.isArray(testValue)
    ? testValue.map(normalizeArrayByValue)
    : testValue
  const filtersWithIsoDates = convertAllDatesToISOString(filters)
  const testValueWithISODates = convertAllDatesToISOString(testValue)
  return filtersWithIsoDates.some(
    f => testValueWithISODates <= f && testValueWithISODates >= f
  )
}

function convertAllDatesToISOString(a) {
  if (Array.isArray(a)) {
    // Assuming array can only have up to one level of nested arrays
    return a.map(value => {
      if (Array.isArray(value)) {
        return value.map(v => {
          if (v instanceof Date) {
            return v.toISOString()
          }
        })
      }
      return value instanceof Date ? value.toISOString() : value
    })
  }
  return a instanceof Date ? a.toISOString() : a
}

export function filterHandlerWithChartContext(_chart) {
  return function filterHandler(dimension, filters) {
    if (dimension.type === "crossfilter") {
      return filters
    }

    if (filters.length === 0) {
      dimension.filterAll(_chart.softFilterClear())
      if (_chart.clearTableFilter) {
        _chart.clearTableFilter() // global filter also will clear all the columns filters on the table
      }
    } else if (_chart.hasOwnProperty("rangeFocused")) {
      dimension.filterMulti(
        filters,
        _chart.rangeFocused(),
        _chart.filtersInverse(),
        _chart.group().binParams()
      )
    } else if (
      _chart.getFilteredColumns &&
      Object.keys(_chart.getFilteredColumns()).length > 0
    ) {
      // case for column filtering on measures
      return filters
    } else {
      dimension.filterMulti(
        filters,
        undefined,
        _chart.filtersInverse(),
        _chart.group().binParams()
      ) // eslint-disable-line no-undefined
    }
    return filters
  }
}

export default function filterMixin(_chart) {
  let _filters = []
  let softFilterClear = false
  let areFiltersInverse = false
  let _hasFilterHandler = noop

  _chart.filters = function() {
    return _filters
  }

  _chart.replaceFilter = function(_) {
    _filters = []
    _chart.filter(_)
  }

  _chart.softFilterClear = function(val) {
    if (!arguments.length) {
      return softFilterClear
    }
    softFilterClear = val
    return _chart
  }

  _chart.filtersInverse = function(isInverse) {
    if (!arguments.length) {
      return areFiltersInverse
    }
    areFiltersInverse = isInverse
    return _chart
  }

  /**
   * Clear all filters associated with this chart
   *
   * The same can be achieved by calling {@link #dc.baseMixin+filter chart.filter(Symbol.for("clear"))}.
   * @name filterAll
   * @memberof dc.baseMixin
   * @instance
   * @return {dc.baseMixin}
   */
  _chart.filterAll = function(_softFilterClear) {
    if (_softFilterClear) {
      _chart.softFilterClear(true)
    } else {
      _chart.softFilterClear(false)
    }
    return _chart.filter(Symbol.for("clear"))
  }

  _chart.filterHandler(filterHandlerWithChartContext(_chart))

  _chart.addFilterHandler(addFilterHandler)

  _chart.hasFilter = function(filter) {
    return _hasFilterHandler(_filters, filter)
  }

  _chart.hasFilterHandler = function(handler) {
    if (!arguments.length) {
      return _hasFilterHandler
    }
    _hasFilterHandler = handler
    return _chart
  }

  _chart.hasFilterHandler(hasFilterHandler)

  function applyFilters() {
    if (_chart.dimension() && _chart.dimension().filter) {
      const fs = _chart.filterHandler()(_chart.dimension(), _filters)
      _filters = fs ? fs : _filters
    }
  }

  _chart.filter = function(filter, isFilterInverse = false) {
    if (!arguments.length) {
      return _filters.length > 0 ? _filters[0] : null
    }

    if (Array.isArray(filter) && filter.length === 1) {
      filter = filter[0]
    } else if (Array.isArray(filter)) {
      filter = filter.map(
        filter =>
          // eslint-disable-line no-shadow, arrow-body-style
          Array.isArray(filter) && filter.length === 1 ? filter[0] : filter
      )
    }

    if (isFilterInverse !== _chart.filtersInverse()) {
      _filters = _chart.resetFilterHandler()(_filters)
      _chart.filtersInverse(isFilterInverse)
    }

    if (
      filter === Symbol.for("clear") ||
      (Array.isArray(filter) && filter.length === 0)
    ) {
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

  /**
   * Filters chart on click. Determines if filter is inverse and passes
   * that information to _chart.filter. Calls _chart.redrawGroup at the end.
   * @name handleFilterClick
   * @memberof dc.baseMixin
   * @instance
   * @example
   * chart.handleFilterClick(d3.event, filter);
   * @param {d3.event} event
   * @param {dc filter} filter
   * @return {dc.baseMixin}
   */
  _chart.handleFilterClick = function(event, filter) {
    if (event.defaultPrevented) {
      return
    }
    const isInverseFilter = event.metaKey || event.ctrlKey
    events.trigger(() => {
      _chart.filter(filter, isInverseFilter)
      _chart.redrawGroup()
    })
  }

  return _chart
}
