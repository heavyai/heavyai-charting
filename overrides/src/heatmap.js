import d3 from "d3"

const NUMBER_LENGTH = 4

export function heatMapKeyAccessor ({key0}) {
  return Array.isArray(key0) ? key0[0] : key0
}

export function heatMapLabel (d) {
  const numFormat = d3.format(".2s")
  if (d instanceof Date) {
    return d.toString()
  } else if (typeof d === "number") {
    return String(d).length > NUMBER_LENGTH && numFormat(d).match(/[a-z]/i) ? numFormat(d) : parseFloat(d.toFixed(2))
  } else {
    return d
  }
}
