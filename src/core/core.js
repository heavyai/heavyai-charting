import { utils } from "../utils/utils"

let _logging = false
let _sampledCount = 0
let _refreshDisabled = false
let _globalTransitionDuration = null
let _renderlet = null
let _disableTransitions = false

export const constants = {
  CHART_CLASS: "dc-chart",
  DEBUG_GROUP_CLASS: "debug",
  STACK_CLASS: "stack",
  DESELECTED_CLASS: "deselected",
  SELECTED_CLASS: "selected",
  NODE_INDEX_NAME: "__index__",
  GROUP_INDEX_NAME: "__group_index__",
  DEFAULT_CHART_GROUP: "__default_chart_group__",
  NEGLIGIBLE_NUMBER: 1e-10,
  ACCENT_CLASS: "accented",
  EVENT_DELAY: 0
}

export function logging(_) {
  if (!arguments.length) {
    return _logging
  }
  _logging = _
}

export function sampledCount(_) {
  if (!arguments.length) {
    return _sampledCount
  }
  _sampledCount = _
}

export function incrementSampledCount() {
  return _sampledCount++
}

export function decrementSampledCount() {
  return _sampledCount--
}

export function refreshDisabled(_) {
  if (!arguments.length) {
    return _refreshDisabled
  }
  _refreshDisabled = _
}

export function disableRefresh() {
  _refreshDisabled = true
}

export function enableRefresh() {
  _refreshDisabled = false
}

export function globalTransitionDuration(_) {
  if (!arguments.length) {
    return _globalTransitionDuration
  }
  _globalTransitionDuration = _
}

export function disableTransitions(_) {
  if (!arguments.length) {
    return _disableTransitions
  }
  _disableTransitions = _
}

export const chartRegistry = (function() {
  // chartGroup:string => charts:array
  let _chartMap = {}

  function initializeChartGroup(group) {
    if (!group) {
      group = constants.DEFAULT_CHART_GROUP
    }

    if (!_chartMap[group]) {
      _chartMap[group] = []
    }

    return group
  }

  return {
    has(chart) {
      for (const e in _chartMap) {
        if (_chartMap[e].indexOf(chart) >= 0) {
          return true
        }
      }
      return false
    },

    register(chart, group) {
      if (Array.isArray(group)) {
        group.forEach(g => _chartMap[initializeChartGroup(g)].push(chart))
      } else {
        _chartMap[initializeChartGroup(group)].push(chart)
      }
    },

    deregister(chart, group) {
      if (Array.isArray(group)) {
        group.forEach(g => {
          group = initializeChartGroup(g)
          for (let i = 0; i < _chartMap[group].length; i++) {
            if (_chartMap[group][i].anchorName() === chart.anchorName()) {
              _chartMap[group].splice(i, 1)
              break
            }
          }
        })
      } else {
        group = initializeChartGroup(group)
        for (let i = 0; i < _chartMap[group].length; i++) {
          if (_chartMap[group][i].anchorName() === chart.anchorName()) {
            _chartMap[group].splice(i, 1)
            break
          }
        }
      }
    },

    clear(group) {
      if (Array.isArray(group)) {
        group.forEach(g => delete _chartMap[g])
      } else if (group) {
        delete _chartMap[group]
      } else {
        _chartMap = {}
      }
    },

    list(group) {
      if (Array.isArray(group)) {
        return group
          .reduce(
            (accum, g) => [...accum, ..._chartMap[initializeChartGroup(g)]],
            []
          )
          .filter((item, i, self) => self.indexOf(item) === i)
      } else {
        group = initializeChartGroup(group)
        return _chartMap[group]
      }
    },

    listAll() {
      return Object.keys(_chartMap)
        .reduce((accum, key) => accum.concat(_chartMap[key]), [])
        .filter((item, i, self) => self.indexOf(item) === i)
    }
  }
})()

export function registerChart(chart, group) {
  chartRegistry.register(chart, group)
}

export function getChart(dcFlag) {
  return chartRegistry
    .listAll()
    .reduce((accum, chrt) => (chrt.__dcFlag__ === dcFlag ? chrt : accum), null)
}

export function deregisterChart(chart, group) {
  chartRegistry.deregister(chart, group)
}

export function hasChart(chart) {
  return chartRegistry.has(chart)
}

export function deregisterAllCharts(group) {
  chartRegistry.clear(group)
}

/**
 * Clear all filters on all charts within the given chart group. If the chart group is not given then
 * only charts that belong to the default chart group will be reset.
 * @memberof dc
 * @name filterAll
 * @param {String} [group]
 */
export function filterAll(group) {
  const charts = chartRegistry.list(group)
  for (let i = 0; i < charts.length; ++i) {
    charts[i].filterAll()
  }
}

/**
 * Reset zoom level / focus on all charts that belong to the given chart group. If the chart group is
 * not given then only charts that belong to the default chart group will be reset.
 * @memberof dc
 * @name refocusAll
 * @param {String} [group]
 */
