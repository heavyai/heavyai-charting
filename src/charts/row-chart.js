import baseMixin from "../mixins/base-mixin"
import capMixin from "../mixins/cap-mixin"
import colorMixin from "../mixins/color-mixin"
import d3 from "d3"
import lockAxisMixin from "../mixins/lock-axis-mixin"
import marginMixin from "../mixins/margin-mixin"
import {transition} from "../core/core"
import {utils} from "../utils/utils"
/**
 * Concrete row chart implementation.
 *
 * Examples:
 * - {@link https://mapd.github.io/mapd-charting/example/example1.html Total Number of Flights by State}
 * @name rowChart
 * @memberof dc
 * @mixes dc.capMixin
 * @mixes dc.marginMixin
 * @mixes dc.colorMixin
 * @mixes dc.baseMixin
 * @example
 * // create a row chart under #chart-container1 element using the default global chart group
 * var chart1 = dc.rowChart('#chart-container1');
 * // create a row chart under #chart-container2 element using chart group A
 * var chart2 = dc.rowChart('#chart-container2', 'chartGroupA');
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/mbostock/d3/wiki/Selections#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @return {dc.rowChart}
 */
export default function rowChart (parent, chartGroup) {

  let _g

  let _labelOffsetX = 8
  let _labelOffsetY = 16
  let _hasLabelOffsetY = false
  const _dyOffset = "0.35em"  // this helps center labels https://github.com/mbostock/d3/wiki/SVG-Shapes#svg_text
  let _titleLabelOffsetX = 2
  const MAX_TICK_WIDTH = 64
  const DEFAULT_NUM_TICKS = 10

/* OVERRIDE -----------------------------------------------------------------*/
  let _xAxisLabel
  let _yAxisLabel
  let _autoScroll = false
  const _minBarHeight = 16
  let _isBigBar = false
  let _scrollTop = 0
/* --------------------------------------------------------------------------*/

  let _gap = 4

  let _fixedBarHeight = false
  const _rowCssClass = "row"
  const _titleRowCssClass = "titlerow"
  let _renderTitleLabel = false

  const _chart = lockAxisMixin(capMixin(marginMixin(colorMixin(baseMixin({})))))

  let _x

  let _elasticX

  const _xAxis = d3.svg.axis().orient("bottom")

  let _rowData

  _chart.rowsCap = _chart.cap

/* OVERRIDE -----------------------------------------------------------------*/
  _chart.accent = accentRow
  _chart.unAccent = unAccentRow

  _chart.setYAxisLabel = function (yAxisLabel) {
    _yAxisLabel = yAxisLabel
  }

  _chart.xAxisLabel = function (_, padding) {
    if (!arguments.length) {
      return _xAxisLabel
    }
    _xAxisLabel = _

    return _chart
  }

  _chart.scrollTop = function (_) {
    if (!arguments.length) {
      return _scrollTop
    }
    _scrollTop = _

    return _chart
  }

  _chart.getNumTicksForXAxis = () => {
    const effectiveWidth = _chart.effectiveWidth()
    const numTicks = _chart.xAxis().scale().ticks().length
    return effectiveWidth / numTicks < MAX_TICK_WIDTH ? Math.ceil(effectiveWidth / MAX_TICK_WIDTH) : DEFAULT_NUM_TICKS
  }
/* --------------------------------------------------------------------------*/

  function calculateAxisScale () {

    if (!_x) {
      _x = d3.scale.linear()
    }
    _x.range([0, _chart.effectiveWidth()])

    if (_elasticX) {
      const extent = d3.extent(_rowData, _chart.cappedValueAccessor)
      if (extent[0] > 0) {
        extent[0] = 0
      }
      _x.domain(extent)

    }
    _xAxis.scale(_x)

    _chart.xAxis().ticks(_chart.getNumTicksForXAxis())
  }

  function drawAxis () {
/* OVERRIDE -----------------------------------------------------------------*/
    const root = _chart.root()
    let axisG = root.select("g.axis")

    calculateAxisScale()

    if (axisG.empty()) {
      if (_chart.autoScroll()) {
        axisG = root.append("div")
                    .attr("class", "external-axis")
                    .style("height", _chart.margins().bottom + "px")
                    .append("svg").attr("height", 32)
                    .append("g").attr("class", "axis")
                    .attr("transform", "translate(" + _chart.margins().left + ", 1)")

        const saveScrollTop = _chart.debounce(function () {
          _scrollTop = d3.select(this).node().scrollTop
        }, 250)

        _chart.root().select(".svg-wrapper").on("scroll", saveScrollTop)

      } else {
        axisG = _g.append("g").attr("class", "axis")
                    .attr("transform", "translate(0, " + _chart.effectiveHeight() + ")")
      }

    }

    if (_chart.autoScroll()) {
      root.select(".external-axis svg").attr("width", _chart.width())
    }

    let yLabel = root.selectAll(".y-axis-label")

    if (yLabel.empty()) {
      yLabel = root.append("div")
            .attr("class", "y-axis-label")
    }

    yLabel
            .text(typeof aliases !== "undefined" ? aliases[_yAxisLabel] : _yAxisLabel)
            .style("top", (_chart.effectiveHeight() / 2 + _chart.margins().top) + "px")


    let xLabel = root.selectAll(".x-axis-label")

    if (xLabel.empty()) {
      xLabel = root.append("div")
            .attr("class", "x-axis-label")
    }

    xLabel
            .text(_chart.xAxisLabel())
            .style("left", (_chart.effectiveWidth() / 2 + _chart.margins().left) + "px")
/* --------------------------------------------------------------------------*/

    transition(axisG, _chart.transitionDuration())
            .call(_xAxis)

    _chart.prepareLockAxis("x")
  }

  _chart._doRender = function (data) {
    _chart.resetSvg()

    _g = _chart.svg()
            .append("g")
            .attr("transform", "translate(" + _chart.margins().left + "," + _chart.margins().top + ")")

    drawChart(data)

    return _chart
  }

  _chart.title((d) => _chart.cappedKeyAccessor(d) + ": " + _chart.cappedValueAccessor(d))

/* OVERRIDE ---------------------------------------------------------------- */
  _chart.measureValue = function (d) {
    return utils.formatValue(_chart.cappedValueAccessor(d))
  }
/* ------------------------------------------------------------------------- */

    /**
     * Gets or sets the x scale. The x scale can be any d3
     * {@link https://github.com/mbostock/d3/wiki/Quantitative-Scales quantitive scale}
     * @name x
     * @memberof dc.rowChart
     * @instance
     * @see {@link https://github.com/mbostock/d3/wiki/Quantitative-Scales quantitive scale}
     * @param {d3.scale} [scale]
     * @return {d3.scale}
     * @return {dc.rowChart}
     */
  _chart.x = function (scale) {
    if (!arguments.length) {
      return _x
    }
    _x = scale
    return _chart
  }

  function drawGridLines () {
    _g.selectAll("g.tick")
            .select("line.grid-line")
            .remove()

    _g.selectAll("g.tick")
            .append("line")
            .attr("class", "grid-line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", () => -_chart.effectiveHeight())
  }

  function drawChart (data) {
/* OVERRIDE -----------------------------------------------------------------*/
    const rData = data ? data : _chart.data()
    _rowData = utils.maybeFormatInfinity(rData)
/* --------------------------------------------------------------------------*/

    drawAxis()
    drawGridLines()

    const rows = _g.selectAll("g." + _rowCssClass)
            .data(_rowData)

    createElements(rows)
    removeElements(rows)
    updateElements(rows)

    if (_chart.autoScroll()) {
      _chart.root().select(".svg-wrapper").node().scrollTop = _scrollTop
    }
  }

  function createElements (rows) {
    const rowEnter = rows.enter()
            .append("g")
            .attr("class", (d, i) => _rowCssClass + " _" + i)

    rowEnter.append("rect").attr("width", 0)

    createLabels(rowEnter)
    updateLabels(rows)
  }

  function removeElements (rows) {
    rows.exit().remove()
  }

  function rootValue () {
    const root = _x(0)
    return (root === -Infinity || root !== root) ? _x(1) : root
  }

  function updateElements (rows) {
    const n = _rowData.length

    let height

    if (!_fixedBarHeight) {
      height = ((_chart.effectiveHeight() - _gap) - (n + 1) * _gap) / n
    } else {
      height = _fixedBarHeight
    }

/* OVERRIDE -----------------------------------------------------------------*/

    _isBigBar = _labelOffsetY * 2 > (_chart.measureLabelsOn() ? 64 : 32)

    if (_isBigBar) {
      height = ((_chart.effectiveHeight() - _gap) - (n + 1) * _gap) / n
    }

    if (_chart.autoScroll()) {
      height = height < _minBarHeight ? _minBarHeight : height
      _chart.root().select(".svg-wrapper")
                .style("height", _chart.height() - _chart.margins().bottom + "px")
                .style("overflow-y", "auto")
                .style("overflow-x", "hidden")
      _chart.svg()
                .attr("height", (height === _minBarHeight ? n * (height + _gap) + 8 : _chart.height() - 56))
    }
/* --------------------------------------------------------------------------*/

        // vertically align label in center unless they override the value via property setter
    if (!_hasLabelOffsetY) {
      _labelOffsetY = height / 2
    }

    const rect = rows.attr("transform", (d, i) => "translate(0," + ((i + 1) * _gap + i * height) + ")").select("rect")
            .attr("height", height)
            .attr("fill", _chart.getColor)
            .on("click", onClick)
            .classed("deselected", (d) => (_chart.hasFilter()) ? !isSelectedRow(d) : false)
            .classed("selected", (d) => (_chart.hasFilter()) ? isSelectedRow(d) : false)

    transition(rect, _chart.transitionDuration())
            .attr("width", (d) => Math.abs(rootValue() - _x(_chart.valueAccessor()(d))))
            .attr("transform", translateX)

    if (!_chart.measureLabelsOn()) {
      createTitles(rows)
    }

    updateLabels(rows)
  }

  function createTitles (rows) {
    if (_chart.renderTitle()) {
      rows.selectAll("title").remove()
      rows.append("title").text(_chart.title())
    }
  }

  function createLabels (rowEnter) {
    if (_chart.renderLabel()) {
      rowEnter.append("text")
                .on("click", onClick)
    }

/* OVERRIDE -----------------------------------------------------------------*/
    if (_chart.measureLabelsOn()) {
      rowEnter.append("text")
                .attr("class", "value-measure")
                .on("click", onClick)
    }
/* --------------------------------------------------------------------------*/

    if (_chart.renderTitleLabel()) {
      rowEnter.append("text")
                .attr("class", _titleRowCssClass)
                .on("click", onClick)
    }
  }

  function updateLabels (rows) {

/* OVERRIDE -----------------------------------------------------------------*/
    rows.selectAll("text")
            .style("font-size", _isBigBar ? "14px" : "12px")
/* --------------------------------------------------------------------------*/

    if (_chart.renderLabel()) {
      const lab = rows.select("text")
                .attr("x", _labelOffsetX)
                .attr("y", _labelOffsetY)
                .attr("dy", _dyOffset)
/* OVERRIDE -----------------------------------------------------------------*/
                .attr("dy", isStackLabel() ? "-0.25em" : _dyOffset)
/* --------------------------------------------------------------------------*/
                .on("click", onClick)
                .attr("class", (d, i) => _rowCssClass + " _" + i)
/* OVERRIDE -----------------------------------------------------------------*/
                .classed("value-dim", true)
/* --------------------------------------------------------------------------*/
                .html((d) => _chart.label()(d))
      transition(lab, _chart.transitionDuration())
                .attr("transform", translateX)
    }

/* OVERRIDE -----------------------------------------------------------------*/
    if (_chart.measureLabelsOn()) {

      const measureLab = rows.select(".value-measure")
                .attr("y", _labelOffsetY)
                .attr("dy", isStackLabel() ? "1.1em" : _dyOffset)
                .on("click", onClick)
                .attr("text-anchor", isStackLabel() ? "start" : "end")
                .text((d) => {

                  if (d.label) {
                    return d.label
                  } else {
                    return _chart.measureValue(d)
                  }
                })
                .attr("x", function (d, i) {
                  if (isStackLabel()) {
                    return _labelOffsetX + 1
                  }

                  const thisLabel = d3.select(this)

                  const width = Math.abs(rootValue() - _x(_chart.valueAccessor()(d)))
                  const measureWidth = thisLabel.node().getBBox().width
                  const dimWidth = _chart.svg().select("text.value-dim._" + i).node().getBBox().width
                  const minIdealWidth = measureWidth + dimWidth + 16

                  thisLabel.attr("text-anchor", isStackLabel() || width < minIdealWidth ? "start" : "end")

                  return width > minIdealWidth ? width - 4 : dimWidth + 16
                })
      transition(measureLab, _chart.transitionDuration())
                .attr("transform", translateX)
    }
/* --------------------------------------------------------------------------*/

    if (_chart.renderTitleLabel()) {
      const titlelab = rows.select("." + _titleRowCssClass)
                    .attr("x", _chart.effectiveWidth() - _titleLabelOffsetX)
                    .attr("y", _labelOffsetY)
                    .attr("text-anchor", "end")
                    .on("click", onClick)
                    .attr("class", (d, i) => _titleRowCssClass + " _" + i)
                    .text((d) => _chart.title()(d))
      transition(titlelab, _chart.transitionDuration())
                .attr("transform", translateX)
    }
  }

    /**
     * Turn on/off Title label rendering (values) using SVG style of text-anchor 'end'
     * @name renderTitleLabel
     * @memberof dc.rowChart
     * @instance
     * @param {Boolean} [renderTitleLabel=false]
     * @return {Boolean}
     * @return {dc.rowChart}
     */
  _chart.renderTitleLabel = function (renderTitleLabel) {
    if (!arguments.length) {
      return _renderTitleLabel
    }
    _renderTitleLabel = renderTitleLabel
    return _chart
  }

  function onClick (d) {
    _chart.onClick(d)
  }

/* OVERRIDE -----------------------------------------------------------------*/
  function isStackLabel () {
    return _chart.measureLabelsOn() && _labelOffsetY > 16
  }
/* --------------------------------------------------------------------------*/

  function translateX (d) {
    let x = _x(_chart.cappedValueAccessor(d)),
      x0 = rootValue(),
      s = x > x0 ? x0 : x
    return "translate(" + s + ",0)"
  }

  _chart._doRedraw = function (data) {
    if (!_g) { return _chart._doRender(data) }

    drawChart(data)
    return _chart
  }

    /**
     * Get the x axis for the row chart instance.  Note: not settable for row charts.
     * See the {@link https://github.com/mbostock/d3/wiki/SVG-Axes#wiki-axis d3 axis object}
     * documention for more information.
     * @name xAxis
     * @memberof dc.rowChart
     * @instance
     * @see {@link https://github.com/mbostock/d3/wiki/SVG-Axes#wiki-axis d3.svg.axis}
     * @example
     * // customize x axis tick format
     * chart.xAxis().tickFormat(function (v) {return v + '%';});
     * // customize x axis tick values
     * chart.xAxis().tickValues([0, 100, 200, 300]);
     * @return {d3.svg.axis}
     */
  _chart.xAxis = function () {
    return _xAxis
  }

    /**
     * Get or set the fixed bar height. Default is [false] which will auto-scale bars.
     * For example, if you want to fix the height for a specific number of bars (useful in TopN charts)
     * you could fix height as follows (where count = total number of bars in your TopN and gap is
     * your vertical gap space).
     * @name fixedBarHeight
     * @memberof dc.rowChart
     * @instance
     * @example
     * chart.fixedBarHeight( chartheight - (count + 1) * gap / count);
     * @param {Boolean|Number} [fixedBarHeight=false]
     * @return {Boolean|Number}
     * @return {dc.rowChart}
     */
  _chart.fixedBarHeight = function (fixedBarHeight) {
    if (!arguments.length) {
      return _fixedBarHeight
    }
    _fixedBarHeight = fixedBarHeight
    return _chart
  }

    /**
     * Get or set the vertical gap space between rows on a particular row chart instance
     * @name gap
     * @memberof dc.rowChart
     * @instance
     * @param {Number} [gap=5]
     * @return {Number}
     * @return {dc.rowChart}
     */
  _chart.gap = function (gap) {
    if (!arguments.length) {
      return _gap
    }
    _gap = gap
    return _chart
  }

    /**
     * Get or set the elasticity on x axis. If this attribute is set to true, then the x axis will rescle to auto-fit the
     * data range when filtered.
     * @name elasticX
     * @memberof dc.rowChart
     * @instance
     * @param {Boolean} [elasticX]
     * @return {Boolean}
     * @return {dc.rowChart}
     */
  _chart.elasticX = function (elasticX) {
    if (!arguments.length) {
      return _elasticX
    }
    _elasticX = elasticX
    return _chart
  }

/* OVERRIDE -----------------------------------------------------------------*/
  _chart.autoScroll = function (autoScroll) {
    if (!arguments.length) {
      return _autoScroll
    }
    _autoScroll = autoScroll
    return _chart
  }

/* --------------------------------------------------------------------------*/
    /**
     * Get or set the x offset (horizontal space to the top left corner of a row) for labels on a particular row chart.
     * @name labelOffsetX
     * @memberof dc.rowChart
     * @instance
     * @param {Number} [labelOffsetX=10]
     * @return {Number}
     * @return {dc.rowChart}
     */
  _chart.labelOffsetX = function (labelOffsetX) {
    if (!arguments.length) {
      return _labelOffsetX
    }
    _labelOffsetX = labelOffsetX
    return _chart
  }

    /**
     * Get or set the y offset (vertical space to the top left corner of a row) for labels on a particular row chart.
     * @name labelOffsetY
     * @memberof dc.rowChart
     * @instance
     * @param {Number} [labelOffsety=15]
     * @return {Number}
     * @return {dc.rowChart}
     */
  _chart.labelOffsetY = function (labelOffsety) {
    if (!arguments.length) {
      return _labelOffsetY
    }
    _labelOffsetY = labelOffsety
    _hasLabelOffsetY = true
    return _chart
  }

    /**
     * Get of set the x offset (horizontal space between right edge of row and right edge or text.
     * @name titleLabelOffsetX
     * @memberof dc.rowChart
     * @instance
     * @param {Number} [titleLabelOffsetX=2]
     * @return {Number}
     * @return {dc.rowChart}
     */
  _chart.titleLabelOffsetX = function (titleLabelOffsetX) {
    if (!arguments.length) {
      return _titleLabelOffsetX
    }
    _titleLabelOffsetX = titleLabelOffsetX
    return _chart
  }

/* OVERRIDE -----------------------------------------------------------------*/
  function accentRow (label) {
    _chart.selectAll("g." + _rowCssClass).each(function (d) {
      if (_chart.cappedKeyAccessor(d) == label) {
        _chart.accentSelected(this)
      }
    })
  }

  function unAccentRow (label) {
    _chart.selectAll("g." + _rowCssClass).each(function (d) {
      if (_chart.cappedKeyAccessor(d) == label) {
        _chart.unAccentSelected(this)
      }
    })
  }
/* --------------------------------------------------------------------------*/

  function isSelectedRow (d) {
    return _chart.hasFilter(_chart.cappedKeyAccessor(d)) ^ _chart.filtersInverse()
  }

  return _chart.anchor(parent, chartGroup)
}
