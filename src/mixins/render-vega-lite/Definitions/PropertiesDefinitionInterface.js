import assert from "assert"

import PropertyDefinition from "./PropertyDefinition"

/**
 * @typedef ParentInfo
 * @property {PropertiesDefinitionInterface} parent
 * @property {string} prop_name
 */

export default class PropertiesDefinitionInterface {
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
  // eslint-disable-next-line no-unused-vars
  materialize(vega_property_output_state) {
    assert(false, `Needs to be overwritten by a derived class`)
  }

  /**
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  // eslint-disable-next-line no-unused-vars
  materializeProperty(prop_descriptor, vega_property_output_state) {
    assert(false, `Needs to be overwritten by a derived class`)
  }

  /**
   * After all the vega properties/state have been materialized, there is one last pass/opportunity
   * for definition objects to realign with the prebuilt state for whatever purpose. Note:
   * realignment is done in a FIFO queue.
   * @param {Map<string,PropDescriptor>} prop_descriptors
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  // eslint-disable-next-line no-unused-vars
  realign(prop_descriptors, vega_property_output_state) {}
}
