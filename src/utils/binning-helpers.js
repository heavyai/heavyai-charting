const SEC = 1
const MIN_IN_SECS = 60
const HOUR_IN_SECS = 3600
const DAY_IN_SECS = 86400
const WEEK_IN_SECS = 604800
const MONTH_IN_SECS = 2592000
const QUARTER_IN_SECS = 10368000
const YEAR_IN_SECS = 31536000
const DECADE_IN_SECS = 315360000

export const DEFAULT_EXTRACT_INTERVAL = "isodow"

const TIME_LABELS = [
  "second",
  "minute",
  "hour",
  "day",
  "week",
  "month",
  "quarter",
  "year",
  "decade"
]

export const TIME_LABEL_TO_SECS = {
  second: SEC,
  minute: MIN_IN_SECS,
  hour: HOUR_IN_SECS,
  day: DAY_IN_SECS,
  week: WEEK_IN_SECS,
  month: MONTH_IN_SECS,
  quarter: QUARTER_IN_SECS,
  year: YEAR_IN_SECS,
  decade: DECADE_IN_SECS
}

export const TIME_SPANS = TIME_LABELS.map(label => ({
  label,
  numSeconds: TIME_LABEL_TO_SECS[label]
}))

export const BIN_INPUT_OPTIONS = [
  { val: "auto", label: "auto", numSeconds: null },
  { val: "century", label: "1c", numSeconds: 3153600000 },
  { val: "decade", label: "10y", numSeconds: 315360000 },
  { val: "year", label: "1y", numSeconds: 31536000 },
  { val: "quarter", label: "1q", numSeconds: 10368000 },
  { val: "month", label: "1mo", numSeconds: 2592000 },
  { val: "week", label: "1w", numSeconds: 604800 },
  { val: "day", label: "1d", numSeconds: 86400 },
  { val: "hour", label: "1h", numSeconds: 3600 },
  { val: "minute", label: "1m", numSeconds: 60 },
  { val: "second", label: "1s", numSeconds: 1 }
]

export function autoBinParams(timeBounds, maxNumBins, reverse) {
  const epochTimeBounds = [timeBounds[0] * 0.001, timeBounds[1] * 0.001]
  const timeRange = epochTimeBounds[1] - epochTimeBounds[0] // in seconds
  const timeSpans = reverse ? TIME_SPANS.slice().reverse() : TIME_SPANS
  for (let s = 0; s < timeSpans.length; s++) {
    if (
      timeRange / timeSpans[s].numSeconds < maxNumBins &&
      timeRange / timeSpans[s].numSeconds > 2
    ) {
      return timeSpans[s].label
    }
  }
  return "century" // default;
}

export function checkIfTimeBinInRange(timeBounds, timeBin, maxNumBins) {
  const epochTimeBounds = [timeBounds[0] * 0.001, timeBounds[1] * 0.001]
  const timeRange = epochTimeBounds[1] - epochTimeBounds[0] // in seconds
  const timeLabelToSecs = TIME_LABEL_TO_SECS
  if (timeRange / timeLabelToSecs[timeBin] > maxNumBins) {
    return autoBinParams(timeBounds, maxNumBins)
  } else if (timeRange / timeLabelToSecs[timeBin] < 2) {
    return autoBinParams(timeBounds, maxNumBins, true)
  } else {
    return timeBin
  }
}

export const createBinParams = (chart, binParams) => {
  if (!chart.group() || !chart.group().binParams) {
    return
  }

  binParams = Array.isArray(binParams) ? binParams : [binParams]

  const parsedBinParams = binParams.map(param => {
    if (param) {
      const { timeBin = "auto", binBounds, numBins } = param
      const extract = param.extract || false
      const isDate = binBounds[0] instanceof Date
      if (isDate && timeBin === "auto") {
        const bounds = binBounds.map(date => date.getTime())
        return Object.assign({}, param, {
          extract,
          timeBin: extract
            ? DEFAULT_EXTRACT_INTERVAL
            : autoBinParams(bounds, numBins),
          binBounds: binBounds.slice(),
          auto: true // hightlights the "auto" UI button
        })
      } else {
        return Object.assign({}, param, {
          extract,
          timeBin,
          binBounds: binBounds.slice()
        })
      }
    }
    return param
  })

  chart.group().binParams(parsedBinParams)
  return chart
}
