import assert from "assert"

import ScaleType from "./Enums/ScaleType"
import LinearScale from "./Continuous/LinearScale"
import PowScale from "./Continuous/PowScale"
import SqrtScale from "./Continuous/SqrtScale"
import LogScale from "./Continuous/LogScale"
import OrdinalScale from "./Discrete/OrdinalScale"
import QuantizeScale from "./Discretizing/QuantizeScale"
import ThresholdScale from "./Discretizing/ThresholdScale"
import InternalPassthruScale from "./Other/InternalPassthruScale"

// only used for JSDoc type
// eslint-disable-next-line no-unused-vars
import ScaleDefinitionObject from "./ScaleDefinitionObject"

/**
 *
 * @param {Object} scale_definition_object
 * @param {ParentInfo} parent_info
 * @param {Function} get_default_scale_name_callback
 * @param {Function} get_default_scale_type_callback
 * @param {Function} validate_scale_type_callback
 * @returns {ScaleDefinitionObject}
 */
const constructScaleFromDefinition = (
  scale_definition_object,
  parent_info,
  get_default_scale_name_callback,
  get_default_scale_type_callback,
  validate_scale_type_callback
) => {
  let scale_type = ScaleType.kLinear

  if (Object.hasOwn(scale_definition_object, "type")) {
    if (typeof scale_definition_object.type !== "string") {
      throw new Error(
        "The 'type' property of a scale definition must be a string."
      )
    }

    scale_type = ScaleType.getScaleTypeFromString(scale_definition_object.type)
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

export { constructScaleFromDefinition }
