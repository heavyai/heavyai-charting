import assert from "assert"

import {
  default as PropDescriptor,
  PropLocation,
  MeasurementType
} from "../PropDescriptor"

// jsdoc imports only
// eslint-disable-next-line no-unused-vars
import RasterLayerContext from "../../RasterLayerContext"

export default class GeographicChannelDescriptor extends PropDescriptor {
  /**
   * @param {string} prop_name
   * @param {string} [vega_prop_name=null]
   */
  constructor(prop_name, vega_prop_name = null) {
    super(prop_name, vega_prop_name, PropLocation.kEncodingOnly, null, false)
  }

  /**
   * Validates the property descriptor with the active context
   * Should throw an error if validation fails
   * @param {RasterLayerContext} raster_layer_context
   */
  validateContext(raster_layer_context) {
    if (!raster_layer_context.chart.useGeoTypes()) {
      throw new Error(
        `Cannot use the Geographic property '${this.prop_name}' with the raster chart as the raster chart is not configured to use geographic data`
      )
    }
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
