import PropertiesDefinitionInterface from "../PropertiesDefinitionInterface"
import assert from "assert"

export default class ValueDefinitionObject extends PropertiesDefinitionInterface {
  /**
   * @param {Object} value_definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(value_definition_object, parent_info) {
    assert(Boolean(parent_info))
    super(value_definition_object, parent_info)

    assert(typeof value_definition_object === "object")
    assert(Object.hasOwn(value_definition_object, "value"))
    if (Object.keys(value_definition_object).length !== 1) {
      this.error_message = `Value definitions must have only 1 property called value`
      // eslint-disable-next-line no-warning-comments
      // TODO(croot): not sure about this early return in
      // a constructor. The caller should check for the error_message
      // pretty much immediately after.
      return
    }
    this.value_ = value_definition_object.value
  }

  /**
   * @returns {string, number, boolean}
   */
  get value() {
    return this.value_
  }

  /**
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materializeProperty(prop_descriptor, vega_property_output_state) {
    if (this.hasError() || !prop_descriptor.isValidValueDefinition(this)) {
      throw new Error(
        `Invalid 'value' definition for property '${prop_descriptor.prop_name}'. ${this.error_message}`
      )
    }
    const vega_mark_property_object = {}
    const context = this
    prop_descriptor.vega_mark_prop_names.forEach(vega_mark_prop_name => {
      vega_mark_property_object[vega_mark_prop_name] = context.value
    })
    vega_property_output_state.addMarkProperty(
      prop_descriptor.prop_name,
      vega_mark_property_object
    )
  }
}
