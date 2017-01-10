import {xAxisTickFormat, xDomain, xScale} from "./utils"
import d3 from "d3"
import dc from "../../mapdc"

const DEFAULT_NUM_TICKS = 10
const MAX_TICK_WIDTH = 64
const DEFAULT_TIME_DIMENSION_INDEX = 0
const ENTER_KEY = 13
const ONE_SECOND_IN_MS = 1000

export function overrideCoordinate (chart) {
  chart._rangeFocused = false
  chart._rangeInput = false
  chart._binInput = false
  chart._binSnap = false

  chart.popupTextAccessor = (arr) => () => (dc.utils.formatValue(arr[0].datum.data.key0))

  chart.getNumTicksForXAxis = () => {
    const xDomain = chart.x().domain()
    const timeBinParam = chart.group().binParams()[DEFAULT_TIME_DIMENSION_INDEX]
    if (timeBinParam && timeBinParam.extract) {
      return xDomain[xDomain.length - 1] - xDomain[0]
    } else {
      const effectiveWidth = chart.effectiveWidth()
      const numTicks = chart.xAxis().scale().ticks().length
      return effectiveWidth / numTicks < MAX_TICK_WIDTH ? Math.ceil(effectiveWidth / MAX_TICK_WIDTH) : DEFAULT_NUM_TICKS
    }
  }

  dc.override(chart, "filterAll", function (_softFilterClear) {
    chart._filterAll(_softFilterClear)
    if (chart.rangeChartEnabled()) {
      const RangeChart = chart.rangeChart()
      if (_softFilterClear) {
        RangeChart.softFilterClear(true)
      } else {
        RangeChart.softFilterClear(false)
      }
      return RangeChart.filter(null)
    }
  })

  chart.destroyChart = function () {
    if (chart.rangeChartEnabled()) {
      chart.rangeChartEnabled(false)
    }
  }

  chart.rangeFocused = function (_) {
    if (!arguments.length) {
      return chart._rangeFocused
    }
    chart._rangeFocused = _

    return chart
  }

  chart.rangeInput = function (_) {
    if (!arguments.length) {
      return chart._rangeInput
    }
    chart._rangeInput = _

    return chart
  }

  chart.binInput = function (_) {

    if (!arguments.length) {
      return chart._binInput
    }
    chart._binInput = _

    return chart
  }

  chart.isTime = function (_) {
    if (!arguments.length) {
      return chart._isTime
    }

    chart._isTime = _
    return chart
  }


  /* istanbul ignore next */
  chart.getBinInputVal = function () {
    return chart.binInputOptions().filter(function (d) { return d.val === chart.timeBinInputVal() })
  }

  /* istanbul ignore next */
  chart.updateRangeInput = function () {
    const dateFormat = d3.time.format.utc("%b %d, %Y")
    const timeFormat = d3.time.format.utc("%I:%M%p")

    const extent = chart.filter() || chart.x().domain()
    const rangeDisplay = chart.root().selectAll(".range-display")
    const binNumSecs = chart.binInputOptions().filter(function (d) { return chart.group().binParams()[0].timeBin === d.val })[0].numSeconds

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

    const extent = chart.filter() || chart.x().domain()
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

    const currentExtent = chart.filter() || chart.x().domain()

    const binNumSecs = chart.binInputOptions().filter(function (d) { return chart.group().binParams()[0].timeBin === d.val })[0].numSeconds

    const inputFormat = binNumSecs > 3600 ? d3.time.format.utc("%m-%d-%Y") : (currentInput.attr("class").indexOf("day") >= 0 ? d3.time.format.utc("%m-%d-%Y %I:%M%p") : d3.time.format.utc("%b %d, %Y %I:%M%p"))

    const inputStr = binNumSecs > 3600 ? newValue : d3.select(thisInput.parentNode).selectAll(".range-day").property("value") + " " + d3.select(thisInput.parentNode).selectAll(".range-time").property("value")

    const date = inputFormat.parse(inputStr)

    if (!date) {
      currentInput.property("value", currentValue)
      thisInput.blur()
      return
    }

    const extentChart = chart.rangeChartEnabled() ? chart.rangeChart() : chart

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

    if (chart._binInput) {
      extent[1] = new Date(extent[1].getTime() + ONE_SECOND_IN_MS)
    }

    const domFilter = dc.filters.RangedFilter(extent[0], extent[1])

    extentChart.replaceFilter(domFilter)
    extentChart.rescale()
    extentChart.redrawAsync().then(() => {
      if (chart.rangeChartEnabled()) {
        chart._binSnap = chart._binInput
        chart.focus(domFilter)
        chart.replaceFilter(domFilter)
      }

      thisInput.blur()
      chart.updateRangeInput()
    })
  }

  /* istanbul ignore next */
  chart.renderYAxisLabel = function (axisClass, text, rotation) {
    const root = chart.root()

    let yLabel = root.selectAll(".y-axis-label")

    if (yLabel.empty() && !chart._isRangeChart) {
      yLabel = root.append("div")
      .attr("class", "y-axis-label")
    }

    if (text !== "") {
      const yOffset = (chart.rangeChartEnabled() && chart._rangeChartCreated ? chart.rangeChart().height() - chart.rangeChart().margins().bottom + chart.margins().bottom : chart.margins().bottom)

      yLabel
          .style("top", ((chart.effectiveHeight() + yOffset) / 2 + chart.margins().top) + "px")
          .text(text)
    }
  }

  /* istanbul ignore next */
  chart.renderXAxis = function (g) {
    let axisXG = g.selectAll("g.x")

    if (axisXG.empty()) {
      axisXG = g.append("g")
            .attr("class", "axis x")
            .attr("transform", "translate(" + chart.margins().left + "," + chart._xAxisY() + ")")
    }

    /* OVERRIDE -----------------------------------------------------------------*/
    const root = chart.root()

    if (chart.rangeInput()) {
      let rangeDisplay = root.selectAll(".range-display")

      if (rangeDisplay.empty()) {
        rangeDisplay = root.append("div")
                .attr("class", "range-display")
                .style("right", chart.margins().right + "px")

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

        if (chart.group().binParams()[0].timeBin) {
          chart.updateRangeInput()
        }

        chart.root().select("div > .svg-wrapper")
          .on("mouseover", function () {
            rangeDisplay.selectAll("input").classed("active", true)
          })
          .on("mouseleave", function () {
            rangeDisplay.selectAll("input").classed("active", false)
          })
      }

    }

    let xLabel = root.selectAll(".x-axis-label")

    const shouldAppendLabel = chart.rangeChartEnabled() ? false : xLabel.empty()
    if (shouldAppendLabel) {
      xLabel = root.append("div")
        .attr("class", "x-axis-label")
    }

    if (!chart.rangeChartEnabled()) {
      xLabel
          .style("left", (chart.effectiveWidth() / 2 + chart.margins().left) + "px")
          .text(chart.xAxisLabel())
    }

    dc.transition(axisXG, chart.transitionDuration())
        .attr("transform", "translate(" + chart.margins().left + "," + chart._xAxisY() + ")")
        .call(chart.xAxis())

    chart.updateBinInput()
  }

  /* istanbul ignore next */
  chart.updateBinInput = () => {
    if (chart.binInput()) {
      const root = chart.root()

      let binRow = root.selectAll(".bin-row")

      if (binRow.empty()) {
        binRow = root.append("div")
                .attr("class", "bin-row")
                .style("left", chart.margins().left + "px")

      }

      binRow.html("")
            .append("span")
            .text("BIN:")

      const binRowItems = binRow.selectAll(".bin-row-item")
            .data(chart.binInputOptions())
            .enter()

      const rangeInSeconds = Math.abs((chart.x().domain()[0].getTime() - chart.x().domain()[1].getTime()) / ONE_SECOND_IN_MS)
      const {auto, timeBin, numBins} = chart.group().binParams()[0]

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
            .on("click", d => chart.changeBinVal(d.val))

    }
  }

  const fixXAxis = (chart, data) => {
    if (isNaN(chart.xAxisMax()) || isNaN(chart.xAxisMin())) {
      chart.elasticX(false)
    } else {
      chart.elasticX(true)
    }
    if (chart.filter() && ((isNaN(chart.xAxisMin()) || isNaN(chart.xAxisMax())) || (chart.filter()[1] <= chart.xAxisMin() || chart.filter()[0] >= chart.xAxisMax()))) {
      chart.filterAll()
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

  chart.on("preRender.fixXAxis", fixXAxis)
  chart.on("preRedraw.fixXAxis", fixXAxis)
  return chart
}
