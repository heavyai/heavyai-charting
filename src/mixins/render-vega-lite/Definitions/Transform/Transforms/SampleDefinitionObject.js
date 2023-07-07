import PropertiesDefinitionInterface from "../../PropertiesDefinitionInterface"
import assert from "assert"

export default class SampleDefinitionObject extends PropertiesDefinitionInterface {
  // eslint-disable-next-line no-undef
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
    // eslint-disable-next-line no-warning-comments
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
    // eslint-disable-next-line no-warning-comments
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
