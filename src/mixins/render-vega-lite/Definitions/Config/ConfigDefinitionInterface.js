import PropertiesDefinitionInterface from "../PropertiesDefinitionInterface"

export default class ConfigDefinitionInterface extends PropertiesDefinitionInterface {
  /**
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materializeProperty(prop_descriptor, vega_property_output_state) {
    const prop_name = prop_descriptor.prop_name
    if (typeof this[prop_name] !== "undefined") {
      const prop_value = this[prop_name]
      if (prop_value !== undefined) {
        if (!prop_descriptor.isValidMarkDefinition(prop_value)) {
          throw new TypeError(
            `Invalid value for config property '${prop_name}'`
          )
        }
        const vega_mark_property_object = {}
        const context = this
        prop_descriptor.vega_mark_prop_names.forEach(vega_mark_prop_name => {
          vega_mark_property_object[vega_mark_prop_name] = context[prop_name]
        })
        vega_property_output_state.addMarkProperty(
          prop_name,
          vega_mark_property_object
        )
      }
      return true
    }
    return false
  }
}
