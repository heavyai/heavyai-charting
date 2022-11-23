import assert from "assert"

import DiscretizingScale from "./DiscretizingScale"
import FieldDefinitionObject from "../../FieldDefinitionObject"
import ScaleType from "../Enums/ScaleType"
import ExtentFlags from "../Enums/ExtentFlags"
import ContinuousScale from "../Continuous/ContinuousScale"

export default class ThresholdScale extends DiscretizingScale {
  /**
   *
   * @param {Object} scale_definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(scale_definition_object, parent_info) {
    super(scale_definition_object, ScaleType.kThreshold, parent_info)
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
      assert(Array.isArray(this.range_))
      assert(this.range_.length > 1)
      /**
       * @type {FieldDefinitionObject}
       */
      const parent = this.parent
      assert(parent instanceof FieldDefinitionObject)

      // Automatically fills out threshold domain based on the number of ranges
      // supplied. The domain is filled out using various sigma intervals (std-deviations
      // from the mean). For example, if 6 ranges are provided, the domain would
      // be [-2stddev, -1stddev, mean, +1stddev, +2stddev]
      //
      // if 7 ranges are provided, the domain would be:
      // [-3stddev, -2stddev, -1stddev, +1stddev, +2stddev, +3stddev]

      /**
       * @type {ExtentFlags}
       */
      let extent_flags = 0

      let sigma_step = Math.floor((this.range_.length + 1) / 2) - 1
      let curr_sigma = ExtentFlags.sigma_to_enum_map_.get(sigma_step)
      if (!curr_sigma) {
        throw new Error(
          `Cannot automatically deduce a threshold domain for ${
            this.range_.length
          } range values. Automatic deduction can only succeed with a max of ${(Array.from(
            ExtentFlags.sigma_to_enum_map_.keys()
          ).pop() +
            1) *
            2} range values`
        )
      }
      while (
        curr_sigma &&
        curr_sigma.sigma_factor >= ExtentFlags.kOneSigma.sigma_factor
      ) {
        assert(curr_sigma)
        extent_flags |= curr_sigma
        sigma_step -= 1
        curr_sigma = ExtentFlags.sigma_to_enum_map_.get(sigma_step)
      }

      if (this.range_.length % 2 === 0) {
        // even number of range values, add the mean
        extent_flags |= ExtentFlags.kMean
      }

      const {
        vega_xform_obj,
        scale_domain_ref
      } = ExtentFlags.buildVegaTransformFromExtentFlags(
        parent.output,
        this.root_context.layer_name,
        prop_descriptor.prop_name,
        extent_flags,
        (
          extent_flag,
          agg_xform_output,
          formula_xform_outputs,
          { vega_xform_outputs }
        ) => {
          if (
            extent_flag >= ExtentFlags.kOneSigma &&
            extent_flag <= ExtentFlags.kSixSigma
          ) {
            assert(formula_xform_outputs.length === 2)
            vega_xform_outputs.unshift(formula_xform_outputs[0].as)
            vega_xform_outputs.push(formula_xform_outputs[1].as)
          } else if (extent_flag === ExtentFlags.kMin) {
            vega_xform_outputs.unshift(agg_xform_output)
          } else if (extent_flag === ExtentFlags.kMax) {
            vega_xform_outputs.push(agg_xform_output)
          } else if (extent_flag === ExtentFlags.kMean) {
            vega_xform_outputs.splice(
              Math.floor(vega_xform_outputs.length / 2),
              0,
              agg_xform_output
            )
          } else {
            assert(false, `Unsupported extent flag ${extent_flag.extent_name}`)
          }
        }
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
}
