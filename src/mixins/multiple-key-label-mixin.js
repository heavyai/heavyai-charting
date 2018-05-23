import { formatDataValue } from "../utils/formatting-helpers"

const INDEX_NONE = -1
const SHOULD_RENDER_LABELS = true

function format(_value, _key, numberFormatter, dateFormatter) {
  let customFormatter = null

  let key = _key
  let value = _value
  let isExtract = false

  if (Array.isArray(_value) && _value[0]) {
    value = _value[0].value || _value[0]
    if (_value[0].isExtract) {
      key = null
      isExtract = true
    }
  }

  if (dateFormatter && value instanceof Date) {
    customFormatter = dateFormatter
  } else if (numberFormatter && typeof value === "number") {
    customFormatter = numberFormatter
  }

  return (!isExtract && customFormatter && customFormatter(value, key)) || formatDataValue(_value)
}

export default function multipleKeysLabelMixin(_chart) {

  function label(d) {
    const numberFormatter = _chart && _chart.valueFormatter()
    const dateFormatter = _chart && _chart.dateFormatter()
    const dimensionNames = _chart.dimension().getDimensionName()

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
