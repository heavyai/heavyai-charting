import { constants, deregisterChart, override, transition } from "../core/core"
import { pluck, utils } from "../utils/utils"
import d3 from "d3"
import stackMixin from "../mixins/stack-mixin"
import elasticDimensionMixin from "../mixins/elastic-dimension-mixin"
import coordinateGridMixin from "../mixins/coordinate-grid-mixin"
import multiSeriesMixin from "../mixins/multi-series-mixin"

const TIME_UNIT_PER_SECONDS = {
  century: 3153600000,
  decade: 315360000,
  year: 31536000,
  quarter: 10368000,
  month: 2592000,
  week: 604800,
  day: 86400,
  hour: 3600,
  minute: 60,
  second: 1
}

const MILLISECONDS_IN_SECOND = 1000

const EXTRACT_UNIT_NUM_BUCKETS = {
  day: 31,
  isodom: 31,
  isodow: 7,
  month: 12,
  quarter: 4,
  hour: 24,
  minute: 60
}

/**
 * Concrete bar chart/histogram implementation.
 *
 * @class barChart
 * @memberof dc
 * @mixes dc.stackMixin
 * @mixes dc.coordinateGridMixin
 * @example
 * // create a bar chart under #chart-container1 element using the default global chart group
 * var chart1 = dc.barChart('#chart-container1');
 * // create a bar chart under #chart-container2 element using chart group A
 * var chart2 = dc.barChart('#chart-container2', 'chartGroupA');
 * // create a sub-chart under a composite parent chart
 * var chart3 = dc.barChart(compositeChart);
 * @param {String|node|d3.selection|dc.compositeChart} parent - Any valid
 * {@link https://github.com/d3/d3-3.x-api-reference/blob/master/Selections.md#selecting-elements d3 single selector}
 * specifying a dom block element such as a div; or a dom element or d3 selection.  If the bar
 * chart is a sub-chart in a {@link dc.compositeChart Composite Chart} then pass in the parent
 * composite chart instance instead.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @returns {dc.barChart}
 */
