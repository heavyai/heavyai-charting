import PropertiesDefinitionInterface from "../../PropertiesDefinitionInterface"
import assert from "assert"

export default class LimitDefinitionObject extends PropertiesDefinitionInterface {
  // eslint-disable-next-line no-undef
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
    // eslint-disable-next-line no-warning-comments
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
      // eslint-disable-next-line no-warning-comments
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
