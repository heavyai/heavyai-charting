import { formatDataValue, isArrayOfObjects } from "../utils/formatting-helpers"
import d3 from "d3"
import baseMixin from "../mixins/base-mixin"
import colorMixin from "../mixins/color-mixin"
import marginMixin from "../mixins/margin-mixin"
import { events } from "../core/events"
import { override, transition } from "../core/core"
import { utils } from "../utils/utils"
import { filters } from "../core/filters"

/** ***************************************************************************
 * OVERRIDE: dc.heatMap                                                       *
 * ***************************************************************************/
/**
 * A heat map is matrix that represents the values of two dimensions of data using colors.
 * @name heatMap
 * @memberof dc
 * @mixes dc.colorMixin
 * @mixes dc.marginMixin
 * @mixes dc.baseMixin
 * @example
 * // create a heat map under #chart-container1 element using the default global chart group
 * var heatMap1 = dc.heatMap('#chart-container1');
 * // create a heat map under #chart-container2 element using chart group A
 * var heatMap2 = dc.heatMap('#chart-container2', 'chartGroupA');
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/mbostock/d3/wiki/Selections#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @return {dc.heatMap}
 */

const MAX_LABEL_WIDTH = 72
const CHAR_WIDTH = 5
const MIN_AXIS_HEIGHT = 52

export function heatMapKeyAccessor({ key0 }) {
  if (Array.isArray(key0)) {
    const value = isArrayOfObjects(key0) ? key0[0].value : key0[0]
    this.colsMap.set(value, key0)
    return value
  } else {
    return key0
  }
}

export function heatMapValueAccesor({ key1 }) {
  if (Array.isArray(key1)) {
    const value = isArrayOfObjects(key1) ? key1[0].value : key1[0]
    this.rowsMap.set(value, key1)
    return value
  } else {
    return key1
  }
}

export function heatMapRowsLabel(d) {
  let value = this.rowsMap.get(d) || d

  const customFormatter = this.dateFormatter()
  if (customFormatter && d && d instanceof Date) {
    if (Array.isArray(value) && value[0]) {
      value = value[0].value || value[0]
    }
  }

  return (customFormatter && customFormatter(value, this.yAxisLabel())) || formatDataValue(value)
}

export function heatMapColsLabel(d) {
  let value = this.colsMap.get(d) || d

  const customFormatter = this.dateFormatter()
  if (customFormatter && d && d instanceof Date) {
    if (Array.isArray(value) && value[0]) {
      value = value[0].value || value[0]
    }
  }

  return (customFormatter && customFormatter(value, this.xAxisLabel())) || formatDataValue(value)
}

export function isDescendingAppropriateData({ key1 }) {
  const value = Array.isArray(key1) ? key1[0] : key1
  return typeof value !== "number"
}

