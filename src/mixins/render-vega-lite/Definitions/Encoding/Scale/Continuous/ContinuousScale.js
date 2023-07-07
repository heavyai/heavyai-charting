import assert from "assert"

import ScaleDefinitionObject from "../ScaleDefinitionObject"
import FieldDefinitionObject from "../../FieldDefinitionObject"
import MeasurementType from "../../../../PropDescriptor/Enums/MeasurementType"
import ScaleType from "../Enums/ScaleType"
import InterpolateType from "../Enums/InterpolateType"
import ExtentFlags from "../Enums/ExtentFlags"
import AccumulatorType from "../Enums/AccumulatorType"
import ColorChannelDescriptor from "../../../../PropDescriptor/CommonChannels/ColorChannelDescriptor"

export default class ContinuousScale extends ScaleDefinitionObject {
  /**
   *
   * @param {ScaleType} scale_type
   * @returns {boolean}
   */
  static isContinuousScale(scale_type) {
    return (
      scale_type === ScaleType.kLinear ||
      scale_type === ScaleType.kLog ||
      scale_type === ScaleType.kSqrt ||
      scale_type === ScaleType.kPow
    )
  }

  /**
   * @param {ScaleType} scale_type
   * @param {MeasurementType} measurement_type
   * @returns {boolean}
   */
  static validateScaleMeasurement(scale_type, measurement_type) {
    assert(ContinuousScale.isContinuousScale(scale_type))
    if (measurement_type !== MeasurementType.kQuantitative) {
      throw new Error(
        `Continuous scales can only be used with continuous '${MeasurementType.kQuantitative}' field type encodings`
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
      ContinuousScale.isContinuousScale(scale_type),
      `Invalid ${ContinuousScale.name} scale type ${scale_type}`
    )
    super(scale_definition_object, scale_type, parent_info)

    this.clamp_ = true
    if (Object.hasOwn(scale_definition_object, "clamp")) {
      if (typeof scale_definition_object.clamp !== "boolean") {
        this.error_message = `Invalid 'clamp' property. The 'clamp' property must be a boolean for continuous scales`
        return
      }
      this.clamp_ = scale_definition_object.clamp
    }

    this.interpolate_type_ = InterpolateType.kAuto
    if (Object.hasOwn(scale_definition_object, "interpolate")) {
      if (typeof scale_definition_object.interpolate !== "string") {
        this.error_message = `Invalid ${
          scale_definition_object.interpolate
        } value for the 'interpolate' property of a continuous scale. It must be a string and must be one of ${Object.keys(
          InterpolateType.val_to_enum_map_
        )}`
      }
      this.interpolate_type_ = InterpolateType.getInterpolateTypeFromString(
        scale_definition_object.interpolate
      )
    }
  }

  // eslint-disable-next-line no-undef
  static max_subdivisions = 25

  /**
   * @param {string} field_output
   * @param {string} layer_name
   * @param {string} prop_name
   * @param {ExtentFlags} extent_flags
   * @param {number} [num_subdivisions=0] Number of subdivisions between the computed extents.
   *                                      This could be used, for example, to fill out a linear
   *                                      stop for a certain number of ranges
   */
  static buildExtentsVegaTransform(
    field_output,
    layer_name,
    prop_name,
    extent_flags,
    num_subdivisions = 0
  ) {
    assert(num_subdivisions <= ContinuousScale.max_subdivisions)
    return ExtentFlags.buildVegaTransformFromExtentFlags(
      field_output,
      layer_name,
      prop_name,
      extent_flags,
      (
        extent_flag,
        agg_xform_output,
        formula_xform_outputs,
        { formula_xform_objs, vega_xform_outputs }
      ) => {
        if (
          extent_flag === ExtentFlags.kMin ||
          extent_flag === ExtentFlags.kMax
        ) {
          // these need to be processed after the sigmas/stddevs, so they should be last, or at least
          // after them in the map.
          if (formula_xform_objs.length === 0) {
            vega_xform_outputs.push(agg_xform_output)
          } else {
            formula_xform_objs.push({
              type: "formula",
              expr: `${
                ExtentFlags.opposite(extent_flag).op_name
              }(${agg_xform_output}, ${
                formula_xform_objs[formula_xform_objs.length - 2].as
              })`,
              as: `${field_output}_extents_${extent_flag.extent_name}`
            })
          }
        } else if (
          formula_xform_objs.length === 0 &&
          (extent_flag < ExtentFlags.kOneSigma ||
            extent_flag > ExtentFlags.kSixSigma)
        ) {
          vega_xform_outputs.push(agg_xform_output)
        }
      },
      ({ formula_xform_objs, vega_xform_outputs }) => {
        if (vega_xform_outputs.length === 0) {
          assert(formula_xform_objs.length >= 2)
          const start_range_formula =
            formula_xform_objs[formula_xform_objs.length - 2]
          const end_range_formula =
            formula_xform_objs[formula_xform_objs.length - 1]
          vega_xform_outputs.push(start_range_formula.as)
          if (num_subdivisions > 0) {
            const diff_var_name = `${field_output}_extents_diff`
            formula_xform_objs.push({
              type: "formula",
              expr: `(${end_range_formula.as} - ${
                start_range_formula.as
              }) / ${num_subdivisions + 1}.0`,
              as: diff_var_name
            })

            for (let i = 1; i <= num_subdivisions; ++i) {
              const var_name = `${field_output}_extents_stop_${i}`
              formula_xform_objs.push({
                type: "formula",
                expr: `${start_range_formula.as} + ${i}*${diff_var_name}`,
                as: var_name
              })
              vega_xform_outputs.push(var_name)
            }
          }
          vega_xform_outputs.push(end_range_formula.as)
        }
        assert(vega_xform_outputs.length >= 2)
      }
    )
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

      const num_subdivisions = this.range_.length - 2
      if (num_subdivisions > ContinuousScale.max_subdivisions) {
        throw new Error(
          `There are too many ranges (${
            this.range_.length
          }) to auto-fill a domain. The max number of ranges is ${ContinuousScale.max_subdivisions +
            2}`
        )
      }

      const {
        vega_xform_obj,
        scale_domain_ref
      } = ContinuousScale.buildExtentsVegaTransform(
        parent.output,
        this.root_context.layer_name,
        prop_descriptor.prop_name,
        // should equate to: [max(min, avg - 2*stddev), min(max, avg + 2*stddev)]
        ExtentFlags.kMin | ExtentFlags.kMax | ExtentFlags.kTwoSigma,
        this.range_.length - 2
      )

      vega_property_output_state.addVegaTransform(
        prop_descriptor.prop_name,
        vega_xform_obj
      )

      return scale_domain_ref
    } else if (this.domain_ === AccumulatorType.kDensity.toString()) {
      this.accumulator_ = AccumulatorType.kDensity
      // NOTE: going to the domain out later in _materializeExtraVegaScaleProps
      // after the ranges have been materialized/validated
      return []
    }
    throw new Error(
      `'${domain_keyword}' is not a valid domain keyword for continuous scale type ${this.type}`
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
      `'${range_keyword}' is not a valid range keyword for continuous scale type ${this.type}`
    )
  }

