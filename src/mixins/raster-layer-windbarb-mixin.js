import {
  lastFilteredSize
  // setLastFilteredSize
} from "../core/core-async"
import {
  //   adjustOpacity,
  createRasterLayerGetterSetter,
  //   createVegaAttrMixin,
  //   getColorScaleName,
  //   getScales,
  getSizeScaleName
} from "../utils/utils-vega"
import { parser } from "../utils/utils"
import assert from "assert"
import { AGGREGATES, isValidPostFilter } from "./raster-layer-point-mixin"
// import * as d3 from "d3"
// import { AABox2d, Point2d } from "@heavyai/draw/dist/mapd-draw"

// const AUTOSIZE_DOMAIN_DEFAULTS = [100000, 0]
// const AUTOSIZE_RANGE_DEFAULTS = [2.0, 5.0]
// const AUTOSIZE_RANGE_MININUM = [1, 1]
// const SIZING_THRESHOLD_FOR_AUTOSIZE_RANGE_MININUM = 1500000
// const ANGLE_SHAPE_SIZE_MULTIPLIER = 2.5

// function validSymbol(type) {
//   switch (type) {
//     case "circle":
//     case "cross":
//     case "diamond":
//     case "hexagon":
//     case "square":
//     case "triangle-down":
//     case "triangle-left":
//     case "triangle-right":
//     case "triangle-up":
//     case "hexagon-vert":
//     case "hexagon-horiz":
//     case "wedge":
//     case "arrow":
//     case "airplane":
//       return true
//     default:
//       return false
//   }
// }

// function getMarkType(config = { point: {} }) {
//   if (validSymbol(config.point.shape)) {
//     return config.point.shape
//   } else {
//     return "circle"
//   }
// }

class RasterLayerContext {
  /**
   * @param {Object} chart
   * @param {string} table_name
   * @param {string} layer_type
   * @param {Object} layer
   * @param {string} layer_name
   * @param {(number|null)} [last_filtered_size=null]
   */
  constructor(
    chart,
    table_name,
    layer_type,
    layer,
    layer_name,
    last_filtered_size = null
  ) {
    assert(Boolean(chart))
    assert(typeof chart === "object")

    /**
     * @type {Object}
     */
    this.chart_ = chart

    assert(typeof table_name === "string")
    /**
     * @type {string}
     */
    this.table_name_ = table_name

    assert(typeof layer_type === "string")
    /**
     * @type {string}
     */
    this.layer_type_ = layer_type

    assert(Boolean(layer))
    assert(typeof layer === "object")
    /**
     * @type {Object}
     */
    this.layer_ = layer

    assert(typeof layer_name === "string")
    /**
     * @type {string}
     */
    this.layer_name_ = layer_name

    this.last_filtered_size_ = last_filtered_size
  }

  /**
   * @type {Object}
   */
  get chart() {
    return this.chart_
  }

  /**
   * @type {string}
   */
  get table_name() {
    return this.table_name_
  }

  /**
   * @type {string}
   */
  get layer_type() {
    return this.layer_type_
  }

  /**
   * @type {Object}
   */
  get layer() {
    return this.layer_
  }

  /**
   * @type {string}
   */
  get layer_name() {
    return this.layer_name_
  }

  /**
   * @type {(number|null)}
   */
  get last_filtered_size() {
    return this.last_filtered_size_
  }
}

/**
 * @typedef {Object} VegaStateMaps
 * @property {Map} sql_parser_transforms
 * @property {Map} vega_transforms
 * @property {Map} vega_scales
 * @property {Map} mark_properties
 * @property {Map} legend_properties
 */

/**
 * @typedef {Object} VegaStateArrays
 * @property {Object[]} sql_parser_transforms
 * @property {Object[]} vega_transforms
 * @property {Object[]} vega_scales
 * @property {Object[]} mark_properties
 */

class VegaPropertyOutputState {
  constructor() {
    /**
     * @type {VegaStateMaps}
     */
    this.vega_state_maps_ = {
      sql_parser_transforms: new Map(),
      vega_transforms: new Map(),
      vega_scales: new Map(),
      mark_properties: new Map(),
      legend_properties: new Map()
    }
  }

  /**
   * @param {string} prop_name
   * @returns {boolean}
   */
  has(prop_name) {
    for (const map_instance of Object.values(this.vega_state_maps_)) {
      if (map_instance.has(prop_name)) {
        return true
      }
    }
    return false
  }

  /**
   * @returns {VegaStateArrays}
   */
  flatten() {
    const output_object = {}
    for (const [key, map_instance] of Object.entries(this.vega_state_maps_)) {
      output_object[key] = Array.from(map_instance.values())
    }
    return output_object
  }

  /**
   * @param {string} prop_name
   * @param {Object} transform_obj
   */
  addSqlParserTransform(prop_name, transform_obj) {
    this.vega_state_maps_.sql_parser_transforms.set(prop_name, transform_obj)
  }

  /**
   * @param {string} prop_name
   * @param {Object} vega_transform_obj
   */
  addVegaTransform(prop_name, vega_transform_obj) {
    this.vega_state_maps_.vega_transforms.set(prop_name, vega_transform_obj)
  }

  /**
   * @param {string} prop_name
   * @param {Object} vega_scale_obj
   */
  addVegaScale(prop_name, vega_scale_obj) {
    this.vega_state_maps_.vega_scales.set(prop_name, vega_scale_obj)
  }

  /**
   *
   * @param {PropDescriptor} prop_descriptor
   */
  getScaleForProp(prop_descriptor) {
    let scale_obj = this.vega_state_maps_.vega_scales.get(
      prop_descriptor.prop_name
    )
    if (!scale_obj) {
      const fallback_prop_descriptor = prop_descriptor.fallback_prop
      if (fallback_prop_descriptor) {
        scale_obj = this.getScaleForProp(fallback_prop_descriptor)
      } else {
        scale_obj = null
      }
    }
    return scale_obj
  }

  /**
   * @param {string} prop_name
   * @param {Object} property_obj
   */
  addMarkProperty(prop_name, property_obj) {
    this.vega_state_maps_.mark_properties.set(prop_name, property_obj)
  }

  /**
   * @param {string} prop_name
   * @param {Object} legend_obj
   */
  addLegendForProperty(prop_name, legend_obj) {
    this.vega_state_maps_.legend_properties.set(prop_name, legend_obj)
  }

  /**
   * @param {PropDescriptor} prop_descriptor
   */
  getLegendForProperty(prop_descriptor) {
    let legend_obj = this.vega_state_maps_.legend_properties.get(
      prop_descriptor.prop_name
    )
    if (!legend_obj) {
      const fallback_prop_descriptor = prop_descriptor.fallback_prop
      if (fallback_prop_descriptor) {
        legend_obj = this.getLegendForProperty(fallback_prop_descriptor)
      } else {
        legend_obj = null
      }
    }
    return legend_obj
  }
}

class PropertyDefinition {
  /**
   *
   * @param {string} prop_name
   * @param {Object} prop_definition
   */
  constructor(prop_name, prop_definition) {
    this._prop_name = prop_name
    this._prop_definition = prop_definition
  }

  /**
   * @returns {string}
   */
  get prop_name() {
    return this._prop_name
  }

  /**
   * @returns {object}
   */
  get prop_definition() {
    return this._prop_definition
  }
}

/**
 * @typedef ParentInfo
 * @property {PropertiesDefinitionInterface} parent
 * @property {string} prop_name
 */

class PropertiesDefinitionInterface {
  /**
   * @param {Object} definition_object
   * @param {ParentInfo} [parent_info=null]
   * @param {RasterLayerContext} [root_context = null]
   */
  constructor(definition_object, parent_info = null, root_context = null) {
    assert(typeof definition_object === "object")
    assert(parent_info === null || root_context === null)
    this.parent_info_ = parent_info
    this.root_context_ = root_context
    this.definition_object_ = definition_object
    this.error_msg_ = ""
  }

  /**
   * @type {string}
   */
  get error_message() {
    return this.error_msg_
  }

  set error_message(error_msg) {
    this.error_msg_ = error_msg
  }

  /**
   * @returns {boolean}
   */
  hasError() {
    return this.error_message.length > 0
  }

  /**
   * @returns {PropertiesDefinitionInterface}
   */
  get parent() {
    return this.parent_info_ ? this.parent_info_.parent : null
  }

  /**
   * @type {RasterLayerContext}
   */
  get root_context() {
    if (this.root_context_) {
      return this.root_context_
    }
    assert(this.parent_info_)
    return this.parent_info_.parent.root_context
  }

  /**
   *
   * @param {string} prop_name
   * @returns boolean
   */
  hasProperty(prop_name) {
    return Object.hasOwn(this.definition_object_, prop_name)
  }

  /**
   * @returns {PropertyDefinition}
   */
  getPropertyDefinition(prop_name) {
    if (!this.hasProperty(prop_name)) {
      return null
    }
    return new PropertyDefinition(prop_name, this.definition_object_[prop_name])
  }

