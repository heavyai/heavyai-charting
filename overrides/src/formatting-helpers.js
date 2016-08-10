import d3 from "d3"

const NUMBER_LENGTH = 4

const numFormat = d3.format(".2s")
const dateFormat = d3.time.format.utc("%b %d, %Y · %I:%M%p")
const commafy = d3.format(",")

export const isPlainObject = value => typeof value === "object" && !(value instanceof Date)
export const hasAllObjects = collection => collection.reduce((accum, value) => isPlainObject(value) && accum, true)
export const isArrayOfObjects = value => Array.isArray(value) && hasAllObjects(value)
export const normalizeArray = collection => isArrayOfObjects(collection) ? collection.map(data => data.value) : collection

export function maybeFormatNumber (val) {
  return typeof val === "number" ? formatNumber(val) : val
}

export function formatResultKey (data) {
  if (Array.isArray(data)) {
    return data.map(d => isArrayOfObjects(data) ? d.alias : d).map(maybeFormatNumber).join("  \u2013  ")
  } else {
    return maybeFormatNumber(data)
  }
}

export function formatValue (value) {
  if (value instanceof Date) {
    return dateFormat(value)
  } else if (typeof value === "number") {
    return commafy(parseFloat(value.toFixed(2)))
  } else {
    return value
  }
}

export function formatNumber (d) {
  const isLong = String(d).length > NUMBER_LENGTH
  const formattedHasAlpha = numFormat(d).match(/[a-z]/i)
  const isLargeNumber = isLong && formattedHasAlpha
  return isLargeNumber ? numFormat(d) : parseFloat(d.toFixed(2))
}
