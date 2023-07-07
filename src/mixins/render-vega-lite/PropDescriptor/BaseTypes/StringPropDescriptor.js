import { default as PropDescriptor, MeasurementType } from "../PropDescriptor"

export default class StringPropDescriptor extends PropDescriptor {
  /**
   * @param {boolean} prop_definition
   */
  isValidMarkDefinition(prop_definition) {
    if (typeof prop_definition !== "string") {
      throw new Error(`Invalid value ${prop_definition}. It must be a string`)
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
