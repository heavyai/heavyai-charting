import PropertiesDefinitionInterface from "../PropertiesDefinitionInterface"
import assert from "assert"
import FieldDefinitionObject from "./FieldDefinitionObject"
import ValueDefinitionObject from "./ValueDefinitionObject"

export default class EncodingDefinitionObject extends PropertiesDefinitionInterface {
  /**
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materializeProperty(prop_descriptor, vega_property_output_state) {
    assert(this.hasProperty(prop_descriptor.prop_name))
    const prop_definition = this.definition_object_[prop_descriptor.prop_name]

    if (typeof prop_definition !== "object") {
      throw new Error(
        `Invalid encoding definition for '${prop_descriptor.prop_name}' property.`
      )
    }

    const prop_name = prop_descriptor.prop_name
    const parent_info = { parent: this, prop_name }

    if (Object.hasOwn(prop_definition, "value")) {
      new ValueDefinitionObject(
        prop_definition,
        parent_info
      ).materializeProperty(prop_descriptor, vega_property_output_state)
    } else if (Object.hasOwn(prop_definition, "field")) {
      new FieldDefinitionObject(
        prop_definition,
        parent_info
      ).materializeProperty(prop_descriptor, vega_property_output_state)
    }
  }
}
