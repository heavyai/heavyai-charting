import {formatDataValue, maybeFormatInfinity} from "./formatting-helpers"

export default function utilsMixin (dc) {
  dc.utils.formatValue = formatDataValue
  dc.utils.maybeFormatInfinity = maybeFormatInfinity
  return dc
}
