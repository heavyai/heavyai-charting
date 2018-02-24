import baseMixin from "../mixins/base-mixin"
import d3 from "d3"
import { groupAll } from "../core/core-async"
import { override } from "../core/core"

/**
 * The data count widget is a simple widget designed to display the number of records selected by the
 * current filters out of the total number of records in the data set. Once created the data count widget
 * will automatically update the text content of the following elements under the parent element.
 *
 * '.total-count' - total number of records
 * '.filter-count' - number of records matched by the current filters
 *
 * @name dataCount
 * @memberof dc
 * @mixes dc.baseMixin
 * @example
 * var ndx = crossfilter(data);
 * var all = ndx.groupAll();
 *
 * dc.dataCount('.dc-data-count')
 *     .dimension(ndx)
 *     .group(all);
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/mbostock/d3/wiki/Selections#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @return {dc.dataCount}
 */
export default function dataCount(parent, chartGroup) {
  let _formatNumber = d3.format(",d")
  const _chart = baseMixin({})
  const _html = { some: "", all: "" }

  /* OVERRIDE ---------------------------------------------------------------- */
  _chart.isCountChart = function() {
    return true
  } // override for count chart
  /* ------------------------------------------------------------------------- */

  override(_chart, "group", function(group, name) {
    if (!arguments.length) {
      return _chart._group()
    }

    groupAll(group)
    return _chart._group(group, name)
  })
  /**
   * Gets or sets an optional object specifying HTML templates to use depending how many items are
   * selected. The text `%total-count` will replaced with the total number of records, and the text
   * `%filter-count` will be replaced with the number of selected records.
   * - all: HTML template to use if all items are selected
   * - some: HTML template to use if not all items are selected
   * @name html
   * @memberof dc.dataCount
   * @instance
   * @example
   * counter.html({
   *      some: '%filter-count out of %total-count records selected',
   *      all: 'All records selected. Click on charts to apply filters'
   * })
   * @param {{some:String, all: String}} [options]
   * @return {{some:String, all: String}}
   * @return {dc.dataCount}
   */
  _chart.html = function(options) {
    if (!arguments.length) {
      return _html
    }
    if (options.all) {
      _html.all = options.all
    }
    if (options.some) {
      _html.some = options.some
    }
    return _chart
  }

  /**
   * Gets or sets an optional function to format the filter count and total count.
   * @name formatNumber
   * @memberof dc.dataCount
   * @instance
   * @see {@link https://github.com/mbostock/d3/wiki/Formatting d3.format}
   * @example
   * counter.formatNumber(d3.format('.2g'))
   * @param {Function} [formatter=d3.format('.2g')]
   * @return {Function}
   * @return {dc.dataCount}
   */
  _chart.formatNumber = function(formatter) {
    if (!arguments.length) {
      return _formatNumber
    }
    _formatNumber = formatter
    return _chart
  }

  /* OVERRIDE ---------------------------------------------------------------- */
  _chart.setDataAsync((group, callbacks) =>
    group
      .valueAsync()
      .then(data => {
        callbacks(null, data)
      })
      .catch(error => {
        callbacks(error)
      })
  )
  /* ------------------------------------------------------------------------- */

  _chart._doRender = function() {
    // ok to call size b/c will hit cache every time
    const tot = _chart.dimension().size()
    _chart
      .root()
      .style("width", "auto")
      .style("height", "auto")

    /* OVERRIDE ---------------------------------------------------------------- */
    let val = null
    if (_chart.dataCache != null) {
      val = _chart.dataCache
    } else {
      val = _chart.group().value()
    }
    /* ------------------------------------------------------------------------- */

    const all = _formatNumber(tot)
    const selected = _formatNumber(val)

    if (tot === val && _html.all !== "") {
      _chart
        .root()
        .html(
          _html.all
            .replace("%total-count", all)
            .replace("%filter-count", selected)
        )
    } else if (_html.some !== "") {
      _chart
        .root()
        .html(
          _html.some
            .replace("%total-count", all)
            .replace("%filter-count", selected)
        )
    } else {
      _chart.selectAll(".total-count").text(all)

      /* OVERRIDE ---------------------------------------------------------------- */
      _chart
        .selectAll(".filter-count")
        .classed("dark-text", all !== selected)
        .text(selected)
      /* ------------------------------------------------------------------------- */
    }
    return _chart
  }

  _chart._doRedraw = function() {
    return _chart._doRender()
  }

  return _chart.anchor(parent, chartGroup)
}