  /**
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materialize(vega_property_output_state) {
    assert(false, `Needs to be overwritten by a derived class`)
  }

  /**
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materializeProperty(prop_descriptor, vega_property_output_state) {
    assert(false, `Needs to be overwritten by a derived class`)
  }
}

class ConfigDefinitionInterface extends PropertiesDefinitionInterface {
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
        prop_descriptor.vega_mark_prop_names.forEach((vega_mark_prop_name) => {
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

class MarkConfigDefinitionObject extends ConfigDefinitionInterface {
  static key = "mark"

  static defaults = {
    color: "#4682b4",
    opacity: 1,
    fillOpacity: 1,
    strokeOpacity: 1,
    strokeJoin: "miter"
  }

  /**
   * @param {Object} definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(definition_object, parent_info) {
    super(definition_object, parent_info)
    this.width_ = MarkConfigDefinitionObject.defaults.width
    if (Object.hasOwn(definition_object, "width")) {
      this.width_ = definition_object.width
    }
    this.height_ = MarkConfigDefinitionObject.defaults.height
    if (Object.hasOwn(definition_object, "height")) {
      this.height_ = definition_object.height
    }
    this.color_ = MarkConfigDefinitionObject.defaults.color
    if (Object.hasOwn(definition_object, "color")) {
      this.color_ = definition_object.color
    }
    this.fill_ = MarkConfigDefinitionObject.defaults.fill
    if (Object.hasOwn(definition_object, "fill")) {
      this.fill_ = definition_object.fill
    }
    this.stroke_ = MarkConfigDefinitionObject.defaults.stroke
    if (Object.hasOwn(definition_object, "stroke")) {
      this.stroke_ = definition_object.stroke
    }
    this.opacity_ = MarkConfigDefinitionObject.defaults.opacity
    if (Object.hasOwn(definition_object, "opacity")) {
      this.opacity_ = definition_object.opacity
    }
    this.fillOpacity_ = MarkConfigDefinitionObject.defaults.fillOpacity
    if (Object.hasOwn(definition_object, "fillOpacity")) {
      this.fillOpacity_ = definition_object.fillOpacity
    }
    this.strokeOpacity_ = MarkConfigDefinitionObject.defaults.strokeOpacity
    if (Object.hasOwn(definition_object, "strokeOpacity")) {
      this.strokeOpacity_ = definition_object.strokeOpacity
    }
    // TODO(croot): make stroke join an enum
    this.strokeJoin_ = MarkConfigDefinitionObject.defaults.strokeJoin
    if (Object.hasOwn(definition_object, "strokeJoin")) {
      this.strokeJoin_ = definition_object.strokeJoin
    }
    this.strokeMiterLimit_ = MarkConfigDefinitionObject.defaults.strokMiterLimit
    if (Object.hasOwn(definition_object, "strokMiterLimit")) {
      this.strokeMiterLimit_ = definition_object.strokMiterLimit
    }
    this.strokeWidth_ = MarkConfigDefinitionObject.defaults.strokeWidth
    if (Object.hasOwn(definition_object, "strokeWidth")) {
      this.strokeWidth_ = definition_object.strokeWidth
    }
  }

  get width() {
    return this.width_
  }

  get height() {
    return this.height_
  }

  get color() {
    return this.color_
  }

  get fill() {
    return this.fill_
  }

  get stroke() {
    return this.stroke_
  }

  get opacity() {
    return this.opacity_
  }

  get fillOpacity() {
    return this.fillOpacity_
  }

  get strokeOpacity() {
    return this.strokeOpacity_
  }

  get strokeJoin() {
    return this.strokeJoin_
  }

  get strokeMiterLimit() {
    return this.strokeMiterLimit_
  }

  get strokeWidth() {
    return this.strokeWidth_
  }
}

class WindBarkConfigDefinitionObject extends MarkConfigDefinitionObject {
  static key = "windbarb"

  static defaults = Object.assign(
    {
      size: 25
    },
    MarkConfigDefinitionObject.defaults
  )

  /**
   * @param {Object} definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(definition_object, parent_info) {
    super(definition_object, parent_info)

    this.size_ = 25
    if (Object.hasOwn(definition_object, "size")) {
      this.size_ = definition_object.size
    }

    this.quantizeDirection_ =
      WindBarkConfigDefinitionObject.defaults.quantizeDirection
    if (Object.hasOwn(definition_object, "quantizeDirection")) {
      this.quantizeDirection_ = definition_object.quantizeDirection
    }

    this.anchorScale_ = WindBarkConfigDefinitionObject.defaults.anchorScale
    if (Object.hasOwn(definition_object, "anchorScale")) {
      this.anchorScale_ = definition_object.anchorScale
    }
  }

  get size() {
    return this.size_
  }

  get quantizeDirection() {
    return this.quantizeDirection_
  }

  get anchorScale() {
    return this.anchorScale_
  }
}

class ConfigDefinitionObject extends PropertiesDefinitionInterface {
  /**
   * @param {Object} definition_object
   * @param {RasterLayerContext} root_context
   */
  constructor(definition_object, root_context) {
    super(definition_object, null, root_context)

    this.configs_ = new Map()

    const sub_config_classes = [
      MarkConfigDefinitionObject,
      WindBarkConfigDefinitionObject
    ]

    sub_config_classes.forEach((sub_config_class) => {
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

class SampleDefinitionObject extends PropertiesDefinitionInterface {
  static key = "sample"

  /**
   * @param {Object} definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(definition_object, parent_info) {
    super(definition_object, parent_info)
    assert(Object.hasOwn(definition_object, SampleDefinitionObject.key))

    /**
     * @type {number}
     */
    this.sample_ = 0
    if (typeof definition_object[SampleDefinitionObject.key] !== "number") {
      throw new Error(
        `Invalid sample transform definition. The '${SampleDefinitionObject.key}' property must be a number`
      )
    }
    this.sample_ = definition_object[SampleDefinitionObject.key]
    // TODO(croot): validate sample ranges?

    if (!Object.hasOwn(definition_object, "tableSize")) {
      throw new Error(
        `A 'tableSize' property is required for sample transforms`
      )
    }

    if (typeof definition_object.tableSize !== "number") {
      throw new Error(
        `Invalid sample transform definition. The 'tableSize' property must be a number`
      )
    }
    this.table_size_ = definition_object.tableSize
    // TODO(croot): validate tableSize?
  }

  /**
   * @type {number}
   */
  get sample_size() {
    return this.sample_
  }

  /**
   * @type {number}
   */
  get table_size() {
    return this.table_size_
  }

  /**
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materialize(vega_property_output_state) {
    const layer_name = this.root_context.layer_name
    const table_size = this.root_context.last_filtered_size || this.table_size_
    vega_property_output_state.addSqlParserTransform(
      `${layer_name}_${SampleDefinitionObject.key}`,
      {
        type: "sample",
        method: "multiplicative",
        size: table_size,
        limit: this.sample_,
        sampleTable: this.root_context.table_name
      }
    )
  }
}

class LimitDefinitionObject extends PropertiesDefinitionInterface {
  static key = "limit"

  /**
   * @param {Object} definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(definition_object, parent_info) {
    super(definition_object, parent_info)
    assert(Object.hasOwn(definition_object, LimitDefinitionObject.key))

    /**
     * @type {number}
     */
    this.limit_ = 0
    if (typeof definition_object[LimitDefinitionObject.key] !== "number") {
      throw new Error(
        `Invalid limit transform definition. The '${LimitDefinitionObject.key}' property must be a number`
      )
    }
    this.limit_ = definition_object[LimitDefinitionObject.key]
    // TODO(croot): validate limit ranges?

    /**
     * @type {number}
     */
    this.offset_ = 0
    if (Object.hasOwn(definition_object, "offset")) {
      if (typeof definition_object.offset !== "number") {
        throw new Error(
          `Invalid limit transform definition. The 'offset' property must be a number`
        )
      }
      this.offset_ = definition_object.offset
      // TODO(croot): validate tableSize?
    }
  }

  /**
   * @type {number}
   */
  get limit() {
    return this.limit_
  }

  /**
   * @type {number}
   */
  get offset() {
    return this.offset_
  }

  /**
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materialize(vega_property_output_state) {
    const layer_name = this.root_context.layer_name
    const transform_obj = {
      type: "limit",
      row: this.limit_
    }
    if (this.offset_) {
      transform_obj.offset = this.offset_
    }
    vega_property_output_state.addSqlParserTransform(
      `${layer_name}_${LimitDefinitionObject.key}`,
      transform_obj
    )
  }
}

class TransformDefinitionObject extends PropertiesDefinitionInterface {
  /**
   * @param {Object} definition_object
   * @param {RasterLayerContext} root_context
   */
  constructor(definition_object, root_context) {
    super(definition_object, null, root_context)

    if (!Array.isArray(definition_object)) {
      throw new Error(
        `Invalid transform definition. It must be an array of objects`
      )
    }

    /**
     * @type {PropertiesDefinitionInterface[]}
     */
    this.transforms_ = []
    definition_object.forEach((xform_definition, index) => {
      if (typeof xform_definition !== "object") {
        throw new Error(
          `Invalid transform definition at index ${index}. It must be an object but is of type ${typeof xform_definition}`
        )
      }
      if (Object.hasOwn(xform_definition, SampleDefinitionObject.key)) {
        this.transforms_.push(
          new SampleDefinitionObject(xform_definition, {
            parent: this,
            prop_name: `${index}/${SampleDefinitionObject.key}`
          })
        )
      } else if (Object.hasOwn(xform_definition, LimitDefinitionObject.key)) {
        this.transforms_.push(
          new LimitDefinitionObject(xform_definition, {
            parent: this,
            prop_name: `${index}/${LimitDefinitionObject.key}`
          })
        )
      } else {
        throw new Error(
          `Invalid transform object ${JSON.stringify(
            xform_definition
          )} at index ${index}`
        )
      }
    })
  }

  /**
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materialize(vega_property_output_state) {
    this.transforms_.forEach((transform) => {
      transform.materialize(vega_property_output_state)
    })
  }
}

class MarkDefinitionObject extends PropertiesDefinitionInterface {
  /**
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materializeProperty(prop_descriptor, vega_property_output_state) {
    assert(this.hasProperty(prop_descriptor.prop_name))
    const prop_definition = this.definition_object_[prop_descriptor.prop_name]
    if (prop_descriptor.isValidMarkDefinition(prop_definition)) {
      const vega_mark_property_object = {}
      const materialized_vega_object =
        prop_descriptor.materializeMarkDefinitionForVega(prop_definition)
      prop_descriptor.vega_mark_prop_names.forEach((vega_mark_prop_name) => {
        vega_mark_property_object[vega_mark_prop_name] =
          materialized_vega_object
      })
      vega_property_output_state.addMarkProperty(
        prop_descriptor.prop_name,
        vega_mark_property_object
      )
    }
  }
}

class MeasurementType {
  static val_to_enum_map_ = {}

  static kQuantitative = new MeasurementType("quantitative")
  static kTemporal = new MeasurementType("temporal")
  static kOrdinal = new MeasurementType("ordinal")
  static kNominal = new MeasurementType("nominal")

  /**
   *
   * @param {string} measurement_type
   */
  static getMeasurementTypeFromString(measurement_type) {
    const rtn_obj =
      MeasurementType.val_to_enum_map_[measurement_type.toLowerCase()]
    if (typeof rtn_obj === "undefined") {
      throw new Error(
        `Invalid measurement type string '${measurement_type}'. It must be one of ${Object.keys(
          MeasurementType.val_to_enum_map_
        )}`
      )
    }
    return rtn_obj
  }

  constructor(value) {
    this.value = value
    MeasurementType.val_to_enum_map_[this.value] = this
  }

  valueOf() {
    return this.value
  }

  toString() {
    return this.value
  }
}

class ValueDefinitionObject extends PropertiesDefinitionInterface {
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
    prop_descriptor.vega_mark_prop_names.forEach((vega_mark_prop_name) => {
      vega_mark_property_object[vega_mark_prop_name] = context.value
    })
    vega_property_output_state.addMarkProperty(
      prop_descriptor.prop_name,
      vega_mark_property_object
    )
  }
}

class LegendDefinitionObject extends PropertiesDefinitionInterface {
  /**
   * @param {Object} legend_definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(legend_definition_object, parent_info) {
    super(legend_definition_object, parent_info, null)

    // NOTE: currently the legend definition only contains the title/open/locked properties, which are custom
    // properties to drive the legend in the 'legendables' package
    // Only the 'title' property aligns with vega-lite

    const {
      title = "Legend",
      open = true,
      locked = false
    } = legend_definition_object

    if (typeof title !== "string") {
      throw new TypeError(`Invalid 'title' property for legend definition`)
    }

    this.title_ = title

    if (typeof open !== "boolean") {
      throw new TypeError(`Invalid 'open' poperty for legend definition`)
    }
    this.open_ = open

    if (typeof locked !== "boolean") {
      throw new TypeError(`Inavlid 'locked' property for legend definition`)
    }
    this.locked_ = locked
  }

  /**
   * @type {string}
   */
  get title() {
    return this.title_
  }

  /**
   * @type {boolean}
   */
  get open() {
    return this.open_
  }

  /**
   * @type {boolean}
   */
  get locked() {
    return this.locked_
  }

  /**
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materializeProperty(prop_descriptor, vega_property_output_state) {
    vega_property_output_state.addLegendForProperty(prop_descriptor.prop_name, {
      title: this.title_,
      open: this.open_,
      locked: this.locked_
    })
  }
}

class ScaleType {
  /**
   * @private
   */
  static val_to_enum_map_ = {}

  static kLinear = new ScaleType("linear")
  static kPow = new ScaleType("pow")
  static kSqrt = new ScaleType("sqrt")
  static kLog = new ScaleType("log")
  static kOrdinal = new ScaleType("ordinal")
  static kQuantize = new ScaleType("quantize")
  static kThreshold = new ScaleType("threshold")

  /**
   * @private
   */
  static kInternalPassthru_ = new ScaleType("internal-passthru")

  /**
   * @param {string} scale_type
   */
  static getScaleTypeFromString(scale_type) {
    const rtn_obj = ScaleType.val_to_enum_map_[scale_type.toLowerCase()]
    if (typeof rtn_obj === "undefined") {
      throw new Error(
        `Invalid scale type '${scale_type}'. It must be one of ${Object.keys(
          ScaleType.val_to_enum_map_
        )}`
      )
    }
    return rtn_obj
  }

  constructor(value) {
    this.value = value
    ScaleType.val_to_enum_map_[this.value] = this
  }

  valueOf() {
    return this.value
  }

  toString() {
    return this.value
  }
}

class AccumulatorType {
  /**
   * @private
   */
  static val_to_enum_map_ = {}

  static kMin = new AccumulatorType("min")
  static kMax = new AccumulatorType("max")
  static kDensity = new AccumulatorType("density")
  static kBlend = new AccumulatorType("blend")
  static kPct = new AccumulatorType("pct")

  /**
   * @param {string} accumulator_type
   */
  static getAccumulatorTypeFromString(accumulator_type) {
    const rtn_obj =
      AccumulatorType.val_to_enum_map_[accumulator_type.toLowerCase()]
    if (typeof rtn_obj === "undefined") {
      throw new Error(
        `Invalid accumulator type '${accumulator_type}'. It must be one of ${Object.keys(
          AccumulatorType.val_to_enum_map_
        )}`
      )
    }
    return rtn_obj
  }

  constructor(value) {
    this.value = value
    AccumulatorType.val_to_enum_map_[this.value] = this
  }

  valueOf() {
    return this.value
  }

  toString() {
    return this.value
  }
}

class ScaleDefinitionObject extends PropertiesDefinitionInterface {
  /**
   *
   * @param {Object} scale_definition_object
   * @param {ParentInfo} parent_info
   * @param {Function} get_default_scale_name_callback
   * @param {Function} get_default_scale_type_callback
   * @param {Function} validate_scale_type_callback
   * @returns {ScaleDefinitionObject}
   */
  static constructScaleFromDefinition(
    scale_definition_object,
    parent_info,
    get_default_scale_name_callback,
    get_default_scale_type_callback,
    validate_scale_type_callback
  ) {
    let scale_type = ScaleType.kLinear

    if (Object.hasOwn(scale_definition_object, "type")) {
      if (typeof scale_definition_object.type !== "string") {
        throw new Error(
          "The 'type' property of a scale definition must be a string."
        )
      }

      scale_type = ScaleType.getScaleTypeFromString(
        scale_definition_object.type
      )
    } else {
      assert(get_default_scale_type_callback)
      scale_type = get_default_scale_type_callback()
    }

    validate_scale_type_callback(scale_type)

    const { name = get_default_scale_name_callback() } = scale_definition_object
    scale_definition_object.name = name

    /* eslint-disable no-use-before-define */
    switch (scale_type) {
      case ScaleType.kLinear:
        return new LinearScale(scale_definition_object, parent_info)
      case ScaleType.kPow:
        return new PowScale(scale_definition_object, parent_info)
      case ScaleType.kSqrt:
        return new SqrtScale(scale_definition_object, parent_info)
      case ScaleType.kLog:
        return new LogScale(scale_definition_object, parent_info)
      case ScaleType.kOrdinal:
        return new OrdinalScale(scale_definition_object, parent_info)
      case ScaleType.kQuantize:
        return new QuantizeScale(scale_definition_object, parent_info)
      case ScaleType.kThreshold:
        return new ThresholdScale(scale_definition_object, parent_info)
      case ScaleType.kInternalPassthru_:
        return new InternalPassthruScale(scale_definition_object, parent_info)
      default:
        assert(false, `unhandled scale type ${scale_type}`)
    }
    /* eslint-enable no-use-before-define */
    return null
  }

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
  _materializeExtraVegaScaleProps(prop_descriptor, vega_scale_obj) {}
}

class InterpolateType {
  /**
   * @private
   */
  static val_to_enum_map_ = {}