export default function heatMap(parent, chartGroup) {
  const INTERVAL_LABELS = {
    // ISO DOW starts at 1, set null at 0 index
    DAY_OF_WEEK: [null, "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],

    // Months start at 1, set null at 0 index
    MONTH: [
      null,
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ],

    HOUR_OF_DAY: [
      "12AM",
      "1AM",
      "2AM",
      "3AM",
      "4AM",
      "5AM",
      "6AM",
      "7AM",
      "8AM",
      "9AM",
      "10AM",
      "11AM",
      "12PM",
      "1PM",
      "2PM",
      "3PM",
      "4PM",
      "5PM",
      "6PM",
      "7PM",
      "8PM",
      "9PM",
      "10PM",
      "11PM"
    ]
  }

  const DEFAULT_BORDER_RADIUS = 6.75

  let _chartBody

  let _cols
  let _rows

  let _colOrdering = utils.nullsFirst(d3.ascending)
  let _rowOrdering = utils.nullsFirst(d3.ascending)
  const _colScale = d3.scale.ordinal()
  const _rowScale = d3.scale.ordinal()

  var _xBorderRadius = DEFAULT_BORDER_RADIUS
  var _yBorderRadius = DEFAULT_BORDER_RADIUS

  /* OVERRIDE EXTEND ----------------------------------------------------------*/
  let _yLabel
  let _xLabel
  let _hasBeenRendered = false
  const _minBoxSize = 16
  let _scrollPos = { top: null, left: 0 }
  let _dockedAxes
  let _dockedAxesSize = { left: 48, bottom: 56 }
  /* --------------------------------------------------------------------------*/

  var _xBorderRadius = DEFAULT_BORDER_RADIUS
  var _yBorderRadius = DEFAULT_BORDER_RADIUS

  const _chart = colorMixin(marginMixin(baseMixin({})))
  _chart._mandatoryAttributes(["group"])
  _chart.title(_chart.colorAccessor())

  let _colsLabel = function(d) {
    return d
  }
  let _rowsLabel = function(d) {
    return d
  }

  _chart.dockedAxesSize = function(_) {
    if (!arguments.length) {
      return _dockedAxesSize
    }
    _dockedAxesSize = _
    return _chart
  }

  /**
   * Set or get the column label function. The chart class uses this function to render
   * column labels on the X axis. It is passed the column name.
   * @name colsLabel
   * @memberof dc.heatMap
   * @instance
   * @example
   * // the default label function just returns the name
   * chart.colsLabel(function(d) { return d; });
   * @param  {Function} [labelFunction=function(d) { return d; }]
   * @return {Function}
   * @return {dc.heatMap}
   */
  _chart.colsLabel = function(labelFunction) {
    if (!arguments.length) {
      return _colsLabel
    }
    _colsLabel = labelFunction
    return _chart
  }

  /**
   * Set or get the row label function. The chart class uses this function to render
   * row labels on the Y axis. It is passed the row name.
   * @name rowsLabel
   * @memberof dc.heatMap
   * @instance
   * @example
   * // the default label function just returns the name
   * chart.rowsLabel(function(d) { return d; });
   * @param  {Function} [labelFunction=function(d) { return d; }]
   * @return {Function}
   * @return {dc.heatMap}
   */
  _chart.rowsLabel = function(labelFunction) {
    if (!arguments.length) {
      return _rowsLabel
    }
    _rowsLabel = labelFunction
    return _chart
  }

  /* OVERRIDE EXTEND ----------------------------------------------------------*/
  _chart.xAxisLabel = function(xLabel) {
    if (!arguments.length) {
      return _xLabel
    }
    _xLabel = xLabel
    return _chart
  }

  _chart.yAxisLabel = function(yLabel) {
    if (!arguments.length) {
      return _yLabel
    }
    _yLabel = yLabel
    return _chart
  }

  let _xAxisOnClick = function(d) {
    filterAxis(0, d)
  }

  let _yAxisOnClick = function(d) {
    filterAxis(1, d)
  }
  /* --------------------------------------------------------------------------*/

  let _boxOnClick = function(d) {
    /* OVERRIDE -----------------------------------------------------------------*/
    const filter = [d.key0, d.key1]
    /* --------------------------------------------------------------------------*/
    _chart.handleFilterClick(d3.event, filter)
  }

  function filterAxis(axis, value) {
    const cellsOnAxis = _chart.selectAll(".box-group").filter(
      d =>
        /* OVERRIDE ---------------------------------------------------------------*/
        (axis === 1 ? _chart.valueAccessor()(d) : _chart.keyAccessor()(d)) ===
        value
      /* --------------------------------------------------------------------------*/
    )

    const unfilteredCellsOnAxis = cellsOnAxis.filter(
      d =>
        /* OVERRIDE -----------------------------------------------------------------*/
        !_chart.hasFilter([d.key0, d.key1])
      /* --------------------------------------------------------------------------*/
    )
    events.trigger(() => {
      if (unfilteredCellsOnAxis.empty()) {
        cellsOnAxis.each(d => {
          /* OVERRIDE -----------------------------------------------------------------*/
          _chart.filter([d.key0, d.key1])
          /* --------------------------------------------------------------------------*/
        })
      } else {
        unfilteredCellsOnAxis.each(d => {
          /* OVERRIDE -----------------------------------------------------------------*/
          _chart.filter([d.key0, d.key1])
          /* --------------------------------------------------------------------------*/
        })
      }

      _chart.redrawGroup()
    })
  }

  override(_chart, "filter", function(filter, isInverseFilter) {
    if (!arguments.length) {
      return _chart._filter()
    }

    return _chart._filter(filters.TwoDimensionalFilter(filter), isInverseFilter)
  })

  function uniq(d, i, a) {
    return !i || a[i - 1] !== d
  }

  /**
   * Gets or sets the values used to create the rows of the heatmap, as an array. By default, all
   * the values will be fetched from the data using the value accessor, and they will be sorted in
   * ascending order.
   * @name rows
   * @memberof dc.heatMap
   * @instance
   * @param  {Array<String|Number>} [rows]
   * @return {Array<String|Number>}
   * @return {dc.heatMap}
   */
  _chart.rows = function(rows) {
    if (arguments.length) {
      _rows = rows
      return _chart
    }
    return _rows
  }

  _chart.rowOrdering = function(_) {
    if (!arguments.length) {
      return _rowOrdering
    }
    _rowOrdering = _
    return _chart
  }

  /**
   * Gets or sets the keys used to create the columns of the heatmap, as an array. By default, all
   * the values will be fetched from the data using the key accessor, and they will be sorted in
   * ascending order.
   * @name cols
   * @memberof dc.heatMap
   * @instance
   * @param  {Array<String|Number>} [cols]
   * @return {Array<String|Number>}
   * @return {dc.heatMap}
   */
  _chart.cols = function(cols) {
    if (arguments.length) {
      _cols = cols
      return _chart
    }
    return _cols
  }

  _chart.colOrdering = function(_) {
    if (!arguments.length) {
      return _colOrdering
    }
    _colOrdering = _
    return _chart
  }

  _chart._doRender = function() {
    _chart.resetSvg()

    /* OVERRIDE -----------------------------------------------------------------*/
    _chart.margins({ top: 8, right: 16, bottom: 0, left: 0 })
    /* --------------------------------------------------------------------------*/

    _chartBody = _chart
      .svg()
      .append("g")
      .attr("class", "heatmap")
      .attr(
        "transform",
        "translate(" + _chart.margins().left + "," + _chart.margins().top + ")"
      )

    /* OVERRIDE -----------------------------------------------------------------*/
    _chartBody.append("g").attr("class", "box-wrapper")
    _hasBeenRendered = true

    _dockedAxes = _chart
      .root()
      .append("div")
      .attr("class", "docked-axis-wrapper")
    /* --------------------------------------------------------------------------*/
    return _chart._doRedraw()
  }

  _chart._doRedraw = function() {
    if (!_hasBeenRendered) {
      return _chart._doRender()
    }

    var data = _chart.data(),
      cols = _chart.cols(),
      rows = _chart.rows() || data.map(_chart.valueAccessor()),
      cols = _chart.cols() || data.map(_chart.keyAccessor())

    if (_rowOrdering) {
      _rowOrdering = _chart.shouldSortYAxisDescending(data)
        ? utils.nullsLast(d3.descending)
        : utils.nullsFirst(d3.ascending)
      rows = rows.sort(_rowOrdering)
    }
    if (_colOrdering) {
      cols = cols.sort(_colOrdering)
    }
    rows = _rowScale.domain(rows)
    cols = _colScale.domain(cols)

    _chart.dockedAxesSize(_chart.getAxisSizes(cols.domain(), rows.domain()))

    let rowCount = rows.domain().length,
      colCount = cols.domain().length,
      availWidth = _chart.width() - _dockedAxesSize.left,
      availHeight = _chart.height() - _dockedAxesSize.bottom,
      boxWidth = Math.max(
        (availWidth - _chart.margins().right) / colCount,
        _minBoxSize
      ),
      boxHeight = Math.max(
        (availHeight - _chart.margins().top) / rowCount,
        _minBoxSize
      ),
      svgWidth = boxWidth * colCount + _chart.margins().right,
      svgHeight = boxHeight * rowCount + _chart.margins().top

    cols.rangeBands([0, boxWidth * colCount])
    rows.rangeBands([boxHeight * rowCount, 0])

    _chart
      .svg()
      .attr("width", svgWidth)
      .attr("height", svgHeight)

    const scrollNode = _chart
      .root()
      .classed("heatmap-scroll", true)
      .select(".svg-wrapper")
      .style("width", _chart.width() - _dockedAxesSize.left + "px")
      .style("height", _chart.height() - _dockedAxesSize.bottom + "px")
      .style("left", _dockedAxesSize.left + "px")
      .on("scroll", function() {
        _scrollPos = {
          top: d3.select(this).node().scrollTop,
          left: d3.select(this).node().scrollLeft
        }
        _chart
          .root()
          .select(".docked-x-axis")
          .style("left", -_scrollPos.left + "px")
        _chart
          .root()
          .select(".docked-y-axis")
          .style("top", -_scrollPos.top + "px")
      })
      .node()

    scrollNode.scrollLeft = _scrollPos.left
    scrollNode.scrollTop =
      _scrollPos.top === null && _rowOrdering === d3.ascending
        ? svgHeight
        : _scrollPos.top || 0

    const boxes = _chartBody
      .select(".box-wrapper")
      .selectAll("g.box-group")
      .data(
        _chart.data(),
        (d, i) =>
          _chart.keyAccessor()(d, i) + "\0" + _chart.valueAccessor()(d, i)
      )

    const gEnter = boxes
      .enter()
      .append("g")
      .attr("class", "box-group")

    gEnter
      .append("rect")
      .attr("class", "heat-box")
      .attr("fill", "white")
      .on("mouseenter", showPopup)
      .on("mousemove", positionPopup)
      .on("mouseleave", hidePopup)
      .on("click", _chart.boxOnClick())

    transition(boxes.select("rect"), _chart.transitionDuration())
      .attr("x", (d, i) => cols(_chart.keyAccessor()(d, i)))
      .attr("y", (d, i) => rows(_chart.valueAccessor()(d, i)))
      .attr("rx", _xBorderRadius)
      .attr("ry", _yBorderRadius)
      .attr("fill", _chart.getColor)
      .attr("width", boxWidth)
      .attr("height", boxHeight)

    boxes.exit().remove()

    let XAxis = _dockedAxes.selectAll(".docked-x-axis")

    if (XAxis.empty()) {
      XAxis = _dockedAxes.append("div").attr("class", "docked-x-axis")
    }

    const colsText = XAxis.style("height", _dockedAxesSize.bottom + "px")
      .html("")
      .selectAll("div.text")
      .data(cols.domain())

    colsText
      .enter()
      .append("div")
      .attr(
        "class",
        () => "text " + (_dockedAxesSize.bottom > 52 ? "rotate-down" : "center")
      )
      .style("left", d => cols(d) + boxWidth / 2 + _dockedAxesSize.left + "px")
      .on("click", _chart.xAxisOnClick())
      .append("span")
      .html(_chart.colsLabel())
      .attr("title", d => {
        // detect if a value is null or has the string "null"
        const val = `${_chart.colsLabel()(d)}`
        return val.match(/null/gi) ? "NULL" : val
      })

    let YAxis = _dockedAxes.selectAll(".docked-y-axis")

    if (YAxis.empty()) {
      YAxis = _dockedAxes.append("div").attr("class", "docked-y-axis")
    }

    const rowsText = YAxis.style("width", _dockedAxesSize.left + "px")
      .style("left", _dockedAxesSize.left + "px")
      .html("")
      .selectAll("div.text")
      .data(rows.domain())

    rowsText
      .enter()
      .append("div")
      .attr("class", "text")
      .style("top", d => rows(d) + boxHeight / 2 + _chart.margins().top + "px")
      .on("click", _chart.yAxisOnClick())
      .html(_chart.rowsLabel())
      .attr("title", d => {
        // detect if a value is null or has the string "null"
        const val = `${_chart.rowsLabel()(d)}`
        return val.match(/null/gi) ? "NULL" : val
      })

    let axesMask = _dockedAxes.selectAll(".axes-mask")

    if (axesMask.empty()) {
      axesMask = _dockedAxes.append("div").attr("class", "axes-mask")
    }

    axesMask
      .style("width", _dockedAxesSize.left + "px")
      .style("height", _dockedAxesSize.bottom + "px")

    if (_chart.hasFilter()) {
      _chart.selectAll("g.box-group").each(function(d) {
        if (_chart.isSelectedNode(d)) {
          _chart.highlightSelected(this)
        } else {
          _chart.fadeDeselected(this)
        }
      })
    } else {
      _chart.selectAll("g.box-group").each(function() {
        _chart.resetHighlight(this)
      })
    }

    _chart.renderAxisLabels()

    return _chart
  }

  /**
   * Gets or sets the handler that fires when an individual cell is clicked in the heatmap.
   * By default, filtering of the cell will be toggled.
   * @name boxOnClick
   * @memberof dc.heatMap
   * @instance
   * @example
   * // default box on click handler
   * chart.boxOnClick(function (d) {
   *     var filter = d.key;
   *     events.trigger(function () {
   *         _chart.filter(filter);
   *         _chart.redrawGroup();
   *     });
   * });
   * @param  {Function} [handler]
   * @return {Function}
   * @return {dc.heatMap}
   */
  _chart.boxOnClick = function(handler) {
    if (!arguments.length) {
      return _boxOnClick
    }
    _boxOnClick = handler
    return _chart
  }

  /**
   * Gets or sets the handler that fires when a column tick is clicked in the x axis.
   * By default, if any cells in the column are unselected, the whole column will be selected,
   * otherwise the whole column will be unselected.
   * @name xAxisOnClick
   * @memberof dc.heatMap
   * @instance
   * @param  {Function} [handler]
   * @return {Function}
   * @return {dc.heatMap}
   */
  _chart.xAxisOnClick = function(handler) {
    if (!arguments.length) {
      return _xAxisOnClick
    }
    _xAxisOnClick = handler
    return _chart
  }

  /**
   * Gets or sets the handler that fires when a row tick is clicked in the y axis.
   * By default, if any cells in the row are unselected, the whole row will be selected,
   * otherwise the whole row will be unselected.
   * @name yAxisOnClick
   * @memberof dc.heatMap
   * @instance
   * @param  {Function} [handler]
   * @return {Function}
   * @return {dc.heatMap}
   */
  _chart.yAxisOnClick = function(handler) {
    if (!arguments.length) {
      return _yAxisOnClick
    }
    _yAxisOnClick = handler
    return _chart
  }

  /**
   * Gets or sets the X border radius.  Set to 0 to get full rectangles.
   * @name xBorderRadius
   * @memberof dc.heatMap
   * @instance
   * @param  {Number} [xBorderRadius=6.75]
   * @return {Number}
   * @return {dc.heatMap}
   */
  _chart.xBorderRadius = function(xBorderRadius) {
    if (!arguments.length) {
      return _xBorderRadius
    }
    _xBorderRadius = xBorderRadius
    return _chart
  }

  /* OVERRIDE -----------------------------------------------------------------*/
  _chart.renderAxisLabels = function() {
    const root = _chart.root()

    let yLabel = root.selectAll(".y-axis-label")

    if (yLabel.empty()) {
      yLabel = root
        .append("div")
        .attr("class", "y-axis-label")
        .text(_yLabel)
    }

    yLabel.style(
      "top",
      _chart.effectiveHeight() / 2 + _chart.margins().top + "px"
    )

    _chart.prepareLabelEdit("y")

    let xLabel = root.selectAll(".x-axis-label")

    if (xLabel.empty()) {
      xLabel = root
        .append("div")
        .attr("class", "x-axis-label")
        .text(_xLabel)
    }

    xLabel.style(
      "left",
      _chart.effectiveWidth() / 2 + _chart.margins().left + "px"
    )

    _chart.prepareLabelEdit("x")
  }

  /* --------------------------------------------------------------------------*/

  /**
   * Gets or sets the Y border radius.  Set to 0 to get full rectangles.
   * @name yBorderRadius
   * @memberof dc.heatMap
   * @instance
   * @param  {Number} [yBorderRadius=6.75]
   * @return {Number}
   * @return {dc.heatMap}
   */
  _chart.yBorderRadius = function(yBorderRadius) {
    if (!arguments.length) {
      return _yBorderRadius
    }
    _yBorderRadius = yBorderRadius
    return _chart
  }

  _chart.isSelectedNode = function(d) {
    /* OVERRIDE -----------------------------------------------------------------*/
    return _chart.hasFilter([d.key0, d.key1]) ^ _chart.filtersInverse()
    /* --------------------------------------------------------------------------*/
  }

  /* OVERRIDE ---------------------------------------------------------------- */
  function showPopup(d, i) {
    const popup = _chart.popup()

    const popupBox = popup
      .select(".chart-popup-content")
      .html("")
      .classed("popup-list", true)

    popupBox
      .append("div")
      .attr("class", "popup-header")
      .html(
        () =>
          _colsLabel(_chart.keyAccessor()(d, i)) +
          " x " +
          _rowsLabel(_chart.valueAccessor()(d, i))
      )

    const popupItem = popupBox.append("div").attr("class", "popup-item")

    popupItem
      .append("div")
      .attr("class", "popup-legend")
      .style("background-color", _chart.getColor(d, i))

    popupItem
      .append("div")
      .attr("class", "popup-item-value")
      .html(() => {
        const customFormatter = _chart.valueFormatter()
        return (
          (customFormatter && customFormatter(d.color)) ||
          utils.formatValue(d.color)
        )
      })

    popup.classed("js-showPopup", true)
  }

  function hidePopup() {
    _chart.popup().classed("js-showPopup", false)
  }

  function positionPopup() {
    let coordinates = [0, 0]
    coordinates = _chart.popupCoordinates(d3.mouse(this))

    const scrollNode = _chart
      .root()
      .select(".svg-wrapper")
      .node()
    const x = coordinates[0] + _dockedAxesSize.left - scrollNode.scrollLeft
    const y = coordinates[1] + _chart.margins().top - scrollNode.scrollTop

    const popup = _chart
      .popup()
      .attr("style", () => "transform:translate(" + x + "px," + y + "px)")

    popup.select(".chart-popup-box").classed("align-right", function() {
      return (
        x +
          d3
            .select(this)
            .node()
            .getBoundingClientRect().width >
        _chart.width()
      )
    })
  }
  /* ------------------------------------------------------------------------- */

  _chart.colsMap = new Map()
  _chart.rowsMap = new Map()
  _chart._axisPadding = { left: 36, bottom: 42 }

  const getMaxChars = (domain, getLabel) =>
    domain
      .map(d => (d === null ? "NULL" : d))
      .map(d => (getLabel(d) ? getLabel(d).toString().length : 0))
      .reduce((prev, curr) => Math.max(prev, curr), null)

  _chart.getAxisSizes = (colsDomain, rowsDomain) => ({
    left:
      Math.min(
        getMaxChars(rowsDomain, _chart.rowsLabel()) * CHAR_WIDTH,
        MAX_LABEL_WIDTH
      ) + _chart._axisPadding.left,
    bottom: Math.max(
      Math.min(
        getMaxChars(colsDomain, _chart.colsLabel()) * CHAR_WIDTH,
        MAX_LABEL_WIDTH
      ) + _chart._axisPadding.bottom,
      MIN_AXIS_HEIGHT
    )
  })

  _chart.shouldSortYAxisDescending = data =>
    data && data.length && isDescendingAppropriateData(data[0])

  _chart
    .keyAccessor(heatMapKeyAccessor.bind(_chart))
    .valueAccessor(heatMapValueAccesor.bind(_chart))
    .colorAccessor(d => d.value)
    .rowsLabel(heatMapRowsLabel.bind(_chart))
    .colsLabel(heatMapColsLabel.bind(_chart))

  return _chart.anchor(parent, chartGroup)
}
/** ***************************************************************************
 * END OVERRIDE: dc.heatMap                                                   *
 * ***************************************************************************/
