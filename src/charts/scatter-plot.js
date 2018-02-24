import coordinateGridMixin from "../mixins/coordinate-grid-mixin"
import d3 from "d3"
import { events } from "../core/events"
import { filters } from "../core/filters"
import { constants, override, transition } from "../core/core"
/**
 * A scatter plot chart
 *
 * Examples:
 * - {@link http://dc-js.github.io/dc.js/examples/scatter.html Scatter Chart}
 * - {@link http://dc-js.github.io/dc.js/examples/multi-scatter.html Multi-Scatter Chart}
 * @name scatterPlot
 * @memberof dc
 * @mixes dc.coordinateGridMixin
 * @example
 * // create a scatter plot under #chart-container1 element using the default global chart group
 * var chart1 = dc.scatterPlot('#chart-container1');
 * // create a scatter plot under #chart-container2 element using chart group A
 * var chart2 = dc.scatterPlot('#chart-container2', 'chartGroupA');
 * // create a sub-chart under a composite parent chart
 * var chart3 = dc.scatterPlot(compositeChart);
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/mbostock/d3/wiki/Selections#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @return {dc.scatterPlot}
 */
export default function scatterPlot(parent, chartGroup) {
  const _chart = coordinateGridMixin({})
  const _symbol = d3.svg.symbol()

  let _existenceAccessor = function(d) {
    return d.value
  }

  const originalKeyAccessor = _chart.keyAccessor()
  _chart.keyAccessor(d => originalKeyAccessor(d)[0])
  _chart.valueAccessor(d => originalKeyAccessor(d)[1])
  _chart.colorAccessor(() => _chart._groupName)

  const _locator = function(d) {
    return (
      "translate(" +
      _chart.x()(_chart.keyAccessor()(d)) +
      "," +
      _chart.y()(_chart.valueAccessor()(d)) +
      ")"
    )
  }

  let _symbolSize = 3
  let _highlightedSize = 5
  let _hiddenSize = 0

  _symbol.size(function(d) {
    if (!_existenceAccessor(d)) {
      return _hiddenSize
    } else if (this.filtered) {
      return Math.pow(_highlightedSize, 2)
    } else {
      return Math.pow(_symbolSize, 2)
    }
  })

  override(_chart, "_filter", function(filter) {
    if (!arguments.length) {
      return _chart.__filter()
    }

    return _chart.__filter(filters.RangedTwoDimensionalFilter(filter))
  })

  _chart.plotData = function() {
    const symbols = _chart
      .chartBodyG()
      .selectAll("path.symbol")
      .data(_chart.data())

    symbols
      .enter()
      .append("path")
      .attr("class", "symbol")
      .attr("opacity", 0)
      .attr("fill", _chart.getColor)
      .attr("transform", _locator)

    transition(symbols, _chart.transitionDuration())
      .attr("opacity", d => (_existenceAccessor(d) ? 1 : 0))
      .attr("fill", _chart.getColor)
      .attr("transform", _locator)
      .attr("d", _symbol)

    transition(symbols.exit(), _chart.transitionDuration())
      .attr("opacity", 0)
      .remove()
  }

  /**
   * Get or set the existence accessor.  If a point exists, it is drawn with
   * {@link #dc.scatterPlot+symbolSize symbolSize} radius and
   * opacity 1; if it does not exist, it is drawn with
   * {@link #dc.scatterPlot+hiddenSize hiddenSize} radius and opacity 0. By default,
   * the existence accessor checks if the reduced value is truthy.
   * @name existenceAccessor
   * @memberof dc.scatterPlot
   * @instance
   * @see {@link #dc.scatterPlot+symbolSize symbolSize}
   * @see {@link #dc.scatterPlot+hiddenSize hiddenSize}
   * @example
   * // default accessor
   * chart.existenceAccessor(function (d) { return d.value; });
   * @param {Function} [accessor]
   * @return {Function}
   * @return {dc.scatterPlot}
   */
  _chart.existenceAccessor = function(accessor) {
    if (!arguments.length) {
      return _existenceAccessor
    }
    _existenceAccessor = accessor
    return this
  }

  /**
   * Get or set the symbol type used for each point. By default the symbol is a circle.
   * Type can be a constant or an accessor.
   * @name symbol
   * @memberof dc.scatterPlot
   * @instance
   * @see {@link https://github.com/mbostock/d3/wiki/SVG-Shapes#symbol_type d3.svg.symbol().type()}
   * @example
   * // Circle type
   * chart.symbol('circle');
   * // Square type
   * chart.symbol('square');
   * @param {String|Function} [type='circle']
   * @return {String|Function}
   * @return {dc.scatterPlot}
   */
  _chart.symbol = function(type) {
    if (!arguments.length) {
      return _symbol.type()
    }
    _symbol.type(type)
    return _chart
  }

  /**
   * Set or get radius for symbols.
   * @name symbolSize
   * @memberof dc.scatterPlot
   * @instance
   * @see {@link https://github.com/mbostock/d3/wiki/SVG-Shapes#symbol_size d3.svg.symbol().size()}
   * @param {Number} [symbolSize=3]
   * @return {Number}
   * @return {dc.scatterPlot}
   */
  _chart.symbolSize = function(symbolSize) {
    if (!arguments.length) {
      return _symbolSize
    }
    _symbolSize = symbolSize
    return _chart
  }

  /**
   * Set or get radius for highlighted symbols.
   * @name highlightedSize
   * @memberof dc.scatterPlot
   * @instance
   * @see {@link https://github.com/mbostock/d3/wiki/SVG-Shapes#symbol_size d3.svg.symbol().size()}
   * @param {Number} [highlightedSize=5]
   * @return {Number}
   * @return {dc.scatterPlot}
   */
  _chart.highlightedSize = function(highlightedSize) {
    if (!arguments.length) {
      return _highlightedSize
    }
    _highlightedSize = highlightedSize
    return _chart
  }

  /**
   * Set or get radius for symbols when the group is empty.
   * @name hiddenSize
   * @memberof dc.scatterPlot
   * @instance
   * @see {@link https://github.com/mbostock/d3/wiki/SVG-Shapes#symbol_size d3.svg.symbol().size()}
   * @param {Number} [hiddenSize=0]
   * @return {Number}
   * @return {dc.scatterPlot}
   */
  _chart.hiddenSize = function(hiddenSize) {
    if (!arguments.length) {
      return _hiddenSize
    }
    _hiddenSize = hiddenSize
    return _chart
  }

  _chart.legendables = function() {
    return [
      { chart: _chart, name: _chart._groupName, color: _chart.getColor() }
    ]
  }

  _chart.legendHighlight = function(d) {
    resizeSymbolsWhere(
      symbol => symbol.attr("fill") === d.color,
      _highlightedSize
    )
    _chart
      .selectAll(".chart-body path.symbol")
      .filter(function() {
        return d3.select(this).attr("fill") !== d.color
      })
      .classed("fadeout", true)
  }

  _chart.legendReset = function(d) {
    resizeSymbolsWhere(symbol => symbol.attr("fill") === d.color, _symbolSize)
    _chart
      .selectAll(".chart-body path.symbol")
      .filter(function() {
        return d3.select(this).attr("fill") !== d.color
      })
      .classed("fadeout", false)
  }

  function resizeSymbolsWhere(condition, size) {
    const symbols = _chart
      .selectAll(".chart-body path.symbol")
      .filter(function() {
        return condition(d3.select(this))
      })
    const oldSize = _symbol.size()
    _symbol.size(Math.pow(size, 2))
    transition(symbols, _chart.transitionDuration()).attr("d", _symbol)
    _symbol.size(oldSize)
  }

  _chart.setHandlePaths = function() {
    // no handle paths for poly-brushes
  }

  _chart.extendBrush = function() {
    const extent = _chart.brush().extent()
    if (_chart.round()) {
      extent[0] = extent[0].map(_chart.round())
      extent[1] = extent[1].map(_chart.round())

      _chart
        .g()
        .select(".brush")
        .call(_chart.brush().extent(extent))
    }
    return extent
  }

  _chart.brushIsEmpty = function(extent) {
    return (
      _chart.brush().empty() ||
      !extent ||
      extent[0][0] >= extent[1][0] ||
      extent[0][1] >= extent[1][1]
    )
  }

  function resizeFiltered(filter) {
    const symbols = _chart
      .selectAll(".chart-body path.symbol")
      .each(function(d) {
        this.filtered = filter && filter.isFiltered(d.key)
      })

    transition(symbols, _chart.transitionDuration()).attr("d", _symbol)
  }

  _chart._brushing = function() {
    const extent = _chart.extendBrush()

    _chart.redrawBrush(_chart.g())

    if (_chart.brushIsEmpty(extent)) {
      events.trigger(() => {
        _chart.filterAll()
        _chart.redrawGroup()
      })

      resizeFiltered(false)
    } else {
      const ranged2DFilter = filters.RangedTwoDimensionalFilter(extent)
      events.trigger(() => {
        _chart.filterAll()
        _chart.filter(ranged2DFilter)
        _chart.redrawGroup()
      }, constants.EVENT_DELAY)

      resizeFiltered(ranged2DFilter)
    }
  }

  _chart.setBrushY = function(gBrush) {
    gBrush.call(_chart.brush().y(_chart.y()))
  }

  return _chart.anchor(parent, chartGroup)
}
