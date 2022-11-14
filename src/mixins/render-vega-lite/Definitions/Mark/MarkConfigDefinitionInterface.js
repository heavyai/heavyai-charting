import ConfigDefinitionInterface from "../Config/ConfigDefinitionInterface"

export default class MarkConfigDefinitionObject extends ConfigDefinitionInterface {
  // eslint-disable-next-line no-undef
  static key = "mark"

  // eslint-disable-next-line no-undef
  static defaults = {
    color: "#4682b4",
    opacity: 1,
    fillOpacity: 1,
    strokeOpacity: 1,
    strokeJoin: "miter"
  }

  /**
   * @param {Object} definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(definition_object, parent_info) {
    super(definition_object, parent_info)
    this.width_ = MarkConfigDefinitionObject.defaults.width
    if (Object.hasOwn(definition_object, "width")) {
      this.width_ = definition_object.width
    }
    this.height_ = MarkConfigDefinitionObject.defaults.height
    if (Object.hasOwn(definition_object, "height")) {
      this.height_ = definition_object.height
    }
    this.color_ = MarkConfigDefinitionObject.defaults.color
    if (Object.hasOwn(definition_object, "color")) {
      this.color_ = definition_object.color
    }
    this.fill_ = MarkConfigDefinitionObject.defaults.fill
    if (Object.hasOwn(definition_object, "fill")) {
      this.fill_ = definition_object.fill
    }
    this.stroke_ = MarkConfigDefinitionObject.defaults.stroke
    if (Object.hasOwn(definition_object, "stroke")) {
      this.stroke_ = definition_object.stroke
    }
    this.opacity_ = MarkConfigDefinitionObject.defaults.opacity
    if (Object.hasOwn(definition_object, "opacity")) {
      this.opacity_ = definition_object.opacity
    }
    this.fillOpacity_ = MarkConfigDefinitionObject.defaults.fillOpacity
    if (Object.hasOwn(definition_object, "fillOpacity")) {
      this.fillOpacity_ = definition_object.fillOpacity
    }
    this.strokeOpacity_ = MarkConfigDefinitionObject.defaults.strokeOpacity
    if (Object.hasOwn(definition_object, "strokeOpacity")) {
      this.strokeOpacity_ = definition_object.strokeOpacity
    }
    // eslint-disable-next-line no-warning-comments
    // TODO(croot): make stroke join an enum
    this.strokeJoin_ = MarkConfigDefinitionObject.defaults.strokeJoin
    if (Object.hasOwn(definition_object, "strokeJoin")) {
      this.strokeJoin_ = definition_object.strokeJoin
    }
    this.strokeMiterLimit_ = MarkConfigDefinitionObject.defaults.strokMiterLimit
    if (Object.hasOwn(definition_object, "strokMiterLimit")) {
      this.strokeMiterLimit_ = definition_object.strokMiterLimit
    }
    this.strokeWidth_ = MarkConfigDefinitionObject.defaults.strokeWidth
    if (Object.hasOwn(definition_object, "strokeWidth")) {
      this.strokeWidth_ = definition_object.strokeWidth
    }
  }

  get width() {
    return this.width_
  }

  get height() {
    return this.height_
  }

  get color() {
    return this.color_
  }

  get fill() {
    return this.fill_
  }

  get stroke() {
    return this.stroke_
  }

  get opacity() {
    return this.opacity_
  }

  get fillOpacity() {
    return this.fillOpacity_
  }

  get strokeOpacity() {
    return this.strokeOpacity_
  }

  get strokeJoin() {
    return this.strokeJoin_
  }

  get strokeMiterLimit() {
    return this.strokeMiterLimit_
  }

  get strokeWidth() {
    return this.strokeWidth_
  }
}
