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
    let chart_function_name = `_get${this.prop_name}ScaleName`
    if (typeof chart[chart_function_name] !== "function") {
      chart_function_name = `_get${this.prop_name.toUpperCase()}ScaleName`
      assert(typeof chart[chart_function_name] === "function")
    }
    return { name: chart[chart_function_name](), type: "internal-passthru" }
  }
}
