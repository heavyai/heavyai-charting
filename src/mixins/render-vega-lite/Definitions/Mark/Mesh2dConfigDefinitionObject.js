import ConfigDefinitionInterface from "../Config/ConfigDefinitionInterface"

export default class Mesh2dConfigDefinitionObject extends ConfigDefinitionInterface {
  // eslint-disable-next-line no-undef
  static key = "mesh2d"

  // eslint-disable-next-line no-undef
  static defaults = {
    color: "#4682b4",
    opacity: 1,
    fillOpacity: 1
  }

  /**
   * @param {Object} definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(definition_object, parent_info) {
    super(definition_object, parent_info)

    this.color_ = Mesh2dConfigDefinitionObject.defaults.color
    if (Object.hasOwn(definition_object, "color")) {
      this.color_ = definition_object.color
    }
    this.fill_ = Mesh2dConfigDefinitionObject.defaults.fill
    if (Object.hasOwn(definition_object, "fill")) {
      this.fill_ = definition_object.fill
    }
    this.opacity_ = Mesh2dConfigDefinitionObject.defaults.opacity
    if (Object.hasOwn(definition_object, "opacity")) {
      this.opacity_ = definition_object.opacity
    }
    this.fillOpacity_ = Mesh2dConfigDefinitionObject.defaults.fillOpacity
    if (Object.hasOwn(definition_object, "fillOpacity")) {
      this.fillOpacity_ = definition_object.fillOpacity
    }
  }

  get color() {
    return this.color
  }

  get fill() {
    return this.fill_
  }

  get opacity() {
    return this.opacity_
  }

  get fillOpacity() {
    return this.fillOpacity_
  }
}
