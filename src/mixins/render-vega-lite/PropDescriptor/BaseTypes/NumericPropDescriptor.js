import {
  default as PropDescriptor,
  PropLocation,
  MeasurementType
} from "../PropDescriptor"

export { PropDescriptor, PropLocation, MeasurementType }
export default class NumericPropDescriptor extends PropDescriptor {
  /**
   * @param {string} prop_name
   * @param {string} [vega_prop_name=null]
   * @param {PropLocation} [prop_location=PropLocation.kEncodingPlusMarkDef]
   * @param {PropDescriptor} [fallback_prop=null]
   * @param {boolean} [can_have_scale_definition=true]
   * @param {Function} [validate_value_callback=null]
   */
  constructor(
    prop_name,
    vega_prop_name = null,
    prop_location = PropLocation.kEncodingPlusMarkDef,
    fallback_prop = null,
    can_have_scale_definition = true,
    validate_value_callback = null
  ) {
    super(
      prop_name,
      vega_prop_name,
      prop_location,
      fallback_prop,
      can_have_scale_definition
    )
    this.validate_value_callback_ = validate_value_callback
  }

  /**
   * @param {(string|number|boolean)} prop_definition
   */
  isValidMarkDefinition(prop_definition) {
    if (typeof prop_definition !== "number") {
      throw new Error(`Invalid value ${prop_definition}. It must be a number`)
    } else if (
      this.validate_value_callback_ &&
      !this.validate_value_callback_(prop_definition)
    ) {
      throw new Error(`Invalid value ${prop_definition}`)
    }
    return true
  }

  /**
   * @returns {MeasurementType}
   */
  getDefaultMeasurementType() {
    return MeasurementType.kQuantitative
  }
}