  static kRgb = new InterpolateType("rgb")
  static kHsl = new InterpolateType("hsl")
  static kHslLong = new InterpolateType("hsl-long")
  static kLab = new InterpolateType("lab")
  static kHcl = new InterpolateType("hcl")
  static kHclLong = new InterpolateType("hcl-long")
  static kAuto = new InterpolateType("auto")

  /**
   * @param {string} interpolate_type
   */
  static getInterpolateTypeFromString(interpolate_type) {
    const rtn_obj =
      InterpolateType.val_to_enum_map_[interpolate_type.toLowerCase()]
    if (typeof rtn_obj === "undefined") {
      throw new Error(
        `Invalid interpolate type '${interpolate_type}'. It must be one of ${Object.keys(
          InterpolateType.val_to_enum_map_
        )}`
      )
    }
    return rtn_obj
  }

  constructor(value) {
    this.value = value
    InterpolateType.val_to_enum_map_[this.value] = this
  }

  valueOf() {
    return this.value
  }

  toString() {
    return this.value
  }
}

class ExtentFlags {
  /**
   * @private
   * @type {Map}
   */
  static val_to_enum_map_ = new Map()
  static sigma_to_enum_map_ = new Map()

  static kOneSigma = new ExtentFlags(1 << 0, "onesigma", "stddev", 1)
  static kTwoSigma = new ExtentFlags(1 << 1, "twosigma", "stddev", 2)
  static kThreeSigma = new ExtentFlags(1 << 2, "threesigma", "stddev", 3)
  static kFourSigma = new ExtentFlags(1 << 3, "foursigma", "stddev", 4)
  static kFiveSigma = new ExtentFlags(1 << 4, "fivesigma", "stddev", 5)
  static kSixSigma = new ExtentFlags(1 << 5, "sixsigma", "stddev", 6)
  // min/mean/max are supposed to be last
  static kMin = new ExtentFlags(1 << 6, "min")
  static kMean = new ExtentFlags(1 << 7, "mean", "avg", 0)
  static kMax = new ExtentFlags(1 << 8, "max")

  /**
   *
   * @param {ExtentFlags} extent_flag
   */
  static opposite(extent_flag) {
    switch (extent_flag) {
      case ExtentFlags.kMin:
        return ExtentFlags.kMax
      case ExtentFlags.kMax:
        return ExtentFlags.kMin
      default:
        assert(false, `${extent_flag.value}`)
    }
    return ExtentFlags.kMin
  }

  /**
   * @param {string} field_output
   * @param {string} layer_name
   * @param {string} prop_name
   * @param {ExtentFlags} extent_flags
   */
  static buildVegaTransformFromExtentFlags(
    field_output,
    layer_name,
    prop_name,
    extent_flags,
    handle_insert_callback = null,
    handle_iteration_complete_callback = null
  ) {
    const vega_xform_build_state = {
      aggregate_xform_obj: {
        type: "aggregate",
        fields: [],
        ops: [],
        as: [],

        // eslint-disable-next-line object-shorthand
        push: function (op) {
          const index = this.ops.indexOf(op)
          if (index >= 0) {
            return this.as[index]
          }

          this.fields.push(field_output)
          this.ops.push(op)
          this.as.push(`${field_output}_${op}`)
          return this.as[this.as.length - 1]
        }
      },
      formula_xform_objs: [],
      vega_xform_outputs: []
    }

    const { aggregate_xform_obj, formula_xform_objs, vega_xform_outputs } =
      vega_xform_build_state

    for (const extent_flag of ExtentFlags.val_to_enum_map_.values()) {
      if (extent_flags & extent_flag) {
        const output = aggregate_xform_obj.push(extent_flag.op_name)
        let added_formulas = []
        if (
          extent_flag >= ExtentFlags.kOneSigma &&
          extent_flag <= ExtentFlags.kSixSigma
        ) {
          const avg_output = aggregate_xform_obj.push(ExtentFlags.kMean.op_name)

          formula_xform_objs.push({
            type: "formula",
            expr: `${avg_output} - ${extent_flag.sigma_factor}*${output}`,
            as: `${field_output}_${extent_flag.extent_name}_below`
          })

          formula_xform_objs.push({
            type: "formula",
            expr: `${avg_output} + ${extent_flag.sigma_factor}*${output}`,
            as: `${field_output}_${extent_flag.extent_name}_above`
          })

          added_formulas = formula_xform_objs.slice(-2)
        }

        if (handle_insert_callback) {
          handle_insert_callback(
            extent_flag,
            output,
            added_formulas,
            vega_xform_build_state
          )
        }
      }
    }

    if (handle_iteration_complete_callback) {
      handle_iteration_complete_callback(vega_xform_build_state)
    }

    const vega_xform_obj = {
      name: `${layer_name}_${prop_name}_xform`,
      source: layer_name,
      transform: [aggregate_xform_obj, ...formula_xform_objs]
    }

    assert(vega_xform_outputs.length > 0)
    const scale_domain_ref = {
      data: vega_xform_obj.name
    }
    if (vega_xform_outputs.length === 1) {
      scale_domain_ref.field = vega_xform_outputs[0]
    } else {
      scale_domain_ref.fields = vega_xform_outputs
    }

    return { vega_xform_obj, scale_domain_ref }
  }

  constructor(value, extent_name, xform_op_name = null, sigma_factor = null) {
    this.value_ = value
    this.extent_name_ = extent_name
    this.xform_op_name_ = xform_op_name || this.extent_name
    this.sigma_factor_ = sigma_factor

    ExtentFlags.val_to_enum_map_.set(this.extent_name, this)
    if (sigma_factor !== null) {
      ExtentFlags.sigma_to_enum_map_.set(sigma_factor, this)
    }
  }

  get value() {
    return this.value_
  }

  get extent_name() {
    return this.extent_name_
  }

  get op_name() {
    return this.xform_op_name_
  }

  get sigma_factor() {
    return this.sigma_factor_
  }

  valueOf() {
    return this.value
  }

  toString() {
    return this.extent_name
  }
}

class ContinuousScale extends ScaleDefinitionObject {
  /**
   *
   * @param {ScaleType} scale_type
   * @returns {boolean}
   */
  static isContinuousScale(scale_type) {
    return (
      scale_type === ScaleType.kLinear ||
      scale_type === ScaleType.kLog ||
      scale_type === ScaleType.kSqrt ||
      scale_type === ScaleType.kPow
    )
  }

  /**
   * @param {ScaleType} scale_type
   * @param {MeasurementType} measurement_type
   * @returns {boolean}
   */
  static validateScaleMeasurement(scale_type, measurement_type) {
    assert(ContinuousScale.isContinuousScale(scale_type))
    if (measurement_type !== MeasurementType.kQuantitative) {
      throw new Error(
        `Continuous scales can only be used with continuous '${MeasurementType.kQuantitative}' field type encodings`
      )
    }
  }

  /**
   * @param {Object} scale_definition_object
   * @param {ScaleType} scale_type
   * @param {ParentInfo} parent_info
   */
  constructor(scale_definition_object, scale_type, parent_info) {
    assert(
      ContinuousScale.isContinuousScale(scale_type),
      `Invalid ${ContinuousScale.name} scale type ${scale_type}`
    )
    super(scale_definition_object, scale_type, parent_info)

    this.clamp_ = true
    if (Object.hasOwn(scale_definition_object, "clamp")) {
      if (typeof scale_definition_object.clamp !== "boolean") {
        this.error_message = `Invalid 'clamp' property. The 'clamp' property must be a boolean for continuous scales`
        return
      }
      this.clamp_ = scale_definition_object.clamp
    }

    this.interpolate_type_ = InterpolateType.kAuto
    if (Object.hasOwn(scale_definition_object, "interpolate")) {
      if (typeof scale_definition_object.interpolate !== "string") {
        this.error_message = `Invalid ${
          scale_definition_object.interpolate
        } value for the 'interpolate' property of a continuous scale. It must be a string and must be one of ${Object.keys(
          InterpolateType.val_to_enum_map_
        )}`
      }
      this.interpolate_type_ = InterpolateType.getInterpolateTypeFromString(
        scale_definition_object.interpolate
      )
    }
  }

  /**
   * @param {string} field_output
   * @param {string} layer_name
   * @param {string} prop_name
   * @param {ExtentFlags} extent_flags
   */
  static buildExtentsVegaTransform(
    field_output,
    layer_name,
    prop_name,
    extent_flags
  ) {
    return ExtentFlags.buildVegaTransformFromExtentFlags(
      field_output,
      layer_name,
      prop_name,
      extent_flags,
      (
        extent_flag,
        agg_xform_output,
        formula_xform_outputs,
        { formula_xform_objs, vega_xform_outputs }
      ) => {
        if (
          extent_flag === ExtentFlags.kMin ||
          extent_flag === ExtentFlags.kMax
        ) {
          // these need to be processed after the sigmas/stddevs, so they should be last, or at least
          // after them in the map.
          if (formula_xform_objs.length === 0) {
            vega_xform_outputs.push(agg_xform_output)
          } else {
            formula_xform_objs.push({
              type: "formula",
              expr: `${
                ExtentFlags.opposite(extent_flag).op_name
              }(${agg_xform_output}, ${
                formula_xform_objs[formula_xform_objs.length - 2].as
              })`,
              as: `${field_output}_extents_${extent_flag.extent_name}`
            })
          }
        } else if (
          formula_xform_objs.length === 0 &&
          (extent_flag < ExtentFlags.kOneSigma ||
            extent_flag > ExtentFlags.kSixSigma)
        ) {
          vega_xform_outputs.push(agg_xform_output)
        }
      },
      ({ formula_xform_objs, vega_xform_outputs }) => {
        if (vega_xform_outputs.length === 0) {
          assert(formula_xform_objs.length >= 2)
          vega_xform_outputs.push(
            formula_xform_objs[formula_xform_objs.length - 2].as,
            formula_xform_objs[formula_xform_objs.length - 1].as
          )
        }
        assert(vega_xform_outputs.length >= 2)
      }
    )
  }

  /**
   * @param {string} domain_keyword
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  _materializeDomainFromKeyword(
    domain_keyword,
    prop_descriptor,
    vega_property_output_state
  ) {
    if (this.domain_ === "auto") {
      /**
       * @type {FieldDefinitionObject}
       */
      const parent = this.parent
      assert(parent instanceof FieldDefinitionObject)

      const { vega_xform_obj, scale_domain_ref } =
        ContinuousScale.buildExtentsVegaTransform(
          parent.output,
          this.root_context.layer_name,
          prop_descriptor.prop_name,
          // should equate to: [max(min, avg - 2*stddev), min(max, avg + 2*stddev)]
          ExtentFlags.kMin | ExtentFlags.kMax | ExtentFlags.kTwoSigma
        )

      vega_property_output_state.addVegaTransform(
        prop_descriptor.prop_name,
        vega_xform_obj
      )

      return scale_domain_ref
    } else if (this.domain_ === AccumulatorType.kDensity.toString()) {
      this.accumulator_ = AccumulatorType.kDensity
      // NOTE: going to the domain out later in _materializeExtraVegaScaleProps
      // after the ranges have been materialized/validated
      return []
    }
    throw new Error(
      `'${domain_keyword}' is not a valid domain keyword for continuous scale type ${this.type}`
    )
  }

  /**
   * @param {string} range_keyword
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  _materializeRangeFromKeyword(
    range_keyword,
    prop_descriptor,
    vega_property_output_state
  ) {
    throw new Error(
      `'${range_keyword}' is not a valid range keyword for continuous scale type ${this.type}`
    )
  }

  /**
   *
   * @param {PropDescriptor} prop_descriptor
   * @param {Object} vega_scale_object
   */
  _materializeExtraVegaScaleProps(prop_descriptor, vega_scale_object) {
    vega_scale_object.clamp = this.clamp_
    if (
      this.interpolate_type_ !== InterpolateType.kAuto &&
      prop_descriptor instanceof ColorChannelDescriptor
    ) {
      vega_scale_object.interpolator = `${this.interpolate_type_}`
    }

    if (this.accumulator_ !== null) {
      assert(this.accumulator_ === AccumulatorType.kDensity)
      assert(Array.isArray(vega_scale_object.domain))
      assert(vega_scale_object.domain.length === 0)

      if (!(prop_descriptor instanceof ColorChannelDescriptor)) {
        throw new Error(
          `Density accumulation scales can only be applied to color properties`
        )
      }

      assert(Array.isArray(vega_scale_object.range))
      assert(vega_scale_object.range.length > 1)

      const density_diff = 1.0 / (vega_scale_object.range.length - 1)
      for (
        let density_val = 0.0;
        density_val <= 1.0;
        density_val += density_diff
      ) {
        vega_scale_object.domain.push(density_val)
      }

      vega_scale_object.accumulator = this.accumulator_.toString()
      vega_scale_object.minDensityCnt = "-2ndStdDev"
      vega_scale_object.maxDensityCnt = "2ndStdDev"

      // density accumulation will force on clamp
      // TODO(croot): is this too heavy handed?
      vega_scale_object.clamp = true
    }
  }
}

