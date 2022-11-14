/**
 * @typedef {Object} VegaStateMaps
 * @property {Map} sql_parser_transforms
 * @property {Map} vega_transforms
 * @property {Map} vega_scales
 * @property {Map} mark_properties
 * @property {Map} legend_properties
 */

export default class VegaPropertyOutputState {
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
