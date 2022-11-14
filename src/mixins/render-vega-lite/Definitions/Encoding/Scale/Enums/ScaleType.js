/* eslint-disable no-undef */

export default class ScaleType {
  /**
   * @private
   */
  static val_to_enum_map_ = {}

  static kLinear = new ScaleType("linear")
  static kPow = new ScaleType("pow")
  static kSqrt = new ScaleType("sqrt")
  static kLog = new ScaleType("log")
  static kOrdinal = new ScaleType("ordinal")
  static kQuantize = new ScaleType("quantize")
  static kThreshold = new ScaleType("threshold")

  /**
   * @private
   */
  static kInternalPassthru_ = new ScaleType("internal-passthru")

  /**
   * @param {string} scale_type
   */
  static getScaleTypeFromString(scale_type) {
    const rtn_obj = ScaleType.val_to_enum_map_[scale_type.toLowerCase()]
    if (typeof rtn_obj === "undefined") {
      throw new Error(
        `Invalid scale type '${scale_type}'. It must be one of ${Object.keys(
          ScaleType.val_to_enum_map_
        )}`
      )
    }
    return rtn_obj
  }

  constructor(value) {
    this.value = value
    ScaleType.val_to_enum_map_[this.value] = this
  }

  valueOf() {
    return this.value
  }

  toString() {
    return this.value
  }
}
