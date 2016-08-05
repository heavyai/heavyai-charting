import {formatNumber} from "./formatting-helpers"

export function heatMapKeyAccessor ({key0}) {
  return Array.isArray(key0) ? key0[0] : key0
}

export function heatMapLabel (d) {
  if (d instanceof Date) {
    return d.toString()
  } else if (typeof d === "number") {
    return formatNumber(d)
  } else {
    return d
  }
}
