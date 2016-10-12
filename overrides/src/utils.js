import d3 from "d3"

const DAYS = [
  "Mon",
  "Tues",
  "Wed",
  "Thurs",
  "Fri",
  "Sat",
  "Sun"
]

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "June",
  "July",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec"
]

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"]

export const deepEquals = require("deep-equal") // eslint-disable-line global-require

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