class LinearScale extends ContinuousScale {
  /**
   * @param {Object} scale_definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(scale_definition_object, parent_info) {
    super(scale_definition_object, ScaleType.kLinear, parent_info)
  }
}

class PowScale extends ContinuousScale {
  /**
   *
   * @param {Object} scale_definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(scale_definition_object, parent_info) {
    super(scale_definition_object, ScaleType.kPow, parent_info)

    this.exponent_ = 1
    if (Object.hasOwn(scale_definition_object, "exponent")) {
      if (typeof scale_definition_object.exponent !== "number") {
        this.error_message = `Invalid ${scale_definition_object.exponent} value for the 'exponent' property of a pow scale. It must be a number`
      }
      this.exponent_ = scale_definition_object.exponent
    }
  }

  /**
   *
   * @param {PropDescriptor} prop_descriptor
   * @param {Object} vega_scale_object
   */
  _materializeExtraVegaScaleProps(prop_descriptor, vega_scale_object) {
    super._materializeExtraVegaScaleProps(prop_descriptor, vega_scale_object)
    vega_scale_object.exponent = this.exponent_
  }
}

class SqrtScale extends ContinuousScale {
  /**
   *
   * @param {Object} scale_definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(scale_definition_object, parent_info) {
    super(scale_definition_object, ScaleType.kSqrt, parent_info)
  }
}

class LogScale extends ContinuousScale {
  /**
   *
   * @param {Object} scale_definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(scale_definition_object, parent_info) {
    super(scale_definition_object, ScaleType.kLog, parent_info)
  }
}

class DiscreteScale extends ScaleDefinitionObject {
  /**
   *
   * @param {ScaleType} scale_type
   * @returns {boolean}
   */
  static isDiscreteScale(scale_type) {
    return scale_type === ScaleType.kOrdinal
  }

  /**
   * @param {ScaleType} scale_type
   * @param {MeasurementType} measurement_type
   * @returns {boolean}
   */
  static validateScaleMeasurement(scale_type, measurement_type) {
    assert(DiscreteScale.isDiscreteScale(scale_type))
    if (
      measurement_type !== MeasurementType.kNominal &&
      measurement_type !== MeasurementType.kOrdinal
    ) {
      throw new Error(
        `Discrete scales can only be used with discrete ('${MeasurementType.kNominal}' or '${MeasurementType.kOrdinal}') field type encodings`
      )
    }
  }

  /**
   * @param {Object} scale_definition_object
   * @param {ScaleType} scale_type
   * @param {ParentInfo} parent_info
   */
  constructor(scale_definition_object, scale_type, parent_info) {
    assert(
      DiscreteScale.isDiscreteScale(scale_type),
      `Invalid ${DiscreteScale.name} scale type ${scale_type}`
    )
    super(scale_definition_object, scale_type, parent_info)

    this.default_value_ = null
    if (Object.hasOwn(scale_definition_object, "default")) {
      this.default_value_ = scale_definition_object.default
    } else if (Object.hasOwn(scale_definition_object, "unknown")) {
      // NOTE: the "unknown" property a property defined by d3 ordinal scales:
      // https://github.com/d3/d3-scale#ordinal_unknown
      // but it is not documented by vega or vega-lite's ordinal scales.
      // Exposing it to further align with d3 props
      this.default_value_ = scale_definition_object.unknown
    }
  }

  /**
   * @param {string} field_output
   * @param {string} layer_name
   * @param {string} prop_name
   */
  static buildDistinctVegaTransform(field_output, layer_name, prop_name) {
    const vega_xform_obj = {
      name: `${layer_name}_${prop_name}_xform`,
      source: layer_name,
      transform: [
        {
          type: "aggregate",
          fields: [field_output],
          ops: ["distinct"],
          as: [`${field_output}_distinct`]
        }
      ]
    }

    const scale_domain_ref = {
      data: vega_xform_obj.name,
      field: vega_xform_obj.transform[0].as[0]
    }

    return { vega_xform_obj, scale_domain_ref }
  }

  /**
   * @param {string} domain_keyword
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  _materializeDomainFromKeyword(
    domain_keyword,
    prop_descriptor,
    vega_property_output_state
  ) {
    if (this.domain_ === "auto") {
      /**
       * @type {FieldDefinitionObject}
       */
      const parent = this.parent
      assert(parent instanceof FieldDefinitionObject)

      const { vega_xform_obj, scale_domain_ref } =
        DiscreteScale.buildDistinctVegaTransform(
          parent.output,
          this.root_context.layer_name,
          prop_descriptor.prop_name
        )

      vega_property_output_state.addVegaTransform(
        prop_descriptor.prop_name,
        vega_xform_obj
      )

      return scale_domain_ref
    }

    throw new Error(
      `'${domain_keyword}' is not a valid domain keyword for discrete scale type ${this.type}`
    )
  }

  /**
   * @param {string} range_keyword
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  _materializeRangeFromKeyword(
    range_keyword,
    prop_descriptor,
    vega_property_output_state
  ) {
    throw new Error(
      `'${range_keyword}' is not a valid range keyword for discrete scale type ${this.type}`
    )
  }

  /**
   * @param {PropDescriptor} prop_descriptor
   * @param {Object} vega_scale_obj
   */
  _materializeExtraVegaScaleProps(prop_descriptor, vega_scale_obj) {
    super._materializeExtraVegaScaleProps(prop_descriptor, vega_scale_obj)
    if (this.default_value_ !== null) {
      // TODO(croot): should we validate the default value?
      vega_scale_obj.default = this.default_value_
    }
  }
}

class OrdinalScale extends DiscreteScale {
  /**
   *
   * @param {Object} scale_definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(scale_definition_object, parent_info) {
    super(scale_definition_object, ScaleType.kOrdinal, parent_info)
  }
}

class DiscretizingScale extends ScaleDefinitionObject {
  /**
   *
   * @param {ScaleType} scale_type
   * @returns {boolean}
   */
  static isDescretizingScale(scale_type) {
    return (
      scale_type === ScaleType.kQuantize || scale_type === ScaleType.kThreshold
    )
  }

  /**
   * @param {ScaleType} scale_type
   * @param {MeasurementType} measurement_type
   * @returns {boolean}
   */
  static validateScaleMeasurement(scale_type, measurement_type) {
    assert(DiscretizingScale.isDescretizingScale(scale_type))
    if (measurement_type !== MeasurementType.kQuantitative) {
      throw new Error(
        `Discretizing scales can only be used with '${MeasurementType.kQuantitative}' field type encodings`
      )
    }
  }

  /**
   * @param {Object} scale_definition_object
   * @param {ScaleType} scale_type
   * @param {ParentInfo} parent_info
   */
  constructor(scale_definition_object, scale_type, parent_info) {
    assert(
      DiscretizingScale.isDescretizingScale(scale_type),
      `Invalid ${DiscretizingScale.name} scale type ${scale_type}`
    )
    super(scale_definition_object, scale_type, parent_info)
  }

  /**
   * @param {string} domain_keyword
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  _materializeDomainFromKeyword(
    domain_keyword,
    prop_descriptor,
    vega_property_output_state
  ) {
    if (this.domain_ === "auto") {
      /**
       * @type {FieldDefinitionObject}
       */
      const parent = this.parent
      assert(parent instanceof FieldDefinitionObject)

      const { vega_xform_obj, scale_domain_ref } =
        ContinuousScale.buildExtentsVegaTransform(
          parent.output,
          this.root_context.layer_name,
          prop_descriptor.prop_name,
          // should equate to: [max(min, avg - 2*stddev), min(max, avg + 2*stddev)]
          ExtentFlags.kMin | ExtentFlags.kMax | ExtentFlags.kTwoSigma
        )

      vega_property_output_state.addVegaTransform(
        prop_descriptor.prop_name,
        vega_xform_obj
      )

      return scale_domain_ref
    }
    throw new Error(
      `'${domain_keyword}' is not a valid domain keyword for discretizing scale type ${this.type}`
    )
  }

  /**
   * @param {string} range_keyword
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  _materializeRangeFromKeyword(
    range_keyword,
    prop_descriptor,
    vega_property_output_state
  ) {
    throw new Error(
      `'${range_keyword}' is not a valid range keyword for discretizing scale type ${this.type}`
    )
  }

  /**
   *
   * @param {PropDescriptor} prop_descriptor
   * @param {Object} vega_scale_object
   */
  _materializeExtraVegaScaleProps(prop_descriptor, vega_scale_object) {}
}

class QuantizeScale extends DiscretizingScale {
  /**
   *
   * @param {Object} scale_definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(scale_definition_object, parent_info) {
    super(scale_definition_object, ScaleType.kQuantize, parent_info)
  }
}

class ThresholdScale extends DiscretizingScale {
  /**
   *
   * @param {Object} scale_definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(scale_definition_object, parent_info) {
    super(scale_definition_object, ScaleType.kThreshold, parent_info)
  }

  /**
   * @param {string} domain_keyword
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  _materializeDomainFromKeyword(
    domain_keyword,
    prop_descriptor,
    vega_property_output_state
  ) {
    if (this.domain_ === "auto") {
      assert(Array.isArray(this.range_))
      assert(this.range_.length > 1)
      /**
       * @type {FieldDefinitionObject}
       */
      const parent = this.parent
      assert(parent instanceof FieldDefinitionObject)

      // Automatically fills out threshold domain based on the number of ranges
      // supplied. The domain is filled out using various sigma intervals (std-deviations
      // from the mean). For example, if 6 ranges are provided, the domain would
      // be [-2stddev, -1stddev, mean, +1stddev, +2stddev]
      //
      // if 7 ranges are provided, the domain would be:
      // [-3stddev, -2stddev, -1stddev, +1stddev, +2stddev, +3stddev]

      /**
       * @type {ExtentFlags}
       */
      let extent_flags = 0

      let sigma_step = Math.floor((this.range_.length + 1) / 2) - 1
      let curr_sigma = ExtentFlags.sigma_to_enum_map_.get(sigma_step)
      if (!curr_sigma) {
        throw new Error(
          `Cannot automatically deduce a threshold domain for ${
            this.range_.length
          } range values. Automatic deduction can only succeed with a max of ${
            (Array.from(ExtentFlags.sigma_to_enum_map_.keys()).pop() + 1) * 2
          } range values`
        )
      }
      while (
        curr_sigma &&
        curr_sigma.sigma_factor >= ExtentFlags.kOneSigma.sigma_factor
      ) {
        assert(curr_sigma)
        extent_flags |= curr_sigma
        sigma_step -= 1
        curr_sigma = ExtentFlags.sigma_to_enum_map_.get(sigma_step)
      }

      if (this.range_.length % 2 === 0) {
        // even number of range values, add the mean
        extent_flags |= ExtentFlags.kMean
      }

      const { vega_xform_obj, scale_domain_ref } =
        ExtentFlags.buildVegaTransformFromExtentFlags(
          parent.output,
          this.root_context.layer_name,
          prop_descriptor.prop_name,
          extent_flags,
          (
            extent_flag,
            agg_xform_output,
            formula_xform_outputs,
            { vega_xform_outputs }
          ) => {
            if (
              extent_flag >= ExtentFlags.kOneSigma &&
              extent_flag <= ExtentFlags.kSixSigma
            ) {
              assert(formula_xform_outputs.length === 2)
              vega_xform_outputs.unshift(formula_xform_outputs[0].as)
              vega_xform_outputs.push(formula_xform_outputs[1].as)
            } else if (extent_flag === ExtentFlags.kMin) {
              vega_xform_outputs.unshift(agg_xform_output)
            } else if (extent_flag === ExtentFlags.kMax) {
              vega_xform_outputs.push(agg_xform_output)
            } else if (extent_flag === ExtentFlags.kMean) {
              vega_xform_outputs.splice(
                Math.floor(vega_xform_outputs.length / 2),
                0,
                agg_xform_output
              )
            } else {
              assert(
                false,
                `Unsupported extent flag ${extent_flag.extent_name}`
              )
            }
          }
        )

      ContinuousScale.buildExtentsVegaTransform(
        parent.output,
        this.root_context.layer_name,
        prop_descriptor.prop_name,
        // should equate to: [max(min, avg - 2*stddev), min(max, avg + 2*stddev)]
        ExtentFlags.kMin | ExtentFlags.kMax | ExtentFlags.kTwoSigma
      )

      vega_property_output_state.addVegaTransform(
        prop_descriptor.prop_name,
        vega_xform_obj
      )

      return scale_domain_ref
    }
    throw new Error(
      `'${domain_keyword}' is not a valid domain keyword for discretizing scale type ${this.type}`
    )
  }
}

