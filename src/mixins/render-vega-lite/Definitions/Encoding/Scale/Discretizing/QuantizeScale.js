import DiscretizingScale from "./DiscretizingScale"
import ScaleType from "../Enums/ScaleType"

export default class QuantizeScale extends DiscretizingScale {
  /**
   *
   * @param {Object} scale_definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(scale_definition_object, parent_info) {
    super(scale_definition_object, ScaleType.kQuantize, parent_info)
  }
}
