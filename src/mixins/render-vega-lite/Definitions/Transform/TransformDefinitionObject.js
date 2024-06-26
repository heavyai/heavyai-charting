import PropertiesDefinitionInterface from "../PropertiesDefinitionInterface"
import SampleDefinitionObject from "../Transform/Transforms/SampleDefinitionObject"
import LimitDefinitionObject from "../Transform/Transforms/LimitDefinitionObject"
import RasterMesh2dDefinitionObject from "../Transform/Transforms/RasterMesh2dDefinitionObject"
import CrossSection2dDefinitionObject from "../Transform/Transforms/CrossSection2dDefinitionObject"
import CrossSectionTerrainDefinitionObject from "../Transform/Transforms/CrossSectionTerrainDefinitionObject"

export default class TransformDefinitionObject extends PropertiesDefinitionInterface {
  /**
   * @param {Object} definition_object
   * @param {RasterLayerContext} root_context
   */
  constructor(definition_object, root_context) {
    super(definition_object, null, root_context)

    if (!Array.isArray(definition_object)) {
      throw new Error(
        `Invalid transform definition. It must be an array of objects`
      )
    }

    /**
     * @type {PropertiesDefinitionInterface[]}
     */
    this.transforms_ = []
    definition_object.forEach((xform_definition, index) => {
      if (typeof xform_definition !== "object") {
        throw new Error(
          `Invalid transform definition at index ${index}. It must be an object but is of type ${typeof xform_definition}`
        )
      }
      if (Object.hasOwn(xform_definition, SampleDefinitionObject.key)) {
        this.transforms_.push(
          new SampleDefinitionObject(xform_definition, {
            parent: this,
            prop_name: `${index}/${SampleDefinitionObject.key}`
          })
        )
      } else if (Object.hasOwn(xform_definition, LimitDefinitionObject.key)) {
        this.transforms_.push(
          new LimitDefinitionObject(xform_definition, {
            parent: this,
            prop_name: `${index}/${LimitDefinitionObject.key}`
          })
        )
      } else if (
        Object.hasOwn(xform_definition, RasterMesh2dDefinitionObject.key)
      ) {
        this.transforms_.push(
          new RasterMesh2dDefinitionObject(xform_definition, {
            parent: this,
            prop_name: `${index}/${RasterMesh2dDefinitionObject.key}`
          })
        )
      } else if (
        Object.hasOwn(xform_definition, CrossSection2dDefinitionObject.key)
      ) {
        this.transforms_.push(
          new CrossSection2dDefinitionObject(xform_definition, {
            parent: this,
            prop_name: `${index}/${CrossSection2dDefinitionObject.key}`
          })
        )
      } else if (
        Object.hasOwn(xform_definition, CrossSectionTerrainDefinitionObject.key)
      ) {
        this.transforms_.push(
          new CrossSectionTerrainDefinitionObject(xform_definition, {
            parent: this,
            prop_name: `${index}/${CrossSectionTerrainDefinitionObject.key}`
          })
        )
      } else {
        throw new Error(
          `Invalid transform object ${JSON.stringify(
            xform_definition
          )} at index ${index}`
        )
      }
    })
  }

  /**
   * @param {VegaPropertyOutputState} vega_property_output_state
   */
  materialize(vega_property_output_state) {
    this.transforms_.forEach(transform => {
      transform.materialize(vega_property_output_state)
    })
  }
}
