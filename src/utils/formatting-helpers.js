import { DAYS, HOURS, MONTHS, QUARTERS } from "../constants/dates-and-times"
import d3 from "d3"
import moment from "moment"

const NUMBER_LENGTH = 4

const numFormat = d3.format(".2s")
const commafy = d3.format(",")

export const nullLabelHtml = '<tspan class="null-value"> NULL </tspan>'
export const momentUTCFormat = (d, f) =>
  moment
    .utc(d)
    .locale("en")
    .format(f)
export const genericDateTimeFormat = d =>
  `${momentUTCFormat(d, "MMM D, YYYY")} \u205F${momentUTCFormat(d, "HH:mm:ss")}`
export const isPlainObject = value =>
  !Array.isArray(value) && typeof value === "object" && !(value instanceof Date)
export const hasAllObjects = collection =>
  collection.reduce((accum, value) => isPlainObject(value) && accum, true)
export const isArrayOfObjects = value =>
  Array.isArray(value) && hasAllObjects(value)
export const normalizeArrayByValue = collection =>
  isArrayOfObjects(collection) ? collection.map(data => data.value) : collection

export function formatDataValue(data, numAbbr) {
  if (typeof data === "number") {
    return formatNumber(data, numAbbr)
  } else if (Array.isArray(data)) {
    return formatArrayValue(data)
  } else if (data instanceof Date) {
    return genericDateTimeFormat(data)
  } else if (data === null) {
    return nullLabelHtml
  }
  return data
}

export function maybeFormatInfinity(data) {
  return data.map(d => {
    if (d.val === "-Infinity" || d.val === "Infinity") {
      d.label = d.val
      d.val = 0
    }
    return d
  })
}

export function formatNumber(d, abbr) {
  if (typeof d !== "number") {
    return d
  }
  const isLong = String(d).length > NUMBER_LENGTH
  const formattedHasAlpha = numFormat(d).match(/[a-z]/i)
  const isLargeNumber = isLong && formattedHasAlpha
  return isLargeNumber && abbr
    ? numFormat(d)
    : commafy(parseFloat(d.toFixed(2)))
}

export function formatArrayValue(data) {
  if (typeof data[0] === "object" && !(data[0] instanceof Date)) {
    return data[0].isExtract
      ? formatExtractValue(data[0].value, data[0].extractUnit)
      : formatTimeBinValue(data)
  } else {
    return data.map(d => formatDataValue(d)).join(" \u2013 ")
  }
}

export function formatTimeBinValue(data) {
  const startTime = data[0]
  const endTime = data[1]
  switch (startTime.timeBin) {
    case "decade":
      return `${momentUTCFormat(
        startTime.value,
        "YYYY"
      )} \u2013 ${momentUTCFormat(endTime.value, "YYYY")}`
    case "year":
      return momentUTCFormat(startTime.value, "YYYY")
    case "quarter":
      return `${moment
        .utc(startTime.value)
        .locale("en")
        .quarter()}Q ${momentUTCFormat(startTime.value, "YYYY")}`
    case "month":
      return momentUTCFormat(startTime.value, "MMM YYYY")
    case "week":
      return `${momentUTCFormat(
        startTime.value,
        "MMM D"
      )} \u2013 ${momentUTCFormat(endTime.value, "MMM D, YYYY")}`
    case "day":
      return momentUTCFormat(startTime.value, "MMM D, YYYY")
    case "hour":
    case "minute":
      return `${momentUTCFormat(
        startTime.value,
        "MMM D, YYYY"
      )} \u205F${momentUTCFormat(startTime.value, "HH:mm")}`
    default:
      return genericDateTimeFormat(startTime.value)
  }
}

export function formatExtractValue(number, label) {
  switch (label) {
    case "isodow":
      return DAYS[number - 1]
    case "month":
      return MONTHS[number - 1]
    case "quarter":
      return QUARTERS[number - 1]
    case "hour":
      return HOURS[number]
    case "minute":
      return number + 1
    default:
      return number
  }
}

export function normalizeFiltersArray(filters) {
  return filters.map(f => {
    if (isArrayOfObjects(f)) {
      return normalizeArrayByValue(f)
    } else {
      return f
    }
  })
}

export function formatCache(_axis) {
  const axis = _axis
  let cachedTickFormat = false

  function setTickFormat(tickFormat, fromCache) {
    if (tickFormat === false) {
      return null
    }

    if (!fromCache && cachedTickFormat === false) {
      cachedTickFormat = axis.tickFormat()
    }

    axis.tickFormat(tickFormat)

    if (fromCache) {
      cachedTickFormat = false
    }
  }

  function setTickFormatFromCache() {
    const FROM_CACHE = true
    setTickFormat(cachedTickFormat, FROM_CACHE)
  }

  return {
    setTickFormat,
    setTickFormatFromCache
  }
}
