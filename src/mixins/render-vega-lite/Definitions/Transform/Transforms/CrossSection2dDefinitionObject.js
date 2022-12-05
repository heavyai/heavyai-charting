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

export default class CrossSection2dDefinitionObject extends PropertiesDefinitionInterface {
  // eslint-disable-next-line no-undef
  static key = "crossSection2d"

  /**
   * @param {Object} definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(definition_object, parent_info) {
    super(definition_object, parent_info)
    assert(Object.hasOwn(definition_object, CrossSection2dDefinitionObject.key))

    const key = CrossSection2dDefinitionObject.key

    const obj = definition_object[key]
    if (typeof obj !== "object") {
      throw new Error(
        `Invalid 2D cross-section transform definition. The '${key}' property must be an object`
      )
    }

    /**
     * @type {string}
     */
    this.x_ = ""
    if (typeof obj.x !== "string") {
      throw new Error(
        `Invalid '${key}' transform definition. The 'x' property must exist and be a string`
      )
    }
    this.x_ = obj.x

    /**
     * @type {string}
     */
    this.y_ = ""
    if (typeof obj.x !== "string") {
      throw new Error(
        `Invalid '${key}' transform definition. The 'y' property must exist and be a string`
      )
    }
    this.y_ = obj.y

    /**
     * @type {string}
     */
    this.z_ = ""
    if (typeof obj.z !== "string") {
      throw new Error(
        `Invalid '${key}' transform definition. The 'z' property must exist and be a string`
      )
    }
    this.z_ = obj.z

    /**
     * @type {Number[]}
     */
    this.cross_section_line_ = []
    if (
      !Array.isArray(obj.crossSectionLine) ||
      obj.crossSectionLine.length !== 2 ||
      !Array.isArray(obj.crossSectionLine[0]) ||
      obj.crossSectionLine[0].length !== 2 ||
      !obj.crossSectionLine[0].every(p =>
        ["number", "string"].includes(typeof p)
      ) ||
      !Array.isArray(obj.crossSectionLine[1]) ||
      obj.crossSectionLine[1].length !== 2 ||
      !obj.crossSectionLine[1].every(p =>
        ["number", "string"].includes(typeof p)
      )
    ) {
      throw new Error(
        `Invalid '${key}' transform definition. The 'crossSectionLine' property must exist and be an array of two 2d points (i.e. [[0, 1], [1, 2]])`
      )
    }

    // deep copy
    this.cross_section_line_ = [
      [...obj.crossSectionLine[0]],
      [...obj.crossSectionLine[1]]
    ]

