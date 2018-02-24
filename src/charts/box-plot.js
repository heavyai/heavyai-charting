import { transition, units } from "../core/core"
import coordinateGridMixin from "../mixins/coordinate-grid-mixin"
import d3 from "d3"
import { utils } from "../utils/utils"
/**
 * A box plot is a chart that depicts numerical data via their quartile ranges.
 * @name boxPlot
 * @memberof dc
 * @mixes dc.coordinateGridMixin
 * @example
 * // create a box plot under #chart-container1 element using the default global chart group
 * var boxPlot1 = dc.boxPlot('#chart-container1');
 * // create a box plot under #chart-container2 element using chart group A
 * var boxPlot2 = dc.boxPlot('#chart-container2', 'chartGroupA');
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/mbostock/d3/wiki/Selections#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @return {dc.boxPlot}
 */
export default function boxPlot(parent, chartGroup) {
  const _chart = coordinateGridMixin({})

  // Returns a function to compute the interquartile range.
  function DEFAULT_WHISKERS_IQR(k) {
    return function(d) {
      let q1 = d.quartiles[0],
        q3 = d.quartiles[2],
        iqr = (q3 - q1) * k,
        i = -1,
        j = d.length
      do {
        ++i
      } while (d[i] < q1 - iqr)
      do {
        --j
      } while (d[j] > q3 + iqr)
      return [i, j]
    }
  }

  const _whiskerIqrFactor = 1.5
  const _whiskersIqr = DEFAULT_WHISKERS_IQR
  const _whiskers = _whiskersIqr(_whiskerIqrFactor)

  const _box = d3.box()
  let _tickFormat = null

  let _boxWidth = function(innerChartWidth, xUnits) {
    if (_chart.isOrdinal()) {
      return _chart.x().rangeBand()
    } else {
      return innerChartWidth / (1 + _chart.boxPadding()) / xUnits
    }
  }

  // default padding to handle min/max whisker text
  _chart.yAxisPadding(12)

  // default to ordinal
  _chart.x(d3.scale.ordinal())
  _chart.xUnits(units.ordinal)

  // valueAccessor should return an array of values that can be coerced into numbers
  // or if data is overloaded for a static array of arrays, it should be `Number`.
  // Empty arrays are not included.
  _chart.data(group =>
    group
      .all()
      .map(d => {
        d.map = function(accessor) {
          return accessor.call(d, d)
        }
        return d
      })
      .filter(d => {
        const values = _chart.valueAccessor()(d)
        return values.length !== 0
      })
  )

  /**
   * Get or set the spacing between boxes as a fraction of box size. Valid values are within 0-1.
   * See the {@link https://github.com/mbostock/d3/wiki/Ordinal-Scales#wiki-ordinal_rangeBands d3 docs}
   * for a visual description of how the padding is applied.
   * @name boxPadding
   * @memberof dc.boxPlot
   * @instance
   * @see {@link https://github.com/mbostock/d3/wiki/Ordinal-Scales#wiki-ordinal_rangeBands d3.scale.ordinal.rangeBands}
   * @param {Number} [padding=0.8]
   * @return {Number}
   * @return {dc.boxPlot}
   */
  _chart.boxPadding = _chart._rangeBandPadding
  _chart.boxPadding(0.8)

  /**
   * Get or set the outer padding on an ordinal box chart. This setting has no effect on non-ordinal charts
   * or on charts with a custom {@link #dc.boxPlot+boxWidth .boxWidth}. Will pad the width by
   * `padding * barWidth` on each side of the chart.
   * @name outerPadding
   * @memberof dc.boxPlot
   * @instance
   * @param {Number} [padding=0.5]
   * @return {Number}
   * @return {dc.boxPlot}
   */
  _chart.outerPadding = _chart._outerRangeBandPadding
  _chart.outerPadding(0.5)

  /**
   * Get or set the numerical width of the boxplot box. The width may also be a function taking as
   * parameters the chart width excluding the right and left margins, as well as the number of x
   * units.
   * @example
   * // Using numerical parameter
   * chart.boxWidth(10);
   * // Using function
   * chart.boxWidth((innerChartWidth, xUnits) { ... });
   * @name boxWidth
   * @memberof dc.boxPlot
   * @instance
   * @param {Number|Function} [boxWidth=0.5]
   * @return {Number|Function}
   * @return {dc.boxPlot}
   */
  _chart.boxWidth = function(boxWidth) {
    if (!arguments.length) {
      return _boxWidth
    }
    _boxWidth = d3.functor(boxWidth)
    return _chart
  }

  const boxTransform = function(d, i) {
    const xOffset = _chart.x()(_chart.keyAccessor()(d, i))
    return "translate(" + xOffset + ", 0)"
  }

  _chart._preprocessData = function() {
    if (_chart.elasticX()) {
      _chart.x().domain([])
    }
  }

  _chart.plotData = function() {
    const _calculatedBoxWidth = _boxWidth(
      _chart.effectiveWidth(),
      _chart.xUnitCount()
    )

    _box
      .whiskers(_whiskers)
      .width(_calculatedBoxWidth)
      .height(_chart.effectiveHeight())
      .value(_chart.valueAccessor())
      .domain(_chart.y().domain())
      .duration(_chart.transitionDuration())
      .tickFormat(_tickFormat)

    const boxesG = _chart
      .chartBodyG()
      .selectAll("g.box")
      .data(_chart.data(), d => d.key)

    renderBoxes(boxesG)
    updateBoxes(boxesG)
    removeBoxes(boxesG)

    _chart.fadeDeselectedArea()
  }

  function renderBoxes(boxesG) {
    const boxesGEnter = boxesG.enter().append("g")

    boxesGEnter
      .attr("class", "box")
      .attr("transform", boxTransform)
      .call(_box)
      .on("click", d => {
        _chart.filter(d.key)
        _chart.redrawGroup()
      })
  }

  function updateBoxes(boxesG) {
    transition(boxesG, _chart.transitionDuration())
      .attr("transform", boxTransform)
      .call(_box)
      .each(function() {
        d3
          .select(this)
          .select("rect.box")
          .attr("fill", _chart.getColor)
      })
  }

  function removeBoxes(boxesG) {
    boxesG
      .exit()
      .remove()
      .call(_box)
  }

  _chart.fadeDeselectedArea = function() {
    if (_chart.hasFilter()) {
      _chart
        .g()
        .selectAll("g.box")
        .each(function(d) {
          if (_chart.isSelectedNode(d)) {
            _chart.highlightSelected(this)
          } else {
            _chart.fadeDeselected(this)
          }
        })
    } else {
      _chart
        .g()
        .selectAll("g.box")
        .each(function() {
          _chart.resetHighlight(this)
        })
    }
  }

  _chart.isSelectedNode = function(d) {
    return _chart.hasFilter(d.key)
  }

  _chart.yAxisMin = function() {
    const min = d3.min(_chart.data(), e => d3.min(_chart.valueAccessor()(e)))
    return utils.subtract(min, _chart.yAxisPadding())
  }

  _chart.yAxisMax = function() {
    const max = d3.max(_chart.data(), e => d3.max(_chart.valueAccessor()(e)))
    return utils.add(max, _chart.yAxisPadding())
  }

  /**
   * Set the numerical format of the boxplot median, whiskers and quartile labels. Defaults to
   * integer formatting.
   * @example
   * // format ticks to 2 decimal places
   * chart.tickFormat(d3.format('.2f'));
   * @name tickFormat
   * @memberof dc.boxPlot
   * @instance
   * @param {Function} [tickFormat]
   * @return {Number|Function}
   * @return {dc.boxPlot}
   */
  _chart.tickFormat = function(tickFormat) {
    if (!arguments.length) {
      return _tickFormat
    }
    _tickFormat = tickFormat
    return _chart
  }

  return _chart.anchor(parent, chartGroup)
}
