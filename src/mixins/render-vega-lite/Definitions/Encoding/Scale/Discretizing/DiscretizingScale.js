import assert from "assert"

import ScaleDefinitionObject from "../ScaleDefinitionObject"
import FieldDefinitionObject from "../../FieldDefinitionObject"
import ScaleType from "../Enums/ScaleType"
import ExtentFlags from "../Enums/ExtentFlags"
import MeasurementType from "../../../../PropDescriptor/Enums/MeasurementType"
import ContinuousScale from "../Continuous/ContinuousScale"

export default class DiscretizingScale extends ScaleDefinitionObject {
  /**
   *
   * @param {ScaleType} scale_type
   * @returns {boolean}
   */
  static isDescretizingScale(scale_type) {
    return (
      scale_type === ScaleType.kQuantize || scale_type === ScaleType.kThreshold
    )
  }

  /**
   * @param {ScaleType} scale_type
   * @param {MeasurementType} measurement_type
   * @returns {boolean}
   */
  static validateScaleMeasurement(scale_type, measurement_type) {
    assert(DiscretizingScale.isDescretizingScale(scale_type))
    if (measurement_type !== MeasurementType.kQuantitative) {
      throw new Error(
        `Discretizing scales can only be used with '${MeasurementType.kQuantitative}' field type encodings`
      )
    }
  }

  /**
   * @param {Object} scale_definition_object
   * @param {ScaleType} scale_type
   * @param {ParentInfo} parent_info
   */
  constructor(scale_definition_object, scale_type, parent_info) {
    assert(
      DiscretizingScale.isDescretizingScale(scale_type),
      `Invalid ${DiscretizingScale.name} scale type ${scale_type}`
    )
    super(scale_definition_object, scale_type, parent_info)
  }

  /**
   * @param {string} domain_keyword
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  _materializeDomainFromKeyword(
    domain_keyword,
    prop_descriptor,
    vega_property_output_state
  ) {
    if (this.domain_ === "auto") {
      /**
       * @type {FieldDefinitionObject}
       */
      const parent = this.parent
      assert(parent instanceof FieldDefinitionObject)

      const {
        vega_xform_obj,
        scale_domain_ref
      } = ContinuousScale.buildExtentsVegaTransform(
        parent.output,
        this.root_context.layer_name,
        prop_descriptor.prop_name,
        // should equate to: [max(min, avg - 2*stddev), min(max, avg + 2*stddev)]
        ExtentFlags.kMin | ExtentFlags.kMax | ExtentFlags.kTwoSigma
      )

      vega_property_output_state.addVegaTransform(
        prop_descriptor.prop_name,
        vega_xform_obj
      )

      return scale_domain_ref
    }
    throw new Error(
      `'${domain_keyword}' is not a valid domain keyword for discretizing scale type ${this.type}`
    )
  }

  /**
   * @param {string} range_keyword
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  _materializeRangeFromKeyword(
    range_keyword,
    prop_descriptor,
    // eslint-disable-next-line no-unused-vars
    vega_property_output_state
  ) {
    throw new Error(
      `'${range_keyword}' is not a valid range keyword for discretizing scale type ${this.type}`
    )
  }

  /**
   *
   * @param {PropDescriptor} prop_descriptor
   * @param {Object} vega_scale_object
   */
  // eslint-disable-next-line no-unused-vars
  _materializeExtraVegaScaleProps(prop_descriptor, vega_scale_object) {
    assert(false)
  }
}
