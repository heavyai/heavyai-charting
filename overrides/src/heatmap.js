import {formatDataValue, isArrayOfObjects} from "./formatting-helpers"

const MAX_LABEL_WIDTH = 72
const CHAR_WIDTH = 5
const MIN_AXIS_HEIGHT = 52

export function heatMapKeyAccessor ({key0}) {
  if (Array.isArray(key0)) {
    const value = isArrayOfObjects(key0) ? key0[0].value : key0[0]
    this.colsMap.set(value, key0)
    return value
  } else {
    return key0
  }
}

export function heatMapValueAccesor ({key1}) {
  if (Array.isArray(key1)) {
    const value = isArrayOfObjects(key1) ? key1[0].value : key1[0]
    this.rowsMap.set(value, key1)
    return value
  } else {
    return key1
  }
}

export function heatMapRowsLabel (d) {
  return formatDataValue(this.rowsMap.get(d) || d)
}

export function heatMapColsLabel (d) {
  return formatDataValue(this.colsMap.get(d) || d)
}

export function isDescendingAppropriateData ({key1}) {
  const value = Array.isArray(key1) ? key1[0] : key1
  return typeof value !== "number"
}

export default function heatMapMixin (chart) {
  chart.colsMap = new Map()
  chart.rowsMap = new Map()
  chart._axisPadding = {left: 36, bottom: 42}

  const getMaxChars = (domain, getLabel) => (domain.map(d => (getLabel(d) ? getLabel(d).toString().length : 0)).reduce((prev, curr) => (Math.max(prev, curr)), null))

  chart.getAxisSizes = (colsDomain, rowsDomain) => ({
    left: Math.min(getMaxChars(rowsDomain, chart.rowsLabel()) * CHAR_WIDTH, MAX_LABEL_WIDTH) + chart._axisPadding.left,
    bottom: Math.max(Math.min(getMaxChars(colsDomain, chart.colsLabel()) * CHAR_WIDTH, MAX_LABEL_WIDTH) + chart._axisPadding.bottom, MIN_AXIS_HEIGHT)
  })

  chart.shouldSortYAxisDescending = (data) => {
    return data && data.length && isDescendingAppropriateData(data[0])
  }

  chart.keyAccessor(heatMapKeyAccessor.bind(chart))
    .valueAccessor(heatMapValueAccesor.bind(chart))
    .colorAccessor(d => d.value)
    .rowsLabel(heatMapRowsLabel.bind(chart))
    .colsLabel(heatMapColsLabel.bind(chart))

  return chart
}
