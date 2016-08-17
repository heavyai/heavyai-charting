import {formatNumber, isArrayOfObjects, normalizeArray} from "./formatting-helpers"

export function heatMapKeyAccessor ({key0}) {
  if (Array.isArray(key0)) {
    return isArrayOfObjects(key0) ? normalizeArray(key0)[0] : key0[0]
  } else {
    return key0
  }
}

export function heatMapValueAccesor ({key1}) {
  return isArrayOfObjects(key1) ? normalizeArray(key1) : key1
}

export function heatMapLabel (d) {
  if (Array.isArray(d)) {
    return d.map(formatForLabel).join("  \u2013  ")
  } else {
    return formatForLabel(d)
  }
}

export function formatForLabel (d) {
  if (d instanceof Date) {
    return d.toString()
  } else if (typeof d === "number") {
    return formatNumber(d)
  } else {
    return d
  }
}
