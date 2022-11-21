import PropertiesDefinitionInterface from "../PropertiesDefinitionInterface"
import assert from "assert"

export default class MarkDefinitionObject extends PropertiesDefinitionInterface {
  /**
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materializeProperty(prop_descriptor, vega_property_output_state) {
    assert(this.hasProperty(prop_descriptor.prop_name))
    const prop_definition = this.definition_object_[prop_descriptor.prop_name]
    if (prop_descriptor.isValidMarkDefinition(prop_definition)) {
      const vega_mark_property_object = {}
      const materialized_vega_object = prop_descriptor.materializeMarkDefinitionForVega(
        prop_definition
      )
      prop_descriptor.vega_mark_prop_names.forEach(vega_mark_prop_name => {
        vega_mark_property_object[
          vega_mark_prop_name
        ] = materialized_vega_object
      })
      vega_property_output_state.addMarkProperty(
        prop_descriptor.prop_name,
        vega_mark_property_object
      )
    }
  }
}
