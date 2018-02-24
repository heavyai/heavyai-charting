import {
  checkIfTimeBinInRange,
  createBinParams
} from "../utils/binning-helpers"
import { pluck, utils } from "../utils/utils"
import d3 from "d3"
import { override } from "../core/core"
import { multipleKeysAccessorForStack } from "../utils/multiple-key-accessors"

/**
 * Stack Mixin is an mixin that provides cross-chart support of stackability using d3.layout.stack.
 * @name stackMixin
 * @memberof dc
 * @mixin
 * @param {Object} _chart
 * @return {dc.stackMixin}
 */

export default function stackMixin(_chart) {
  function prepareValues(layer, layerIdx) {
    const valAccessor = layer.accessor || _chart.valueAccessor()
    layer.name = String(layer.name || "series_" + (layerIdx + 1))
    layer.layer = layer.name
    layer.idx = layerIdx

    /* OVERRIDE ---------------------------------------------------------------- */
    // WARNING: probably destroys stack functionality: find workaround
    const preValues =
      _chart.dataCache != null ? _chart.dataCache : layer.group.all()
    // layer.values = layer.group.all().map(function (d, i) {
    layer.values = preValues.map((d, i) => ({
      x: _chart.keyAccessor()(d, i),
      y: layer.hidden ? null : valAccessor(d, i) || 0,
      idx: layerIdx,
      data: d,
      layer: layer.name,
      hidden: layer.hidden
    }))
    /* ------------------------------------------------------------------------- */
    layer.values = layer.values.filter(domainFilter())
    return layer.values
  }

  let _stackLayout = d3.layout.stack().values(prepareValues)

  let _stack = []
  let _titles = {}

  let _hidableStacks = false
  let _colorByLayerId = false

  function domainFilter() {
    if (!_chart.x()) {
      return d3.functor(true)
    }
    const xDomain = _chart.x().domain()
    if (_chart.isOrdinal()) {
      // TODO #416
      // var domainSet = d3.set(xDomain);
      return function() {
        return true // domainSet.has(p.x);
      }
    }
    if (_chart.elasticX()) {
      return function() {
        return true
      }
    }
    return function(p) {
      return true
    }
  }

  /**
   * Stack a new crossfilter group onto this chart with an optional custom value accessor. All stacks
   * in the same chart will share the same key accessor and therefore the same set of keys.
   *
   * For example, in a stacked bar chart, the bars of each stack will be positioned using the same set
   * of keys on the x axis, while stacked vertically. If name is specified then it will be used to
   * generate the legend label.
   * @name stack
   * @memberof dc.stackMixin
   * @instance
   * @see {@link https://github.com/square/crossfilter/wiki/API-Reference#group-map-reduce crossfilter.group}
   * @example
   * // stack group using default accessor
   * chart.stack(valueSumGroup)
   * // stack group using custom accessor
   * .stack(avgByDayGroup, function(d){return d.value.avgByDay;});
   * @param {crossfilter.group} group
   * @param {String} [name]
   * @param {Function} [accessor]
   * @return {Array<{group: crossfilter.group, name: String, accessor: Function}>}
   * @return {dc.stackMixin}
   */
  _chart.stack = function(group, name, accessor) {
    if (!arguments.length) {
      return _stack
    }

    if (arguments.length <= 2) {
      accessor = name
    }

    const layer = { group }
    if (typeof name === "string") {
      layer.name = name
    }
    if (typeof accessor === "function") {
      layer.accessor = accessor
    }
    _stack.push(layer)

    return _chart
  }

  override(_chart, "group", function(g, n, f) {
    if (!arguments.length) {
      return _chart._group()
    }
    _stack = []
    _titles = {}
    _chart.stack(g, n)
    if (f) {
      _chart.valueAccessor(f)
    }
    return _chart._group(g, n)
  })

  /**
   * Allow named stacks to be hidden or shown by clicking on legend items.
   * This does not affect the behavior of hideStack or showStack.
   * @name hidableStacks
   * @memberof dc.stackMixin
   * @instance
   * @param {Boolean} [hidableStacks=false]
   * @return {Boolean}
   * @return {dc.stackMixin}
   */
  _chart.hidableStacks = function(hidableStacks) {
    if (!arguments.length) {
      return _hidableStacks
    }
    _hidableStacks = hidableStacks
    return _chart
  }

  function findLayerByName(n) {
    const i = _stack.map(pluck("name")).indexOf(n)
    return _stack[i]
  }

  /**
   * Hide all stacks on the chart with the given name.
   * The chart must be re-rendered for this change to appear.
   * @name hideStack
   * @memberof dc.stackMixin
   * @instance
   * @param {String} stackName
   * @return {dc.stackMixin}
   */
  _chart.hideStack = function(stackName) {
    const layer = findLayerByName(stackName)
    if (layer) {
      layer.hidden = true
    }
    return _chart
  }

  /**
   * Show all stacks on the chart with the given name.
   * The chart must be re-rendered for this change to appear.
   * @name showStack
   * @memberof dc.stackMixin
   * @instance
   * @param {String} stackName
   * @return {dc.stackMixin}
   */
  _chart.showStack = function(stackName) {
    const layer = findLayerByName(stackName)
    if (layer) {
      layer.hidden = false
    }
    return _chart
  }

  _chart.getValueAccessorByIndex = function(index) {
    return _stack[index].accessor || _chart.valueAccessor()
  }

  _chart.yAxisMin = function() {
    const min = d3.min(flattenStack(), p => {
      /* OVERRIDE ---------------------------------------------------------------- */
      if (_chart.renderArea === undefined || _chart.renderArea()) {
        return p.y + p.y0 < p.y0 ? p.y + p.y0 : p.y0
      } else {
        return p.y
      }
    })
    /* ------------------------------------------------------------------------- */

    return utils.subtract(min, _chart.yAxisPadding())
  }

  _chart.yAxisMax = function() {
    const max = d3.max(flattenStack(), p => {
      /* OVERRIDE ---------------------------------------------------------------- */
      if (_chart.renderArea === undefined || _chart.renderArea()) {
        return p.y + p.y0
      } else {
        return p.y
      }
      /* ------------------------------------------------------------------------- */
    })

    return utils.add(max, _chart.yAxisPadding())
  }

  function flattenStack() {
    const valueses = _chart.data().map(layer => layer.values)
    return Array.prototype.concat.apply([], valueses)
  }

  _chart.xAxisMin = function() {
    const min = d3.min(flattenStack(), pluck("x"))
    return utils.subtract(min, _chart.xAxisPadding())
  }

  _chart.xAxisMax = function() {
    const max = d3.max(flattenStack(), pluck("x"))
    return utils.add(max, _chart.xAxisPadding())
  }

  /**
   * Set or get the title function. Chart class will use this function to render svg title (usually interpreted by
   * browser as tooltips) for each child element in the chart, i.e. a slice in a pie chart or a bubble in a bubble chart.
   * Almost every chart supports title function however in grid coordinate chart you need to turn off brush in order to
   * use title otherwise the brush layer will block tooltip trigger.
   *
   * If the first argument is a stack name, the title function will get or set the title for that stack. If stackName
   * is not provided, the first stack is implied.
   * @name title
   * @memberof dc.stackMixin
   * @instance
   * @example
   * // set a title function on 'first stack'
   * chart.title('first stack', function(d) { return d.key + ': ' + d.value; });
   * // get a title function from 'second stack'
   * var secondTitleFunction = chart.title('second stack');
   * @param {String} [stackName]
   * @param {Function} [titleAccessor]
   * @return {String}
   * @return {dc.stackMixin}
   */
  override(_chart, "title", (stackName, titleAccessor) => {
    if (!stackName) {
      return _chart._title()
    }

    if (typeof stackName === "function") {
      return _chart._title(stackName)
    }
    if (
      stackName === _chart._groupName &&
      typeof titleAccessor === "function"
    ) {
      return _chart._title(titleAccessor)
    }

    if (typeof titleAccessor !== "function") {
      return _titles[stackName] || _chart._title()
    }

    _titles[stackName] = titleAccessor

    return _chart
  })

  /**
   * Gets or sets the stack layout algorithm, which computes a baseline for each stack and
   * propagates it to the next
   * @name stackLayout
   * @memberof dc.stackMixin
   * @instance
   * @see {@link http://github.com/mbostock/d3/wiki/Stack-Layout d3.layout.stack}
   * @param {Function} [stack=d3.layout.stack]
   * @return {Function}
   * @return {dc.stackMixin}
   */
  _chart.stackLayout = function(stack) {
    if (!arguments.length) {
      return _stackLayout
    }
    _stackLayout = stack
    return _chart
  }

  function visability(l) {
    return !l.hidden
  }

  _chart.data(() => {
    const layers = _stack.filter(visability)
    return layers.length ? _chart.stackLayout()(layers) : []
  })

  _chart._ordinalXDomain = function() {
    const flat = flattenStack().map(pluck("data"))
    const ordered = _chart._computeOrderedGroups(flat)
    return ordered.map(_chart.keyAccessor())
  }

  _chart.colorByLayerId = function(_) {
    if (!arguments.length) {
      return _colorByLayerId
    }
    _colorByLayerId = _
    return _chart
  }

  _chart.colorAccessor(function(d) {
    /* OVERRIDE ---------------------------------------------------------------- */
    let layer = null
    if (_colorByLayerId) {
      layer = this.idx
    } else {
      layer = this.layer || this.name || d.name || d.layer
    }
    /* ------------------------------------------------------------------------- */
    return layer
  })

  _chart.legendables = function() {
    return _stack.map((layer, i) => ({
      chart: _chart,
      name: layer.name,
      hidden: layer.hidden || false,
      color: _chart.getColor.call(layer, layer.values, i)
    }))
  }

  _chart.isLegendableHidden = function(d) {
    const layer = findLayerByName(d.name)
    return layer ? layer.hidden : false
  }

  _chart.legendToggle = function(d) {
    if (_hidableStacks) {
      if (_chart.isLegendableHidden(d)) {
        _chart.showStack(d.name)
      } else {
        _chart.hideStack(d.name)
      }
      _chart.renderGroup()
    }
  }

  override(_chart, "binParams", function(binParams) {
    if (!arguments.length) {
      return _chart.group().binParams()
    }

    binParams = Array.isArray(binParams) ? binParams : [binParams]

    const parsedBinParams = binParams.map(param => {
      if (param) {
        const { timeBin = "auto", binBounds, numBins, auto } = param
        const extract = param.extract || false
        const isDate = binBounds[0] instanceof Date
        if (isDate && timeBin && !extract) {
          const bounds = binBounds.map(date => date.getTime())
          return Object.assign({}, param, {
            extract,
            timeBin: checkIfTimeBinInRange(bounds, timeBin, numBins),
            binBounds: binBounds.slice()
          })
        } else {
          return param
        }
      }
      return null
    })

    return createBinParams(_chart, parsedBinParams)
  })

  _chart.keyAccessor(multipleKeysAccessorForStack)

  return _chart
}
