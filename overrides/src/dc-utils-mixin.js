import {formatValue} from "./formatting-helpers"

export default function utilsMixin (dc) {
  dc.utils.formatValue = formatValue
  return dc
}
