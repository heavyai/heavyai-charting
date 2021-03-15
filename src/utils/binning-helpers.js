import {
  TIME_LABELS,
  TIME_LABEL_TO_SECONDS,
  CENTURY_IN_SECONDS,
  DECADE_IN_SECONDS,
  YEAR_IN_SECONDS,
  QUARTER_IN_SECONDS,
  MONTH_IN_SECONDS,
  WEEK_IN_SECONDS,
  DAY_IN_SECONDS,
  HOUR_IN_SECONDS,
  MIN_IN_SECONDS,
  SECOND,
  MS_IN_SECONDS
} from "../constants/dates-and-times"

export const DEFAULT_EXTRACT_INTERVAL = "isodow"

const DEFAULT_NULL_TIME_RANGE = "day"

export const TIME_SPANS = TIME_LABELS.map(label => ({
  label,
  numSeconds: TIME_LABEL_TO_SECONDS[label]
}))

export const BIN_INPUT_OPTIONS = [
  { val: "auto", label: "auto", numSeconds: null },
  { val: "century", label: "1c", numSeconds: CENTURY_IN_SECONDS },
  { val: "decade", label: "10y", numSeconds: DECADE_IN_SECONDS },
  { val: "year", label: "1y", numSeconds: YEAR_IN_SECONDS },
  { val: "quarter", label: "1q", numSeconds: QUARTER_IN_SECONDS },
  { val: "month", label: "1mo", numSeconds: MONTH_IN_SECONDS },
  { val: "week", label: "1w", numSeconds: WEEK_IN_SECONDS },
  { val: "day", label: "1d", numSeconds: DAY_IN_SECONDS },
  { val: "hour", label: "1h", numSeconds: HOUR_IN_SECONDS },
  { val: "minute", label: "1m", numSeconds: MIN_IN_SECONDS },
  { val: "second", label: "1s", numSeconds: SECOND },
  { val: "millisecond", label: "1ms", numSeconds: MS_IN_SECONDS }
]

export function autoBinParams(timeBounds, maxNumBins, reverse) {
  const epochTimeBounds = [timeBounds[0] * 0.001, timeBounds[1] * 0.001]
  const timeRange = epochTimeBounds[1] - epochTimeBounds[0] // in seconds
  if (timeRange === 0) {
    return DEFAULT_NULL_TIME_RANGE
  }
  const timeSpans = reverse ? TIME_SPANS.slice().reverse() : TIME_SPANS

  for (let s = 0; s < timeSpans.length; s++) {
    if (timeRange / timeSpans[s].numSeconds < maxNumBins) {
      return timeSpans[s].label
    }
  }
  return "century" // default
}

export function checkIfTimeBinInRange(timeBounds, timeBin, maxNumBins) {
  const epochTimeBounds = [timeBounds[0] * 0.001, timeBounds[1] * 0.001]
  const timeRange = epochTimeBounds[1] - epochTimeBounds[0] // in seconds
  const timeLabelToSecs = TIME_LABEL_TO_SECONDS
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

export const getFirstNonNullDatumForAxis = (data, axisType) =>
  data &&
  Array.isArray(data) &&
  data.find((datum = {}) => {
    const keyVal = datum[`key${axisType === "x" ? "0" : "1"}`]
    const value = Array.isArray(keyVal) ? keyVal[0] : keyVal
    return value !== null
  })
