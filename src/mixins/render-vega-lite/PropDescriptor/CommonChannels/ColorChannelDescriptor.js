import {
  default as PropDescriptor,
  PropLocation,
  MeasurementType
} from "../PropDescriptor"

export default class ColorChannelDescriptor extends PropDescriptor {
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