class InternalPassthruScale extends ScaleDefinitionObject {
  /**
   *
   * @param {Object} passthru_definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(passthru_definition_object, parent_info) {
    super(passthru_definition_object, ScaleType.kInternalPassthru, parent_info)
  }

  /**
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materializeProperty(prop_descriptor, vega_property_output_state) {
    // no-op, just passes thru. It does not build any new scales.
    // Generally this is used in the event that the scale is built out
    // by some other means, but we still need to build out the:
    //
    // {
    //   "scale": ...,
    //   "field": ...
    // }
    //
    // struct
  }
}

class FieldDefinitionObject extends PropertiesDefinitionInterface {
  /**
   * @param {Object} field_definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(field_definition_object, parent_info) {
    super(field_definition_object, parent_info)
    assert(Object.hasOwn(field_definition_object, "field"))
    if (typeof field_definition_object.field !== "string") {
      this.error_message = `The 'field' property in a field definition must by a string`
      return
    }
    /**
     * @type {string}
     */
    this.field_ = field_definition_object.field
    this.output_ = null

    /**
     * @type {MeasurementType}
     */
    this.measurement_type_ = null
    if (Object.hasOwn(field_definition_object, "type")) {
      if (typeof field_definition_object.type !== "string") {
        this.error_message = `The 'type' property in a field definition must be a string`
      }

      // eslint-disable-next-line no-restricted-syntax
      try {
        this.measurement_type_ = MeasurementType.getMeasurementTypeFromString(
          field_definition_object.type
        )
      } catch (err) {
        this.error_message = err.message
      }
    }
  }

  /**
   * @type {string}
   */
  get field() {
    return this.field_
  }

  /**
   * @type {string}
   */
  get output() {
    return this.output_
  }

  /**
   * @type {MeasurementType}
   */
  get measurement_type() {
    return this.measurement_type_
  }

  /**
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materializeProperty(prop_descriptor, vega_property_output_state) {
    const prop_name = prop_descriptor.prop_name

    if (this.hasError()) {
      throw new Error(
        `Invalid field definition for property '${prop_name}'. ${this.error_message}`
      )
    }

    this.output_ = prop_name
    vega_property_output_state.addSqlParserTransform(prop_name, {
      type: "project",
      expr: this.field,
      as: prop_name
    })

    const vega_mark_property_object = { field: prop_name }

    if (this.measurement_type_ !== null) {
      prop_descriptor.validateMeasurementType(this.measurement_type_)
    }

    let scale_definition_object = null
    const context = this
    const default_scale_type_callback = () => {
      if (context.measurement_type_ === null) {
        context.measurement_type_ = prop_descriptor.getDefaultMeasurementType()
      }
      if (prop_descriptor instanceof PositionChannelDescriptor) {
        assert(context.measurement_type_ === MeasurementType.kQuantitative)
        return ScaleType.kLinear
      } else if (
        prop_descriptor instanceof ColorChannelDescriptor ||
        prop_descriptor instanceof SizeChannelDescriptor ||
        prop_descriptor instanceof OpacityChannelDescriptor
      ) {
        switch (context.measurement_type_) {
          case MeasurementType.kNominal:
          case MeasurementType.kOrdinal:
            return ScaleType.kOrdinal
          case MeasurementType.kQuantitative:
          case MeasurementType.kTemporal:
            return ScaleType.kLinear
          default:
            assert(
              false,
              `unhandled measurement type ${context.measurement_type_}`
            )
        }
      } else {
        switch (context.measurement_type_) {
          case MeasurementType.kNominal:
          case MeasurementType.kOrdinal:
            return ScaleType.kOrdinal
          case MeasurementType.kQuantitative:
          case MeasurementType.kTemporal:
            return ScaleType.kLinear
          default:
            assert(
              false,
              `unhandled measurement type ${context.measurement_type_}`
            )
        }
      }
    }

    const validate_scale_type = (scale_type) => {
      if (ContinuousScale.isContinuousScale(scale_type)) {
        if (context.measurement_type_ === null) {
          context.measurement_type_ = MeasurementType.kQuantitative
        } else {
          ContinuousScale.validateScaleMeasurement(
            scale_type,
            context.measurement_type
          )
        }
      } else if (DiscreteScale.isDiscreteScale(scale_type)) {
        if (context.measurement_type_ === null) {
          context.measurement_type_ = MeasurementType.kOrdinal
        } else {
          DiscreteScale.validateScaleMeasurement(
            scale_type,
            context.measurement_type
          )
        }
      } else if (DiscretizingScale.isDescretizingScale(scale_type)) {
        if (context.measurement_type_ === null) {
          context.measurement_type_ = MeasurementType.kQuantitative
        } else {
          DiscretizingScale.validateScaleMeasurement(
            scale_type,
            context.measurement_type_
          )
        }
      }
    }

    const default_scale_name_callback = () =>
      `${this.root_context.layer_name}_${prop_name}`

    const scale_parent_info = { parent: this, prop_name: "scale" }
    if (this.hasProperty(scale_parent_info.prop_name)) {
      if (typeof this.definition_object_.scale !== "object") {
        throw new Error(
          `Inavlid scale definition for property '${prop_name}'. Scales must be an object or null`
        )
      }
      if (this.definition_object_.scale !== null) {
        if (!prop_descriptor.can_have_scale_definition) {
          throw new Error(
            `Invalid field definition for property '${prop_name}'. The property does not work with scales.`
          )
        }
        scale_definition_object =
          ScaleDefinitionObject.constructScaleFromDefinition(
            this.definition_object_.scale,
            scale_parent_info,
            default_scale_name_callback,
            default_scale_type_callback,
            validate_scale_type
          )
      }
    } else if (prop_descriptor.can_have_scale_definition) {
      scale_definition_object =
        ScaleDefinitionObject.constructScaleFromDefinition(
          prop_descriptor.buildDefaultScaleDefinition(scale_parent_info),
          scale_parent_info,
          default_scale_name_callback,
          default_scale_type_callback,
          validate_scale_type
        )
    }
    if (this.measurement_type_ === null) {
      this.measurement_type_ = prop_descriptor.getDefaultMeasurementType()
    }

    if (scale_definition_object) {
      scale_definition_object.materializeProperty(
        prop_descriptor,
        vega_property_output_state
      )
      vega_mark_property_object.scale = scale_definition_object.name
    }

    const {
      legend = scale_definition_object &&
      prop_descriptor instanceof ColorChannelDescriptor
        ? {}
        : null
    } = this.definition_object_
    if (legend !== null) {
      if (!(prop_descriptor instanceof ColorChannelDescriptor)) {
        throw new TypeError(
          `A legend definition is currently supplied for property ${prop_name}, but legends are currently only supported for colors`
        )
      }
      new LegendDefinitionObject(legend, {
        parent: this,
        prop_name: "legend"
      }).materializeProperty(prop_descriptor, vega_property_output_state)
    }

    const final_property_object = {}
    prop_descriptor.vega_mark_prop_names.forEach((vega_mark_prop_name) => {
      final_property_object[vega_mark_prop_name] = vega_mark_property_object
    })
    vega_property_output_state.addMarkProperty(prop_name, final_property_object)
  }
}

class EncodingDefinitionObject extends PropertiesDefinitionInterface {
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

class PropLocation {
  static kEncodingOnly = new PropLocation(1 << 0)
  static kMarkDefOnly = new PropLocation(1 << 1)
  static kEncodingPlusMarkDef = new PropLocation(
    PropLocation.kEncodingOnly | PropLocation.kMarkDefOnly
  )

  constructor(value) {
    this.value = value
  }

  valueOf() {
    return this.value
  }

  toString() {
    return `${this.value}`
  }
}

class PropDescriptor {
  /**
   * @param {string} prop_name
   * @param {string} [vega_prop_name=null]
   * @param {PropLocation} [prop_location=PropLocation.kEncodingPlusMarkDef]
   * @param {PropDescriptor} [fallback_prop=null]
   * @param {boolean} [can_have_scale_definition=true]
   */
  constructor(
    prop_name,
    vega_prop_name = null,
    prop_location = PropLocation.kEncodingPlusMarkDef,
    fallback_prop = null,
    can_have_scale_definition = true
  ) {
    this.prop_name_ = prop_name
    /**
     * @type {string[]}
     */
    this.vega_prop_names_ = []
    if (vega_prop_name === null) {
      this.vega_prop_names_.push(prop_name)
    } else if (vega_prop_name.length > 0) {
      this.vega_prop_names_.push(vega_prop_name)
    }

    this.fallback_prop_ = fallback_prop
    if (this.fallback_prop_) {
      const context = this
      this.vega_mark_prop_names.forEach((vega_prop_name) => {
        if (!context.fallback_prop_.vega_prop_names_.includes(vega_prop_name)) {
          context.fallback_prop_.vega_prop_names_.push(vega_prop_name)
        }
      })
    }
    this.prop_location_ = prop_location
    this.can_have_scale_definition_ = can_have_scale_definition
  }

  /**
   * @returns {string}
   */
  get prop_name() {
    return this.prop_name_
  }

  /**
   * @returns {PropLocation}
   */
  get prop_location() {
    return this.prop_location_
  }

  /**
   * @returns {PropDescriptor}
   */
  get fallback_prop() {
    return this.fallback_prop_
  }

  /**
   * @type {string[]}
   */
  get vega_mark_prop_names() {
    return this.vega_prop_names_
  }

  /**
   * @returns {boolean}
   */
  get can_have_scale_definition() {
    return this.can_have_scale_definition_
  }

  /**
   * @param {(string|number|boolean)} prop_definition
   */
  isValidMarkDefinition(prop_definition) {
    const is_valid =
      typeof prop_definition === "number" ||
      typeof prop_definition === "string" ||
      typeof prop_definition === "boolean"
    if (!is_valid) {
      prop_definition.error_message = `Invalid value ${prop_definition}. It must be a number, string, or boolean`
    }
    return is_valid
  }

  /**
   * @param {(Object|string|number|boolean)} prop_definition
   * @returns {(Object|string|numbr|boolean)}
   */
  materializeMarkDefinitionForVega(prop_definition) {
    // pass thru, as long as everything validated
    return prop_definition
  }

  /**
   * @param {ValueDefinitionObject} value_definition_object
   */
  isValidValueDefinition(value_definition_object) {
    if (!this.isValidMarkDefinition(value_definition_object.value)) {
      value_definition_object.error_message =
        value_definition_object.value.error_message
      return false
    }
    return true
  }

  /**
   * @param {(Object|string|number|boolean)} prop_definition
   * @returns {(Object|string|numbr|boolean)}
   */
  materiailzeEncodingValueDefinitionForVega(prop_definition) {
    return this.materializeMarkDefinitionForVega(prop_definition)
  }

  /**
   * @param {MeasurementType} measurement_type
   */
  validateMeasurementType(measurement_type) {
    // no-op. Can be overwritten by derived classes that need
    // specialization
  }

  /**
   * @returns {MeasurementType}
   */
  getDefaultMeasurementType() {
    return MeasurementType.kNominal
  }

  /**
   * @param {ParentInfo} parent_info
   * @returns {Object}
   */
  buildDefaultScaleDefinition(parent_info) {
    // TODO(croot): move this into a scale-enabled descriptor mixin
    return {}
  }
}

class PositionChannelDescriptor extends PropDescriptor {
  /**
   * @param {string} prop_name
   * @param {string} [vega_prop_name=null]
   */
  constructor(prop_name, vega_prop_name = null) {
    super(prop_name, vega_prop_name, PropLocation.kEncodingOnly, null, true)
  }

  isValidMarkDefinition() {
    assert(false, "This should never be called")
  }

  /**
   * @param {ValueDefinitionObject} value_definition_object
   * @returns {boolean}
   */
  isValidValueDefinition(value_definition_object) {
    // position channels currently do not support value defs, only fields.
    value_definition_object.error_message = `Position channels do not currently support value definitions.`
    return false
  }

  /**
   * @param {MeasurementType} measurement_type
   */
  validateMeasurementType(measurement_type) {
    if (measurement_type !== MeasurementType.kQuantitative) {
      throw new Error(
        `The measurement type ${measurement_type} is an invalid measurement type for position channel '${this.prop_name}'. Position channels only accept ${MeasurementType.kQuantitative} measurement types.`
      )
    }
  }

  /**
   * @returns {MeasurementType}
   */
  getDefaultMeasurementType() {
    return MeasurementType.kQuantitative
  }

  /**
   * @param {ParentInfo} parent_info
   * @returns {Object}
   */
  buildDefaultScaleDefinition(parent_info) {
    const chart = parent_info.parent.root_context.chart
    let chart_function_name = `_get${this.prop_name}ScaleName`
    if (typeof chart[chart_function_name] !== "function") {
      chart_function_name = `_get${this.prop_name.toUpperCase()}ScaleName`
      assert(typeof chart[chart_function_name] === "function")
    }
    return { name: chart[chart_function_name](), type: "internal-passthru" }
  }
}

class GeographicChannelDescriptor extends PropDescriptor {
  /**
   * @param {string} prop_name
   * @param {string} [vega_prop_name=null]
   */
  constructor(prop_name, vega_prop_name = null) {
    super(prop_name, vega_prop_name, PropLocation.kEncodingOnly, [], false)
  }

  isValidMarkDefinition() {
    assert(false, "This should never be called")
  }

  /**
   * @param {ValueDefinitionObject} value_definition_object
   * @returns {boolean}
   */
  isValidValueDefinition(value_definition_object) {
    // position channels currently do not support value defs, only fields.
    value_definition_object.error_message = `Geographic channels do not currently support value definitions.`
    return false
  }

