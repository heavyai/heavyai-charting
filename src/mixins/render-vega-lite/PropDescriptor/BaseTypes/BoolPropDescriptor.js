import { default as PropDescriptor, MeasurementType } from "../PropDescriptor"

export default class BoolPropDescriptor extends PropDescriptor {
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
