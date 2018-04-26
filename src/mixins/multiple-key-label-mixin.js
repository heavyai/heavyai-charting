import { formatDataValue } from "../utils/formatting-helpers"

const INDEX_NONE = -1
const SHOULD_RENDER_LABELS = true

function format(value, key, numberFormatter, dateFormatter) {
  let customFormatter = null

  if (Array.isArray(value) && value[0]) {
    value = value[0].value || value[0]
  }

  if (dateFormatter && value instanceof Date) {
    customFormatter = dateFormatter
  } else if (numberFormatter && typeof value === "number") {
    customFormatter = numberFormatter
  }

  return (customFormatter && customFormatter(value, key)) || formatDataValue(value)
}

export default function multipleKeysLabelMixin(_chart) {

  function label(d) {
    const numberFormatter = _chart && _chart.valueFormatter()
    const dateFormatter = _chart && _chart.dateFormatter()
    const dimensionNames = _chart.dimension().value()

    if (dimensionNames.length === 1) {
      return format(d.key0, dimensionNames[0], numberFormatter, dateFormatter)
    }

    const keysStr = []
    let i = 0
    for (const key in d) {
      if (d.hasOwnProperty(key) && key.indexOf("key") > INDEX_NONE) {
        const formatted = format(d[key], dimensionNames[i], numberFormatter, dateFormatter)
        keysStr.push(formatted)
      }
      i++
    }
    return keysStr.join(" / ")
  }

  _chart.label(label, SHOULD_RENDER_LABELS)
  return _chart
}