export function refocusAll(group) {
  const charts = chartRegistry.list(group)
  for (let i = 0; i < charts.length; ++i) {
    if (charts[i].focus) {
      charts[i].focus()
    }
  }
}

export function transition(selections, duration, callback, name) {
  if (duration <= 0 || duration === undefined || _disableTransitions) {
    return selections
  }

  const s = selections.transition(name).duration(duration)

  if (typeof callback === "function") {
    callback(s)
  }

  return s
}

/* somewhat silly, but to avoid duplicating logic */
export function optionalTransition(enable, duration, callback, name) {
  if (enable) {
    return function(selection) {
      return transition(selection, duration, callback, name)
    }
  } else {
    return function(selection) {
      return selection
    }
  }
}

// See http://stackoverflow.com/a/20773846
export function afterTransition(_transition, callback) {
  if (_transition.empty() || !_transition.duration) {
    callback.call(_transition)
  } else {
    let n = 0
    _transition
      .each(() => {
        ++n
      })
      .each("end", () => {
        if (!--n) {
          callback.call(_transition)
        }
      })
  }
}

/**
 * @name units
 * @memberof dc
 * @type {{}}
 */
export const units = {}

/**
 * The default value for {@link #dc.coordinateGridMixin+xUnits .xUnits} for the
 * {@link #dc.coordinateGridMixin Coordinate Grid Chart} and should
 * be used when the x values are a sequence of integers.
 * It is a function that counts the number of integers in the range supplied in its start and end parameters.
 * @name integers
 * @memberof units
 * @see {@link #dc.coordinateGridMixin+xUnits coordinateGridMixin.xUnits}
 * @example
 * chart.xUnits(units.integers) // already the default
 * @param {Number} start
 * @param {Number} end
 * @return {Number}
 */
units.integers = function(start, end) {
  return Math.abs(end - start)
}

/**
 * This argument can be passed to the {@link #dc.coordinateGridMixin+xUnits .xUnits} function of the to
 * specify ordinal units for the x axis. Usually this parameter is used in combination with passing
 * {@link https://github.com/mbostock/d3/wiki/Ordinal-Scales d3.scale.ordinal} to
 * {@link #dc.coordinateGridMixin+x .x}.
 * It just returns the domain passed to it, which for ordinal charts is an array of all values.
 * @name ordinal
 * @memberof units
 * @see {@link https://github.com/mbostock/d3/wiki/Ordinal-Scales d3.scale.ordinal}
 * @see {@link #dc.coordinateGridMixin+xUnits coordinateGridMixin.xUnits}
 * @see {@link #dc.coordinateGridMixin+x coordinateGridMixin.x}
 * @example
 * chart.xUnits(dc.units.ordinal)
 *      .x(d3.scale.ordinal())
 * @param {*} start
 * @param {*} end
 * @param {Array<String>} domain
 * @return {Array<String>}
 */
units.ordinal = function(start, end, domain) {
  return domain
}

/**
 * @name fp
 * @memberof units
 * @type {{}}
 */
units.fp = {}
/**
 * This function generates an argument for the {@link #dc.coordinateGridMixin Coordinate Grid Chart}
 * {@link #dc.coordinateGridMixin+xUnits .xUnits} function specifying that the x values are floating-point
 * numbers with the given precision.
 * The returned function determines how many values at the given precision will fit into the range
 * supplied in its start and end parameters.
 * @name precision
 * @memberof units.fp
 * @see {@link #dc.coordinateGridMixin+xUnits coordinateGridMixin.xUnits}
 * @example
 * // specify values (and ticks) every 0.1 units
 * chart.xUnits(units.fp.precision(0.1)
 * // there are 500 units between 0.5 and 1 if the precision is 0.001
 * var thousandths = units.fp.precision(0.001);
 * thousandths(0.5, 1.0) // returns 500
 * @param {Number} precision
 * @return {Function} start-end unit function
 */
units.fp.precision = function(precision) {
  var _f = function(s, e) {
    const d = Math.abs((e - s) / _f.resolution)
    if (utils.isNegligible(d - Math.floor(d))) {
      return Math.floor(d)
    } else {
      return Math.ceil(d)
    }
  }
  _f.resolution = precision
  return _f
}

export const round = {}
round.floor = function(n) {
  return Math.floor(n)
}
round.ceil = function(n) {
  return Math.ceil(n)
}
round.round = function(n) {
  return Math.round(n)
}

export function override(obj, functionName, newFunction) {
  const existingFunction = obj[functionName]
  obj["_" + functionName] = existingFunction
  obj[functionName] = newFunction
}

export function renderlet(_) {
  if (!arguments.length) {
    return _renderlet
  }
  _renderlet = _
}

export function instanceOfChart(o) {
  return o instanceof Object && o.__dcFlag__ && true
}
