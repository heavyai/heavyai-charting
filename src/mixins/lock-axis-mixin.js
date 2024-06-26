import d3 from "d3"
import { formatDataValue } from "../utils/formatting-helpers"
import moment from "moment"
import { utils } from "../utils/utils"
import {
  xAxisDataIsNonNumerical,
  yAxisDataIsNonNumerical
} from "../charts/heatmap"
import { getFirstNonNullDatumForAxis } from "../utils/binning-helpers"

const CHART_HEIGHT = 0.75
const TOGGLE_SIZE = 24
const NON_INDEX = -1
const RETURN_KEY = 13
const DATE_FORMAT = "MM-DD-YYYY"

function formatVal(val) {
  return val instanceof Date
    ? d3.time.format.utc("%m-%d-%Y")(val)
    : formatDataValue(val)
}

function parseFloatStrict(value) {
  if (/^(\-|\+)?([0-9]+(\.[0-9]+)?)$/.test(value)) {
    return Number(value)
  } else {
    return NaN
  }
}

export default function lockAxisMixin(chart) {
  const events = ["elasticX", "elasticY", "xDomain", "yDomain"]
  const _listeners = d3.dispatch.apply(d3, events)
  const _on = chart.on.bind(chart)

  chart.on = function(event, listener) {
    const baseEvent = event.includes(".")
      ? event.slice(0, event.indexOf("."))
      : event
    if (events.indexOf(baseEvent) === NON_INDEX) {
      _on(event, listener)
    } else {
      _listeners.on(event, listener)
    }
    return chart
  }

  chart._invokeelasticYListener = function() {
    const scatterLayer = chart.getLayer && chart.getLayer("backendScatter")
    if (chart.elasticY && chart.elasticY() && scatterLayer) {
      scatterLayer.yDim().filter([chart.originalYMinMax])
      chart.y().domain(chart.originalYMinMax)
    }
    _listeners.elasticY(chart)
  }
  chart._invokeYDomainListener = function(minMax) {
    _listeners.yDomain(chart, minMax)
  }

  chart._invokeelasticXListener = function() {
    const scatterLayer = chart.getLayer && chart.getLayer("backendScatter")
    if (chart.elasticX && chart.elasticX() && scatterLayer) {
      scatterLayer.xDim().filter([chart.originalXMinMax])
      chart.x().domain(chart.originalXMinMax)
    }
    _listeners.elasticX(chart)
  }
  chart._invokeXDomainListener = function(minMax) {
    _listeners.xDomain(chart, minMax)
  }

  function handleRangeFocus(chart, minMax) {
    if (chart.filters().length) {
      if (minMax[0] <= chart.filter()[0] && chart.filter()[1] <= minMax[1]) {
        const preserveFilter = chart.filter().slice()
        chart.rangeChart().replaceFilter(minMax)
        chart.replaceFilter(preserveFilter)
      } else {
        chart.rangeChart().replaceFilter(minMax)
      }
    } else {
      chart.rangeChart().filter(minMax)
    }
  }

  function setAxis(type, minMax) {
    if (type === "y") {
      chart.elasticY(false)
      chart._invokeelasticYListener()
      chart.y().domain(minMax)
      chart._invokeYDomainListener(minMax)
    } else {
      if (chart.rangeChart && chart.rangeChart()) {
        return handleRangeFocus(chart, minMax)
      }

      chart.elasticX(false)
      chart._invokeelasticXListener()
      chart.x().domain(minMax)
      chart._invokeXDomainListener(minMax)
      if (chart.focusChart && chart.focusChart()) {
        chart.focusChart().elasticX(false)
        chart.focusChart()._invokeelasticXListener()
        chart.focusChart()._invokeXDomainListener(minMax)
        if (!chart.filters().length) {
          chart
            .focusChart()
            .x()
            .domain(minMax)
        }
        chart.focusChart().xOriginalDomain(minMax)
        chart.focusChart().renderAsync()
      }
    }
    chart.renderAsync()
  }

  function toggleLock(type) {
    if (type === "y") {
      chart.elasticY(!chart.elasticY())
      const yDomain = chart
        .y()
        .domain()
        .slice(0)
      chart._invokeYDomainListener(
        chart.elasticY() ? chart.originalYMinMax || yDomain : yDomain
      )
      chart._invokeelasticYListener()
    } else {
      chart.elasticX(!chart.elasticX())
      const xDomain = chart
        .x()
        .domain()
        .slice()
      chart._invokeXDomainListener(
        chart.elasticX() ? chart.originalXMinMax || xDomain : xDomain
      )
      chart._invokeelasticXListener()
      if (chart.focusChart && chart.focusChart()) {
        chart.focusChart().elasticX(!chart.focusChart().elasticX())
        if (chart.elasticX()) {
          chart.focusChart()._invokeXDomainListener(null)
        } else {
          chart.focusChart()._invokeXDomainListener(
            chart
              .x()
              .domain()
              .slice()
          )
        }
        chart.focusChart()._invokeelasticXListener()
        chart.focusChart().redrawAsync()
      }
    }
    chart.redrawAsync()
  }

  const valueOutOfBounds = (value, originalMinMax) =>
    originalMinMax &&
    (value[0] < originalMinMax[0] ||
      value[1] < originalMinMax[0] ||
      value[0] > originalMinMax[1] ||
      value[1] > originalMinMax[1])

  function updateMinMax(type, value) {
    const valOutOfBounds = valueOutOfBounds(
      value,
      type === "x" ? chart.originalXMinMax : chart.originalYMinMax
    )
    if (
      valOutOfBounds ||
      value.some(isNaN) ||
      value[1] <= value[0] ||
      (type === "x" &&
        chart.rangeChart &&
        chart.rangeChart() &&
        (value[0] <
          chart
            .rangeChart()
            .x()
            .domain()[0] ||
          value[1] >
            chart
              .rangeChart()
              .x()
              .domain()[1]))
    ) {
      chart.prepareLockAxis(type)
    } else {
      setAxis(type, value)
    }
  }

  chart.prepareLockAxis = function(type = "y") {
    const data = chart.data && chart.data()
    const firstNonNullDatum = getFirstNonNullDatumForAxis(data, type)
    const heatDataIncompatible =
      chart.isHeatMap &&
      data &&
      Array.isArray(data) &&
      firstNonNullDatum &&
      (type === "y"
        ? yAxisDataIsNonNumerical(firstNonNullDatum)
        : xAxisDataIsNonNumerical(firstNonNullDatum))
    if (
      (chart.focusChart && chart.focusChart() && type === "y") ||
      heatDataIncompatible
    ) {
      return
    }

    const chartLeftPixels =
      chart.dockedAxesSize && chart.dockedAxesSize()
        ? chart.dockedAxesSize().left
        : chart.margins().left
    const chartBottomPixels =
      chart.dockedAxesSize && chart.dockedAxesSize()
        ? chart.dockedAxesSize().bottom
        : chart.margins().bottom

    const iconPosition = {
      left:
        type === "y"
          ? `${chartLeftPixels - TOGGLE_SIZE / 2}px`
          : `${chart.width() - chart.margins().right}px`,
      top:
        type === "y"
          ? `${chart.margins().top - TOGGLE_SIZE}px`
          : `${chart.height() - chartBottomPixels}px`
    }

    const inputsPosition = {
      minLeft: type === "y" ? `${chartLeftPixels}px` : `${chartLeftPixels}px`,
      minTop: `${chart.height() - chartBottomPixels}px`,
      maxLeft:
        type === "y"
          ? `${chartLeftPixels}px`
          : `${chart.width() - chart.margins().right}px`,
      maxTop:
        type === "y"
          ? `${chart.margins().top}px`
          : `${chart.height() - chartBottomPixels}px`
    }

    const hitBoxDim = {
      top:
        type === "y"
          ? 0
          : `${
              chart.height() - chartBottomPixels /* chart.margins().bottom*/
            }px`,
      left: type === "y" ? 0 : `${chartLeftPixels /* chart.margins().left*/}px`,
      width:
        type === "y"
          ? `${chartLeftPixels}px`
          : `${chart.width() - chartLeftPixels}px`,
      height:
        type === "y"
          ? `${chart.height()}px`
          : `${chartBottomPixels /* chart.margins().bottom*/}px`
    }

    const minMax = chart[type]()
      .domain()
      .slice()

    // Horrible hack to ensure the inputs aren't inverted from whatever order
    //  the Y axis decides to display.  Mea culpa.
    let shouldFlipYMinMax = false
    const isHeatY = chart.isHeatMap && type === "y"
    if (isHeatY) {
      const data = chart.data && chart.data()
      const rowOrdering = chart.shouldSortYAxisDescending(data)
        ? utils.nullsLast(d3.descending)
        : utils.nullsFirst(d3.ascending)
      let rows = chart.rows() || data.map(chart.valueAccessor())
      rows = rows.sort(rowOrdering)
      const firstRowValue = rows.find(r => r !== null)
      let lastRowValue = null
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i] !== null) {
          lastRowValue = rows[i]
          break
        }
      }
      const minMaxIsAscending = minMax[0] < minMax[1]
      const rowsAreAscending = firstRowValue < lastRowValue
      shouldFlipYMinMax =
        firstRowValue !== lastRowValue &&
        !minMaxIsAscending === rowsAreAscending
      if (shouldFlipYMinMax) {
        minMax.reverse()
      }
    }

    chart
      .root()
      .selectAll(`.axis-lock.type-${type}`)
      .remove()

    const lockWrapper = chart
      .root()
      .append("div")
      .attr("class", `axis-lock type-${type}`)

    lockWrapper
      .append("div")
      .attr("class", "hit-box")
      .style("width", hitBoxDim.width)
      .style("height", hitBoxDim.height)
      .style("top", hitBoxDim.top)
      .style("left", hitBoxDim.left)

    // Occasionally, the x-axis domain of a chart can be empty due to a global
    // or chart filter. heavyai-charting will see the domain extent as [NaN, NaN],
    // and we don't want the user to lock the chart with this faulty extent. So,
    // we're going to use this funciton to see if we should disable the axis
    // lock feature. Conditions:
    //  1. Only the x-axis lock togggle can be disabled (for now?)
    //  2. We only want to prevent the user from locking the x-axis, not unlocking it
    //  3. We want to disable it if any value in the extent === NaN
    const shouldDisableAxisLock = () => {
      if (type === "x" && chart.elasticX()) {
        const xDomain = chart
          .x()
          .domain()
          .slice()
        return isNaN(xDomain[0]) || isNaN(xDomain[1])
      }
      return false
    }

    lockWrapper
      .append("div")
      .attr("class", `lock-toggle type-${type}`)
      .classed("is-locked", () =>
        type === "y" ? !chart.elasticY() : !chart.elasticX()
      )
      .classed("disabled", shouldDisableAxisLock)
      .style("top", iconPosition.top)
      .style("left", iconPosition.left)
      .on("click", () => {
        if (!shouldDisableAxisLock()) {
          toggleLock(type)
        }
      })

    if (chart.rangeChart && chart.rangeChart() && type === "x") {
      lockWrapper.selectAll(".lock-toggle.type-x").remove()
    }

    const axisMax = lockWrapper
      .append("div")
      .attr("class", "axis-input max")
      .style("top", inputsPosition.maxTop)
      .style("left", inputsPosition.maxLeft)

    axisMax
      .append("input")
      .attr("pattern", "[0-9-]")
      .attr("value", formatVal(minMax[1]))
      .on("focus", function() {
        this.select()
      })
      .on("change", function() {
        const max = minMax[1]
        const min = minMax[0]
        const val =
          max instanceof Date
            ? moment(this.value, DATE_FORMAT).toDate()
            : parseFloatStrict(this.value.replace(/,/g, ""))
        updateMinMax(type, shouldFlipYMinMax ? [val, min] : [min, val])
      })
      .on("keyup", function() {
        if (d3.event.keyCode === RETURN_KEY) {
          this.blur()
        }
      })

    const maxVal = formatVal(minMax[1])
    axisMax.append("div").text(maxVal)

    const axisMin = lockWrapper
      .append("div")
      .attr("class", "axis-input min")
      .style("top", inputsPosition.minTop)
      .style("left", inputsPosition.minLeft)

    axisMin
      .append("input")
      .attr("value", formatVal(minMax[0]))
      .on("focus", function() {
        this.select()
      })
      .on("change", function() {
        const max = minMax[1]
        const min = minMax[0]
        const val =
          min instanceof Date
            ? moment(this.value, DATE_FORMAT).toDate()
            : parseFloatStrict(this.value.replace(/,/g, ""))
        updateMinMax(type, shouldFlipYMinMax ? [max, val] : [val, max])
      })
      .on("keyup", function() {
        if (d3.event.keyCode === RETURN_KEY) {
          this.blur()
        }
      })

    axisMin.append("div").text(formatVal(minMax[0]))
  }

  return chart
}
