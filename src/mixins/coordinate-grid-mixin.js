import {constants, disableTransitions, globalTransitionDuration, optionalTransition, override, transition, units} from "../core/core"
import {xAxisTickFormat, xDomain, xScale} from "../../src/utils/utils"
import baseMixin from "./base-mixin"
import binningMixin from "../mixins/binning-mixin"
import colorMixin from "./color-mixin"
import d3 from "d3"
import {events} from "../core/events"
import {filters} from "../core/filters"
import lockAxisMixin from "./lock-axis-mixin"
import marginMixin from "./margin-mixin"
import {utils} from "../utils/utils"
import rangeMixin from "../mixins/range-mixin"
import {redrawAllAsync} from "../core/core-async"

 /**
  * Coordinate Grid is an abstract base chart designed to support a number of coordinate grid based
  * concrete chart types, e.g. bar chart, line chart, and bubble chart.
  * @name coordinateGridMixin
  * @memberof dc
  * @mixin
  * @mixes dc.colorMixin
  * @mixes dc.marginMixin
  * @mixes dc.baseMixin
  * @param {Object} _chart
  * @return {dc.coordinateGridMixin}
  */

const DEFAULT_NUM_TICKS = 10
const MAX_TICK_WIDTH = 64
const DEFAULT_TIME_DIMENSION_INDEX = 0
const ENTER_KEY = 13
const ONE_SECOND_IN_MS = 1000

