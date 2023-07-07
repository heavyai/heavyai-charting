import {
  default as NumericPropDescriptor,
  PropLocation
} from "../BaseTypes/NumericPropDescriptor"
import { is_gte_zero } from "../BaseTypes/NumericPropValidators"

export default class SizeChannelDescriptor extends NumericPropDescriptor {
  /**
   * @param {string} prop_name
   * @param {string} [vega_prop_name=null]
   * @param {PropLocation} [prop_location=PropLocation.kEncodingPlusMarkDef]
   * @param {PropDescriptor} [fallback_prop=null]
   * @param {boolean} [can_have_scale_definition=true]
   */
  constructor(
    prop_name,
    vega_prop_name = null,
    prop_location = PropLocation.kEncodingPlusMarkDef,
    fallback_prop = null,
    can_have_scale_definition = true
  ) {
    super(
      prop_name,
      vega_prop_name,
      prop_location,
      fallback_prop,
      can_have_scale_definition,
      is_gte_zero
    )
  }
}
