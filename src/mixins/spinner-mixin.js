import { chartRegistry } from "../core/core"
import d3 from "d3"
import { SPINNER_DELAY } from "../constants/dc-constants"

export const areAnySpinnersShowing = () =>
  chartRegistry.list().some(chart => chart.isSpinnerShowing())
export const setCursorSpinner = () =>
  d3.select("body").classed("waiting", areAnySpinnersShowing())

export default function spinnerMixin(_chart) {
  let _spinnerDelay = SPINNER_DELAY
  let _spinnerTimeout = null
  let _spinnerIsVisible = false

  _chart.isSpinnerShowing = () => _spinnerIsVisible

  let _dataFetchRequestCallback = () => {
    const anchor = _chart.anchor()
    const selectedAnchor = d3.select(anchor)

    selectedAnchor.classed("chart-loading-overlay", true)

    const loadingWidget = selectedAnchor
      .append("div")
      .classed("loading-widget-dc", true)

    loadingWidget.append("div").classed("main-loading-icon", true)
  }

  let _dataFetchSuccessfulCallback = () => {
    const anchor = _chart.anchor()

    const selectedAnchor = d3.select(anchor)

    selectedAnchor.classed("chart-loading-overlay", false)

    selectedAnchor
      .selectAll(function() {
        return [...this.childNodes].filter(
          node => node.className === "loading-widget-dc"
        )
      })
      .remove()

    d3.select("body").classed("waiting", areAnySpinnersShowing())
  }

  _chart.spinnerDelay = function(delay) {
    if (!arguments.length) {
      return _spinnerDelay
    }

    _spinnerDelay = delay
    return _chart
  }

  _chart.dataFetchSuccessfulCallback = function(func) {
    if (!arguments.length) {
      return _dataFetchSuccessfulCallback
    }

    _dataFetchSuccessfulCallback = func
    return _chart
  }

  _chart.dataFetchRequestCallback = function(func) {
    if (!arguments.length) {
      return _dataFetchRequestCallback
    }

    _dataFetchRequestCallback = func
    return _chart
  }

  function initSpinner() {
    if (_spinnerTimeout) {
      window.clearTimeout(_spinnerTimeout)
    }

    _spinnerTimeout = window.setTimeout(() => {
      _spinnerIsVisible = true
      _dataFetchRequestCallback()
      setCursorSpinner()
    }, _spinnerDelay)
  }

  function tearDownSpinner() {
    if (_spinnerIsVisible) {
      _spinnerIsVisible = false
      _dataFetchSuccessfulCallback()
      setCursorSpinner()
    }
    window.clearTimeout(_spinnerTimeout)
  }

  _chart.on("dataFetch.spinner", initSpinner)

  _chart.on("postRedraw.spinner", tearDownSpinner)
  _chart.on("postRender.spinner", tearDownSpinner)

  _chart.on("dataError.spinner", () => {
    console.log(_chart.__dcFlag__, ": error")
  })

  return _chart
}
