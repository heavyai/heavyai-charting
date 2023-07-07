import {
  default as PropDescriptor,
  PropLocation,
  MeasurementType
} from "../PropDescriptor"
import assert from "assert"

export default class PositionChannelDescriptor extends PropDescriptor {
  /**
   * @param {string} prop_name
   * @param {string} [vega_prop_name=null]
   */
  constructor(prop_name, vega_prop_name = null) {
    super(prop_name, vega_prop_name, PropLocation.kEncodingOnly, null, true)
  }

  isValidMarkDefinition() {
    assert(false, "This should never be called")
  }

  /**
   * @param {ValueDefinitionObject} value_definition_object
   * @returns {boolean}
   */
  isValidValueDefinition(value_definition_object) {
    // position channels currently do not support value defs, only fields.
    value_definition_object.error_message = `Position channels do not currently support value definitions.`
    return false
  }

  /**
   * @param {MeasurementType} measurement_type
   */
  validateMeasurementType(measurement_type) {
    if (measurement_type !== MeasurementType.kQuantitative) {
      throw new Error(
        `The measurement type ${measurement_type} is an invalid measurement type for position channel '${this.prop_name}'. Position channels only accept ${MeasurementType.kQuantitative} measurement types.`
      )
    }
  }

  /**
   * @returns {MeasurementType}
   */
  getDefaultMeasurementType() {
    return MeasurementType.kQuantitative
  }

  /**
   * @param {ParentInfo} parent_info
   * @returns {Object}
   */
  buildDefaultScaleDefinition(parent_info) {
    const chart = parent_info.parent.root_context.chart
    const layer = parent_info.parent.root_context.layer
    let scale_function_name = `_get${this.prop_name}ScaleName`

    // added check for get..ScaleName on layer level, as cross section terrain
    // needs to create a separate y scale from cross section when multi-layered
    if (
      typeof chart[scale_function_name] !== "function" &&
      typeof layer[scale_function_name] !== "function"
    ) {
      scale_function_name = `_get${this.prop_name.toUpperCase()}ScaleName`
      assert(
        typeof chart[scale_function_name] === "function" ||
          typeof layer[scale_function_name] === "function"
      )
    }

    if (typeof layer[scale_function_name] === "function") {
      return { name: layer[scale_function_name](), type: "internal-passthru" }
    } else {
      return { name: chart[scale_function_name](), type: "internal-passthru" }
    }
  }
}
