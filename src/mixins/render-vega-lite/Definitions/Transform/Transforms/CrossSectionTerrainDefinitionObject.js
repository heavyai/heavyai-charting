import assert from "assert"
import PropertiesDefinitionInterface from "../../PropertiesDefinitionInterface"
import { PositionChannelDescriptor } from "../../../PropDescriptor/CommonChannelDescriptors"

// jsdoc imports only
/* eslint-disable no-unused-vars */
import VegaPropertyOutputState from "../../../VegaPropertyOutputState"
/* eslint-enable no-unused-vars */

export default class CrossSectionTerrainDefinitionObject extends PropertiesDefinitionInterface {
  // eslint-disable-next-line no-undef
  static key = "cross_section1d"

  /**
   * @param {Object} definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(definition_object, parent_info) {
    super(definition_object, parent_info)
    assert(
      Object.hasOwn(definition_object, CrossSectionTerrainDefinitionObject.key)
    )

    const key = CrossSectionTerrainDefinitionObject.key

    const obj = definition_object[key]
    if (typeof obj !== "object") {
      throw new Error(
        `Invalid 1D cross-section transform definition. The '${key}' property must be an object`
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
     * @type {number}
     */
    this.num_points_ = 0
    if (Object.hasOwn(obj, "numPoints")) {
      if (typeof obj.numPoints !== "number") {
        throw new Error(
          `Invalid '${key}' transform definition. The 'numPoints' property must be a number`
        )
      }
      this.num_points_ = obj.numPoints
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
   * Required by the renderer for the line generation. Should be half of chart width
   * @type {number}
   */
  get numPoints() {
    return this.num_points_
  }

  /**
   * Used internally as the key for the materialized data stored in the VegaPropertyOutputState instance
   * @type {string}
   */
  get key() {
    const layer_name = this.root_context.layer_name
    return `${layer_name}_${CrossSectionTerrainDefinitionObject.key}`
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
        type: "cross_section1d",
        coords: {
          x: this.x,
          y: this.y,
          z: this.z
        },
        xy_cross_section: this.crossSectionLine,
        num_points: this.numPoints
      }
    })

    vega_property_output_state.addRealignmentDefinition(this)
  }

  /**
   * @param {Map<string,PropDescriptor>} prop_descriptors
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  realign(prop_descriptors, vega_property_output_state) {
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

          const new_field_name = vega_prop_name === "x" ? "x" : "y"

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
      }
    }
    /* eslint-enable max-depth */
  }
}
