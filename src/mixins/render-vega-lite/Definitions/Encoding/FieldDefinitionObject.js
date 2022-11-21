import assert from "assert"

import PropertiesDefinitionInterface from "../PropertiesDefinitionInterface"
import MeasurementType from "../../PropDescriptor/Enums/MeasurementType"
import ScaleType from "./Scale/Enums/ScaleType"
import ContinuousScale from "./Scale/Continuous/ContinuousScale"
import DiscreteScale from "./Scale/Discrete/DiscreteScale"
import DiscretizingScale from "./Scale/Discretizing/DiscretizingScale"
import LegendDefinitionObject from "../Legend/LegendDefinitionObject"
import { constructScaleFromDefinition } from "./Scale/Utils"
import {
  PositionChannelDescriptor,
  ColorChannelDescriptor,
  SizeChannelDescriptor,
  OpacityChannelDescriptor
} from "../../PropDescriptor/CommonChannelDescriptors"

export default class FieldDefinitionObject extends PropertiesDefinitionInterface {
  /**
   * @param {Object} field_definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(field_definition_object, parent_info) {
    super(field_definition_object, parent_info)
    assert(Object.hasOwn(field_definition_object, "field"))
    if (typeof field_definition_object.field !== "string") {
      this.error_message = `The 'field' property in a field definition must by a string`
      return
    }
    /**
     * @type {string}
     */
    this.field_ = field_definition_object.field
    this.output_ = null

    /**
     * @type {MeasurementType}
     */
    this.measurement_type_ = null
    if (Object.hasOwn(field_definition_object, "type")) {
      if (typeof field_definition_object.type !== "string") {
        this.error_message = `The 'type' property in a field definition must be a string`
      }

      // eslint-disable-next-line no-restricted-syntax
      try {
        this.measurement_type_ = MeasurementType.getMeasurementTypeFromString(
          field_definition_object.type
        )
      } catch (err) {
        this.error_message = err.message
      }
    }
  }

  /**
   * @type {string}
   */
  get field() {
    return this.field_
  }

  /**
   * @type {string}
   */
  get output() {
    return this.output_
  }

  /**
   * @type {MeasurementType}
   */
  get measurement_type() {
    return this.measurement_type_
  }

  /**
   * @param {PropDescriptor} prop_descriptor
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materializeProperty(prop_descriptor, vega_property_output_state) {
    const prop_name = prop_descriptor.prop_name

    if (this.hasError()) {
      throw new Error(
        `Invalid field definition for property '${prop_name}'. ${this.error_message}`
      )
    }

    this.output_ = prop_name
    vega_property_output_state.addSqlParserTransform(prop_name, {
      type: "project",
      expr: this.field,
      as: prop_name
    })

    const vega_mark_property_object = { field: prop_name }

    if (this.measurement_type_ !== null) {
      prop_descriptor.validateMeasurementType(this.measurement_type_)
    }

    let scale_definition_object = null
    const context = this
    const default_scale_type_callback = () => {
      if (context.measurement_type_ === null) {
        context.measurement_type_ = prop_descriptor.getDefaultMeasurementType()
      }
      if (prop_descriptor instanceof PositionChannelDescriptor) {
        assert(context.measurement_type_ === MeasurementType.kQuantitative)
        return ScaleType.kLinear
      } else if (
        prop_descriptor instanceof ColorChannelDescriptor ||
        prop_descriptor instanceof SizeChannelDescriptor ||
        prop_descriptor instanceof OpacityChannelDescriptor
      ) {
        switch (context.measurement_type_) {
          case MeasurementType.kNominal:
          case MeasurementType.kOrdinal:
            return ScaleType.kOrdinal
          case MeasurementType.kQuantitative:
          case MeasurementType.kTemporal:
            return ScaleType.kLinear
          default:
            assert(
              false,
              `unhandled measurement type ${context.measurement_type_}`
            )
        }
      } else {
        switch (context.measurement_type_) {
          case MeasurementType.kNominal:
          case MeasurementType.kOrdinal:
            return ScaleType.kOrdinal
          case MeasurementType.kQuantitative:
          case MeasurementType.kTemporal:
            return ScaleType.kLinear
          default:
            assert(
              false,
              `unhandled measurement type ${context.measurement_type_}`
            )
        }
      }

      assert(false, "unreachable")
      return ScaleType.kLinear
    }

    const validate_scale_type = scale_type => {
      if (ContinuousScale.isContinuousScale(scale_type)) {
        if (context.measurement_type_ === null) {
          context.measurement_type_ = MeasurementType.kQuantitative
        } else {
          ContinuousScale.validateScaleMeasurement(
            scale_type,
            context.measurement_type
          )
        }
      } else if (DiscreteScale.isDiscreteScale(scale_type)) {
        if (context.measurement_type_ === null) {
          context.measurement_type_ = MeasurementType.kOrdinal
        } else {
          DiscreteScale.validateScaleMeasurement(
            scale_type,
            context.measurement_type
          )
        }
      } else if (DiscretizingScale.isDescretizingScale(scale_type)) {
        if (context.measurement_type_ === null) {
          context.measurement_type_ = MeasurementType.kQuantitative
        } else {
          DiscretizingScale.validateScaleMeasurement(
            scale_type,
            context.measurement_type_
          )
        }
      }
    }

    const default_scale_name_callback = () =>
      `${this.root_context.layer_name}_${prop_name}`

    const scale_parent_info = { parent: this, prop_name: "scale" }
    if (this.hasProperty(scale_parent_info.prop_name)) {
      if (typeof this.definition_object_.scale !== "object") {
        throw new Error(
          `Inavlid scale definition for property '${prop_name}'. Scales must be an object or null`
        )
      }
      if (this.definition_object_.scale !== null) {
        if (!prop_descriptor.can_have_scale_definition) {
          throw new Error(
            `Invalid field definition for property '${prop_name}'. The property does not work with scales.`
          )
        }
        scale_definition_object = constructScaleFromDefinition(
          this.definition_object_.scale,
          scale_parent_info,
          default_scale_name_callback,
          default_scale_type_callback,
          validate_scale_type
        )
      }
    } else if (prop_descriptor.can_have_scale_definition) {
      scale_definition_object = constructScaleFromDefinition(
        prop_descriptor.buildDefaultScaleDefinition(scale_parent_info),
        scale_parent_info,
        default_scale_name_callback,
        default_scale_type_callback,
        validate_scale_type
      )
    }
    if (this.measurement_type_ === null) {
      this.measurement_type_ = prop_descriptor.getDefaultMeasurementType()
    }

    if (scale_definition_object) {
      scale_definition_object.materializeProperty(
        prop_descriptor,
        vega_property_output_state
      )
      vega_mark_property_object.scale = scale_definition_object.name
    }

    const {
      legend = scale_definition_object &&
      prop_descriptor instanceof ColorChannelDescriptor
        ? {}
        : null
    } = this.definition_object_
    if (legend !== null) {
      if (!(prop_descriptor instanceof ColorChannelDescriptor)) {
        throw new TypeError(
          `A legend definition is currently supplied for property ${prop_name}, but legends are currently only supported for colors`
        )
      }
      new LegendDefinitionObject(legend, {
        parent: this,
        prop_name: "legend"
      }).materializeProperty(prop_descriptor, vega_property_output_state)
    }

    const final_property_object = {}
    prop_descriptor.vega_mark_prop_names.forEach(vega_mark_prop_name => {
      final_property_object[vega_mark_prop_name] = vega_mark_property_object
    })
    vega_property_output_state.addMarkProperty(prop_name, final_property_object)
  }
}
