/* eslint-disable no-undef */

export default class InterpolateType {
  /**
   * @private
   */
  static val_to_enum_map_ = {}

  static kRgb = new InterpolateType("rgb")
  static kHsl = new InterpolateType("hsl")
  static kHslLong = new InterpolateType("hsl-long")
  static kLab = new InterpolateType("lab")
  static kHcl = new InterpolateType("hcl")
  static kHclLong = new InterpolateType("hcl-long")
  static kAuto = new InterpolateType("auto")

  /**
   * @param {string} interpolate_type
   */
  static getInterpolateTypeFromString(interpolate_type) {
    const rtn_obj =
      InterpolateType.val_to_enum_map_[interpolate_type.toLowerCase()]
    if (typeof rtn_obj === "undefined") {
      throw new Error(
        `Invalid interpolate type '${interpolate_type}'. It must be one of ${Object.keys(
          InterpolateType.val_to_enum_map_
        )}`
      )
    }
    return rtn_obj
  }

  constructor(value) {
    this.value = value
    InterpolateType.val_to_enum_map_[this.value] = this
  }

  valueOf() {
    return this.value
  }

  toString() {
    return this.value
  }
}
