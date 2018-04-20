import { autoBinParams, BIN_INPUT_OPTIONS } from "../utils/binning-helpers"
import d3 from "d3"
import { events } from "../core/events"
import { filters } from "../core/filters"
import { constants } from "../core/core"

export function roundTimeBin(date, timeInterval, operation) {
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

  const startRange =
    operation === "round" ? ranges[0] : operation === "ceil" ? 0 : -ranges[2]
  const endRange =
    operation === "round" ? ranges[1] : operation === "ceil" ? ranges[2] : 0

  const subHalf = d3.time[unit].offset(date, startRange)
  const addHalf = d3.time[unit].offset(date, endRange)

  return d3.time[unit].utc.round(
    d3.time[unit + "s"](subHalf, addHalf, ranges[2])[0]
  )
}

export default function binningMixin(chart) {
  let _timeBinInputVal = "auto"

  const _line_events = ["bin"]
  const _listeners = d3.dispatch.apply(d3, _line_events)
  const _on = chart.on.bind(chart)

  chart.on = function(event, listener) {
    if (_line_events.indexOf(event) === -1) {
      _on(event, listener)
    } else {
      _listeners.on(event, listener)
    }
    return chart
  }

  chart._invokeBinListener = function(f) {
    if (f !== "undefined") {
      _listeners.bin(chart, f)
    }
  }

  chart.binInputOptions = () => BIN_INPUT_OPTIONS

  chart.timeBinInputVal = val => {
    if (typeof val === "undefined") {
      return _timeBinInputVal
    }
    _timeBinInputVal = val
    return chart
  }

  chart.binBrush = isRangeChart => {
    const rangeChartBrush = isRangeChart
      ? chart.rangeChart().extendBrush()
      : null
    const extent0 = isRangeChart ? rangeChartBrush : chart.extendBrush()

    const bin_bounds = chart.group().binParams()[0]
      ? chart.group().binParams()[0].binBounds
      : null

    const chartBounds = isRangeChart ? rangeChartBrush : bin_bounds

    if (!extent0[0].getTime || extent0[0].getTime() === extent0[1].getTime()) {
      return
    }

    const timeInterval = chart.group().binParams()[0].timeBin

    const extent1 = extent0.map(date =>
      roundTimeBin(date, timeInterval, "round")
    )

    if (extent1[0] < chartBounds[0]) {
      extent1[0] = roundTimeBin(extent0[0], timeInterval, "ceil")
    }

    if (extent1[1] > chartBounds[1]) {
      extent1[1] = roundTimeBin(extent0[1], timeInterval, "floor")
    }

    /* istanbul ignore next */
    // if empty when rounded, use floor & ceil instead
    if (extent1[0] >= extent1[1]) {
      extent1[0] = roundTimeBin(extent0[0], timeInterval, "floor")
      extent1[1] = roundTimeBin(extent0[1], timeInterval, "ceil")
    }

    /* istanbul ignore next */
    if (
      !isNaN(chart.xAxisMax()) &&
      extent1[0].getTime() === chart.xAxisMax().getTime()
    ) {
      const binNumSecs = chart
        .binInputOptions()
        .filter(d => chart.group().binParams()[0].timeBin === d.val)[0]
        .numSeconds
      extent1[0] = new Date(extent1[0].getTime() - binNumSecs * 1000)
      extent1[0] = roundTimeBin(extent1[0], timeInterval, "round")
    }

    /* istanbul ignore next */
    if (
      !isNaN(chart.xAxisMin()) &&
      extent1[1].getTime() === chart.xAxisMin().getTime()
    ) {
      const binNumSecs = chart
        .binInputOptions()
        .filter(d => chart.group().binParams()[0].timeBin === d.val)[0]
        .numSeconds
      extent1[1] = new Date(extent1[1].getTime() + binNumSecs * 1000)
      extent1[1] = roundTimeBin(extent1[1], timeInterval, "round")
    }

    const rangedFilter = filters.RangedFilter(extent1[0], extent1[1])

    events.trigger(() => {
      chart.replaceFilter(rangedFilter)
    }, constants.EVENT_DELAY)
  }

  chart.changeBinVal = val => {
    chart.timeBinInputVal(val)

    const currentStack = chart.stack().slice()
    /* istanbul ignore next */
    for (let i = 0; i < currentStack.length; i++) {
      const binParams = currentStack[i].group
        .binParams()
        .map((binParam, idx) => {
          if (idx === i && binParam) {
            const { binBounds, numBins } = binParam
            const isAuto = val === "auto"
            const bounds = binBounds.map(date => date.getTime())
            binParam.timeBin = isAuto ? autoBinParams(bounds, numBins) : val
            binParam.auto = isAuto // hightlights the "auto" UI button
          }
          return binParam
        })

      /* istanbul ignore next */
      if (i === 0) {
        chart.group(
          currentStack[i].group.binParams(binParams),
          currentStack[i].name
        )
      } else {
        chart.stack(
          currentStack[i].group.binParams(binParams),
          currentStack[i].name,
          currentStack[i].accessor
        )
      }
    }

    chart._invokeBinListener(val)
    return chart.renderAsync().then(() => {
      chart.binBrush()
    })
  }

  return chart
}
