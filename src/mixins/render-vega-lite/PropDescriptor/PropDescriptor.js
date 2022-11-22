import PropLocation from "./Enums/PropLocation"
import MeasurementType from "./Enums/MeasurementType"

// jsdoc import only
// eslint-disable-next-line no-unused-vars
import RasterLayerContext from "../RasterLayerContext"

export { PropLocation, MeasurementType }
export default class PropDescriptor {
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
    this.prop_name_ = prop_name
    /**
     * @type {string[]}
     */
    this.vega_prop_names_ = []
    if (vega_prop_name === null) {
      this.vega_prop_names_.push(prop_name)
    } else if (vega_prop_name.length > 0) {
      this.vega_prop_names_.push(vega_prop_name)
    }

    this.fallback_prop_ = fallback_prop
    if (this.fallback_prop_) {
      const context = this
      this.vega_mark_prop_names.forEach(vega_prop_name => {
        if (!context.fallback_prop_.vega_prop_names_.includes(vega_prop_name)) {
          context.fallback_prop_.vega_prop_names_.push(vega_prop_name)
        }
      })
    }
    this.prop_location_ = prop_location
    this.can_have_scale_definition_ = can_have_scale_definition
  }

  /**
   * @returns {string}
   */
  get prop_name() {
    return this.prop_name_
  }

  /**
   * @returns {PropLocation}
   */
  get prop_location() {
    return this.prop_location_
  }

  /**
   * @returns {PropDescriptor}
   */
  get fallback_prop() {
    return this.fallback_prop_
  }

  /**
   * @type {string[]}
   */
  get vega_mark_prop_names() {
    return this.vega_prop_names_
  }

  /**
   * @returns {boolean}
   */
  get can_have_scale_definition() {
    return this.can_have_scale_definition_
  }

  /**
   * Validates the property descriptor with the active context
   * Should throw an error if validation fails
   * @param {RasterLayerContext} raster_layer_context
   */
  // eslint-disable-next-line no-unused-vars
  validateContext(raster_layer_context) {}

  /**
   * @param {(string|number|boolean)} prop_definition
   */
  isValidMarkDefinition(prop_definition) {
    const is_valid =
      typeof prop_definition === "number" ||
      typeof prop_definition === "string" ||
      typeof prop_definition === "boolean"
    if (!is_valid) {
      prop_definition.error_message = `Invalid value ${prop_definition}. It must be a number, string, or boolean`
    }
    return is_valid
  }

  /**
   * @param {(Object|string|number|boolean)} prop_definition
   * @returns {(Object|string|numbr|boolean)}
   */
  materializeMarkDefinitionForVega(prop_definition) {
    // pass thru, as long as everything validated
    return prop_definition
  }

  /**
   * @param {ValueDefinitionObject} value_definition_object
   */
  isValidValueDefinition(value_definition_object) {
    if (!this.isValidMarkDefinition(value_definition_object.value)) {
      value_definition_object.error_message =
        value_definition_object.value.error_message
      return false
    }
    return true
  }

  /**
   * @param {(Object|string|number|boolean)} prop_definition
   * @returns {(Object|string|numbr|boolean)}
   */
  materiailzeEncodingValueDefinitionForVega(prop_definition) {
    return this.materializeMarkDefinitionForVega(prop_definition)
  }

  /**
   * @param {MeasurementType} measurement_type
   */
  // eslint-disable-next-line no-unused-vars
  validateMeasurementType(measurement_type) {
    // no-op. Can be overwritten by derived classes that need
    // specialization
  }

  /**
   * @returns {MeasurementType}
   */
  getDefaultMeasurementType() {
    return MeasurementType.kNominal
  }

  /**
   * @param {ParentInfo} parent_info
   * @returns {Object}
   */
  // eslint-disable-next-line no-unused-vars
  buildDefaultScaleDefinition(parent_info) {
    // eslint-disable-next-line no-warning-comments
    // TODO(croot): move this into a scale-enabled descriptor mixin
    return {}
  }
}
