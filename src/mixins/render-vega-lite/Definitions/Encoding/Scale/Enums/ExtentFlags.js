import assert from "assert"

/* eslint-disable no-undef */
export default class ExtentFlags {
  /**
   * @private
   * @type {Map}
   */
  static val_to_enum_map_ = new Map()
  static sigma_to_enum_map_ = new Map()

  static kOneSigma = new ExtentFlags(1 << 0, "onesigma", "stddev", 1)
  static kTwoSigma = new ExtentFlags(1 << 1, "twosigma", "stddev", 2)
  static kThreeSigma = new ExtentFlags(1 << 2, "threesigma", "stddev", 3)
  static kFourSigma = new ExtentFlags(1 << 3, "foursigma", "stddev", 4)
  static kFiveSigma = new ExtentFlags(1 << 4, "fivesigma", "stddev", 5)
  static kSixSigma = new ExtentFlags(1 << 5, "sixsigma", "stddev", 6)
  // min/mean/max are supposed to be last
  static kMin = new ExtentFlags(1 << 6, "min")
  static kMean = new ExtentFlags(1 << 7, "mean", "avg", 0)
  static kMax = new ExtentFlags(1 << 8, "max")

  /**
   * @param {ExtentFlags} extent_flag
   */
  static opposite(extent_flag) {
    switch (extent_flag) {
      case ExtentFlags.kMin:
        return ExtentFlags.kMax
      case ExtentFlags.kMax:
        return ExtentFlags.kMin
      default:
        assert(false, `${extent_flag.value}`)
    }
    return ExtentFlags.kMin
  }

  /**
   * @param {string} field_output
   * @param {string} layer_name
   * @param {string} prop_name
   * @param {ExtentFlags} extent_flags
   */
  static buildVegaTransformFromExtentFlags(
    field_output,
    layer_name,
    prop_name,
    extent_flags,
    handle_insert_callback = null,
    handle_iteration_complete_callback = null
  ) {
    const vega_xform_build_state = {
      aggregate_xform_obj: {
        type: "aggregate",
        fields: [],
        ops: [],
        as: [],

        // eslint-disable-next-line object-shorthand
        push: function(op) {
          const index = this.ops.indexOf(op)
          if (index >= 0) {
            return this.as[index]
          }

          this.fields.push(field_output)
          this.ops.push(op)
          this.as.push(`${field_output}_${op}`)
          return this.as[this.as.length - 1]
        }
      },
      formula_xform_objs: [],
      vega_xform_outputs: []
    }

    const {
      aggregate_xform_obj,
      formula_xform_objs,
      vega_xform_outputs
    } = vega_xform_build_state

    for (const extent_flag of ExtentFlags.val_to_enum_map_.values()) {
      if (extent_flags & extent_flag) {
        const output = aggregate_xform_obj.push(extent_flag.op_name)
        let added_formulas = []
        if (
          extent_flag >= ExtentFlags.kOneSigma &&
          extent_flag <= ExtentFlags.kSixSigma
        ) {
          const avg_output = aggregate_xform_obj.push(ExtentFlags.kMean.op_name)

          formula_xform_objs.push({
            type: "formula",
            expr: `${avg_output} - ${extent_flag.sigma_factor}*${output}`,
            as: `${field_output}_${extent_flag.extent_name}_below`
          })

          formula_xform_objs.push({
            type: "formula",
            expr: `${avg_output} + ${extent_flag.sigma_factor}*${output}`,
            as: `${field_output}_${extent_flag.extent_name}_above`
          })

          added_formulas = formula_xform_objs.slice(-2)
        }

        if (handle_insert_callback) {
          handle_insert_callback(
            extent_flag,
            output,
            added_formulas,
            vega_xform_build_state
          )
        }
      }
    }

    if (handle_iteration_complete_callback) {
      handle_iteration_complete_callback(vega_xform_build_state)
    }

    const vega_xform_obj = {
      name: `${layer_name}_${prop_name}_xform`,
      source: layer_name,
      transform: [aggregate_xform_obj, ...formula_xform_objs]
    }

    assert(vega_xform_outputs.length > 0)
    const scale_domain_ref = {
      data: vega_xform_obj.name
    }
    if (vega_xform_outputs.length === 1) {
      scale_domain_ref.field = vega_xform_outputs[0]
    } else {
      scale_domain_ref.fields = vega_xform_outputs
    }

    return { vega_xform_obj, scale_domain_ref }
  }

  constructor(value, extent_name, xform_op_name = null, sigma_factor = null) {
    this.value_ = value
    this.extent_name_ = extent_name
    this.xform_op_name_ = xform_op_name || this.extent_name
    this.sigma_factor_ = sigma_factor

    ExtentFlags.val_to_enum_map_.set(this.extent_name, this)
    if (sigma_factor !== null) {
      ExtentFlags.sigma_to_enum_map_.set(sigma_factor, this)
    }
  }

  get value() {
    return this.value_
  }

  get extent_name() {
    return this.extent_name_
  }

  get op_name() {
    return this.xform_op_name_
  }

  get sigma_factor() {
    return this.sigma_factor_
  }

  valueOf() {
    return this.value
  }

  toString() {
    return this.extent_name
  }
}
