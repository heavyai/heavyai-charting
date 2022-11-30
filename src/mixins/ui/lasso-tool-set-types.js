/**
 * Enum class describing the various lasso draw tools accessible via the lasso-tool-ui.
 * This is a bit-flag enum that allows users to define a custom tool set to use
 * with the lasso draw tool interface.
 * For example, calling:
 *
 *  pointmap_chart.addDrawControl(LassoToolSetTypes.kCircle | LassoToolSetTypes.kPolyLine)
 *
 * will enable only the circle and polyline tools.
 *
 * Calling:
 *
 *  pointmap_chart.addDrawControl(LassoToolSetTypes.kStandard)
 *
 * will enable the standard set of tools, currently circle, polyline, and lasso
 */
export default class LassoToolSetTypes {
  // NOTE: the no-undef eslint disabling below is due to the outdated nature
  // of the babel-eslint package and its apparent inappropriate handling of
  // static member variables

  /**
   * Bitflag identifier for the Circle draw tool
   * @type {Number}
   */
  // eslint-disable-next-line no-undef
  static kCircle = new LassoToolSetTypes(1 << 0)

  /**
   * Bitflag identifier for the Polyline draw tool
   * @type {Number}
   */
  // eslint-disable-next-line no-undef
  static kPolyLine = new LassoToolSetTypes(1 << 1)

  /**
   * Bitflag identifier for the Lasso draw tool
   * @type {Number}
   */
  // eslint-disable-next-line no-undef
  static kLasso = new LassoToolSetTypes(1 << 2)

  /**
   * Bitflag identifier for the CrossSection draw tool
   * @type {Number}
   */
  // eslint-disable-next-line no-undef
  static kCrossSection = new LassoToolSetTypes(1 << 3)

  // eslint-disable-next-line no-undef
  static kAll = new LassoToolSetTypes(
    LassoToolSetTypes.kCircle |
      LassoToolSetTypes.kPolyLine |
      LassoToolSetTypes.kLasso |
      LassoToolSetTypes.kCrossSection
  )

  // eslint-disable-next-line no-undef
  static kStandard = new LassoToolSetTypes(
    LassoToolSetTypes.kCircle |
      LassoToolSetTypes.kPolyLine |
      LassoToolSetTypes.kLasso
  )

  constructor(value) {
    this.value = value
  }

  valueOf() {
    return this.value
  }

  toString() {
    return `${this.value}`
  }
}
