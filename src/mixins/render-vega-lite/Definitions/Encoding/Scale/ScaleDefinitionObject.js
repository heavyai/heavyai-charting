import assert from "assert"
import PropertiesDefinitionInterface from "../../PropertiesDefinitionInterface"

/**
 * @extends PropertiesDefinitionInterface
 */
export default class ScaleDefinitionObject extends PropertiesDefinitionInterface {
  /**
   * @param {string} name
   * @param {Object} scale_definition_object
   * @param {ScaleType} scale_type
   * @param {ParentInfo} parent_info
   */
  constructor(scale_definition_object, scale_type, parent_info) {
    super(scale_definition_object, parent_info)
    assert(Object.hasOwn(scale_definition_object, "name"))
    assert(typeof scale_definition_object.name === "string")
    this.name_ = scale_definition_object.name
    this.type_ = scale_type

    this.domain_ = "auto"
    if (Object.hasOwn(scale_definition_object, "domain")) {
      if (
        !Array.isArray(scale_definition_object.domain) &&
        typeof scale_definition_object.domain !== "string"
      ) {
        this.error_message = `Invalid scale domain '${scale_definition_object.domain}'. Scale domains must be an array or the string 'auto'`
      }
      this.domain_ = scale_definition_object.domain

      if (typeof this.domain_ === "string") {
        this.domain_ = this.domain_.toLowerCase()
      }
    }

    this.range_ = "auto"
    if (Object.hasOwn(scale_definition_object, "range")) {
      if (
        !Array.isArray(scale_definition_object.range) &&
        (typeof scale_definition_object.range !== "string" ||
          scale_definition_object.range.toLowerCase() !== "auto")
      ) {
        this.error_message = `Invalid scale range '${scale_definition_object.range}'. Scale ranges must be an array or the string 'auto'`
      }
      this.range_ = scale_definition_object.range
      if (typeof this.range_ === "string") {
        this.range_ = this.range_.toLowerCase()
      }
    }

    this.null_value_ = null
    if (Object.hasOwn(scale_definition_object, "null")) {
      this.null_value_ = scale_definition_object.null
    } else if (Object.hasOwn(scale_definition_object, "nullValue")) {
      this.null_value_ = scale_definition_object.nullValue
    }

    /**
     * @type {(AccumulatorType|null)}
     */
    this.accumulator_ = null
  }

  get name() {
    return this.name_
  }

  /**
   * @type {ScaleType}
   */
  get type() {
    return this.type_
  }

  /**
   * @type {(AccumulatorType|null)}
   */
  get accumulator() {
    return this.accumulator_
  }

  /**
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materializeProperty(prop_descriptor, vega_property_output_state) {
    const prop_name = prop_descriptor.prop_name

    let domain = this.domain_
    if (typeof domain === "string") {
      domain = this._materializeDomainFromKeyword(
        this.domain_,
        prop_descriptor,
        vega_property_output_state
      )
    }

    let range = this.range_
    if (typeof range === "string") {
      range = this._materializeRangeFromKeyword(
        this.range_,
        prop_descriptor,
        vega_property_output_state
      )
    }

    const vega_scale_obj = {
      name: this.name,
      type: `${this.type_}`,
      domain,
      range
    }

    this._materializeExtraVegaScaleProps(prop_descriptor, vega_scale_obj)

    if (this.null_value_ !== null) {
      // eslint-disable-next-line no-warning-comments
      // TODO(croot): validate null value, at least object-wise?
      vega_scale_obj.nullValue = this.null_value_
    }

    vega_property_output_state.addVegaScale(prop_name, vega_scale_obj)
  }

  /**
   * @param {string} domain_keyword
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  _materializeDomainFromKeyword(domain_keyword) {
    throw new Error(
      `'${domain_keyword}' is not a valid domain keyword for scale type ${this.type}`
    )
  }

  /**
   * @param {string} range_keyword
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  _materializeRangeFromKeyword(range_keyword) {
    throw new Error(
      `'${range_keyword}' is not a valid range keyword for scale type ${this.type}`
    )
  }

  /**
   * @param {PropDescriptor} prop_descriptor
   * @param {Object} vega_scale_obj
   */
  // eslint-disable-next-line no-unused-vars
  _materializeExtraVegaScaleProps(prop_descriptor, vega_scale_obj) {
    assert(false, "Needs to be overridden by derived class")
  }
}