export default function barChart(parent, chartGroup) {
  const MIN_BAR_WIDTH = 1
  const DEFAULT_GAP_BETWEEN_BARS = 4
  const LABEL_PADDING = 3

  let _chart = elasticDimensionMixin(stackMixin(coordinateGridMixin({})))

  let _gap = DEFAULT_GAP_BETWEEN_BARS
  let _centerBar = false
  let _alwaysUseRounding = false

  let _numBars
  const _parent = parent

  _chart._numberOfBars = null
  let _barWidth

  override(_chart, "rescale", () => {
    _chart._rescale()
    _barWidth = undefined

    return _chart
  })

  _chart.label(d => utils.printSingleValue(d.y0 + d.y), false)

  _chart.measureValue = function(value) {
    const customFormatter = _chart.valueFormatter()
    return customFormatter && customFormatter(value) || utils.formatValue(value)
  }

  _chart.plotData = function() {
    const layers = _chart
      .chartBodyG()
      .selectAll("g.stack")
      .data(_chart.data())

    calculateBarWidth()

    layers
      .enter()
      .append("g")
      .attr("class", (d, i) => "stack " + "_" + i)

    const last = layers.size() - 1
    layers.each(function(d, i) {
      const layer = d3.select(this)

      renderBars(layer, i, d)
      if (_chart.renderLabel() && last === i) {
        renderLabels(layer, i, d)
      }
    })

    if (_chart.brushOn()) {
      hoverOverBrush()
    }
  }

  function hoverOverBrush() {
    var g = _chart
      .g()
      .on("mouseout", () => {
        dehighlightBars()
      })
      .on("mousemove", function() {
        if (_chart.isBrushing()) {
          hidePopup()
        } else {
          highlightBars(g, this)
        }
      })
  }

  function highlightBars(g, e) {
    let coordinates = [0, 0]
    coordinates = _chart.popupCoordinates(d3.mouse(e))
    const x = coordinates[0]
    const y = coordinates[1]
    const xAdjusted = x - _chart.margins().left
    const yAdjusted = y - _chart.margins().top

    const popupRows = []

    const toolTips = g.selectAll(".stack").each(function() {
      let hoverBar = null

      const bars = d3
        .select(this)
        .selectAll(".bar")
        .style("fill-opacity", 1)

      bars[0].sort((a, b) => d3.select(a).attr("x") - d3.select(b).attr("x"))

      bars[0].some((obj, i) => {
        const elm = d3.select(obj)

        if (xAdjusted < elm.attr("x")) {
          return true
        }

        hoverBar = { elm, datum: elm.datum(), i }
      })

      if (
        hoverBar &&
        Math.abs(hoverBar.elm.attr("x") - xAdjusted) < _barWidth
      ) {
        hoverBar.elm.style("fill-opacity", 0.8)
        popupRows.push(hoverBar)
      }
    })

    if (popupRows.length > 0) {
      showPopup(popupRows.reverse(), x, y)
    } else {
      hidePopup()
    }
  }

  function dehighlightBars() {
    _chart
      .g()
      .selectAll(".bar")
      .style("fill-opacity", 1)
    hidePopup()
  }

  function showPopup(arr, x, y) {
    if (!_chart.popupIsEnabled()) {
      hidePopup()
      return false
    }
    const popup = _chart.popup().classed("hide-delay", true)

    const popupBox = popup
      .select(".chart-popup-content")
      .html("")
      .classed("popup-list", true)

    popupBox
      .append("div")
      .attr("class", "popup-header")
      .text(_chart.popupTextAccessor(arr))

    const popupItems = popupBox
      .selectAll(".popup-item")
      .data(arr)
      .enter()
      .append("div")
      .attr("class", "popup-item")

    popupItems
      .append("div")
      .attr("class", "popup-legend")
      .style("background-color", d => _chart.getColor(d.datum, d.i))

    if (_chart.series().keys()) {
      popupItems
        .append("div")
        .attr("class", "popup-item-key")
        .text(d => _chart.colorDomain()[d.datum.idx])
    }

    popupItems
      .append("div")
      .attr("class", "popup-item-value")
      .text(d => _chart.measureValue(d.datum.y))

    positionPopup(x, y)
    popup.classed("js-showPopup", true)
  }

  function hidePopup() {
    _chart.popup().classed("js-showPopup", false)
  }

  function positionPopup(x, y) {
    const popup = _chart
      .popup()
      .attr("style", () => "transform:translate(" + x + "px," + y + "px)")

    popup
      .select(".chart-popup-box")
      .classed("align-left-center", true)
      .classed("align-right-center", function() {
        return (
          x +
            (d3
              .select(this)
              .node()
              .getBoundingClientRect().width +
              32) >
          _chart.width()
        )
      })
  }

  function barHeight(d) {
    return utils.safeNumber(Math.abs(_chart.y()(d.y + d.y0) - _chart.y()(d.y0)))
  }

  function renderLabels(layer, layerIndex, d) {
    const labels = layer.selectAll("text.barLabel").data(d.values, pluck("x"))

    labels
      .enter()
      .append("text")
      .attr("class", "barLabel")
      .attr("text-anchor", "middle")

    if (_chart.isOrdinal()) {
      labels.on("click", _chart.onClick)
      labels.attr("cursor", "pointer")
    }

    transition(labels, _chart.transitionDuration())
      .attr("x", d => {
        let x = _chart.x()(d.x)
        if (!_centerBar) {
          x = x + _barWidth / 2
        }
        return utils.safeNumber(x)
      })
      .attr("y", d => {
        let y = _chart.y()(d.y + d.y0)

        if (d.y < 0) {
          y = y - barHeight(d)
        }

        return utils.safeNumber(y - LABEL_PADDING)
      })
      .text(d => _chart.label()(d))

    transition(labels.exit(), _chart.transitionDuration())
      .attr("height", 0)
      .remove()
  }

  function renderBars(layer, layerIndex, d) {
    /* OVERRIDE ---------------------------------------------------------------- */
    _numBars = d.values.length
    /* ------------------------------------------------------------------------- */
    function colors(d, i) {
      if (d.name) {
        d.layer = d.name
        return _chart.getColor(d, i)
      } else {
        return _chart.getColor(d, i)
      }
    }

    const bars = layer.selectAll("rect.bar").data(d.values, pluck("x"))

    const enter = bars
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("fill", colors)
      .attr("y", _chart.yAxisHeight())
      .attr("height", 0)

    if (_chart.renderTitle()) {
      enter.append("title").text(pluck("data", _chart.title(d.name)))
    }

    if (_chart.isOrdinal()) {
      bars.on("click", _chart.onClick)
    }

    transition(bars, _chart.transitionDuration())
      .attr("x", d => {
        let x = _chart.x()(d.x)
        if (_centerBar) {
          x = x - _barWidth / 2
        }
        if (_chart.isOrdinal() && _gap !== undefined) {
          x = x + _gap / 2
        }
        return utils.safeNumber(x)
      })
      .attr("y", d => {
        let y = _chart.y()(d.y + d.y0)

        if (d.y < 0) {
          y = y - barHeight(d)
        }

        return utils.safeNumber(y)
      })
      .attr("width", _barWidth)
      .attr("height", d => barHeight(d))
      .attr("fill", colors)
      .select("title")
      .text(pluck("data", _chart.title(d.name)))

    transition(bars.exit(), _chart.transitionDuration())
      .attr("height", 0)
      .remove()
  }

  function calculateBarWidth() {
    let numberOfBars
    const binParams = _chart.group().binParams()[0]

    if (binParams) {
      numberOfBars = binParams.timeBin
        ? _chart.getTimeBinSize(binParams)
        : binParams.numBins
    } else {
      const allValues = _chart.data()[0].values.map(val => val.x)
      const maxVal = Math.max.apply(null, allValues)
      const minVal = Math.min.apply(null, allValues)

      numberOfBars = maxVal - minVal
    }

    if (_chart.isOrdinal() && _gap === undefined) {
      _barWidth = Math.floor(_chart.x().rangeBand())
    } else if (_gap) {
      _barWidth = Math.floor(
        (_chart.xAxisLength() - (numberOfBars - 1) * _gap) / numberOfBars
      )
    } else {
      _barWidth = Math.floor(
        _chart.xAxisLength() / (1 + _chart.barPadding()) / numberOfBars
      )
    }

    if (
      _barWidth === Infinity ||
      isNaN(_barWidth) ||
      _barWidth < MIN_BAR_WIDTH
    ) {
      _barWidth = MIN_BAR_WIDTH
    }
  }

  _chart.fadeDeselectedArea = function() {
    const bars = _chart.chartBodyG().selectAll("rect.bar")
    const extent = _chart.brush().extent()

    if (_chart.isOrdinal()) {
      if (_chart.hasFilter()) {
        bars.classed(constants.SELECTED_CLASS, d => _chart.hasFilter(d.x))
        bars.classed(constants.DESELECTED_CLASS, d => !_chart.hasFilter(d.x))
      } else {
        bars.classed(constants.SELECTED_CLASS, false)
        bars.classed(constants.DESELECTED_CLASS, false)
      }
    } else if (!_chart.brushIsEmpty(extent)) {
      const start = extent[0]
      const end = extent[1]

      bars.classed(constants.DESELECTED_CLASS, d => d.x < start || d.x >= end)
    } else {
      bars.classed(constants.DESELECTED_CLASS, false)
    }
  }

  /**
   * Whether the bar chart will render each bar centered around the data position on the x-axis.
   * @name centerBar
   * @memberof dc.barChart
   * @instance
   * @param {Boolean} [centerBar=false]
   * @return {Boolean}
   * @return {dc.barChart}
   */
  _chart.centerBar = function(centerBar) {
    if (!arguments.length) {
      return _centerBar
    }
    _centerBar = centerBar
    return _chart
  }

  override(_chart, "onClick", d => {
    _chart._onClick(d.data)
  })

  /**
   * Get or set the spacing between bars as a fraction of bar size. Valid values are between 0-1.
   * Setting this value will also remove any previously set {@link #dc.barChart+gap gap}. See the
   * {@link https://github.com/mbostock/d3/wiki/Ordinal-Scales#wiki-ordinal_rangeBands d3 docs}
   * for a visual description of how the padding is applied.
   * @name barPadding
   * @memberof dc.barChart
   * @instance
   * @param {Number} [barPadding=0]
   * @return {Number}
   * @return {dc.barChart}
   */
  _chart.barPadding = function(barPadding) {
    if (!arguments.length) {
      return _chart._rangeBandPadding()
    }
    _chart._rangeBandPadding(barPadding)
    _gap = undefined
    return _chart
  }

  _chart._useOuterPadding = function() {
    return _gap === undefined
  }

  /**
   * Get or set the outer padding on an ordinal bar chart. This setting has no effect on non-ordinal charts.
   * Will pad the width by `padding * barWidth` on each side of the chart.
   * @name outerPadding
   * @memberof dc.barChart
   * @instance
   * @param {Number} [padding=0.5]
   * @return {Number}
   * @return {dc.barChart}
   */
  _chart.outerPadding = _chart._outerRangeBandPadding

  /**
   * Manually set fixed gap (in px) between bars instead of relying on the default auto-generated
   * gap.  By default the bar chart implementation will calculate and set the gap automatically
   * based on the number of data points and the length of the x axis.
   * @name gap
   * @memberof dc.barChart
   * @instance
   * @param {Number} [gap=2]
   * @return {Number}
   * @return {dc.barChart}
   */
  _chart.gap = function(gap) {
    if (!arguments.length) {
      return _gap
    }
    _gap = gap
    return _chart
  }

  _chart.extendBrush = function() {
    const extent = _chart.brush().extent()
    if (_chart.round() && (!_centerBar || _alwaysUseRounding)) {
      extent[0] = extent.map(_chart.round())[0]
      extent[1] = extent.map(_chart.round())[1]

      _chart
        .chartBodyG()
        .select(".brush")
        .call(_chart.brush().extent(extent))
    }

    return extent
  }

  /**
   * Set or get whether rounding is enabled when bars are centered. If false, using
   * rounding with centered bars will result in a warning and rounding will be ignored.  This flag
   * has no effect if bars are not {@link #dc.barChart+centerBar centered}.
   * When using standard d3.js rounding methods, the brush often doesn't align correctly with
   * centered bars since the bars are offset.  The rounding function must add an offset to
   * compensate, such as in the following example.
   * @name alwaysUseRounding
   * @memberof dc.barChart
   * @instance
   * @example
   * chart.round(function(n) { return Math.floor(n) + 0.5; });
   * @param {Boolean} [alwaysUseRounding=false]
   * @return {Boolean}
   * @return {dc.barChart}
   */
  _chart.alwaysUseRounding = function(alwaysUseRounding) {
    if (!arguments.length) {
      return _alwaysUseRounding
    }
    _alwaysUseRounding = alwaysUseRounding
    return _chart
  }

  function colorFilter(color, inv) {
    return function() {
      const item = d3.select(this)
      const match = item.attr("fill") === color
      return inv ? !match : match
    }
  }

  _chart.legendHighlight = function(d) {
    if (!_chart.isLegendableHidden(d)) {
      _chart
        .g()
        .selectAll("rect.bar")
        .classed("highlight", colorFilter(d.color))
        .classed("fadeout", colorFilter(d.color, true))
    }
  }

  _chart.legendReset = function() {
    _chart
      .g()
      .selectAll("rect.bar")
      .classed("highlight", false)
      .classed("fadeout", false)
  }

  override(_chart, "xAxisMax", function() {
    let max = this._xAxisMax()
    if ("resolution" in _chart.xUnits()) {
      const res = _chart.xUnits().resolution
      max = max + res
    }
    return max
  })

  const getConservativeDateTruncBucket = binUnit =>
    TIME_UNIT_PER_SECONDS[binUnit] * MILLISECONDS_IN_SECOND

  const getDateExtractBucket = binUnit => EXTRACT_UNIT_NUM_BUCKETS[binUnit]

  _chart.getTimeBinSize = binParams => {
    if (binParams.extract && binParams.timeBin !== "year") {
      return getDateExtractBucket(binParams.timeBin)
    }
    return Math.ceil(
      (_chart.xAxisMax() - _chart.xAxisMin()) /
        getConservativeDateTruncBucket(binParams.timeBin)
    )
  }

  _chart.renderLabel(false)

  _chart = multiSeriesMixin(_chart)

  _chart.destroyChart = function() {
    deregisterChart(_chart, _chart.chartGroup())
    _chart.on("filtered", null)
    _chart.filterAll()
    _chart.resetSvg()
    _chart
      .root()
      .attr("style", "")
      .attr("class", "")
      .html("")
    _chart._doRender = () => _chart
  }

  return _chart.anchor(parent, chartGroup)
}
