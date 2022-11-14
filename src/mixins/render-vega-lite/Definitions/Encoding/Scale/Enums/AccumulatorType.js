/* eslint-disable no-undef */

export default class AccumulatorType {
  /**
   * @private
   */
  static val_to_enum_map_ = {}

  static kMin = new AccumulatorType("min")
  static kMax = new AccumulatorType("max")
  static kDensity = new AccumulatorType("density")
  static kBlend = new AccumulatorType("blend")
  static kPct = new AccumulatorType("pct")

  /**
   * @param {string} accumulator_type
   */
  static getAccumulatorTypeFromString(accumulator_type) {
    const rtn_obj =
      AccumulatorType.val_to_enum_map_[accumulator_type.toLowerCase()]
    if (typeof rtn_obj === "undefined") {
      throw new Error(
        `Invalid accumulator type '${accumulator_type}'. It must be one of ${Object.keys(
          AccumulatorType.val_to_enum_map_
        )}`
      )
    }
    return rtn_obj
  }

  constructor(value) {
    this.value = value
    AccumulatorType.val_to_enum_map_[this.value] = this
  }

  valueOf() {
    return this.value
  }

  toString() {
    return this.value
  }
}
