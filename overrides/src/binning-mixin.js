import d3 from "d3"
import dc from "../../mapdc"

const binInputOptions = [
  {val: "auto", label: "auto", numSeconds: null},
  {val: "century", label: "10y", numSeconds: 3153600000},
  {val: "decade", label: "10y", numSeconds: 315360000},
  {val: "year", label: "1y", numSeconds: 31536000},
  {val: "quarter", label: "1q", numSeconds: 10368000},
  {val: "month", label: "1mo", numSeconds: 2592000},
  {val: "week", label: "1w", numSeconds: 604800},
  {val: "day", label: "1d", numSeconds: 86400},
  {val: "hour", label: "1h", numSeconds: 3600},
  {val: "minute", label: "1m", numSeconds: 60},
  {val: "second", label: "1s", numSeconds: 1}
]

export function roundTimeBin (date, timeInterval, operation) {
  if (!timeInterval) {
    return date
  }

  if (d3.time[timeInterval]) {
    return d3.time[timeInterval].utc[operation](date)
  }

  const unit = timeInterval === "quarter" ? "month" : "year"
  let ranges = []
  switch (timeInterval) {
  case "quarter":
    ranges = [-2, 2, 3]
    break
  case "decade":
    ranges = [-5, 5, 10]
    break
  case "century":
    ranges = [-50, 50, 100]
    break
  }

  const startRange = operation === "round" ? ranges[0] : (operation === "ceil" ? 0 : -ranges[2])
  const endRange = operation === "round" ? ranges[1] : (operation === "ceil" ? ranges[2] : 0)

  const subHalf = d3.time[unit].offset(date, startRange)
  const addHalf = d3.time[unit].offset(date, endRange)

  return d3.time[unit].utc.round(d3.time[unit + "s"](subHalf, addHalf, ranges[2])[0])
}

export default function binningMixin (chart) {
  let _timeBinInputVal = "auto"

  const _line_events = ["bin"]
  const _listeners = d3.dispatch.apply(d3, _line_events)
  const _on = chart.on.bind(chart)

  chart.on = function (event, listener) {
    if (_line_events.indexOf(event) === -1) {
      _on(event, listener)
    } else {
      _listeners.on(event, listener)
    }
    return chart
  }

  chart._invokeBinListener = function (f) {
    if (f !== "undefined") {
      _listeners.bin(chart, f)
    }
  }

  chart.binInputOptions = () => binInputOptions

  chart.timeBinInputVal = (val) => {
    if (typeof val === "undefined") {
      return _timeBinInputVal
    }
    _timeBinInputVal = val
    return chart
  }

  chart.binBrush = () => {
    const extent0 = chart.extendBrush()

    if (extent0[0].getTime() === extent0[1].getTime()) {
      return
    }

    if (extent0[0] <= chart.xAxisMin() && extent0[1] <= chart.xAxisMin() || extent0[0] >= chart.xAxisMax() && extent0[1] >= chart.xAxisMax()) {
      dc.events.trigger(() => {
        chart.replaceFilter(null)
        chart.redrawGroup()
      }, dc.constants.EVENT_DELAY)
      return
    }

    const timeInterval = chart.group().actualTimeBin(0)

    const extent1 = extent0.map(date => roundTimeBin(date, timeInterval, "round"))

      // if empty when rounded, use floor & ceil instead
    if (extent1[0] >= extent1[1]) {
      extent1[0] = roundTimeBin(extent0[0], timeInterval, "floor")
      extent1[1] = roundTimeBin(extent0[1], timeInterval, "ceil")
    }

    extent1[0] = extent1[0] < chart.xAxisMin() ? chart.xAxisMin() : extent1[0]
    extent1[1] = extent1[1] > chart.xAxisMax() ? chart.xAxisMax() : extent1[1]

    if (extent1[0].getTime() === chart.xAxisMax().getTime()) {
      const binNumSecs = chart.binInputOptions().filter(d => chart.group().actualTimeBin(0) === d.val)[0].numSeconds
      extent1[0] = new Date(extent1[0].getTime() - (binNumSecs * 1000))
      extent1[0] = roundTimeBin(extent1[0], timeInterval, "round")
    }

    if (extent1[1].getTime() === chart.xAxisMin().getTime()) {
      const binNumSecs = chart.binInputOptions().filter(d => chart.group().actualTimeBin(0) === d.val)[0].numSeconds
      extent1[1] = new Date(extent1[1].getTime() + (binNumSecs * 1000))
      extent1[1] = roundTimeBin(extent1[1], timeInterval, "round")
    }

    const rangedFilter = dc.filters.RangedFilter(extent1[0], extent1[1])

    dc.events.trigger(() => {
      chart.triggerReplaceFilter()
      chart.replaceFilter(rangedFilter)
      chart.redrawGroup()
    }, dc.constants.EVENT_DELAY)
  }

  chart.changeBinVal = (val) => {
    chart.timeBinInputVal(val)
    const currentStack = chart.stack().slice()

    for (let i = 0; i < currentStack.length; i++) {
      const binParams = currentStack[i].group.binParams().map((binParam, idx) => {
        if (idx === i) {
          binParam.timeBin = chart.timeBinInputVal()
        }
        return binParam
      })

      if (i === 0) {
        chart.group(currentStack[i].group.binParams(binParams), currentStack[i].name)
      } else {
        chart.stack(currentStack[i].group.binParams(binParams), currentStack[i].name, currentStack[i].accessor)
      }
    }

    chart._invokeBinListener(val)
    chart.renderAsync()
    chart.binBrush()
  }

  return chart
}