  /**
   * @param {MeasurementType} measurement_type
   */
  validateMeasurementType(measurement_type) {
    if (measurement_type !== MeasurementType.kQuantitative) {
      throw new Error(
        `The measurement type ${measurement_type} is an invalid measurement type for geographic channel '${this.prop_name}'. Geographic channels only accept ${MeasurementType.kQuantitative} measurement types.`
      )
    }
  }

  /**
   * @returns {MeasurementType}
   */
  getDefaultMeasurementType() {
    return MeasurementType.kQuantitative
  }
}

class ColorChannelDescriptor extends PropDescriptor {
  /**
   * @param {string} prop_name
   * @param {string} [vega_prop_name=null]
   * @param {ColorChannelDescriptor} [color_channel_fallback=null]
   */
  constructor(prop_name, vega_prop_name = null, color_channel_fallback = null) {
    super(
      prop_name,
      vega_prop_name,
      PropLocation.kEncodingPlusMarkDef,
      color_channel_fallback,
      true
    )
  }

  /**
   * @param {MeasurementType} measurement_type
   */
  validateMeasurementType(measurement_type) {
    switch (measurement_type) {
      case MeasurementType.kQuantitative:
      case MeasurementType.kOrdinal:
      case MeasurementType.kNominal:
        break
      default:
        throw new Error(
          `The measurement type ${measurement_type} is an invalid measurement type for color channel '${
            this.prop_name
          }'. Color channels only accept ${[
            `${MeasurementType.kQuantitative}`,
            `${MeasurementType.kOrdinal}`,
            `${MeasurementType.kNominal}`
          ]} measurement types.`
        )
    }
  }
}

class BoolPropDescriptor extends PropDescriptor {
  /**
   * @param {boolean} prop_definition
   */
  isValidMarkDefinition(prop_definition) {
    if (typeof prop_definition !== "boolean") {
      throw new Error(`Invalid value ${prop_definition}. It must be a boolean`)
    }
    return true
  }

  /**
   * @returns {MeasurementType}
   */
  getDefaultMeasurementType() {
    return MeasurementType.nominal
  }
}

class NumericPropDescriptor extends PropDescriptor {
  /**
   * @param {string} prop_name
   * @param {string} [vega_prop_name=null]
   * @param {PropLocation} [prop_location=PropLocation.kEncodingPlusMarkDef]
   * @param {PropDescriptor} [fallback_prop=null]
   * @param {boolean} [can_have_scale_definition=true]
   * @param {Function} [validate_value_callback=null]
   */
  constructor(
    prop_name,
    vega_prop_name = null,
    prop_location = PropLocation.kEncodingPlusMarkDef,
    fallback_prop = null,
    can_have_scale_definition = true,
    validate_value_callback = null
  ) {
    super(
      prop_name,
      vega_prop_name,
      prop_location,
      fallback_prop,
      can_have_scale_definition
    )
    this.validate_value_callback_ = validate_value_callback
  }

  /**
   * @param {(string|number|boolean)} prop_definition
   */
  isValidMarkDefinition(prop_definition) {
    if (typeof prop_definition !== "number") {
      throw new Error(`Invalid value ${prop_definition}. It must be a number`)
    } else if (
      this.validate_value_callback_ &&
      !this.validate_value_callback_(prop_definition)
    ) {
      throw new Error(`Invalid value ${prop_definition}`)
    }
    return true
  }

  /**
   * @returns {MeasurementType}
   */
  getDefaultMeasurementType() {
    return MeasurementType.kQuantitative
  }
}

/**
 * @param {number} value
 */
function is_zero_to_one(value) {
  return value >= 0 && value <= 1
}

/**
 * @param {number} value
 * @returns
 */
function is_gte_zero(value) {
  return value >= 0
}

class SizeChannelDescriptor extends NumericPropDescriptor {
  /**
   * @param {string} prop_name
   * @param {string} [vega_prop_name=null]
   * @param {PropLocation} [prop_location=PropLocation.kEncodingPlusMarkDef]
   * @param {PropDescriptor} [fallback_prop=null]
   * @param {boolean} [can_have_scale_definition=true]
   */
  constructor(
    prop_name,
    vega_prop_name = null,
    prop_location = PropLocation.kEncodingPlusMarkDef,
    fallback_prop = null,
    can_have_scale_definition = true
  ) {
    super(
      prop_name,
      vega_prop_name,
      prop_location,
      fallback_prop,
      can_have_scale_definition,
      is_gte_zero
    )
  }
}
class OpacityChannelDescriptor extends NumericPropDescriptor {
  /**
   * @param {string} prop_name
   * @param {string} [vega_prop_name=null]
   * @param {PropLocation} [prop_location=PropLocation.kEncodingPlusMarkDef]
   * @param {PropDescriptor} [fallback_prop=null]
   * @param {boolean} [can_have_scale_definition=true]
   */
  constructor(
    prop_name,
    vega_prop_name = null,
    prop_location = PropLocation.kEncodingPlusMarkDef,
    fallback_prop = null,
    can_have_scale_definition = true
  ) {
    super(
      prop_name,
      vega_prop_name,
      prop_location,
      fallback_prop,
      can_have_scale_definition,
      is_zero_to_one
    )
  }
}

function getSizing(
  sizeAttr,
  cap,
  lastFilteredSize = cap,
  pixelRatio,
  layerName
) {
  if (typeof sizeAttr === "number") {
    return sizeAttr
  } else if (typeof sizeAttr === "object" && sizeAttr.type === "quantitative") {
    return {
      scale: getSizeScaleName(layerName),
      field: "size"
    }
    // } else if (sizeAttr === "auto") {
    //   const size = Math.min(lastFilteredSize, cap);
    //   const dynamicRScale = d3.scale
    //     .sqrt()
    //     .domain(AUTOSIZE_DOMAIN_DEFAULTS)
    //     .range(
    //       size > SIZING_THRESHOLD_FOR_AUTOSIZE_RANGE_MININUM
    //         ? AUTOSIZE_RANGE_MININUM
    //         : AUTOSIZE_RANGE_DEFAULTS
    //     )
    //     .clamp(true);
    //   const sizeRounded = Math.round(dynamicRScale(size) * pixelRatio);
    //   return markType === "wedge" || markType === "arrow"
    //     ? sizeRounded * ANGLE_SHAPE_SIZE_MULTIPLIER
    //     : sizeRounded;
  } else {
    return null
  }
}

function materialize_attr_descriptor(attr_name, attr_descriptor) {
  const property_def = {}
  if (
    typeof attr_descriptor === "number" ||
    typeof attr_descriptor === "string" ||
    typeof attr_descriptor === "boolean"
  ) {
    return attr_descriptor
  } else if (typeof attr_descriptor === "object") {
    if (Object.hasOwn(attr_descriptor, "value")) {
      if (Object.keys(attr_descriptor).length !== 1) {
        throw new Error(
          `Invalid value definition for attribute '${attr_name}'. Value definitions must have only 1 property called 'value'.`
        )
      }

      if (typeof attr_descriptor.value === "number") {
        throw new Error(
          `Invalid 'value' of ${attr_descriptor.value} for attribute '${attr_name}'. 'value' properties must be numeric.`
        )
      }
      return attr_descriptor.value
    } else if (Object.hasOwn(attr_descriptor, "field")) {
      if (typeof attr_descriptor.field !== "string") {
        throw new Error(
          `Invalid field definition for attribute '${attr_name}'. The 'field' property must be a string`
        )
      }
      // TODO(croot): get the field name from the "transforms" array
      property_def.field = attr_name
    }
  } else {
    throw new Error(`Invalid channel definition for attribute '${attr_name}'`)
  }
  return property_def
}

/**
 * @param {PropDescriptor} prop_descriptor
 * @param {PropertyDefinition} prop_definition
 * @param {VegaPropertyOutputState} vega_property_output_state
 */
function materialize_prop(
  prop_descriptor,
  prop_definition,
  vega_property_output_state
) {
  const mark_prop_name = prop_descriptor.output
  const mark_prop_obj = {}
  if (
    typeof prop_definition === "number" ||
    typeof prop_definition === "string" ||
    typeof prop_definition === "boolean"
  ) {
    mark_prop_obj[mark_prop_name] = prop_definition
    mark_properties.set(prop_name, mark_prop_obj)
  } else if (typeof prop_definition === "object") {
    if (Object.hasOwn(prop_definition, "value")) {
      if (Object.keys(prop_definition).length !== 1) {
        throw new Error(
          `Invalid value definition for attribute '${prop_name}'. Value definitions must have only 1 property called 'value'.`
        )
      }

      if (
        typeof prop_definition.value !== "number" &&
        typeof prop_definition.value !== "string" &&
        typeof prop_definition.value !== "boolean"
      ) {
        throw new Error(
          `Invalid 'value' of ${prop_definition.value} for attribute '${prop_name}'. 'value' properties must be a number, string, or boolean value.`
        )
      }
      mark_prop_obj[mark_prop_name] = prop_definition
      mark_properties.set(prop_name, mark_prop_obj)
    } else if (Object.hasOwn(prop_definition, "field")) {
      if (typeof prop_definition.field !== "string") {
        throw new Error(
          `Invalid field definition for attribute '${prop_name}'. The 'field' property must be a string`
        )
      }
      sql_parser_transforms.set(prop_name, {
        type: "project",
        expr: prop_definition.field,
        as: prop_name
      })
      mark_prop_obj[mark_prop_name] = { field: prop_name }
      mark_properties.set(prop_name, mark_prop_obj)
    }
  } else {
    throw new Error(`Invalid channel definition for attribute '${prop_name}'`)
  }
}

/**
 *
 * @param {PropDescriptor} prop_descriptor
 * @param {PropertiesDefinitionInterface} props_definition
 * @param {VegaPropertyOutputState} vega_property_output_state
 */
function handle_prop(
  prop_descriptor,
  props_definition,
  vega_property_output_state
) {
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
function materialize_prop_descriptors(raster_layer_context, props, state) {
  const vega_property_output_state = new VegaPropertyOutputState()

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

    // assert(handled, `${prop_descriptor.prop_name}`)
  }

  // const handle_position_props = (
  //   position_prop_channels,
  //   description_adjective
  // ) => {
  //   let prop_added_cnt = 0;
  //   position_prop_channels.forEach(prop => {
  //     if (Object.hasOwn(mark, prop)) {
  //       throw new Error(
  //         `The '${prop}' property an 'encoding' property only, yet is found as a general 'mark' property`
  //       );
  //     }
  //     if (handle_prop(prop, encoding, vega_property_state)) {
  //       prop_added_cnt += 1;
  //     }
  //   });
  //   if (
  //     prop_added_cnt !== 0 &&
  //     prop_added_cnt !== position_prop_channels.length
  //   ) {
  //     throw new Error(
  //       `Not all ${description_adjective} channels are encoded. If ${description_adjective} channels are desired, then all of ${geographic_channels} should be encoded.`
  //     );
  //   }
  //   return prop_added_cnt > 0;
  // };

  // if (
  //   handle_position_props(geographic_channels, "geographic") &&
  //   handle_position_props(position_channels, "position")
  // ) {
  //   throw new Error(
  //     `Cannot intermix encoding position (${position_channels}) and geographic (${geographic_channels}) channels`
  //   );
  // }

  return vega_property_output_state
}

// function getColor(color, layerName) {
//   if (typeof color === "object" && color.type === "density") {
//     return {
//       scale: getColorScaleName(layerName),
//       value: 0
//     }
//   } else if (
//     typeof color === "object" &&
//     (color.type === "ordinal" || color.type === "quantitative")
//   ) {
//     return {
//       scale: getColorScaleName(layerName),
//       field: "color"
//     }
//   } else if (typeof color === "object") {
//     return adjustOpacity(color.value, color.opacity)
//   } else {
//     return color
//   }
// }

// function getOrientation(orientation, layerName) {
//   if (typeof orientation === "object" && orientation.type === "quantitative") {
//     return {
//       scale: `${layerName}_symbolAngle`,
//       field: "orientation"
//     }
//   } else {
//     return {
//       scale: "x",
//       field: "orientation"
//     }
//   }
// }

// function isValidPostFilter(postFilter) {
//   const { operator, min, max, aggType, value, custom } = postFilter

//   if (value && (aggType || custom)) {
//     if (
//       (operator === "not between" || operator === "between") &&
//       typeof min === "number" &&
//       !isNaN(min) &&
//       typeof max === "number" &&
//       !isNaN(max)
//     ) {
//       return true
//     } else if (
//       (operator === "equals" ||
//         operator === "not equals" ||
//         operator === "greater than or equals") &&
//       typeof min === "number" &&
//       !isNaN(min)
//     ) {
//       return true
//     } else if (
//       operator === "less than or equals" &&
//       typeof max === "number" &&
//       !isNaN(max)
//     ) {
//       return true
//     } else if (operator === "null" || operator === "not null") {
//       return true
//     } else {
//       return false
//     }
//   } else {
//     return false
//   }
// }

