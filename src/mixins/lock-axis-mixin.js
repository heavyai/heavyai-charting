import d3 from "d3"
import { formatDataValue } from "../utils/formatting-helpers"
import moment from "moment"

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
    _listeners.elasticY(chart)
  }
  chart._invokeYDomainListener = function(minMax) {
    _listeners.yDomain(chart, minMax)
  }

  chart._invokeelasticXListener = function() {
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
      chart._invokeelasticYListener()
      if (chart.elasticY()) {
        chart._invokeYDomainListener(null)
      } else {
        chart._invokeYDomainListener(
          chart
            .y()
            .domain()
            .slice(0)
        )
      }
    } else {
      chart.elasticX(!chart.elasticX())
      chart._invokeelasticXListener()
      if (chart.elasticX()) {
        chart._invokeXDomainListener(null)
      } else {
        chart._invokeXDomainListener(
          chart
            .x()
            .domain()
            .slice()
        )
      }
      if (chart.focusChart && chart.focusChart()) {
        chart.focusChart().elasticX(!chart.focusChart().elasticX())
        chart.focusChart()._invokeelasticXListener()
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
        chart.focusChart().redrawAsync()
      }
    }
    chart.redrawAsync()
  }

  function updateMinMax(type, value) {
    if (
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
    if (chart.focusChart && chart.focusChart() && type === "y") {
      return
    }

    const iconPosition = {
      left:
        type === "y"
          ? `${chart.margins().left - TOGGLE_SIZE / 2}px`
          : `${chart.width() - chart.margins().right}px`,
      top:
        type === "y"
          ? `${chart.margins().top - TOGGLE_SIZE}px`
          : `${chart.height() - chart.margins().bottom}px`
    }

    const inputsPosition = {
      minLeft: `${chart.margins().left}px`,
      minTop: `${chart.height() - chart.margins().bottom}px`,
      maxLeft:
        type === "y"
          ? `${chart.margins().left}px`
          : `${chart.width() - chart.margins().right}px`,
      maxTop:
        type === "y"
          ? `${chart.margins().top}px`
          : `${chart.height() - chart.margins().bottom}px`
    }

    const hitBoxDim = {
      top: type === "y" ? 0 : `${chart.height() - chart.margins().bottom}px`,
      left: type === "y" ? 0 : `${chart.margins().left}px`,
      width:
        type === "y"
          ? `${chart.margins().left}px`
          : `${chart.width() - chart.margins().left}px`,
      height:
        type === "y" ? `${chart.height()}px` : `${chart.margins().bottom}px`
    }

    const minMax = chart[type]()
      .domain()
      .slice()

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

    lockWrapper
      .append("div")
      .attr("class", `lock-toggle type-${type}`)
      .classed(
        "is-locked",
        () => (type === "y" ? !chart.elasticY() : !chart.elasticX())
      )
      .style("top", iconPosition.top)
      .style("left", iconPosition.left)
      .on("click", () => toggleLock(type))

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
        const val =
          minMax[1] instanceof Date
            ? moment(this.value, DATE_FORMAT).toDate()
            : parseFloatStrict(this.value.replace(/,/g, ""))
        updateMinMax(type, [minMax[0], val])
      })
      .on("keyup", function() {
        if (d3.event.keyCode === RETURN_KEY) {
          this.blur()
        }
      })

    axisMax.append("div").text(formatVal(minMax[1]))

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
        const val =
          minMax[0] instanceof Date
            ? moment(this.value, DATE_FORMAT).toDate()
            : parseFloatStrict(this.value.replace(/,/g, ""))
        updateMinMax(type, [val, minMax[1]])
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
