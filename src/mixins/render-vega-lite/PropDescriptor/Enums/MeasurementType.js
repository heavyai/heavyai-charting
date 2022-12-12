// NOTE: need to disable no-undef due to an issue with the rather outdated
// nature of the babel-eslint parser. The parser does to properly account
// for static class members

/* eslint-disable no-undef */

export default class MeasurementType {
  static val_to_enum_map_ = {}

  static kQuantitative = new MeasurementType("quantitative")
  static kTemporal = new MeasurementType("temporal")
  static kOrdinal = new MeasurementType("ordinal")
  static kNominal = new MeasurementType("nominal")

  /**
   *
   * @param {string} measurement_type
   */
  static getMeasurementTypeFromString(measurement_type) {
    const rtn_obj =
      MeasurementType.val_to_enum_map_[measurement_type.toLowerCase()]
    if (typeof rtn_obj === "undefined") {
      throw new Error(
        `Invalid measurement type string '${measurement_type}'. It must be one of ${Object.keys(
          MeasurementType.val_to_enum_map_
        )}`
      )
    }
    return rtn_obj
  }

  constructor(value) {
    this.value = value
    MeasurementType.val_to_enum_map_[this.value] = this
  }

  valueOf() {
    return this.value
  }

  toString() {
    return this.value
  }
}
