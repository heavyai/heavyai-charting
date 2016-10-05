import d3 from "d3"

const NUMBER_LENGTH = 4

const numFormat = d3.format(".2s")
const dateFormat = d3.time.format.utc("%b %d, %Y · %I:%M%p")
const commafy = d3.format(",")

export const isPlainObject = value => !Array.isArray(value) && typeof value === "object" && !(value instanceof Date)
export const hasAllObjects = collection => collection.reduce((accum, value) => isPlainObject(value) && accum, true)
export const isArrayOfObjects = value => Array.isArray(value) && hasAllObjects(value)
export const normalizeArrayByValue = collection => isArrayOfObjects(collection) ? collection.map(data => data.value) : collection
export const normalizeArrayByAlias = collection => isArrayOfObjects(collection) ? collection.map(data => data.alias) : collection

export function maybeFormatNumber (val) {
  return typeof val === "number" ? formatNumber(val) : val
}

const maybeMapProp = prop => data => data.map(d => isArrayOfObjects(data) ? d[prop] : d)
const maybeMapAlias = maybeMapProp("alias")
const maybeMapValue = maybeMapProp("value")
const allDateTypes = data => data.reduce((accum, d) => accum && d instanceof Date, true)

export function formatResultKey (data) {
  if (Array.isArray(data)) {
    const normalized = maybeMapAlias(data).map(maybeFormatNumber)
    const isDate = allDateTypes(maybeMapValue(data))
    if (data[0].timeBin === "week" || !isDate) {
      return normalized.join("  \u2013  ")
    } else {
      return normalized[0]
    }
  } else {
    return maybeFormatNumber(data)
  }
}

export function maybeFormatInfinity (data) {
  return data.map(function (d) {
    if (d.val === "-Infinity" || d.val === "Infinity") {
      d.label = d.val
      d.val = 0
    }
    return d
  })
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

export function normalizeFiltersArray (filters) {
  return filters.map(f => {
    if (isArrayOfObjects(f)) {
      return normalizeArrayByValue(f)
    } else {
      return f
    }
  })
}