export default function coordinateGridMixin (_chart) {
  const GRID_LINE_CLASS = "grid-line"
  const HORIZONTAL_CLASS = "horizontal"
  const VERTICAL_CLASS = "vertical"
  const Y_AXIS_LABEL_CLASS = "y-axis-label"
  const X_AXIS_LABEL_CLASS = "x-axis-label"
  const DEFAULT_AXIS_LABEL_PADDING = 12


     /* OVERRIDE EXTEND ----------------------------------------------------------*/
  let _hasBeenRendered = false
     /* --------------------------------------------------------------------------*/

  _chart = lockAxisMixin(colorMixin(marginMixin(baseMixin(_chart))))

  _chart.colors(d3.scale.category10())
  _chart._mandatoryAttributes().push("x")
  _chart._rangeFocused = false
  _chart._rangeInput = false
  _chart._binInput = false
  _chart._binSnap = false

  function zoomHandler () {
    _refocused = true
    if (_zoomOutRestrict) {
      _chart.x().domain(constrainRange(_chart.x().domain(), _xOriginalDomain))
      if (_rangeChart) {
        _chart.x().domain(constrainRange(_chart.x().domain(), _rangeChart.x().domain()))
      }
    }

    const domain = _chart.x().domain()
    const domFilter = filters.RangedFilter(domain[0], domain[1])

    _chart.replaceFilter(domFilter)
    _chart.rescale()
    redrawAllAsync()
  }


  let _parent
  let _g
  let _chartBodyG

  let _x
  let _xOriginalDomain
  let _xAxis = d3.svg.axis().orient("bottom")
  let _xUnits = units.integers
  let _xAxisPadding = 0
  let _xElasticity = false
  let _xAxisLabel
  let _xAxisLabelPadding = 0
  let _lastXDomain

  let _y
  let _yAxis = d3.svg.axis().orient("left")
  let _yAxisPadding = 0
  let _yElasticity = false
  let _yAxisLabel
  let _yAxisLabelPadding = 0

  let _brush = d3.svg.brush()
  let _brushOn = true
  let _isBrushing = false
  let _round

  let _renderHorizontalGridLine = false
  let _renderVerticalGridLine = false

  var _refocused = false, _resizing = false


  let _unitCount

  let _zoomScale = [1, Infinity]
  var _zoomOutRestrict = true

  const _zoom = d3.behavior.zoom().on("zoom", zoomHandler)
  const _nullZoom = d3.behavior.zoom().on("zoom", null)
  let _hasBeenMouseZoomable = false

  let _rangeChart
  let _focusChart

  let _mouseZoomable = false
  let _clipPadding = 0

  let _outerRangeBandPadding = 0.5
  let _rangeBandPadding = 0

  let _useRightYAxis = false

     /**
      * When changing the domain of the x or y scale, it is necessary to tell the chart to recalculate
      * and redraw the axes. (`.rescale()` is called automatically when the x or y scale is replaced
      * with {@link #dc.coordinateGridMixin+x .x()} or {@link #dc.coordinateGridMixin+y .y()}, and has
      * no effect on elastic scales.)
      * @name rescale
      * @memberof dc.coordinateGridMixin
      * @instance
      * @return {dc.coordinateGridMixin}
      */
  _chart.rescale = function () {
    _unitCount = undefined
    _resizing = true
    return _chart
  }

  _chart.resizing = function () {
    return _resizing
  }

     /**
      * Get or set the range selection chart associated with this instance. Setting the range selection
      * chart using this function will automatically update its selection brush when the current chart
      * zooms in. In return the given range chart will also automatically attach this chart as its focus
      * chart hence zoom in when range brush updates.
      * @name rangeChart
      * @memberof dc.coordinateGridMixin
      * @instance
      * @param {dc.coordinateGridMixin} [rangeChart]
      * @return {dc.coordinateGridMixin}
      */
  _chart.rangeChart = function (rangeChart) {
    if (!arguments.length) {
      return _rangeChart
    }
    _rangeChart = rangeChart
    _rangeChart.focusChart(_chart)
    return _chart
  }

     /**
      * Get or set the scale extent for mouse zooms.
      * @name zoomScale
      * @memberof dc.coordinateGridMixin
      * @instance
      * @param {Array<Number|Date>} [extent=[1, Infinity]]
      * @return {Array<Number|Date>}
      * @return {dc.coordinateGridMixin}
      */
  _chart.zoomScale = function (extent) {
    if (!arguments.length) {
      return _zoomScale
    }
    _zoomScale = extent
    return _chart
  }

     /**
      * Get or set the zoom restriction for the chart. If true limits the zoom to origional domain of the chart.
      * @name zoomOutRestrict
      * @memberof dc.coordinateGridMixin
      * @instance
      * @param {Boolean} [zoomOutRestrict=true]
      * @return {Boolean}
      * @return {dc.coordinateGridMixin}
      */
  _chart.zoomOutRestrict = function (zoomOutRestrict) {
    if (!arguments.length) {
      return _zoomOutRestrict
    }
    _zoomScale[0] = zoomOutRestrict ? 1 : 0
    _zoomOutRestrict = zoomOutRestrict
    return _chart
  }

  _chart._generateG = function (parent) {
    if (parent === undefined) {
      _parent = _chart.svg()
    } else {
      _parent = parent
    }

    _g = _parent.append("g")

    _chartBodyG = _g.append("g").attr("class", "chart-body")
             .attr("transform", "translate(" + _chart.margins().left + ", " + _chart.margins().top + ")")
             .attr("clip-path", "url(#" + getClipPathId() + ")")

    return _g
  }

     /**
      * Get or set the root g element. This method is usually used to retrieve the g element in order to
      * overlay custom svg drawing programatically. **Caution**: The root g element is usually generated
      * by dc.js internals, and resetting it might produce unpredictable result.
      * @name g
      * @memberof dc.coordinateGridMixin
      * @instance
      * @param {SVGElement} [gElement]
      * @return {SVGElement}
      * @return {dc.coordinateGridMixin}
      */
  _chart.g = function (gElement) {
    if (!arguments.length) {
      return _g
    }
    _g = gElement
    return _chart
  }

     /**
      * Set or get mouse zoom capability flag (default: false). When turned on the chart will be
      * zoomable using the mouse wheel. If the range selector chart is attached zooming will also update
      * the range selection brush on the associated range selector chart.
      * @name mouseZoomable
      * @memberof dc.coordinateGridMixin
      * @instance
      * @param {Boolean} [mouseZoomable=false]
      * @return {Boolean}
      * @return {dc.coordinateGridMixin}
      */
  _chart.mouseZoomable = function (mouseZoomable) {
    if (!arguments.length) {
      return _mouseZoomable
    }
    _mouseZoomable = mouseZoomable
    return _chart
  }

     /**
      * Retrieve the svg group for the chart body.
      * @name chartBodyG
      * @memberof dc.coordinateGridMixin
      * @instance
      * @param {SVGElement} [chartBodyG]
      * @return {SVGElement}
      */
  _chart.chartBodyG = function (chartBodyG) {
    if (!arguments.length) {
      return _chartBodyG
    }
    _chartBodyG = chartBodyG
    return _chart
  }

     /**
      * **mandatory**
      *
      * Get or set the x scale. The x scale can be any d3
      * {@link https://github.com/mbostock/d3/wiki/Quantitative-Scales quantitive scale} or
      * {@link https://github.com/mbostock/d3/wiki/Ordinal-Scales ordinal scale}.
      * @name x
      * @memberof dc.coordinateGridMixin
      * @instance
      * @see {@link http://github.com/mbostock/d3/wiki/Scales d3.scale}
      * @example
      * // set x to a linear scale
      * chart.x(d3.scale.linear().domain([-2500, 2500]))
      * // set x to a time scale to generate histogram
      * chart.x(d3.time.scale().domain([new Date(1985, 0, 1), new Date(2012, 11, 31)]))
      * @param {d3.scale} [xScale]
      * @return {d3.scale}
      * @return {dc.coordinateGridMixin}
      */
  _chart.x = function (xScale) {
    if (!arguments.length) {
      return _x
    }
    _x = xScale
    _xOriginalDomain = _x.domain()
    _chart.rescale()
    return _chart
  }

  _chart.xOriginalDomain = function () {
    return _xOriginalDomain
  }

     /**
      * Set or get the xUnits function. The coordinate grid chart uses the xUnits function to calculate
      * the number of data projections on x axis such as the number of bars for a bar chart or the
      * number of dots for a line chart. This function is expected to return a Javascript array of all
      * data points on x axis, or the number of points on the axis. [d3 time range functions
      * d3.time.days, d3.time.months, and
      * d3.time.years](https://github.com/mbostock/d3/wiki/Time-Intervals#aliases) are all valid xUnits
      * function. dc.js also provides a few units function, see the {@link #utilities Utilities} section for
      * a list of built-in units functions. The default xUnits function is dc.units.integers.
      * @name xUnits
      * @memberof dc.coordinateGridMixin
      * @instance
      * @todo Add docs for utilities
      * @example
      * // set x units to count days
      * chart.xUnits(d3.time.days);
      * // set x units to count months
      * chart.xUnits(d3.time.months);
      *
      * // A custom xUnits function can be used as long as it follows the following interface:
      * // units in integer
      * function(start, end, xDomain) {
      *      // simply calculates how many integers in the domain
      *      return Math.abs(end - start);
      * };
      *
      * // fixed units
      * function(start, end, xDomain) {
      *      // be aware using fixed units will disable the focus/zoom ability on the chart
      *      return 1000;
      * @param {Function} [xUnits]
      * @return {Function}
      * @return {dc.coordinateGridMixin}
      */
  _chart.xUnits = function (xUnits) {
    if (!arguments.length) {
      return _xUnits
    }
    _xUnits = xUnits
    return _chart
  }

     /**
      * Set or get the x axis used by a particular coordinate grid chart instance. This function is most
      * useful when x axis customization is required. The x axis in dc.js is an instance of a [d3
      * axis object](https://github.com/mbostock/d3/wiki/SVG-Axes#wiki-axis); therefore it supports any
      * valid d3 axis manipulation. **Caution**: The x axis is usually generated internally by dc;
      * resetting it may cause unexpected results.
      * @name xAxis
      * @memberof dc.coordinateGridMixin
      * @instance
      * @see {@link http://github.com/mbostock/d3/wiki/SVG-Axes d3.svg.axis}
      * @example
      * // customize x axis tick format
      * chart.xAxis().tickFormat(function(v) {return v + '%';});
      * // customize x axis tick values
      * chart.xAxis().tickValues([0, 100, 200, 300]);
      * @param {d3.svg.axis} [xAxis=d3.svg.axis().orient('bottom')]
      * @return {d3.svg.axis}
      * @return {dc.coordinateGridMixin}
      */
  _chart.xAxis = function (xAxis) {
    if (!arguments.length) {
      return _xAxis
    }
    _xAxis = xAxis
    return _chart
  }

     /**
      * Turn on/off elastic x axis behavior. If x axis elasticity is turned on, then the grid chart will
      * attempt to recalculate the x axis range whenever a redraw event is triggered.
      * @name elasticX
      * @memberof dc.coordinateGridMixin
      * @instance
      * @param {Boolean} [elasticX=false]
      * @return {Boolean}
      * @return {dc.coordinateGridMixin}
      */
  _chart.elasticX = function (elasticX) {
    if (!arguments.length) {
      return _xElasticity
    }
    _xElasticity = elasticX
    return _chart
  }

     /**
      * Set or get x axis padding for the elastic x axis. The padding will be added to both end of the x
      * axis if elasticX is turned on; otherwise it is ignored.
      *
      * padding can be an integer or percentage in string (e.g. '10%'). Padding can be applied to
      * number or date x axes.  When padding a date axis, an integer represents number of days being padded
      * and a percentage string will be treated the same as an integer.
      * @name xAxisPadding
      * @memberof dc.coordinateGridMixin
      * @instance
      * @param {Number|String} [padding=0]
      * @return {Number|String}
      * @return {dc.coordinateGridMixin}
      */
  _chart.xAxisPadding = function (padding) {
    if (!arguments.length) {
      return _xAxisPadding
    }
    _xAxisPadding = padding
    return _chart
  }

     /**
      * Returns the number of units displayed on the x axis using the unit measure configured by
      * .xUnits.
      * @name xUnitCount
      * @memberof dc.coordinateGridMixin
      * @instance
      * @return {Number}
      */
  _chart.xUnitCount = function () {
    if (_unitCount === undefined) {
      const units = _chart.xUnits()(_chart.x().domain()[0], _chart.x().domain()[1], _chart.x().domain())

      if (units instanceof Array) {
        _unitCount = units.length
      } else {
        _unitCount = units
      }
    }

    return _unitCount
  }

     /**
      * Gets or sets whether the chart should be drawn with a right axis instead of a left axis. When
      * used with a chart in a composite chart, allows both left and right Y axes to be shown on a
      * chart.
      * @name useRightYAxis
      * @memberof dc.coordinateGridMixin
      * @instance
      * @param {Boolean} [useRightYAxis=false]
      * @return {Boolean}
      * @return {dc.coordinateGridMixin}
      */
  _chart.useRightYAxis = function (useRightYAxis) {
    if (!arguments.length) {
      return _useRightYAxis
    }
    _useRightYAxis = useRightYAxis
    return _chart
  }

     /**
      * Returns true if the chart is using ordinal xUnits ({@link #dc.units.ordinal dc.units.ordinal}, or false
      * otherwise. Most charts behave differently with ordinal data and use the result of this method to
      * trigger the appropriate logic.
      * @name isOrdinal
      * @memberof dc.coordinateGridMixin
      * @instance
      * @return {Boolean}
      */
  _chart.isOrdinal = function () {
    return _chart.xUnits() === units.ordinal
  }

  _chart._useOuterPadding = function () {
    return true
  }

  _chart._ordinalXDomain = function () {
    const groups = _chart._computeOrderedGroups(_chart.data())
    return groups.map(_chart.keyAccessor())
  }

 /* OVERRIDE ---------------------------------------------------------------- */

  _chart.binVal = _chart.changeBinVal

 /* ------------------------------------------------------------------------ */
  function compareDomains (d1, d2) {
    return !d1 || !d2 || d1.length !== d2.length || d1.some((elem, i) => (elem && d2[i]) ? elem.toString() !== d2[i].toString() : elem === d2[i])
  }

  function prepareXAxis (g, render) {
    if (!_chart.isOrdinal()) {
      if (_chart.elasticX() && (!_chart.rangeChartEnabled() || (_chart.rangeChartEnabled() && _chart.rangeChart() && !_chart.rangeChart().filters().length))) {
        _x.domain([_chart.xAxisMin(), _chart.xAxisMax()])
      }
    } else { // _chart.isOrdinal()
      if (_chart.elasticX() || _x.domain().length === 0) {
        _x.domain(_chart._ordinalXDomain())
      }
    }

         // has the domain changed?
    const xdom = _x.domain()
    if (render || compareDomains(_lastXDomain, xdom)) {
      _chart.rescale()
    }
    _lastXDomain = xdom

         // please can't we always use rangeBands for bar charts?
    if (_chart.isOrdinal()) {
      _x.rangeBands([0, _chart.xAxisLength()], _rangeBandPadding,
                           _chart._useOuterPadding() ? _outerRangeBandPadding : 0)
    } else {
      _x.range([0, _chart.xAxisLength()])
    }

    _chart.xAxis().ticks(_chart.getNumTicksForXAxis())

    renderVerticalGridLines(g)
    _chart.prepareLabelEdit("x")
  }

  _chart.renderXAxis = function (g) {
    let axisXG = g.selectAll("g.x")

    if (axisXG.empty()) {
      axisXG = g.append("g")
                 .attr("class", "axis x")
                 .attr("transform", "translate(" + _chart.margins().left + "," + _chart._xAxisY() + ")")
    }

    let axisXLab = g.selectAll("text." + X_AXIS_LABEL_CLASS)
    if (axisXLab.empty() && _chart.xAxisLabel()) {
      axisXLab = g.append("text")
                 .attr("class", X_AXIS_LABEL_CLASS)
                 .attr("transform", "translate(" + (_chart.margins().left + _chart.xAxisLength() / 2) + "," + (_chart.height() - _xAxisLabelPadding) + ")")
                 .attr("text-anchor", "middle")
    }
    if (_chart.xAxisLabel() && axisXLab.text() !== _chart.xAxisLabel()) {
      axisXLab.text(_chart.xAxisLabel())
    }

    transition(axisXG, _chart.transitionDuration())
             .attr("transform", "translate(" + _chart.margins().left + "," + _chart._xAxisY() + ")")
             .call(_xAxis)
    transition(axisXLab, _chart.transitionDuration())
             .attr("transform", "translate(" + (_chart.margins().left + _chart.xAxisLength() / 2) + "," + (_chart.height() - _xAxisLabelPadding) + ")")
  }

  function renderVerticalGridLines (g) {
    let gridLineG = g.selectAll("g." + VERTICAL_CLASS)

    if (_renderVerticalGridLine) {
      if (gridLineG.empty()) {
        gridLineG = g.insert("g", ":first-child")
                     .attr("class", GRID_LINE_CLASS + " " + VERTICAL_CLASS)
                     .attr("transform", "translate(" + _chart.margins().left + "," + _chart.margins().top + ")")
      }

      const ticks = _xAxis.tickValues() ? _xAxis.tickValues() : (typeof _x.ticks === "function" ? _x.ticks(_xAxis.ticks()[0]) : _x.domain())

      const lines = gridLineG.selectAll("line")
                 .data(ticks)

             // enter
      const linesGEnter = lines.enter()
                 .append("line")
                 .attr("x1", (d) => _x(d))
                 .attr("y1", _chart._xAxisY() - _chart.margins().top)
                 .attr("x2", (d) => _x(d))
                 .attr("y2", 0)
                 .attr("opacity", 0)
      transition(linesGEnter, _chart.transitionDuration())
                 .attr("opacity", 1)

             // update
      transition(lines, _chart.transitionDuration())
                 .attr("x1", (d) => _x(d))
                 .attr("y1", _chart._xAxisY() - _chart.margins().top)
                 .attr("x2", (d) => _x(d))
                 .attr("y2", 0)

             // exit
      lines.exit().remove()
    } else {
      gridLineG.selectAll("line").remove()
    }
  }

  _chart._xAxisY = function () {
    return (_chart.height() - _chart.margins().bottom)
  }

  _chart.xAxisLength = function () {
    return _chart.effectiveWidth()
  }

     /**
      * Set or get the x axis label. If setting the label, you may optionally include additional padding to
      * the margin to make room for the label. By default the padded is set to 12 to accomodate the text height.
      * @name xAxisLabel
      * @memberof dc.coordinateGridMixin
      * @instance
      * @param {String} [labelText]
      * @param {Number} [padding=12]
      * @return {String}
      */
  _chart.xAxisLabel = function (labelText, padding) {
    if (!arguments.length) {
      return _xAxisLabel
    }
    _xAxisLabel = labelText
    _chart.margins().bottom -= _xAxisLabelPadding
    _xAxisLabelPadding = (padding === undefined) ? DEFAULT_AXIS_LABEL_PADDING : padding
    _chart.margins().bottom += _xAxisLabelPadding
    return _chart
  }

  _chart._prepareYAxis = function (g) {
    if (_y === undefined || _chart.elasticY()) {
      if (_y === undefined) {
        _y = d3.scale.linear()
      }
      let min = _chart.yAxisMin() || 0,
        max = _chart.yAxisMax() || 0
      _y.domain([min, max]).rangeRound([_chart.yAxisHeight(), 0])
    }

    _y.range([_chart.yAxisHeight(), 0])
    _yAxis = _yAxis.scale(_y)

    _yAxis.ticks(_chart.effectiveHeight() / _yAxis.scale().ticks().length < 16 ? Math.ceil(_chart.effectiveHeight() / 16) : 10)

    if (_useRightYAxis) {
      _yAxis.orient("right")
    }

    _chart._renderHorizontalGridLinesForAxis(g, _y, _yAxis)
    _chart.prepareLockAxis("y")
  }

  _chart.renderYAxisLabel = function (axisClass, text, rotation, labelXPosition) {
    labelXPosition = labelXPosition || _yAxisLabelPadding

    let axisYLab = _chart.g().selectAll("text." + Y_AXIS_LABEL_CLASS + "." + axisClass + "-label")
    const labelYPosition = (_chart.margins().top + _chart.yAxisHeight() / 2)
    if (axisYLab.empty() && text) {
      axisYLab = _chart.g().append("text")
                 .attr("transform", "translate(" + labelXPosition + "," + labelYPosition + "),rotate(" + rotation + ")")
                 .attr("class", Y_AXIS_LABEL_CLASS + " " + axisClass + "-label")
                 .attr("text-anchor", "middle")
                 .text(text)
    }
    if (text && axisYLab.text() !== text) {
      axisYLab.text(text)
    }
    transition(axisYLab, _chart.transitionDuration())
             .attr("transform", "translate(" + labelXPosition + "," + labelYPosition + "),rotate(" + rotation + ")")

  }

  _chart.renderYAxisAt = function (axisClass, axis, position) {
    let axisYG = _chart.g().selectAll("g." + axisClass)
    if (axisYG.empty()) {
      axisYG = _chart.g().append("g")
                 .attr("class", "axis " + axisClass)
                 .attr("transform", "translate(" + position + "," + _chart.margins().top + ")")
    }

    transition(axisYG, _chart.transitionDuration())
             .attr("transform", "translate(" + position + "," + _chart.margins().top + ")")
             .call(axis)
  }

  _chart.renderYAxis = function () {
    const axisPosition = _useRightYAxis ? (_chart.width() - _chart.margins().right) : _chart._yAxisX()
    _chart.renderYAxisAt("y", _yAxis, axisPosition)
    const labelPosition = _useRightYAxis ? (_chart.width() - _yAxisLabelPadding) : _yAxisLabelPadding
    const rotation = _useRightYAxis ? 90 : -90
    _chart.renderYAxisLabel("y", _chart.yAxisLabel(), rotation, labelPosition)
  }

  _chart._renderHorizontalGridLinesForAxis = function (g, scale, axis) {
    let gridLineG = g.selectAll("g." + HORIZONTAL_CLASS)

    if (_renderHorizontalGridLine) {
      const ticks = axis.tickValues() ? axis.tickValues() : scale.ticks(axis.ticks()[0])

      if (gridLineG.empty()) {
        gridLineG = g.insert("g", ":first-child")
                     .attr("class", GRID_LINE_CLASS + " " + HORIZONTAL_CLASS)
                     .attr("transform", "translate(" + _chart.margins().left + "," + _chart.margins().top + ")")
      }

      const lines = gridLineG.selectAll("line")
                 .data(ticks)

             // enter
      const linesGEnter = lines.enter()
                 .append("line")
                 .attr("x1", 1)
                 .attr("y1", (d) => scale(d))
                 .attr("x2", _chart.xAxisLength())
                 .attr("y2", (d) => scale(d))
                 .attr("opacity", 0)
      transition(linesGEnter, _chart.transitionDuration())
                 .attr("opacity", 1)

             // update
      transition(lines, _chart.transitionDuration())
                 .attr("x1", 1)
                 .attr("y1", (d) => scale(d))
                 .attr("x2", _chart.xAxisLength())
                 .attr("y2", (d) => scale(d))

             // exit
      lines.exit().remove()
    } else {
      gridLineG.selectAll("line").remove()
    }
  }

  _chart._yAxisX = function () {
    return _chart.useRightYAxis() ? _chart.width() - _chart.margins().right : _chart.margins().left
  }

     /**
      * Set or get the y axis label. If setting the label, you may optionally include additional padding
      * to the margin to make room for the label. By default the padded is set to 12 to accomodate the
      * text height.
      * @name yAxisLabel
      * @memberof dc.coordinateGridMixin
      * @instance
      * @param {String} [labelText]
      * @param {Number} [padding=12]
      * @return {String}
      * @return {dc.coordinateGridMixin}
      */
  _chart.yAxisLabel = function (labelText, padding) {
    if (!arguments.length) {
      return _yAxisLabel
    }
    _yAxisLabel = labelText
    _chart.margins().left -= _yAxisLabelPadding
    _yAxisLabelPadding = (padding === undefined) ? DEFAULT_AXIS_LABEL_PADDING : padding
    _chart.margins().left += _yAxisLabelPadding
    return _chart
  }

     /**
      * Get or set the y scale. The y scale is typically automatically determined by the chart implementation.
      * @name y
      * @memberof dc.coordinateGridMixin
      * @instance
      * @see {@link http://github.com/mbostock/d3/wiki/Scales d3.scale}
      * @param {d3.scale} [yScale]
      * @return {d3.scale}
      * @return {dc.coordinateGridMixin}
      */
  _chart.y = function (yScale) {
    if (!arguments.length) {
      return _y
    }
    _y = yScale
    _chart.rescale()
    return _chart
  }

     /**
      * Set or get the y axis used by the coordinate grid chart instance. This function is most useful
      * when y axis customization is required. The y axis in dc.js is simply an instance of a [d3 axis
      * object](https://github.com/mbostock/d3/wiki/SVG-Axes#wiki-_axis); therefore it supports any
      * valid d3 axis manipulation. **Caution**: The y axis is usually generated internally by dc;
      * resetting it may cause unexpected results.
      * @name yAxis
      * @memberof dc.coordinateGridMixin
      * @instance
      * @see {@link http://github.com/mbostock/d3/wiki/SVG-Axes d3.svg.axis}
      * @example
      * // customize y axis tick format
      * chart.yAxis().tickFormat(function(v) {return v + '%';});
      * // customize y axis tick values
      * chart.yAxis().tickValues([0, 100, 200, 300]);
      * @param {d3.svg.axis} [yAxis=d3.svg.axis().orient('left')]
      * @return {d3.svg.axis}
      * @return {dc.coordinateGridMixin}
      */
  _chart.yAxis = function (yAxis) {
    if (!arguments.length) {
      return _yAxis
    }
    _yAxis = yAxis
    return _chart
  }

     /**
      * Turn on/off elastic y axis behavior. If y axis elasticity is turned on, then the grid chart will
      * attempt to recalculate the y axis range whenever a redraw event is triggered.
      * @name elasticY
      * @memberof dc.coordinateGridMixin
      * @instance
      * @param {Boolean} [elasticY=false]
      * @return {Boolean}
      * @return {dc.coordinateGridMixin}
      */
  _chart.elasticY = function (elasticY) {
    if (!arguments.length) {
      return _yElasticity
    }
    _yElasticity = elasticY
    return _chart
  }

     /**
      * Turn on/off horizontal grid lines.
      * @name renderHorizontalGridLines
      * @memberof dc.coordinateGridMixin
      * @instance
      * @param {Boolean} [renderHorizontalGridLines=false]
      * @return {Boolean}
      * @return {dc.coordinateGridMixin}
      */
  _chart.renderHorizontalGridLines = function (renderHorizontalGridLines) {
    if (!arguments.length) {
      return _renderHorizontalGridLine
    }
    _renderHorizontalGridLine = renderHorizontalGridLines
    return _chart
  }

     /**
      * Turn on/off vertical grid lines.
      * @name renderVerticalGridLines
      * @memberof dc.coordinateGridMixin
      * @instance
      * @param {Boolean} [renderVerticalGridLines=false]
      * @return {Boolean}
      * @return {dc.coordinateGridMixin}
      */
  _chart.renderVerticalGridLines = function (renderVerticalGridLines) {
    if (!arguments.length) {
      return _renderVerticalGridLine
    }
    _renderVerticalGridLine = renderVerticalGridLines
    return _chart
  }

     /**
      * Calculates the minimum x value to display in the chart. Includes xAxisPadding if set.
      * @name xAxisMin
      * @memberof dc.coordinateGridMixin
      * @instance
      * @return {*}
      */
  _chart.xAxisMin = function () {
    const min = d3.min(_chart.data(), (e) => _chart.keyAccessor()(e))
    const max = d3.max(_chart.data(), (e) => _chart.keyAccessor()(e))
    return utils.subtract(min, _xAxisPadding, max - min)
  }

     /**
      * Calculates the maximum x value to display in the chart. Includes xAxisPadding if set.
      * @name xAxisMax
      * @memberof dc.coordinateGridMixin
      * @instance
      * @return {*}
      */
  _chart.xAxisMax = function () {
    const max = d3.max(_chart.data(), (e) => _chart.keyAccessor()(e))
    const min = d3.min(_chart.data(), (e) => _chart.keyAccessor()(e))
    return utils.add(max, _xAxisPadding, max - min)
  }

     /**
      * Calculates the minimum y value to display in the chart. Includes yAxisPadding if set.
      * @name yAxisMin
      * @memberof dc.coordinateGridMixin
      * @instance
      * @return {*}
      */
  _chart.yAxisMin = function () {
    const min = d3.min(_chart.data(), (e) => _chart.valueAccessor()(e))
    const max = d3.max(_chart.data(), (e) => _chart.valueAccessor()(e))
    return utils.subtract(min, _yAxisPadding, max - min)
  }

     /**
      * Calculates the maximum y value to display in the chart. Includes yAxisPadding if set.
      * @name yAxisMax
      * @memberof dc.coordinateGridMixin
      * @instance
      * @return {*}
      */
  _chart.yAxisMax = function () {
    const max = d3.max(_chart.data(), (e) => _chart.valueAccessor()(e))
    const min = d3.min(_chart.data(), (e) => _chart.valueAccessor()(e))
    return utils.add(max, _yAxisPadding, max - min)
  }

     /**
      * Set or get y axis padding for the elastic y axis. The padding will be added to the top of the y
      * axis if elasticY is turned on; otherwise it is ignored.
      *
      * padding can be an integer or percentage in string (e.g. '10%'). Padding can be applied to
      * number or date axes. When padding a date axis, an integer represents number of days being padded
      * and a percentage string will be treated the same as an integer.
      * @name yAxisPadding
      * @memberof dc.coordinateGridMixin
      * @instance
      * @param {Number|String} [padding=0]
      * @return {Number}
      * @return {dc.coordinateGridMixin}
      */
  _chart.yAxisPadding = function (padding) {
    if (!arguments.length) {
      return _yAxisPadding
    }
    _yAxisPadding = padding
    return _chart
  }

  _chart.yAxisHeight = function () {
    return _chart.effectiveHeight()
  }

     /**
      * Set or get the rounding function used to quantize the selection when brushing is enabled.
      * @name round
      * @memberof dc.coordinateGridMixin
      * @instance
      * @example
      * // set x unit round to by month, this will make sure range selection brush will
      * // select whole months
      * chart.round(d3.time.month.round);
      * @param {Function} [round]
      * @return {Function}
      * @return {dc.coordinateGridMixin}
      */
  _chart.round = function (round) {
    if (!arguments.length) {
      return _round
    }
    _round = round
    return _chart
  }

  _chart._rangeBandPadding = function (_) {
    if (!arguments.length) {
      return _rangeBandPadding
    }
    _rangeBandPadding = _
    return _chart
  }

  _chart._outerRangeBandPadding = function (_) {
    if (!arguments.length) {
      return _outerRangeBandPadding
    }
    _outerRangeBandPadding = _
    return _chart
  }

  function updateBinParamsForChart (_chart, filter) {
    const extract = _chart.binParams()[0] ? _chart.binParams()[0].extract : false
    if (_chart._isRangeChart && filter.length && !extract) {
      const FocusChart = _chart.focusChart()
      const currentBinParams = FocusChart.binParams()
      if (currentBinParams[0]) {
        currentBinParams[0].binBounds = filter
        FocusChart.binParams(currentBinParams)
      }
      _chart.brush().extent(filter)
    }
  }

  function resetBinParamsForChart (_chart) {
    if (_chart.binParams()[0]) {
      const extract = _chart.binParams()[0].extract
      const isRangeAndIsNotFiltered = _chart._isRangeChart && !_chart.filters().length && !extract

      if (isRangeAndIsNotFiltered) {
        const chartBinParams = _chart.focusChart().binParams().map((p) => p)
        chartBinParams[0].binBounds = _chart.binParams()[0].binBounds
        _chart.focusChart().binParams(chartBinParams)
        _chart.focusChart().x().domain(_chart.x().domain().slice(0))
      }
    }
  }

  override(_chart, "filter", function (filter, isInverseFilter) {
    if (!arguments.length) {
      return _chart._filter()
    }

    _chart._filter(filter, isInverseFilter)

    if (filter !== Symbol.for("clear")) {
      updateBinParamsForChart(_chart, filter)
      _chart.brush().extent(filter)
    } else {
      resetBinParamsForChart(_chart)
      _chart.brush().clear()
    }

    return _chart
  })

  _chart.brush = function (_) {
    if (!arguments.length) {
      return _brush
    }
    _brush = _
    return _chart
  }

  _chart.isBrushing = function (_) {
    if (!arguments.length) {
      return _isBrushing
    }
    _isBrushing = _
    return _chart
  }

  function brushHeight () {
    return _chart._xAxisY() - _chart.margins().top
  }

  _chart.renderBrush = function (g) {
    if (_brushOn) {
      const gBrush = g.select("g.brush").empty() ? g.append("g") : g.select("g.brush")

      gBrush
                 .attr("class", "brush")
                 .attr("transform", "translate(" + _chart.margins().left + "," + _chart.margins().top + ")")
                 .call(_brush.x(_chart.x()))

      gBrush.select("rect.extent")
                 .attr("clip-path", "url(#" + getClipPathId() + ")")

      _chart.setBrushY(gBrush, false)
      _chart.setHandlePaths(gBrush)

      _brush.on("brush", _chart._brushing)
      _brush.on("brushstart", () => {
        _isBrushing = true
        _chart._disableMouseZoom()
        disableTransitions(true)
      })
      _brush.on("brushend", () => {
        _isBrushing = false
        const isRangeChart = _chart._isRangeChart
        configureMouseZoom()
        if (!isRangeChart) {
          _chart.brushSnap(isRangeChart)
        } else if (isRangeChart) {
          _chart.focusChart().brushSnap(isRangeChart)
          const binParams = _chart.focusChart().binParams()[0]
          if (!binParams.auto && !binParams.extract) {
            _chart.focusChart()._invokeBinListener(binParams.timeBin)
          }
        }
        disableTransitions(false)
      })

      if (_chart.hasFilter()) {
        _chart.redrawBrush(g, false)
      }
    }
  }

  _chart.brushSnap = function (isRangeChart) {

    if (!d3.event.sourceEvent) { return } // only transition after input
    _chart.binBrush(isRangeChart)
  }

  _chart.triggerReplaceFilter = function (shouldSetSizingFalse) {
    _resizing = false
  }

  _chart.setHandlePaths = function (gBrush) {
    gBrush.selectAll(".resize").append("path").attr("d", _chart.resizeHandlePath)
  }

  _chart.setBrushY = function (gBrush) {
    gBrush.selectAll(".brush rect")
             .attr("height", brushHeight())
    gBrush.selectAll(".resize path")
             .attr("d", _chart.resizeHandlePath)
  }

  _chart.extendBrush = function () {
    const extent = _brush.extent()
    if (_chart.round()) {
      extent[0] = extent.map(_chart.round())[0]
      extent[1] = extent.map(_chart.round())[1]

      _g.select(".brush")
                 .call(_brush.extent(extent))
    }
    return extent
  }

  _chart.brushIsEmpty = function (extent) {
    return _brush.empty() || !extent || extent[1] <= extent[0]
  }

  _chart._brushing = function () {
    const extent = _chart.extendBrush()

    _chart.redrawBrush(_g, false)

    if (_chart.brushIsEmpty(extent)) {
      events.trigger(() => {
        if (_chart.focusChart()) {
          _chart.focusChart().filterAll()
        }
        _chart.filterAll()
        _chart.redrawGroup()
      }, constants.EVENT_DELAY)


    } else {
      const rangedFilter = filters.RangedFilter(extent[0], extent[1])

      events.trigger(() => {

 /* OVERRIDE ---------------------------------------------------------------- */
        globalTransitionDuration(10)
 /* ------------------------------------------------------------------------- */
        _chart.replaceFilter(rangedFilter)
        _chart.redrawGroup()
      }, constants.EVENT_DELAY)
    }

    if (_chart.rangeInput()) {
      _chart.updateRangeInput()
    } else if (_chart.focusChart() && _chart.focusChart().rangeInput()) {
      _chart.focusChart().updateRangeInput()
    }
  }

  _chart.redrawBrush = function (g, doTransition) {
    if (_brushOn) {
 /* OVERRIDE ---------------------------------------------------------------- */
      if (_chart.filter() && (_chart.brush().empty() || _chart._redrawBrushFlag)) {
        _chart._redrawBrushFlag = false
 /* ------------------------------------------------------------------------- */

        _chart.brush().extent(_chart.filter())
      }

      const gBrush = optionalTransition(doTransition, _chart.transitionDuration())(g.select("g.brush"))
      _chart.setBrushY(gBrush)
      gBrush.call(_chart.brush()
                       .x(_chart.x())
                       .extent(_chart.brush().extent()))

    }

    _chart.fadeDeselectedArea()
  }

  _chart.fadeDeselectedArea = function () {
         // do nothing, sub-chart should override this function
  }

     // borrowed from Crossfilter example
  _chart.resizeHandlePath = function (d) {
    let e = Number(d === "e"), x = e ? 1 : -1, y = brushHeight() / 3
    return "M" + (0.5 * x) + "," + y + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6) + "V" + (2 * y - 6) + "A6,6 0 0 " + e + " " + (0.5 * x) + "," + (2 * y) + "Z" + "M" + (2.5 * x) + "," + (y + 8) + "V" + (2 * y - 8) + "M" + (4.5 * x) + "," + (y + 8) + "V" + (2 * y - 8)
  }

  function getClipPathId () {
    return _chart.anchorName().replace(/[ .#=\[\]]/g, "-") + "-clip"
  }

     /**
      * Get or set the padding in pixels for the clip path. Once set padding will be applied evenly to
      * the top, left, right, and bottom when the clip path is generated. If set to zero, the clip area
      * will be exactly the chart body area minus the margins.
      * @name clipPadding
      * @memberof dc.coordinateGridMixin
      * @instance
      * @param {Number} [padding=5]
      * @return {Number}
      * @return {dc.coordinateGridMixin}
      */
  _chart.clipPadding = function (padding) {
    if (!arguments.length) {
      return _clipPadding
    }
    _clipPadding = padding
    return _chart
  }

  function generateClipPath () {
    const defs = utils.appendOrSelect(_parent, "defs")
         // cannot select <clippath> elements; bug in WebKit, must select by id
         // https://groups.google.com/forum/#!topic/d3-js/6EpAzQ2gU9I
    const id = getClipPathId()
    const chartBodyClip = utils.appendOrSelect(defs, "#" + id, "clipPath").attr("id", id)

    const padding = _clipPadding * 2

    utils.appendOrSelect(chartBodyClip, "rect")
             .attr("width", _chart.xAxisLength() + padding)
             .attr("height", _chart.yAxisHeight() + padding)
             .attr("transform", "translate(-" + _clipPadding + ", -" + _clipPadding + ")")
  }

  _chart._preprocessData = function (data) {
  }

  _chart._doRender = function () {
 /* OVERRIDE ---------------------------------------------------------------- */
    _chart._redrawBrushFlag = true
 /* ------------------------------------------------------------------------- */

    _chart.resetSvg()

    _chart._preprocessData()

    _chart._generateG()

    _chart.root().classed("coordinate-chart", true)

    generateClipPath()

    drawChart(true)

    configureMouseZoom()

 /* OVERRIDE ---------------------------------------------------------------- */
    _hasBeenRendered = true
 /* ------------------------------------------------------------------------- */
    return _chart
  }

  _chart._doRedraw = function () {
 /* OVERRIDE ---------------------------------------------------------------- */
    if (!_hasBeenRendered) // guard to prevent a redraw before a render
      { return _chart._doRender() }
 /* ------------------------------------------------------------------------- */
    _chart._preprocessData()

    drawChart(false)
    generateClipPath()

    return _chart
  }

  function drawChart (render) {
    if (_chart.isOrdinal()) {
      _brushOn = false
    }

    prepareXAxis(_chart.g(), render)
    _chart._prepareYAxis(_chart.g())

    _chart.plotData()

    if (_chart.elasticX() || _resizing || render) {
      _chart.renderXAxis(_chart.g())
    }

    if (_chart.elasticY() || _resizing || render) {
      _chart.renderYAxis(_chart.g())
    }

    if (render) {
      _chart.renderBrush(_chart.g(), false)
    } else {
      _chart.redrawBrush(_chart.g(), _resizing)
    }
    _chart.fadeDeselectedArea()
    _resizing = false

  }

  function configureMouseZoom () {
    if (_mouseZoomable) {
      _chart._enableMouseZoom()
    } else if (_hasBeenMouseZoomable) {
      _chart._disableMouseZoom()
    }
  }

  _chart._enableMouseZoom = function () {
    _hasBeenMouseZoomable = true
    _zoom.x(_chart.x())
             .scaleExtent(_zoomScale)
             .size([_chart.width(), _chart.height()])
             .duration(_chart.transitionDuration())
    _chart.root().call(_zoom)
  }

  _chart._disableMouseZoom = function () {
    _chart.root().call(_nullZoom)
  }

  function constrainRange (range, constraint) {
    const constrainedRange = []
    constrainedRange[0] = d3.max([range[0], constraint[0]])
    constrainedRange[1] = d3.min([range[1], constraint[1]])
    return constrainedRange
  }

     /**
      * Zoom this chart to focus on the given range. The given range should be an array containing only
      * 2 elements (`[start, end]`) defining a range in the x domain. If the range is not given or set
      * to null, then the zoom will be reset. _For focus to work elasticX has to be turned off;
      * otherwise focus will be ignored.
      * @name focus
      * @memberof dc.coordinateGridMixin
      * @instance
      * @example
      * chart.on('renderlet', function(chart) {
      *     // smooth the rendering through event throttling
      *     events.trigger(function(){
      *          // focus some other chart to the range selected by user on this chart
      *          someOtherChart.focus(chart.filter());
      *     });
      * })
      * @param {Array<Number>} [range]
      */
  _chart.focus = function (range) {
    if (hasRangeSelected(range)) {
      _chart.x().domain(range)
    } else {
      _chart.x().domain(_xOriginalDomain)
    }

    _zoom.x(_chart.x())

    zoomHandler()
  }

  _chart.refocused = function () {
    return _refocused
  }

  _chart.focusChart = function (c) {
    if (!arguments.length) {
      return _focusChart
    }
    _focusChart = c
    _chart.on("filtered", (chart) => {

 /* OVERRIDE ---------------------------------------------------------------- */
      _focusChart.rangeFocused(true)
 /* ------------------------------------------------------------------------- */

      if (!chart.filter()) {
        events.trigger(() => {
          _focusChart.x().domain(_focusChart.xOriginalDomain())
        })
      } else if (!rangesEqual(chart.filter(), _focusChart.filter())) {
        events.trigger(() => {
          _focusChart.focus(chart.filter())
        })
      }

 /* OVERRIDE ---------------------------------------------------------------- */
      _focusChart.rangeFocused(false)
 /* ------------------------------------------------------------------------- */

    })
    return _chart
  }

  function rangesEqual (range1, range2) {
    if (!range1 && !range2) {
      return true
    } else if (!range1 || !range2) {
      return false
    } else if (range1.length === 0 && range2.length === 0) {
      return true
    } else if (range1[0].valueOf() === range2[0].valueOf() && range1[1].valueOf() === range2[1].valueOf()) {
      return true
    }
    return false
  }

     /**
      * Turn on/off the brush-based range filter. When brushing is on then user can drag the mouse
      * across a chart with a quantitative scale to perform range filtering based on the extent of the
      * brush, or click on the bars of an ordinal bar chart or slices of a pie chart to filter and
      * un-filter them. However turning on the brush filter will disable other interactive elements on
      * the chart such as highlighting, tool tips, and reference lines. Zooming will still be possible
      * if enabled, but only via scrolling (panning will be disabled.)
      * @name brushOn
      * @memberof dc.coordinateGridMixin
      * @instance
      * @param {Boolean} [brushOn=true]
      * @return {Boolean}
      * @return {dc.coordinateGridMixin}
      */
  _chart.brushOn = function (brushOn) {
    if (!arguments.length) {
      return _brushOn
    }
    _brushOn = brushOn
    return _chart
  }

  function hasRangeSelected (range) {
    return range instanceof Array && range.length > 1
  }

  _chart.popupTextAccessor = (arr) => () => (utils.formatValue(arr[0].datum.data.key0))

  _chart.getNumTicksForXAxis = () => {
    const xDomain = _chart.x().domain()
    const timeBinParam = _chart.group().binParams()[DEFAULT_TIME_DIMENSION_INDEX]
    if (timeBinParam && timeBinParam.extract) {
      return xDomain[xDomain.length - 1] - xDomain[0]
    } else {
      const effectiveWidth = _chart.effectiveWidth()
      const numTicks = _chart.xAxis().scale().ticks().length
      return effectiveWidth / numTicks < MAX_TICK_WIDTH ? Math.ceil(effectiveWidth / MAX_TICK_WIDTH) : DEFAULT_NUM_TICKS
    }
  }

  _chart.destroyChart = function () {
    if (_chart.rangeChartEnabled()) {
      _chart.rangeChartEnabled(false)
    }
  }

  _chart.rangeFocused = function (_) {
    if (!arguments.length) {
      return _chart._rangeFocused
    }
    _chart._rangeFocused = _

    return _chart
  }

  _chart.rangeInput = function (_) {
    if (!arguments.length) {
      return _chart._rangeInput
    }
    _chart._rangeInput = _

    return _chart
  }

  _chart.binInput = function (_) {

    if (!arguments.length) {
      return _chart._binInput
    }
    _chart._binInput = _

    return _chart
  }

  _chart.isTime = function (_) {
    if (!arguments.length) {
      return _chart._isTime
    }

    _chart._isTime = _
    return _chart
  }


     /* istanbul ignore next */
  _chart.getBinInputVal = function () {
    return _chart.binInputOptions().filter((d) => d.val === _chart.timeBinInputVal())
  }

     /* istanbul ignore next */
  _chart.updateRangeInput = function () {
    const dateFormat = d3.time.format.utc("%b %d, %Y")
    const timeFormat = d3.time.format.utc("%I:%M%p")

    const extent = _chart.filter() || _chart.x().domain()
    const rangeDisplay = _chart.root().selectAll(".range-display")
    const binNumSecs = _chart.binInputOptions().filter((d) => _chart.group().binParams()[0].timeBin === d.val)[0].numSeconds

    rangeDisplay.select(".range-start-day")
             .property("value", dateFormat(extent[0]))
             .attr("value", dateFormat(extent[0]))

    rangeDisplay.select(".range-start-time")
             .classed("disable", binNumSecs > 3600)
             .property("value", timeFormat(extent[0]))
             .attr("value", timeFormat(extent[0]))

    rangeDisplay.select(".range-end-day")
             .property("value", dateFormat(extent[1]))
             .attr("value", dateFormat(extent[1]))

    rangeDisplay.select(".range-end-time")
             .classed("disable", binNumSecs > 3600)
             .property("value", timeFormat(extent[1]))
             .attr("value", timeFormat(extent[1]))
  }

     /* istanbul ignore next */
  function rangeInputOnFocus () {

    this.select()

    const dateInputFormat = d3.time.format.utc("%m-%d-%Y")
    const timeInputFormat = d3.time.format.utc("%I:%M%p")
    const currentInput = d3.select(this)

    const extent = _chart.filter() || _chart.x().domain()
    const index = currentInput.attr("class").indexOf("start") >= 0 ? 0 : 1

    currentInput
               .property("value", currentInput.classed("range-day") ? dateInputFormat(extent[index]) : timeInputFormat(extent[index]))
  }

     /* istanbul ignore next */
  function rangeInputChange (input) {
    const thisInput = this || input
    const currentInput = d3.select(thisInput)
    const currentValue = currentInput.attr("value")
    const newValue = currentInput.property("value")

    const currentExtent = _chart.filter() || _chart.x().domain()

    const binNumSecs = _chart.binInputOptions().filter((d) => _chart.group().binParams()[0].timeBin === d.val)[0].numSeconds

    const inputFormat = binNumSecs > 3600 ? d3.time.format.utc("%m-%d-%Y") : (currentInput.attr("class").indexOf("day") >= 0 ? d3.time.format.utc("%m-%d-%Y %I:%M%p") : d3.time.format.utc("%b %d, %Y %I:%M%p"))

    const inputStr = binNumSecs > 3600 ? newValue : d3.select(thisInput.parentNode).selectAll(".range-day").property("value") + " " + d3.select(thisInput.parentNode).selectAll(".range-time").property("value")

    const date = inputFormat.parse(inputStr)

    if (!date) {
      currentInput.property("value", currentValue)
      thisInput.blur()
      return
    }

    const extentChart = _chart.rangeChartEnabled() ? _chart.rangeChart() : _chart

    const extent = extentChart.filter() || extentChart.x().domain()

    const index = currentInput.attr("class").indexOf("start") >= 0 ? 0 : 1

    const other = index === 0 ? 1 : 0

    extent[index] = date < extentChart.xAxisMin() ? extentChart.xAxisMin() : (date > extentChart.xAxisMax() ? extentChart.xAxisMax() : date)

    if (binNumSecs > 3600) {
      extent[other] = d3.time.day.utc.round(extent[other])
    }

    extent.sort((a, b) => a - b)

    if (extent[0].getTime() === extent[1].getTime()) {
      extent[1] = new Date(extent[1].getTime() + (binNumSecs * ONE_SECOND_IN_MS))
    }

    if (_chart._binInput) {
      extent[1] = new Date(extent[1].getTime() + ONE_SECOND_IN_MS)
    }

    const domFilter = filters.RangedFilter(extent[0], extent[1])

    extentChart.replaceFilter(domFilter)
    extentChart.rescale()
    extentChart.redrawAsync().then(() => {
      if (_chart.rangeChartEnabled()) {
        _chart._binSnap = _chart._binInput
        _chart.focus(domFilter)
        _chart.replaceFilter(domFilter)
      }

      thisInput.blur()
      _chart.updateRangeInput()
    })
  }

     /* istanbul ignore next */
  _chart.renderYAxisLabel = function (axisClass, text, rotation) {
    const root = _chart.root()

    let yLabel = root.selectAll(".y-axis-label")

    if (yLabel.empty() && !_chart._isRangeChart) {
      yLabel = root.append("div")
         .attr("class", "y-axis-label")
    }

    if (text !== "") {
      const yOffset = (_chart.rangeChartEnabled() && _chart._rangeChartCreated ? _chart.rangeChart().height() - _chart.rangeChart().margins().bottom + _chart.margins().bottom : _chart.margins().bottom)

      yLabel
             .style("top", ((_chart.effectiveHeight() + yOffset) / 2 + _chart.margins().top) + "px")
             .text(text)
    }
    _chart.prepareLabelEdit("y")
  }

     /* istanbul ignore next */
  _chart.renderXAxis = function (g) {
    let axisXG = g.selectAll("g.x")

    if (axisXG.empty()) {
      axisXG = g.append("g")
               .attr("class", "axis x")
               .attr("transform", "translate(" + _chart.margins().left + "," + _chart._xAxisY() + ")")
    }

       /* OVERRIDE -----------------------------------------------------------------*/
    const root = _chart.root()

    if (_chart.rangeInput()) {
      let rangeDisplay = root.selectAll(".range-display")

      if (rangeDisplay.empty()) {
        rangeDisplay = root.append("div")
                   .attr("class", "range-display")
                   .style("right", _chart.margins().right + "px")

        const group1 = rangeDisplay.append("div")

        rangeDisplay.append("span")
                   .html(" &mdash; ")

        const group2 = rangeDisplay.append("div")

        group1.append("input")
                   .attr("class", "range-start-day range-day")

        group1.append("input")
                   .attr("class", "range-start-time range-time")

        group2.append("input")
                   .attr("class", "range-end-day range-day")

        group2.append("input")
                   .attr("class", "range-end-time range-time")

        rangeDisplay.selectAll("input")
                   .each(function () { bindRangeInputEvents(this) })

        if (_chart.group().binParams()[0] && _chart.group().binParams()[0].timeBin) {
          _chart.updateRangeInput()
        }

        _chart.root().select("div > .svg-wrapper")
             .on("mouseover", () => {
               rangeDisplay.selectAll("input").classed("active", true)
             })
             .on("mouseleave", () => {
               rangeDisplay.selectAll("input").classed("active", false)
             })
      }

    }

    let xLabel = root.selectAll(".x-axis-label")

    const shouldAppendLabel = _chart.rangeChartEnabled() ? false : xLabel.empty()
    if (shouldAppendLabel) {
      xLabel = root.append("div")
           .attr("class", "x-axis-label")
    }

    if (!_chart.rangeChartEnabled()) {
      xLabel
             .style("left", (_chart.effectiveWidth() / 2 + _chart.margins().left) + "px")
             .text(_chart.xAxisLabel())
    }

    transition(axisXG, _chart.transitionDuration())
           .attr("transform", "translate(" + _chart.margins().left + "," + _chart._xAxisY() + ")")
           .call(_chart.xAxis())

    _chart.updateBinInput()
  }

     /* istanbul ignore next */
  _chart.updateBinInput = () => {
    if (_chart.binInput() && _chart.group().binParams()[0]) {
      const root = _chart.root()

      let binRow = root.selectAll(".bin-row")

      if (binRow.empty()) {
        binRow = root.append("div")
                   .attr("class", "bin-row")
                   .style("left", _chart.margins().left + "px")

      }

      binRow.html("")
               .append("span")
               .text("BIN:")

      const binRowItems = binRow.selectAll(".bin-row-item")
               .data(_chart.binInputOptions())
               .enter()

      const rangeInSeconds = Math.abs((_chart.x().domain()[0].getTime() - _chart.x().domain()[1].getTime()) / ONE_SECOND_IN_MS)
      const {auto, timeBin, numBins} = _chart.group().binParams()[0]

      const shouldShowTimeBinOption = d => d.numSeconds && rangeInSeconds / d.numSeconds > numBins || d.numSeconds && rangeInSeconds / d.numSeconds < 2

      binRowItems.append("div")
               .attr("class", "bin-row-item")
               .classed("inactive", d => shouldShowTimeBinOption(d))
               .classed("active", (d) => {
                 if (d.val === "auto" && auto) {
                   return true
                 } else if (!auto) {
                   return d.val === timeBin
                 }
               })
               .classed("underline", d => auto && d.val === timeBin)
               .text(d => d.label)
               .on("click", d => _chart.changeBinVal(d.val))

    }
  }

     /* istanbul ignore next */
  function bindRangeInputEvents (input) {
    d3.select(input)
         .on("focus", rangeInputOnFocus)
         .on("blur", rangeInputChange)
         .on("keydown", function () {
           if (d3.event.keyCode === ENTER_KEY) {
             rangeInputChange(this)
           }
         })
  }

  _chart = rangeMixin(binningMixin(_chart))

  return _chart
}