  /**
   *
   * @param {PropDescriptor} prop_descriptor
   * @param {Object} vega_scale_object
   */
  _materializeExtraVegaScaleProps(prop_descriptor, vega_scale_object) {
    vega_scale_object.clamp = this.clamp_
    if (
      this.interpolate_type_ !== InterpolateType.kAuto &&
      prop_descriptor instanceof ColorChannelDescriptor
    ) {
      vega_scale_object.interpolator = `${this.interpolate_type_}`
    }

    if (this.accumulator_ !== null) {
      assert(this.accumulator_ === AccumulatorType.kDensity)
      assert(Array.isArray(vega_scale_object.domain))
      assert(vega_scale_object.domain.length === 0)

      if (!(prop_descriptor instanceof ColorChannelDescriptor)) {
        throw new Error(
          `Density accumulation scales can only be applied to color properties`
        )
      }

      assert(Array.isArray(vega_scale_object.range))
      assert(vega_scale_object.range.length > 1)

      const density_diff = 1.0 / (vega_scale_object.range.length - 1)
      for (
        let density_val = 0.0;
        density_val <= 1.0;
        density_val += density_diff
      ) {
        vega_scale_object.domain.push(density_val)
      }

      vega_scale_object.accumulator = this.accumulator_.toString()
      vega_scale_object.minDensityCnt = "-2ndStdDev"
      vega_scale_object.maxDensityCnt = "2ndStdDev"

      // density accumulation will force on clamp

      // eslint-disable-next-line no-warning-comments
      // TODO(croot): is this too heavy handed?
      vega_scale_object.clamp = true
    }
  }
}
