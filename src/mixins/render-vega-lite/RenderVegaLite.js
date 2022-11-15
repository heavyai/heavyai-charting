import VegaPropertyOutputState from "./VegaPropertyOutputState"
import ConfigDefinitionObject from "./Definitions/Config/ConfigDefinitionObject"
import TransformDefinitionObject from "./Definitions/Transform/TransformDefinitionObject"
import MarkDefinitionObject from "./Definitions/Mark/MarkDefinitionObject"
import EncodingDefinitionObject from "./Definitions/Encoding/EncodingDefinitionObject"
import PropLocation from "./PropDescriptor/Enums/PropLocation"

// jsdoc imports only
/* eslint-disable no-unused-vars */
import PropDescriptor from "./PropDescriptor/PropDescriptor"
import RasterLayerContext from "./RasterLayerContext"
/* eslint-enable no-unused-vars */

/**
 * @param {PropDescriptor} prop_descriptor
 * @param {PropertiesDefinitionInterface} props_definition
 * @param {VegaPropertyOutputState} vega_property_output_state
 */
const handle_prop = (
  prop_descriptor,
  props_definition,
  vega_property_output_state
) => {
  if (vega_property_output_state.has(prop_descriptor.prop_name)) {
    return true
  }

  if (props_definition.hasProperty(prop_descriptor.prop_name)) {
    props_definition.materializeProperty(
      prop_descriptor,
      vega_property_output_state
    )
    return true
  } else {
    const fallback_prop = prop_descriptor.fallback_prop
    if (fallback_prop) {
      return handle_prop(
        fallback_prop,
        props_definition,
        vega_property_output_state
      )
    }
  }
  return false
}

/**
 * @param {RasterLayerContext} raster_layer_context
 * @param {Map<string,PropDescriptor>} props
 * @param {Object} state
 * @returns {VegaPropertyOutputState}
 */
const materialize_prop_descriptors = (raster_layer_context, props, state) => {
  const vega_property_output_state = new VegaPropertyOutputState()

  // eslint-disable-next-line prefer-const
  let { transform = [], mark = {}, encoding = {}, config = {} } = state
  if (typeof mark !== "object") {
    mark = {}
  }

  const config_definition_object = new ConfigDefinitionObject(
    config,
    raster_layer_context
  )

  new TransformDefinitionObject(transform, raster_layer_context).materialize(
    vega_property_output_state
  )

  const mark_definition_object = new MarkDefinitionObject(
    mark,
    null,
    raster_layer_context
  )
  const encoding_definition_object = new EncodingDefinitionObject(
    encoding,
    null,
    raster_layer_context
  )

  for (const prop_descriptor of props.values()) {
    prop_descriptor.validateContext(raster_layer_context)

    let handled = false
    if (
      prop_descriptor.prop_location.value & PropLocation.kEncodingOnly.value
    ) {
      handled = handle_prop(
        prop_descriptor,
        encoding_definition_object,
        vega_property_output_state
      )
    }

    if (
      !handled &&
      prop_descriptor.prop_location.value & PropLocation.kMarkDefOnly.value
    ) {
      handled = handle_prop(
        prop_descriptor,
        mark_definition_object,
        vega_property_output_state
      )
    }

    if (!handled) {
      handled = config_definition_object.materializeProperty(
        prop_descriptor,
        vega_property_output_state
      )
    }
  }

  // validate that there's no conflict of position/geographic descriptors
  const position_collision_set = new Set()
  vega_property_output_state.vega_state_maps_.mark_properties.forEach(
    prop_vega_obj => {
      Object.keys(prop_vega_obj).forEach(prop_name => {
        if (position_collision_set.has(prop_name)) {
          throw new Error(
            `Invalid mark definition for raster layer '${raster_layer_context.layer_name}'. It has multiple definitions for property '${prop_name}'`
          )
        }
        position_collision_set.add(prop_name)
      })
    }
  )

  // now do a realignment step
  // After all the property definitions have been materialized, there is an opportunity for prop definitions
  // to adjust the materialized state for whatever purpose. For example linking in fields that may not be present
  // at original materialization (See RasterMesh2DDefinitionObject)
  // Any property definition that requires realignment must register itself with the vega_property_output_state instance.
  // Realignment is performed in a FIFO queue from that registration
  vega_property_output_state.realignment_definitions.forEach(
    prop_definition => {
      prop_definition.realign(props, vega_property_output_state)
    }
  )
  vega_property_output_state.clearRealignments()

  return vega_property_output_state
}

export { materialize_prop_descriptors as materializePropDescriptors }
