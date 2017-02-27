import d3 from "d3"
import {utils} from "../../src/utils"

export const DAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun"
]

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
]


export const QUARTERS = ["Q1", "Q2", "Q3", "Q4"]

export const HOURS = [
  '12AM', '1AM', '2AM', '3AM', '4AM', '5AM',
  '6AM', '7AM', '8AM', '9AM', '10AM', '11AM',
  '12PM', '1PM', '2PM', '3PM', '4PM', '5PM',
  '6PM', '7PM', '8PM', '9PM', '10PM', '11PM'
]

export const deepEquals = require("deep-equal") // eslint-disable-line global-require

export const deepClone = obj => JSON.parse(JSON.stringify(obj))

export const TIME_UNITS = {
  DATE: true,
  TIMESTAMP: true,
  date: true,
  datetime: true,
  timestamp: true,
  "timestamp without timezone": true,
  TIME: true
}

/* istanbul ignore next */
export const customTimeFormat = d3.time.format.utc.multi([
  [".%L", (d) => d.getUTCMilliseconds()],
  [":%S", (d) => d.getUTCSeconds()],
  ["%I:%M", (d) => d.getUTCMinutes()],
  ["%I %p", (d) => d.getUTCHours()],
  ["%a %d", (d) => d.getUTCDay() && d.getUTCDate() != 1], // eslint-disable-line eqeqeq
  ["%b %d", (d) => d.getUTCDate() != 1], // eslint-disable-line eqeqeq
  ["%b", (d) => d.getUTCMonth()],
  ["%Y", () => true]
])

export function extractTickFormat (timeBin) {
  return (tick) => {
    switch (timeBin) {
    case "year":
      return Math.ceil(tick)
    case "isodow":
      return DAYS[tick - 1]
    case "month":
      return MONTHS[tick - 1]
    case "quarter":
      return QUARTERS[tick - 1]
    case "hour":
    case "minute":
      return tick + 1
    default:
      return tick
    }
  }
}

export function xDomain (extract, currentLowValue, currentHighValue, timeBin) {
  if (extract) {
    switch (timeBin) {
    case "year":
      return [
        currentLowValue.getFullYear(),
        currentHighValue.getFullYear()
      ]
    case "quarter":
      return [1, 4] // eslint-disable-line no-magic-numbers
    case "isodow":
      return [1, 7] // eslint-disable-line no-magic-numbers
    case "month":
      return [1, 12] // eslint-disable-line no-magic-numbers
    case "day":
      return [1, 31] // eslint-disable-line no-magic-numbers
    case "hour":
      return [0, 23] // eslint-disable-line no-magic-numbers
    case "minute":
      return [0, 59] // eslint-disable-line no-magic-numbers
    default:
      return [1, 7] // eslint-disable-line no-magic-numbers
    }
  } else {
    return [currentLowValue, currentHighValue]
  }
}

export function xScale (extract, isChartDate) {
  if (extract || !isChartDate) {
    return d3.scale.linear()
  } else {
    return d3.time.scale.utc()
  }
}

export function xAxisTickFormat ({extract, timeBin}, isChartDate) {
  if (extract) {
    return utils.extractTickFormat(timeBin)
  } else if (isChartDate) {
    return customTimeFormat
  } else {
    return d3.format(".2s")
  }
}
