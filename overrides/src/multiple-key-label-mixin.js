import {formatDataValue} from "./formatting-helpers"

const INDEX_NONE = -1
const SHOULD_RENDER_LABELS = true

export default function multipleKeysLabelMixin (_chart) {
  function label (d) {
    if (_chart.dimension().value().length === 1) {
      return formatDataValue(d.key0)
    }
    let keysStr = ""
    let i = 1
    for (const key in d) {
      if (d.hasOwnProperty(key) && key.indexOf("key") > INDEX_NONE) {
        keysStr = keysStr + (i > 1 ? " / " : "") + formatDataValue(d[key])
      }
      i++
    }
    return keysStr
  }

  _chart.label(label, SHOULD_RENDER_LABELS)
  return _chart
}
