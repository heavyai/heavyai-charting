import ContinuousScale from "./ContinuousScale"
import ScaleType from "../Enums/ScaleType"

export default class PowScale extends ContinuousScale {
  /**
   *
   * @param {Object} scale_definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(scale_definition_object, parent_info) {
    super(scale_definition_object, ScaleType.kPow, parent_info)

    this.exponent_ = 1
    if (Object.hasOwn(scale_definition_object, "exponent")) {
      if (typeof scale_definition_object.exponent !== "number") {
        this.error_message = `Invalid ${scale_definition_object.exponent} value for the 'exponent' property of a pow scale. It must be a number`
      }
      this.exponent_ = scale_definition_object.exponent
    }
  }

  /**
   *
   * @param {PropDescriptor} prop_descriptor
   * @param {Object} vega_scale_object
   */
  _materializeExtraVegaScaleProps(prop_descriptor, vega_scale_object) {
    super._materializeExtraVegaScaleProps(prop_descriptor, vega_scale_object)
    vega_scale_object.exponent = this.exponent_
  }
}
