import PropertiesDefinitionInterface from "../PropertiesDefinitionInterface"
import MarkConfigDefinitionObject from "../Mark/MarkConfigDefinitionObject"
import WindBarbConfigDefinitionObject from "../Mark/WindBarbConfigDefinitionObject"
import Mesh2dConfigDefinitionObject from "../Mark/Mesh2dConfigDefinitionObject"
import CrossSectionTerrainConfigDefinitionObject from "../Mark/CrossSectionTerrainConfigDefinitionObject"

import assert from "assert"

export default class ConfigDefinitionObject extends PropertiesDefinitionInterface {
  /**
   * @param {Object} definition_object
   * @param {RasterLayerContext} root_context
   */
  constructor(definition_object, root_context) {
    super(definition_object, null, root_context)

    this.configs_ = new Map()

    const sub_config_classes = [
      MarkConfigDefinitionObject,
      WindBarbConfigDefinitionObject,
      Mesh2dConfigDefinitionObject,
      CrossSectionTerrainConfigDefinitionObject
    ]

    sub_config_classes.forEach(sub_config_class => {
      const key = sub_config_class.key
      if (Object.hasOwn(definition_object, key)) {
        this.configs_.set(
          key,
          new sub_config_class(definition_object[key], {
            parent: this,
            prop_name: key
          })
        )
      } else {
        this.configs_.set(
          key,
          new sub_config_class(sub_config_class.defaults),
          { parent: this, prop_name: key }
        )
      }
    })

    this.general_mark_config_ = this.configs_.get(
      MarkConfigDefinitionObject.key
    )
    assert(this.general_mark_config_)
    assert(this.general_mark_config_ instanceof MarkConfigDefinitionObject)
  }

  /**
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materializeProperty(prop_descriptor, vega_property_output_state) {
    const layer_type = this.root_context.layer_type
    const mark_type_config = this.configs_.get(layer_type)
    if (
      mark_type_config &&
      typeof mark_type_config[prop_descriptor.prop_name] !== "undefined"
    ) {
      return mark_type_config.materializeProperty(
        prop_descriptor,
        vega_property_output_state
      )
    } else if (
      typeof this.general_mark_config_[prop_descriptor.prop_name] !==
      "undefined"
    ) {
      return this.general_mark_config_.materializeProperty(
        prop_descriptor,
        vega_property_output_state
      )
    }
    return false
  }
}
