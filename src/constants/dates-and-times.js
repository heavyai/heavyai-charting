export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

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
  "12AM",
  "1AM",
  "2AM",
  "3AM",
  "4AM",
  "5AM",
  "6AM",
  "7AM",
  "8AM",
  "9AM",
  "10AM",
  "11AM",
  "12PM",
  "1PM",
  "2PM",
  "3PM",
  "4PM",
  "5PM",
  "6PM",
  "7PM",
  "8PM",
  "9PM",
  "10PM",
  "11PM"
]

export const MS_IN_SECONDS = 0.001
export const SECOND = 1
export const MIN_IN_SECONDS = 60
export const HOUR_IN_SECONDS = 60 * MIN_IN_SECONDS
export const DAY_IN_SECONDS = 24 * HOUR_IN_SECONDS
export const WEEK_IN_SECONDS = 7 * DAY_IN_SECONDS
export const MONTH_IN_SECONDS = 30 * DAY_IN_SECONDS
export const QUARTER_IN_SECONDS = 3 * MONTH_IN_SECONDS
export const YEAR_IN_SECONDS = 365 * DAY_IN_SECONDS
export const DECADE_IN_SECONDS = 10 * YEAR_IN_SECONDS
export const CENTURY_IN_SECONDS = 10 * DECADE_IN_SECONDS

export const TIME_LABELS = [
  "millisecond",
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

export const TIME_LABEL_TO_SECONDS = {
  century: CENTURY_IN_SECONDS,
  decade: DECADE_IN_SECONDS,
  year: YEAR_IN_SECONDS,
  quarter: QUARTER_IN_SECONDS,
  month: MONTH_IN_SECONDS,
  week: WEEK_IN_SECONDS,
  day: DAY_IN_SECONDS,
  hour: HOUR_IN_SECONDS,
  minute: MIN_IN_SECONDS,
  second: SECOND,
  millisecond: MS_IN_SECONDS
}
