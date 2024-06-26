import d3 from "d3"

const NON_INDEX = -1
const LEGEND_WIDTH = 180
const LABEL_WIDTH_MULTIPLIER = 0.9

export default function labelMixin(chart) {
  const events = ["xLabel", "yLabel"]
  const _listeners = d3.dispatch.apply(d3, events)
  const _on = chart.on.bind(chart)
  let _measureLabelsOn = false

  chart.measureLabelsOn = function(val) {
    if (!arguments.length) {
      return _measureLabelsOn
    }
    _measureLabelsOn = val
    return chart
  }

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

  chart._invokeLabelYListener = function(val) {
    _listeners.yLabel(chart, val)
  }

  chart._invokeLabelXListener = function(val) {
    _listeners.xLabel(chart, val)
  }

  function rangeChart() {
    return typeof chart.rangeChart === "function" && chart.rangeChart()
  }

  function focusChart() {
    return typeof chart.focusChart === "function" && chart.focusChart()
  }

  function isIE11() {
    return (
      Boolean(window.MSInputMethodContext) && Boolean(document.documentMode)
    )
  }

  function getMaxLabelWidth(type, hasLegend) {
    if (type === "y") {
      const height =
        chart.height() + (rangeChart() ? chart.rangeChart().height() : 0)
      return (
        (height - Math.max(chart.margins().top + chart.margins().bottom, 64)) *
        LABEL_WIDTH_MULTIPLIER
      )
    }

    return (
      (hasLegend ? chart.width() - LEGEND_WIDTH : chart.effectiveWidth()) *
      LABEL_WIDTH_MULTIPLIER
    )
  }

  function getXaxisLeftPosition(hasLegend) {
    return hasLegend
      ? chart.getAxisLabelContainerWidth("x", hasLegend) / 2 + 32
      : chart.effectiveWidth() / 2 + chart.margins().left
  }

  function getYaxisTopPosition() {
    const yOffset = rangeChart()
      ? chart.rangeChart().height() -
        chart.rangeChart().margins().bottom +
        chart.margins().bottom
      : 0
    return (
      (chart.height() -
        Math.max(chart.margins().top + chart.margins().bottom, 64) +
        yOffset) /
        2 +
      chart.margins().top
    )
  }

  chart.getAxisLabelContainerWidth = function(type, hasLegend) {
    const width =
      type === "x" ? chart.effectiveWidth() : chart.effectiveHeight()
    const adjustForLegend = type === "x" && hasLegend ? 32 : 0
    return width - adjustForLegend
  }

  function setLabel(type, val) {
    chart[`${type}AxisLabel`](val)
    if (focusChart()) {
      chart.focusChart()[`_invokeLabel${type.toUpperCase()}Listener`](val)
      if (type === "x") {
        chart.xAxisLabel(val)
        chart.redrawAsync()
      }
      return
    }
    chart[`_invokeLabel${type.toUpperCase()}Listener`](val)
    chart.redrawAsync()
  }

  chart.prepareLabelEdit = function(type = "y") {
    if ((rangeChart() && type === "x") || (focusChart() && type === "y")) {
      return
    }
    const hasLegend =
      type === "x" &&
      chart.legend() &&
      chart.legend().legendType &&
      chart.legend().legendType() === "quantitative"

    const iconPosition = {
      left: ["y", "y2"].includes(type)
        ? ""
        : `${getXaxisLeftPosition(hasLegend)}px`,
      top: ["y", "y2"].includes(type) ? `${getYaxisTopPosition()}px` : ""
    }

    if (type === "y2") {
      iconPosition.left = `${chart.width() - chart.margins().right / 2.5}px`
    }

    chart
      .root()
      .selectAll(`.axis-label-edit.type-${type}`)
      .remove()

    chart
      .root()
      .selectAll(".y-axis-label, .x-axis-label, .y2-axis-label")
      .style("display", "none")

    const editorWrapper = chart
      .root()
      .append("div")
      .attr("class", `axis-label-edit type-${type}`)
      .style("width", `${chart.getAxisLabelContainerWidth(type, hasLegend)}px`)
      .classed("has-legend", hasLegend)
      .style("top", iconPosition.top)
      .style("left", iconPosition.left)
      .append("div")
      .attr("class", "input-wrapper")
      .style("max-width", `${getMaxLabelWidth(type, hasLegend)}px`)
      .style(
        "width",
        isIE11() ? `${getMaxLabelWidth(type, hasLegend)}px` : "auto"
      )

    editorWrapper.append("span").text(chart[`${type}AxisLabel`]())

    editorWrapper
      .append("input")
      .attr("value", chart[`${type}AxisLabel`]())
      .attr("title", chart[`${type}AxisLabel`]())
      .on("focus", function() {
        this.select()
      })
      .on("keyup", function() {
        d3.select(this.parentNode)
          .select("span")
          .text(this.value)
        if (d3.event.keyCode === 13) {
          this.blur()
        }
      })
      .on("mouseup", () => {
        d3.event.preventDefault()
      })
      .on("change", function() {
        this.blur()
      })
      .on("blur", function() {
        setLabel(type, this.value)
      })
  }

  return chart
}
