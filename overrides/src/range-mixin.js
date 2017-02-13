import {deepClone, deepEquals, xAxisTickFormat, xDomain, xScale} from "./utils"
import d3 from "d3"

import lineChart from "../../src/line-chart"
import barChart from "../../src/bar-chart"
import {deregisterChart, override} from "../../src/core"

const CHART_HEIGHT = 0.75
const RANGE_CHART_HEIGHT = 0.25
export const MAX_RANGE_HEIGHT_IN_PX = 200
export const MIN_RANGE_HEIGHT_IN_PX = 72
export const DEFAULT_RANGE_MARGINS = {top: 12, right: 24, bottom: 32, left: 48}
export const DEFAULT_CHART_MARGINS_W_RANGE = {top: 24, right: 24, bottom: 20, left: 60}
export const DEFAULT_CHART_MARGINS = {top: 24, right: 24, bottom: 52, left: 48}

function overridePlotData (chart) {
  if (!chart._plotData) {
    override(chart, "plotData", () => {

      if (chart.rangeChartEnabled() && !chart._rangeChartCreated) {
        chart._rangeChartCreated = true
        initializeRangeChart(chart)
        createRangeChart(chart)
      }

      chart._plotData()

      if (chart.rangeChartEnabled()) {
        const RangeChart = chart.rangeChart()
        chart.anchor().appendChild(RangeChart.rangeChartDiv)

        const parentHeight = chart.anchor().parentNode.clientHeight

        if (RangeChart.colors() !== chart.colors()) {
          RangeChart.colors(chart.colors())
          RangeChart._hasRendered = false
        }

        if (!deepEquals(RangeChart.series().selected(), chart.series().selected())) {
          RangeChart.series().selected(chart.series().selected())
          RangeChart._hasRendered = false
        }

        if (chart.showOther() !== RangeChart.showOther()) {
          RangeChart.showOther(chart.showOther())
          RangeChart._hasRendered = false
        }

        if (calcMaxRangeChartHeight(parentHeight) !== RangeChart.height()) {
          RangeChart.height(calcMaxRangeChartHeight(parentHeight))
          RangeChart._hasRendered = false
        }

        if (chart.width() !== RangeChart.width()) {
          RangeChart.width(chart.width())
          RangeChart._hasRendered = false
        }

        if (chart.renderArea() !== RangeChart.renderArea()) {
          RangeChart.renderArea(chart.renderArea())
          RangeChart._hasRendered = false
        }

        if (!RangeChart._hasRendered) {
          RangeChart._hasRendered = true
          RangeChart.renderAsync()
        }
      }
    })
  }
}

export function initializeRangeChart (chart) {
  let RangeChart = null
  const rangeChartDiv = document.createElement("DIV")
  rangeChartDiv.className = "range-chart"

  if (chart._chartType === "line") {
    RangeChart = lineChart(rangeChartDiv)
                   .defined(d => d.y !== null)
                   .interpolate("linear")
                   .renderArea(false)
  } else if (chart._chartType === "histogram") {
    RangeChart = barChart(rangeChartDiv)
  }

  RangeChart
      .width(chart.width())
      .height(chart.height() * RANGE_CHART_HEIGHT)
      .colorByLayerId(true)
      .elasticY(true)
      .margins(Object.assign({}, DEFAULT_RANGE_MARGINS))
      .valueAccessor(d => d.series_1)
      .xAxisLabel(chart.xAxisLabel())
      .yAxisLabel("")

  RangeChart._isRangeChart = true
  RangeChart._hasRendered = false
  chart._tempRangeChart = RangeChart
  chart.renderHorizontalGridLines(true)
  RangeChart._focusChart = chart
  RangeChart.rangeChartDiv = rangeChartDiv
}

