import PropertiesDefinitionInterface from "../PropertiesDefinitionInterface"

export default class LegendDefinitionObject extends PropertiesDefinitionInterface {
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
