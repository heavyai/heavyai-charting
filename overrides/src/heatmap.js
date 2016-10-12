import {formatNumber, isArrayOfObjects, normalizeArrayByAlias, normalizeArrayByValue} from "./formatting-helpers"

export function heatMapKeyAccessor ({key0}) {
  if (Array.isArray(key0)) {
    return isArrayOfObjects(key0) ? normalizeArrayByAlias(key0)[0] : key0[0]
  } else {
    return key0
  }
}

export function heatMapValueAccesor ({key1}) {
  if (Array.isArray(key1)) {
    return isArrayOfObjects(key1) ? normalizeArrayByValue(key1)[0] : key1[0]
  } else {
    return key1
  }
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