export function createRangeChart (chart) {
  const RangeChart = chart._tempRangeChart
  chart._height(calcChartHeightWithMaxRangeChartHeight(chart._height()))
  chart.xAxisLabel("")
  chart.margins(Object.assign({}, DEFAULT_CHART_MARGINS_W_RANGE))

  const isChartDate = chart.isTime()
  RangeChart._isTime = isChartDate

  const binParams = deepClone(chart.group().binParams())

  if (isChartDate) {
    binParams[0].binBounds = binParams[0].binBounds.map(time => new Date(time))

    if (!binParams[0].extract) {
      binParams[0].timeBin = "auto"
    }
  }

  RangeChart.dimension(chart.dimension())
  const group = RangeChart.dimension().group().reduceMulti(chart._rangeMeasure).binParams(binParams)
  RangeChart.group(group)

  const defaultExact = binParams[0] ? binParams[0].extract : null
  const defaultTimeBin = binParams[0] ? binParams[0].timeBin : null
  const xDomainArr = [defaultExact, binParams[0].binBounds[0], binParams[0].binBounds[1], defaultTimeBin]
  RangeChart.x(xScale(defaultExact, isChartDate).domain(xDomain(...xDomainArr)))
  RangeChart.xAxis().scale(RangeChart.x()).tickFormat(xAxisTickFormat(binParams[0] || {extract: false, timeBin: false}, isChartDate))
  RangeChart.yAxis().tickFormat(d3.format(".2s"))
  RangeChart.colorAccessor(chart.colorAccessor())
  RangeChart.colors(chart.colors())
  RangeChart.renderArea(chart.renderArea())


  if (chart.isMulti()) {
    RangeChart.series().group(chart.series().group())
    RangeChart.series().selected(chart.series().selected())
  }

  chart.rangeChart(chart._tempRangeChart)
  if (chart._loadRangeFilter) {
    RangeChart.filter(chart._loadRangeFilter)
    chart.focus(chart._loadRangeFilter)
  }

  chart.renderAsync().then(() => {
    if (chart._loadRangeFilter) {
      if (chart._loadChartFilter && chart._loadRangeFilter[0] !== chart._loadChartFilter[0] && chart._loadRangeFilter[1] !== chart._loadChartFilter[1]) {
        chart.replaceFilter(chart._loadChartFilter)
      }
      chart._loadChartFilter = null
      chart._loadRangeFilter = null
    }
  })

  RangeChart.updateAxes = function (_chart, _binParams) {
    const _RangeChart = _chart.rangeChart()
    const _isChartDate = _chart.isTime()
    const _xDomainArr = [_binParams[0].extract, _binParams[0].binBounds[0], _binParams[0].binBounds[1], _binParams[0].timeBin]
    _RangeChart.x(xScale(_binParams[0].extract, _isChartDate).domain(xDomain(..._xDomainArr)))
    _RangeChart.xAxis().scale(RangeChart.x()).tickFormat(xAxisTickFormat(_binParams[0], _isChartDate))
    _RangeChart.yAxis().tickFormat(d3.format(".2s"))
  }

  RangeChart.destroyRangeChart = function (_chart) {
    _chart._height(_chart.anchor().parentNode.clientHeight)
    const _RangeChart = _chart.rangeChart()

    if (_chart.filters().length) {
      _chart.filter(null)
    }
    if (_RangeChart.filters().length) {
      _RangeChart.filter(null)
    }
    _chart.group().binParams(_RangeChart.group().binParams())
    _chart.xAxisLabel(_RangeChart.xAxisLabel())
    deregisterChart(_RangeChart)
    _chart.margins(DEFAULT_CHART_MARGINS)
    _chart.renderHorizontalGridLines(false)
    _chart._rangeChartCreated = false
    _chart.renderAsync()
  }

}

export default function rangeMixin (chart) {

  let hasRangeChart = false

  chart.rangeChartEnabled = function (_, chartType = "line") {
    if (!arguments.length) {
      return hasRangeChart
    }

    if (!hasRangeChart && _) {
      overridePlotData(chart)
    } else if (hasRangeChart && !_) {
      hasRangeChart = _
      chart.rangeChart().destroyRangeChart(chart)
    }

    hasRangeChart = _
    chart._chartType = chartType

    return chart
  }

  override(chart, "height", function (height) {
    if (!arguments.length) {
      return chart._height()
    }

    if (chart._isRangeChart) {
      chart._height(height)
    } else {
      chart._height(hasRangeChart ? calcChartHeightWithMaxRangeChartHeight(height) : height)
    }
    return chart
  })

  return chart
}

export function calcChartHeightWithMaxRangeChartHeight (height) {
  const rangeHeight = calcMaxRangeChartHeight(height)
  return height - rangeHeight
}

export function calcMaxRangeChartHeight (height) {
  const rangeHeight = height * RANGE_CHART_HEIGHT
  return Math.max(Math.min(rangeHeight, MAX_RANGE_HEIGHT_IN_PX), MIN_RANGE_HEIGHT_IN_PX)
}
