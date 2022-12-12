import MarkConfigDefinitionObject from "./MarkConfigDefinitionObject"

export default class WindBarbConfigDefinitionObject extends MarkConfigDefinitionObject {
  // eslint-disable-next-line no-undef
  static key = "windbarb"

  // eslint-disable-next-line no-undef
  static defaults = Object.assign(
    {
      size: 25
    },
    MarkConfigDefinitionObject.defaults
  )

  /**
   * @param {Object} definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(definition_object, parent_info) {
    super(definition_object, parent_info)

    this.size_ = 25
    if (Object.hasOwn(definition_object, "size")) {
      this.size_ = definition_object.size
    }

    this.quantizeDirection_ =
      WindBarbConfigDefinitionObject.defaults.quantizeDirection
    if (Object.hasOwn(definition_object, "quantizeDirection")) {
      this.quantizeDirection_ = definition_object.quantizeDirection
    }

    this.anchorScale_ = WindBarbConfigDefinitionObject.defaults.anchorScale
    if (Object.hasOwn(definition_object, "anchorScale")) {
      this.anchorScale_ = definition_object.anchorScale
    }
  }

  get size() {
    return this.size_
  }

  get quantizeDirection() {
    return this.quantizeDirection_
  }

  get anchorScale() {
    return this.anchorScale_
  }
}