export default function rasterLayerWindBarbMixin(_layer) {
  let state = null

  /**
   * @type {VegaPropertyOutputState}
   */
  let _vega_property_output_state = null

  // _layer.colorDomain = createRasterLayerGetterSetter(_layer, null)
  // _layer.sizeDomain = createRasterLayerGetterSetter(_layer, null)

  _layer.setState = function (setter) {
    if (typeof setter === "function") {
      state = setter(state)
    } else {
      state = setter
    }
    if (!Object.hasOwn(state, "transform")) {
      state.transform = {}
    }
    return _layer
  }
  _layer.getState = function () {
    return state
  }

  // eslint-disable-next-line complexity
  _layer.getTransforms = function (
    table,
    filter,
    globalFilter,
    { transform, encoding: { x, y, size, color }, postFilters },
    lastFilteredSize,
    isDataExport
  ) {
    // NOTE: as of 11/02/22 this function might only be called from immerse via the
    // buildRasterExportSql() method in raster-sql.ts
    // Currently it appears windbarbs are not supported in buildRasterExportSql(), so
    // this method should never be called, but if windbards are included in buildRasterExportSql(),
    // then this method would need to be filled out. In the meantime, the logic in here is mostly a direct
    // copy of the equivalent getTransforms method in raster-layer-point-mixin (minus the 'orientation' prop).
    // Using a direct copy because the state object that's build for the buildRasterExportSql() call is
    // very point specific, and is completely different than the state that is used to render the wind
    // barb, so we can just plop in the point code for now. It's also worth noting that rebuilding the state
    // json object in buildRasterExportSql() is very redundant. Why rebuild the state?  I don't see why
    // we cant just supply a getter to retrieve the current sql for a layer (tho with the isDataExport,
    // which can impact how the sql is generated in the end). Wouldn't that do what's intended and yet
    // be far less error prone?

    const transforms = []

    if (
      typeof transform === "object" &&
      typeof transform.groupby === "object" &&
      transform.groupby.length
    ) {
      const fields = isDataExport ? [] : [x.field, y.field]
      const alias = isDataExport ? [] : ["x", "y"]
      const ops = isDataExport ? [] : [x.aggregate, y.aggregate]

      if (typeof size === "object" && size.type === "quantitative") {
        fields.push(size.field)
        alias.push("size")
        ops.push(size.aggregate)
      }

      if (
        typeof color === "object" &&
        (color.type === "quantitative" || color.type === "ordinal")
      ) {
        fields.push(color.field)
        alias.push("color")
        ops.push(color.aggregate)
      }

      // Since we use ST_POINT for pointmap data export, we need to include /*+ cpu_mode */ in pointmap chart data export queries.
      // The reason is ST_Point projections need buffer allocation to hold the coords and thus require cpu execution
      transforms.push({
        type: "aggregate",
        fields,
        ops,
        as: alias,
        // For some reason, we're receiving duplicate tables here, causing headaches w/ export SQL generation
        //  in heavyai-data-layer2. So, just gonna filter them out.
        //  https://heavyai.atlassian.net/browse/FE-14213
        groupby: [...new Set(transform.groupby)].map((g, i) => ({
          type: "project",
          expr: `${isDataExport && i === 0 ? "/*+ cpu_mode */ " : ""}${g}`,
          as: isDataExport ? g : `key${i}`
        }))
      })
      if (isDataExport) {
        transforms.push({
          type: "project",
          expr: `ST_SetSRID(ST_Point(${AGGREGATES[x.aggregate]}(${x.field}), ${
            AGGREGATES[y.aggregate]
          }(${y.field})), 4326) AS location`
        })
      }
    } else {
      if (isDataExport) {
        transforms.push({
          type: "project",
          expr: `/*+ cpu_mode */ ST_SetSRID(ST_Point(${x.field}, ${y.field}), 4326)`
        })
      } else {
        transforms.push({
          type: "project",
          expr: x.field,
          as: "x"
        })
        transforms.push({
          type: "project",
          expr: y.field,
          as: "y"
        })
      }

      if (typeof transform.limit === "number") {
        transforms.push({
          type: "limit",
          row: transform.limit
        })
        if (transform.sample) {
          transforms.push({
            type: "sample",
            method: "multiplicative",
            size: lastFilteredSize || transform.tableSize,
            limit: transform.limit,
            sampleTable: table
          })
        }
      }

      if (typeof size === "object" && size.type === "quantitative") {
        transforms.push({
          type: "project",
          expr: size.field,
          as: "size"
        })
      }

      if (
        typeof color === "object" &&
        (color.type === "quantitative" || color.type === "ordinal")
      ) {
        transforms.push({
          type: "project",
          expr: color.field,
          as: "color"
        })
      }
    }

    if (typeof filter === "string" && filter.length) {
      transforms.push({
        type: "filter",
        expr: filter
      })
    }

    const postFilter = postFilters ? postFilters[0] : null // may change to map when we have more than one postFilter
    if (postFilter && isValidPostFilter(postFilter)) {
      transforms.push({
        type: "postFilter",
        table: postFilter.table || null,
        aggType: postFilter.aggType,
        custom: postFilter.custom,
        fields: [postFilter.value],
        ops: postFilter.operator,
        min: postFilter.min,
        max: postFilter.max
      })
    }

    if (typeof globalFilter === "string" && globalFilter.length) {
      transforms.push({
        type: "filter",
        expr: globalFilter
      })
    }

    return transforms
  }

  // _layer.getProjections = function() {
  //   return _layer
  //     .getTransforms(
  //       "",
  //       "",
  //       "",
  //       state,
  //       lastFilteredSize(_layer.crossfilter().getId())
  //     )
  //     .filter(
  //       transform =>
  //         transform.type === "project" && transform.hasOwnProperty("as")
  //     )
  //     .map(projection => parser.parseTransform({ select: [] }, projection))
  //     .map(sql => sql.select[0]);
  // };
  // function usesAutoColors() {
  //   return state.encoding.color.domain === "auto";
  // }
  // function usesAutoSize() {
  //   return state.encoding.size.domain === "auto";
  // }
  // function getAutoColorVegaTransforms(aggregateNode) {
  //   const rtnobj = { transforms: [], fields: [] };
  //   if (state.encoding.color.type === "quantitative") {
  //     const minoutput = "mincolor",
  //       maxoutput = "maxcolor";
  //     aggregateNode.fields = aggregateNode.fields.concat([
  //       "color",
  //       "color",
  //       "color",
  //       "color"
  //     ]);
  //     aggregateNode.ops = aggregateNode.ops.concat([
  //       "min",
  //       "max",
  //       "avg",
  //       "stddev"
  //     ]);
  //     aggregateNode.as = aggregateNode.as.concat([
  //       "mincol",
  //       "maxcol",
  //       "avgcol",
  //       "stdcol"
  //     ]);
  //     rtnobj.transforms.push(
  //       {
  //         type: "formula",
  //         expr: "max(mincol, avgcol-2*stdcol)",
  //         as: minoutput
  //       },
  //       {
  //         type: "formula",
  //         expr: "min(maxcol, avgcol+2*stdcol)",
  //         as: maxoutput
  //       }
  //     );
  //     rtnobj.fields = [minoutput, maxoutput];
  //   } else if (state.encoding.color.type === "ordinal") {
  //     const output = "distinctcolor";
  //     aggregateNode.fields.push("color");
  //     aggregateNode.ops.push("distinct");
  //     aggregateNode.as.push(output);
  //     rtnobj.fields.push(output);
  //   }
  //   return rtnobj;
  // }
  // function getAutoSizeVegaTransforms(aggregateNode) {
  //   const minoutput = "minsize",
  //     maxoutput = "maxsize";
  //   aggregateNode.fields.push("size", "size", "size", "size");
  //   aggregateNode.ops.push("min", "max", "avg", "stddev");
  //   aggregateNode.as.push("minsz", "maxsz", "avgsz", "stdsz");
  //   return {
  //     transforms: [
  //       {
  //         type: "formula",
  //         expr: "max(minsz, avgsz-2*stdsz)",
  //         as: minoutput
  //       },
  //       {
  //         type: "formula",
  //         expr: "min(maxsz, avgsz+2*stdsz)",
  //         as: maxoutput
  //       }
  //     ],
  //     fields: [minoutput, maxoutput]
  //   };
  // }
  // _layer._updateFromMetadata = (metadata, layerName = "") => {
  //   const autoColors = usesAutoColors();
  //   const autoSize = usesAutoSize();
  //   if ((autoColors || autoSize) && Array.isArray(metadata.scales)) {
  //     const colorScaleName = getColorScaleName(layerName);
  //     const sizeScaleName = getSizeScaleName(layerName);
  //     for (const scale of metadata.scales) {
  //       if (autoColors && scale.name === colorScaleName) {
  //         _layer.colorDomain(scale.domain);
  //       } else if (autoSize && scale.name === sizeScaleName) {
  //         _layer.sizeDomain(scale.domain);
  //       }
  //     }
  //   }
  // };

  const color_prop_descriptor = new ColorChannelDescriptor("color", "")
  const prop_descriptors = new Map()

  prop_descriptors.set("x", new PositionChannelDescriptor("x"))
  prop_descriptors.set("y", new PositionChannelDescriptor("y"))
  // prop_descriptors.set(
  //   "longitude",
  //   new GeographicChannelDescriptor("longitude", "x")
  // );
  // prop_descriptors.set(
  //   "latitude",
  //   new GeographicChannelDescriptor("latitude", "y")
  // );
  prop_descriptors.set("size", new SizeChannelDescriptor("size"))
  prop_descriptors.set("speed", new PropDescriptor("speed"))
  prop_descriptors.set("direction", new PropDescriptor("direction"))
  prop_descriptors.set(
    "fill",
    new ColorChannelDescriptor("fill", "fillColor", color_prop_descriptor)
  )
  prop_descriptors.set(
    "stroke",
    new ColorChannelDescriptor("stroke", "strokeColor", color_prop_descriptor)
  )
  prop_descriptors.set("opacity", new OpacityChannelDescriptor("opacity"))

  prop_descriptors.set(
    "quantizeDirection",
    new BoolPropDescriptor(
      "quantizeDirection",
      null,
      PropLocation.kMarkDefOnly,
      null,
      false
    )
  )
  prop_descriptors.set(
    "anchorScale",
    new NumericPropDescriptor(
      "anchorScale",
      null,
      PropLocation.kMarkDefOnly,
      null,
      false,
      is_zero_to_one
    )
  )

  _layer.__genVega = function ({
    chart,
    table,
    filter,
    lastFilteredSize,
    globalFilter,
    pixelRatio,
    layerName
  }) {
    const raster_layer_context = new RasterLayerContext(
      chart,
      table,
      WindBarkConfigDefinitionObject.key,
      this,
      layerName,
      lastFilteredSize
    )

    _vega_property_output_state = materialize_prop_descriptors(
      raster_layer_context,
      prop_descriptors,
      state
    )
    const {
      sql_parser_transforms,
      vega_transforms,
      vega_scales,
      mark_properties
    } = _vega_property_output_state.flatten()

    if (typeof filter === "string" && filter.length) {
      sql_parser_transforms.push({
        type: "filter",
        expr: filter
      })
    }
    // const postFilter = postFilters ? postFilters[0] : null; // may change to map when we have more than one postFilter
    // if (postFilter && isValidPostFilter(postFilter)) {
    //   transforms.push({
    //     type: "postFilter",
    //     table: postFilter.table || null,
    //     aggType: postFilter.aggType,
    //     custom: postFilter.custom,
    //     fields: [postFilter.value],
    //     ops: postFilter.operator,
    //     min: postFilter.min,
    //     max: postFilter.max
    //   });
    // }
    if (typeof globalFilter === "string" && globalFilter.length) {
      sql_parser_transforms.push({
        type: "filter",
        expr: globalFilter
      })
    }

    const data = [
      {
        name: layerName,
        sql: parser.writeSQL({
          type: "root",
          source: table,
          transform: sql_parser_transforms
        }),
        enableHitTesting: state.enableHitTesting
      },
      ...vega_transforms
    ]

    const marks = [
      {
        type: WindBarkConfigDefinitionObject.key,
        from: {
          data: layerName
        },
        properties: Object.assign({}, ...mark_properties)
      }
    ]

    return { data, scales: vega_scales, marks }

    //   // const autocolors = usesAutoColors();
    //   // const autosize = usesAutoSize();
    //   // const getStatsLayerName = () => layerName + "_stats";
    //   // const markType = getMarkType(state.config);
    //   const size = getSizing(
    //     state.encoding.size,
    //     state.transform && state.transform.limit,
    //     lastFilteredSize,
    //     pixelRatio,
    //     layerName
    //   );
    //   let data = [];
    //   let scales = [];
    //   // if (
    //   //   state.encoding.color.prioritizedColor &&
    //   //   state.encoding.color.prioritizedColor.length > 0 &&
    //   //   layerName !== "backendScatter"
    //   // ) {
    //   //   for (let i = 0; i < state.encoding.color.prioritizedColor.length; i++) {
    //   //     if (layerName.includes(`_z${i * 2}`)) {
    //   //       data = [
    //   //         {
    //   //           name: layerName,
    //   //           sql: parser.writeSQL({
    //   //             type: "root",
    //   //             source: table,
    //   //             transform: _layer.getTransforms(
    //   //               table,
    //   //               filter +
    //   //                 ` AND ${state.encoding.color.field} != '${state.encoding.color.prioritizedColor[i].value}'`,
    //   //               globalFilter,
    //   //               state,
    //   //               lastFilteredSize
    //   //             )
    //   //           }),
    //   //           enableHitTesting: state.enableHitTesting
    //   //         }
    //   //       ];
    //   //     } else if (layerName.includes(`_z${i * 2 + 1}`)) {
    //   //       data = [
    //   //         {
    //   //           name: layerName,
    //   //           sql: parser.writeSQL({
    //   //             type: "root",
    //   //             source: table,
    //   //             transform: _layer.getTransforms(
    //   //               table,
    //   //               filter +
    //   //                 ` AND ${state.encoding.color.field} = '${state.encoding.color.prioritizedColor[i].value}'`,
    //   //               globalFilter,
    //   //               state,
    //   //               lastFilteredSize
    //   //             )
    //   //           }),
    //   //           enableHitTesting: state.enableHitTesting
    //   //         }
    //   //       ];
    //   //     }
    //   //   }
    //   // } else {
    //   data = [
    //     {
    //       name: layerName,
    //       sql: parser.writeSQL({
    //         type: "root",
    //         source: table,
    //         transform: _layer.getTransforms(
    //           table,
    //           filter,
    //           globalFilter,
    //           state,
    //           lastFilteredSize
    //         )
    //       }),
    //       enableHitTesting: state.enableHitTesting
    //     }
    //   ];
    //   // }
    //   // const scaledomainfields = {};
    //   // if (autocolors || autosize) {
    //   //   const aggregateNode = {
    //   //     type: "aggregate",
    //   //     fields: [],
    //   //     ops: [],
    //   //     as: []
    //   //   };
    //   //   let transforms = [aggregateNode];
    //   //   if (autocolors) {
    //   //     const xformdata = getAutoColorVegaTransforms(aggregateNode);
    //   //     scaledomainfields.color = xformdata.fields;
    //   //     transforms = transforms.concat(xformdata.transforms);
    //   //   }
    //   //   if (autosize) {
    //   //     const xformdata = getAutoSizeVegaTransforms(aggregateNode);
    //   //     scaledomainfields.size = xformdata.fields;
    //   //     transforms = transforms.concat(xformdata.transforms);
    //   //   }
    //   //   data.push({
    //   //     name: getStatsLayerName(),
    //   //     source: layerName,
    //   //     transform: transforms
    //   //   });
    //   // }
    //   // const scales = getScales(
    //   //   state.encoding,
    //   //   layerName,
    //   //   scaledomainfields,
    //   //   getStatsLayerName()
    //   // );
    //   const marks = [
    //     {
    //       type: "windbarb",
    //       from: {
    //         data: layerName
    //       },
    //       properties: Object.assign(
    //         {},
    //         {
    //           x: {
    //             scale: "x",
    //             field: "x"
    //           },
    //           y: {
    //             scale: "y",
    //             field: "y"
    //           },
    //           size,
    //           speed: materialize_attr_descriptor("speed", state.encoding.speed),
    //           direction: materialize_attr_descriptor(
    //             "direction",
    //             state.encoding.direction
    //           ),
    //           fillColor: materialize_attr_descriptor(
    //             "color",
    //             state.encoding.color
    //           ),
    //           strokeColor: materialize_attr_descriptor(
    //             "color",
    //             state.encoding.color
    //           )
    //           // fillColor: getColor(state.encoding.color, layerName)
    //         }
    //         // {
    //         //   shape: markType,
    //         //   ...(state.encoding.orientation && {
    //         //     angle: getOrientation(state.encoding.orientation, layerName)
    //         //   }),
    //         //   width: size,
    //         //   height: size
    //         // }
    //       )
    //     }
    //   ];
    //   return {
    //     data,
    //     scales,
    //     marks
    //   };
  }
  _layer.xDim = createRasterLayerGetterSetter(_layer, null)
  _layer.yDim = createRasterLayerGetterSetter(_layer, null)
  // // NOTE: builds _layer.defaultSize(), _layer.nullSize(),
  // //              _layer.sizeScale(), & _layer.sizeAttr()
  // createVegaAttrMixin(_layer, "size", 3, 1, true);
  // _layer.dynamicSize = createRasterLayerGetterSetter(_layer, null);
  // _layer.xAttr = createRasterLayerGetterSetter(_layer, null);
  // _layer.yAttr = createRasterLayerGetterSetter(_layer, null);
  // const _point_wrap_class = "map-point-wrap";
  // const _point_class = "map-point-new";
  // const _point_gfx_class = "map-point-gfx";
  let _vega = null
  // const _scaledPopups = {};
  // const _minMaxCache = {};
  const _cf = null
  _layer.crossfilter = createRasterLayerGetterSetter(_layer, _cf)
  // _layer.crossfilter = function(cf) {
  //   if (!arguments.length) {
  //     return _cf;
  //   }
  //   _cf = cf;
  //   return _layer;
  // };
  // _layer._requiresCap = function() {
  //   return false;
  // };
  // _layer.xRangeFilter = function(range) {
  //   if (!_layer.xDim()) {
  //     throw new Error("Must set layer's xDim before invoking xRange");
  //   }
  //   const xValue = _layer.xDim().value()[0];
  //   if (!arguments.length) {
  //     return _minMaxCache[xValue];
  //   }
  //   _minMaxCache[xValue] = range;
  //   return _layer;
  // };
  // _layer.yRangeFilter = function(range) {
  //   if (!_layer.yDim()) {
  //     throw new Error("Must set layer's yDim before invoking yRange");
  //   }
  //   const yValue = _layer.yDim().value()[0];
  //   if (!arguments.length) {
  //     return _minMaxCache[yValue];
  //   }
  //   _minMaxCache[yValue] = range;
  //   return _layer;
  // };
  _layer._genVega = function (chart, layerName, group, query) {
    // Pointmap prioritized color hack. Need to use the real layer name for crossfilter
    const realLayerName = layerName
    // if (
    //   layerName &&
    //   layerName !== "backendScatter" &&
    //   layerName.includes("_z")
    // ) {
    //   const idx = layerName.indexOf("_z");
    //   realLayerName = layerName.substring(0, idx);
    // }
    // // needed to set LastFilteredSize when point map first initialized
    // if (_layer.yDim()) {
    //   _layer
    //     .yDim()
    //     .groupAll()
    //     .valueAsync(false, false, false, realLayerName)
    //     .then(value => {
    //       setLastFilteredSize(_layer.crossfilter().getId(), value);
    //     });
    // }
    _vega = _layer.__genVega({
      chart,
      layerName,
      table: _layer.crossfilter().getTable()[0],
      filter: _layer.crossfilter().getFilterString(realLayerName),
      globalFilter: _layer.crossfilter().getGlobalFilterString(),
      lastFilteredSize: lastFilteredSize(_layer.crossfilter().getId()),
      pixelRatio: chart._getPixelRatio()
    })
    return _vega
  }

  _layer.getPrimaryColorScaleAndLegend = function () {
    let prop_descriptor = prop_descriptors.get("stroke")
    let scale_obj = _vega_property_output_state.getScaleForProp(prop_descriptor)
    if (!scale_obj) {
      prop_descriptor = prop_descriptors.get("fill")
      scale_obj = _vega_property_output_state.getScaleForProp(prop_descriptor)
      if (!scale_obj) {
        prop_descriptor = null
      }
    }
    const legend_obj = prop_descriptor
      ? _vega_property_output_state.getLegendForProperty(prop_descriptor)
      : null
    return [scale_obj, legend_obj]
  }

  // const renderAttributes = [
  //   "xc",
  //   "yc",
  //   "width",
  //   "height",
  //   "fillColor",
  //   "angle"
  // ];
  // _layer._addRenderAttrsToPopupColumnSet = function(chart, popupColumnsSet) {
  //   if (
  //     _vega &&
  //     Array.isArray(_vega.marks) &&
  //     _vega.marks.length > 0 &&
  //     _vega.marks[0].properties
  //   ) {
  //     renderAttributes.forEach(prop => {
  //       _layer._addQueryDrivenRenderPropToSet(
  //         popupColumnsSet,
  //         _vega.marks[0].properties,
  //         prop
  //       );
  //     });
  //   }
  // };
  // _layer._areResultsValidForPopup = function(results) {
  //   if (typeof results.x === "undefined" || typeof results.y === "undefined") {
  //     return false;
  //   } else {
  //     return true;
  //   }
  // };
  // _layer._displayPopup = function(svgProps) {
  //   const {
  //     chart,
  //     parentElem,
  //     data,
  //     height,
  //     margins,
  //     xscale,
  //     yscale,
  //     minPopupArea,
  //     animate
  //   } = svgProps;
  //   const rndrProps = {};
  //   if (
  //     _vega &&
  //     Array.isArray(_vega.marks) &&
  //     _vega.marks.length > 0 &&
  //     _vega.marks[0].properties
  //   ) {
  //     const propObj = _vega.marks[0].properties;
  //     renderAttributes.forEach(prop => {
  //       if (
  //         typeof propObj[prop] === "object" &&
  //         propObj[prop].field &&
  //         typeof propObj[prop].field === "string"
  //       ) {
  //         rndrProps[prop] = propObj[prop].field;
  //       }
  //     });
  //   }
  //   const pixel = Point2d.create(
  //     xscale(data[rndrProps.xc || rndrProps.x]) + margins.left,
  //     height - yscale(data[rndrProps.yc || rndrProps.y]) + margins.top
  //   );
  //   let sizeFromData =
  //     data[rndrProps.size || rndrProps.width || rndrProps.height];
  //   sizeFromData = Math.max(sizeFromData, 1); // size must be > 0 (#164)
  //   let dotSize = _layer.getSizeVal(sizeFromData);
  //   let scale = 1;
  //   const scaleRatio = minPopupArea / (dotSize * dotSize);
  //   const isScaled = scaleRatio > 1;
  //   if (isScaled) {
  //     scale = Math.sqrt(scaleRatio);
  //     dotSize = dotSize * scale;
  //   }
  //   const popupStyle = _layer.popupStyle();
  //   let bgColor = _layer.getFillColorVal(data[rndrProps.fillColor]);
  //   let strokeColor, strokeWidth;
  //   if (typeof popupStyle === "object" && !isScaled) {
  //     bgColor = popupStyle.fillColor || bgColor;
  //     strokeColor = popupStyle.strokeColor;
  //     strokeWidth = popupStyle.strokeWidth;
  //   }
  //   const wrapDiv = parentElem.append("div").attr("class", _point_wrap_class);
  //   const pointDiv = wrapDiv
  //     .append("div")
  //     .attr("class", _point_class)
  //     .style({ left: pixel[0] + "px", top: pixel[1] + "px" });
  //   if (animate) {
  //     if (isScaled) {
  //       pointDiv.classed("popupPoint", true);
  //     } else {
  //       pointDiv.classed("fadeInPoint", true);
  //     }
  //   }
  //   _scaledPopups[chart] = isScaled;
  //   const gfxDiv = pointDiv
  //     .append("div")
  //     .attr("class", _point_gfx_class)
  //     .style("background", bgColor)
  //     .style("width", dotSize + "px")
  //     .style("height", dotSize + "px");
  //   if (strokeColor) {
  //     gfxDiv.style("border-color", strokeColor);
  //   }
  //   if (typeof strokeWidth === "number") {
  //     gfxDiv.style("border-width", strokeWidth);
  //   }
  //   return AABox2d.initCenterExtents(AABox2d.create(), pixel, [
  //     dotSize / 2,
  //     dotSize / 2
  //   ]);
  // };
  // _layer._hidePopup = function(chart, hideCallback) {
  //   const mapPoint = chart.select("." + _point_class);
  //   if (mapPoint) {
  //     if (_scaledPopups[chart]) {
  //       mapPoint.classed("removePoint", true);
  //     } else {
  //       mapPoint.classed("fadeOutPoint", true);
  //     }
  //     if (hideCallback) {
  //       mapPoint.on("animationend", () => {
  //         hideCallback(chart);
  //       });
  //     }
  //     delete _scaledPopups[chart];
  //   }
  // };
  _layer._destroyLayer = function () {
    const xDim = _layer.xDim()
    if (xDim) {
      xDim.dispose()
    }
    const yDim = _layer.yDim()
    if (yDim) {
      yDim.dispose()
    }
  }
  // _layer.setZIndexedLayers = function(chart, prioritizedColors) {
  //   const layers = chart.getLayers();
  //   const layerNames = chart.getLayerNames();
  //   if (
  //     layers.length === 1 &&
  //     layerNames[0] === "pointmap" &&
  //     prioritizedColors.length
  //   ) {
  //     chart.popLayer();
  //     chart.pushLayer("pointmap", _layer);
  //   }
  // };
  // _layer.removeZIndexedLayers = function(chart) {
  //   const layers = chart.getLayers();
  //   const layerNames = chart.getLayerNames();
  //   if (
  //     layers.length === 2 &&
  //     layerNames[0].includes("_z") &&
  //     layerNames[1].includes("_z")
  //   ) {
  //     chart.popAllLayers();
  //     chart.pushLayer("pointmap", _layer);
  //   }
  // };
  // _layer.getLayerNames = function(chart) {
  //   return chart.getLayerNames();
  // };
  return _layer
}
