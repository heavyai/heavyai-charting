import assert from "assert"

export default class RasterLayerContext {
  /**
   * @param {Object} chart
   * @param {string} table_name
   * @param {string} layer_type
   * @param {Object} layer
   * @param {string} layer_name
   * @param {(number|null)} [last_filtered_size=null]
   */
  constructor(
    chart,
    table_name,
    layer_type,
    layer,
    layer_name,
    last_filtered_size = null
  ) {
    assert(Boolean(chart))
    assert(typeof chart === "object")

    /**
     * @type {Object}
     */
    this.chart_ = chart

    assert(typeof table_name === "string")
    /**
     * @type {string}
     */
    this.table_name_ = table_name

    assert(typeof layer_type === "string")
    /**
     * @type {string}
     */
    this.layer_type_ = layer_type

    assert(Boolean(layer))
    assert(typeof layer === "object")
    /**
     * @type {Object}
     */
    this.layer_ = layer

    assert(typeof layer_name === "string")
    /**
     * @type {string}
     */
    this.layer_name_ = layer_name

    this.last_filtered_size_ = last_filtered_size
  }

  /**
   * @type {Object}
   */
  get chart() {
    return this.chart_
  }

  /**
   * @type {string}
   */
  get table_name() {
    return this.table_name_
  }

  /**
   * @type {string}
   */
  get layer_type() {
    return this.layer_type_
  }

  /**
   * @type {Object}
   */
  get layer() {
    return this.layer_
  }

  /**
   * @type {string}
   */
  get layer_name() {
    return this.layer_name_
  }

  /**
   * @type {(number|null)}
   */
  get last_filtered_size() {
    return this.last_filtered_size_
  }
}