    /**
     * @type {string}
     */
    this.cross_section_dimension_name_ = "distance"
    if (Object.hasOwn(obj, "crossSectionDimensionName")) {
      if (typeof obj.crossSectionDimensionName !== "string") {
        throw new Error(
          `Invalid '${key}' transform definition. The 'crossSectionDimensionName' property must be a string`
        )
      }
      this.cross_section_dimension_name_ = obj.crossSectionDimensionName
    }
  }

  /**
   * The name of the column from the query defining the x dimension of the raster volume to cross-section
   * @type {string}
   */
  get x() {
    return this.x_
  }

  /**
   * The name of the column from the query defining the y dimension of the raster volume to cross-section
   * @type {string}
   */
  get y() {
    return this.y_
  }

  /**
   * The name of the column from the query defining the z dimension of the raster volume to cross-section
   * @type {string}
   */
  get z() {
    return this.z_
  }

  /**
   * The line defining the cross-section cut thru the raster volume
   * @type {Number[]}
   */
  get crossSectionLine() {
    return this.cross_section_line_
  }

  /**
   * The name of the new xy dimension created by the cross-section cut
   * @type {string}
   */
  get crossSectionDimensionName() {
    return this.cross_section_dimension_name_
  }

  /**
   * Used internally as the key for the materialized data stored in the VegaPropertyOutputState instance
   * @type {string}
   */
  get key() {
    const layer_name = this.root_context.layer_name
    return `${layer_name}_${CrossSection2dDefinitionObject.key}`
  }

  /**
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materialize(vega_property_output_state) {
    vega_property_output_state.addSqlParserTransform(`${this.key}_${this.x}`, {
      type: "project",
      expr: this.x,
      as: this.x
    })

    vega_property_output_state.addSqlParserTransform(`${this.key}_${this.y}`, {
      type: "project",
      expr: this.y,
      as: this.y
    })

    vega_property_output_state.addSqlParserTransform(`${this.key}_${this.z}`, {
      type: "project",
      expr: this.z,
      as: this.z
    })

    vega_property_output_state.addVegaDataFormat(this.key, {
      format: {
        type: "cross_section2d",
        coords: {
          x: this.x,
          y: this.y,
          z: this.z
        },
        xy_cross_section: this.crossSectionLine,
        cross_section_dimension: this.crossSectionDimensionName
      }
    })

    vega_property_output_state.addRealignmentDefinition(this)
  }

  /**
   * @param {Map<string,PropDescriptor>} prop_descriptors
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  realign(prop_descriptors, vega_property_output_state) {
    const transform_name = CrossSection2dDefinitionObject.key
    // const format_obj = vega_property_output_state.vega_data_formats.get(
    //   this.key
    // )
    // assert(
    //   typeof format_obj === "object" &&
    //     Object.hasOwn(format_obj, "format") &&
    //     Object.hasOwn(format_obj.format, "coords") &&
    //     typeof format_obj.format.coords === "object" &&
    //     Object.hasOwn(format_obj.format.coords, "x") &&
    //     Object.hasOwn(format_obj.format.coords, "y"),
    //   `${format_obj}`
    // )
    /* eslint-disable max-depth */
    for (const prop_descriptor of prop_descriptors.values()) {
      if (prop_descriptor instanceof PositionChannelDescriptor) {
        const sql_obj = vega_property_output_state.sql_parser_transforms.get(
          prop_descriptor.prop_name
        )
        if (sql_obj) {
          assert(
            prop_descriptor.vega_mark_prop_names.length === 1,
            `${prop_descriptor.vega_mark_prop_names.length}`
          )
          const vega_prop_name = prop_descriptor.vega_mark_prop_names[0]

          assert(
            vega_prop_name === "x" || vega_prop_name === "y",
            `${vega_prop_name}`
          )

          let new_field_name = ""
          let cross_prop_name = ""
          if (vega_prop_name === "x") {
            new_field_name = this.crossSectionDimensionName
            cross_prop_name = "crossSectionDimensionName"
          } else {
            new_field_name = this.z
            cross_prop_name = "z"
          }

          if (sql_obj.expr !== new_field_name) {
            throw new Error(
              `Invalid '${transform_name}' transform definition. The '${vega_prop_name}' mark position property must be linked with the '${cross_prop_name}' property. It is linked to '${sql_obj.expr}'`
            )
          }

          // drop any mention of the dynamically-created columns from the sql list
          vega_property_output_state.sql_parser_transforms.delete(
            prop_descriptor.prop_name
          )

          const vega_mark_prop_obj = vega_property_output_state.mark_properties.get(
            prop_descriptor.prop_name
          )

          if (
            vega_mark_prop_obj &&
            Object.hasOwn(vega_mark_prop_obj, vega_prop_name) &&
            Object.hasOwn(vega_mark_prop_obj[vega_prop_name], "field")
          ) {
            vega_mark_prop_obj[vega_prop_name].field = new_field_name
          }
        }
        // const vega_mark_prop_obj = vega_property_output_state.mark_properties.get(
        //   prop_descriptor.prop_name
        // )
        // assert(
        //   prop_descriptor.vega_mark_prop_names.length === 1,
        //   `${prop_descriptor.vega_mark_prop_names.length}`
        // )
        // const vega_prop_name = prop_descriptor.vega_mark_prop_names[0]
        // if (
        //   vega_mark_prop_obj &&
        //   Object.hasOwn(vega_mark_prop_obj, vega_prop_name) &&
        //   Object.hasOwn(vega_mark_prop_obj[vega_prop_name], "field")
        // ) {
        //   assert(
        //     Object.hasOwn(format_obj.format.coords, vega_prop_name),
        //     `${vega_prop_name}`
        //   )
        //   const value = vega_mark_prop_obj[vega_prop_name].field
        //   format_obj.format.coords[vega_prop_name] = value
        //   this[`${vega_prop_name}_`] = value
        //   vega_mark_prop_obj[vega_prop_name].field = vega_prop_name
        // }
      }
      // TODO(croot): may want to do a Geographic channel check here, but that would require the prop_descriptors input
      // to this function to only be the prop descriptors that were "handled"
      //  else if (prop_descriptor instanceof GeographicChannelDescriptor) {
      //   throw new Error(
      //     `Invalid '${transform_name}' transform definition. ${transform_name} transforms cannot be used with geographic channel '${prop_descriptor.prop_name}'`
      //   )
      // }
    }
    /* eslint-enable max-depth */
  }
}
