import ScaleDefinitionObject from "../ScaleDefinitionObject"
import ScaleType from "../Enums/ScaleType"

export default class InternalPassthruScale extends ScaleDefinitionObject {
  /**
   *
   * @param {Object} passthru_definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(passthru_definition_object, parent_info) {
    super(passthru_definition_object, ScaleType.kInternalPassthru, parent_info)
  }

  /**
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  // eslint-disable-next-line no-unused-vars
  materializeProperty(prop_descriptor, vega_property_output_state) {
    // no-op, just passes thru. It does not build any new scales.
    // Generally this is used in the event that the scale is built out
    // by some other means, but we still need to build out the:
    //
    // {
    //   "scale": ...,
    //   "field": ...
    // }
    //
    // struct
  }
}
