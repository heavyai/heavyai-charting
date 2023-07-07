import assert from "assert"
import PropertiesDefinitionInterface from "../../PropertiesDefinitionInterface"

import {
  PositionChannelDescriptor,
  GeographicChannelDescriptor
} from "../../../PropDescriptor/CommonChannelDescriptors"

// jsdoc imports only
/* eslint-disable no-unused-vars */
import VegaPropertyOutputState from "../../../VegaPropertyOutputState"
/* eslint-enable no-unused-vars */

export default class RasterMesh2dDefinitionObject extends PropertiesDefinitionInterface {
  // eslint-disable-next-line no-undef
  static key = "rasterMesh2d"

  /**
   * @param {Object} definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(definition_object, parent_info) {
    super(definition_object, parent_info)
    assert(Object.hasOwn(definition_object, RasterMesh2dDefinitionObject.key))

    const key = RasterMesh2dDefinitionObject.key

    const obj = definition_object[key]
    if (typeof obj !== "object") {
      throw new Error(
        `Invalid 2D raster mesh transform definition. The '${key}' property must be an object`
      )
    }

    /**
     * @type {string}
     */
    this.x_ = ""

    /**
     * @type {string}
     */
    this.y_ = ""
  }

  /**
   * The name of the column from the query that is used as the x dimension of the mesh
   * @type {string}
   */
  get x() {
    return this.x_
  }

  /**
   * The name of the column from the query that is used as the y dimension of the mesh
   * @type {string}
   */
  get y() {
    return this.y_
  }

  /**
   * Used internally as the key for the materialized data stored in the VegaPropertyOutputState instance
   * @type {string}
   */
  get key() {
    const layer_name = this.root_context.layer_name
    return `${layer_name}_${RasterMesh2dDefinitionObject.key}`
  }

  /**
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materialize(vega_property_output_state) {
    vega_property_output_state.addVegaDataFormat(this.key, {
      format: {
        type: "raster_mesh2d",
        coords: {
          // stubs. the real values for x/y will be filled in the realign step
          x: this.x,
          y: this.y
        }
      }
    })

    vega_property_output_state.addRealignmentDefinition(this)
  }

  /**
   * @param {Map<string,PropDescriptor>} prop_descriptors
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  realign(prop_descriptors, vega_property_output_state) {
    const format_obj = vega_property_output_state.vega_data_formats.get(
      this.key
    )
    assert(
      typeof format_obj === "object" &&
        Object.hasOwn(format_obj, "format") &&
        Object.hasOwn(format_obj.format, "coords") &&
        typeof format_obj.format.coords === "object" &&
        Object.hasOwn(format_obj.format.coords, "x") &&
        Object.hasOwn(format_obj.format.coords, "y"),
      `${format_obj}`
    )

    for (const prop_descriptor of prop_descriptors.values()) {
      if (
        prop_descriptor instanceof PositionChannelDescriptor ||
        prop_descriptor instanceof GeographicChannelDescriptor
      ) {
        const vega_mark_prop_obj = vega_property_output_state.mark_properties.get(
          prop_descriptor.prop_name
        )

        assert(
          prop_descriptor.vega_mark_prop_names.length === 1,
          `${prop_descriptor.vega_mark_prop_names.length}`
        )
        const vega_prop_name = prop_descriptor.vega_mark_prop_names[0]

        if (
          vega_mark_prop_obj &&
          Object.hasOwn(vega_mark_prop_obj, vega_prop_name) &&
          Object.hasOwn(vega_mark_prop_obj[vega_prop_name], "field")
        ) {
          assert(
            Object.hasOwn(format_obj.format.coords, vega_prop_name),
            `${vega_prop_name}`
          )
          const value = vega_mark_prop_obj[vega_prop_name].field
          format_obj.format.coords[vega_prop_name] = value
          this[`${vega_prop_name}_`] = value

          vega_mark_prop_obj[vega_prop_name].field = vega_prop_name
        }
      }
    }
  }
}
