import assert from "assert"

import ScaleDefinitionObject from "../ScaleDefinitionObject"
import FieldDefinitionObject from "../../FieldDefinitionObject"
import ScaleType from "../Enums/ScaleType"
import MeasurementType from "../../../../PropDescriptor/Enums/MeasurementType"

export default class DiscreteScale extends ScaleDefinitionObject {
  /**
   *
   * @param {ScaleType} scale_type
   * @returns {boolean}
   */
  static isDiscreteScale(scale_type) {
    return scale_type === ScaleType.kOrdinal
  }

  /**
   * @param {ScaleType} scale_type
   * @param {MeasurementType} measurement_type
   * @returns {boolean}
   */
  static validateScaleMeasurement(scale_type, measurement_type) {
    assert(DiscreteScale.isDiscreteScale(scale_type))
    if (
      measurement_type !== MeasurementType.kNominal &&
      measurement_type !== MeasurementType.kOrdinal
    ) {
      throw new Error(
        `Discrete scales can only be used with discrete ('${MeasurementType.kNominal}' or '${MeasurementType.kOrdinal}') field type encodings`
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
      DiscreteScale.isDiscreteScale(scale_type),
      `Invalid ${DiscreteScale.name} scale type ${scale_type}`
    )
    super(scale_definition_object, scale_type, parent_info)

    this.default_value_ = null
    if (Object.hasOwn(scale_definition_object, "default")) {
      this.default_value_ = scale_definition_object.default
    } else if (Object.hasOwn(scale_definition_object, "unknown")) {
      // NOTE: the "unknown" property a property defined by d3 ordinal scales:
      // https://github.com/d3/d3-scale#ordinal_unknown
      // but it is not documented by vega or vega-lite's ordinal scales.
      // Exposing it to further align with d3 props
      this.default_value_ = scale_definition_object.unknown
    }
  }

  /**
   * @param {string} field_output
   * @param {string} layer_name
   * @param {string} prop_name
   */
  static buildDistinctVegaTransform(field_output, layer_name, prop_name) {
    const vega_xform_obj = {
      name: `${layer_name}_${prop_name}_xform`,
      source: layer_name,
      transform: [
        {
          type: "aggregate",
          fields: [field_output],
          ops: ["distinct"],
          as: [`${field_output}_distinct`]
        }
      ]
    }

    const scale_domain_ref = {
      data: vega_xform_obj.name,
      field: vega_xform_obj.transform[0].as[0]
    }

    return { vega_xform_obj, scale_domain_ref }
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
      } = DiscreteScale.buildDistinctVegaTransform(
        parent.output,
        this.root_context.layer_name,
        prop_descriptor.prop_name
      )

      vega_property_output_state.addVegaTransform(
        prop_descriptor.prop_name,
        vega_xform_obj
      )

      return scale_domain_ref
    }

    throw new Error(
      `'${domain_keyword}' is not a valid domain keyword for discrete scale type ${this.type}`
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
      `'${range_keyword}' is not a valid range keyword for discrete scale type ${this.type}`
    )
  }

  /**
   * @param {PropDescriptor} prop_descriptor
   * @param {Object} vega_scale_obj
   */
  _materializeExtraVegaScaleProps(prop_descriptor, vega_scale_obj) {
    super._materializeExtraVegaScaleProps(prop_descriptor, vega_scale_obj)
    if (this.default_value_ !== null) {
      // eslint-disable-next-line no-warning-comments
      // TODO(croot): should we validate the default value?
      vega_scale_obj.default = this.default_value_
    }
  }
}
