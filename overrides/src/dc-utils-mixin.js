import {formatValue, maybeFormatInfinity} from "./formatting-helpers"

export default function utilsMixin (dc) {
  dc.utils.formatValue = formatValue
  dc.utils.maybeFormatInfinity = maybeFormatInfinity
  return dc
}
