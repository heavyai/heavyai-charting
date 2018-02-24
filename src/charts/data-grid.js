import d3 from "d3"
import baseMixin from "../mixins/base-mixin"
/**
 * Data grid is a simple widget designed to list the filtered records, providing
 * a simple way to define how the items are displayed.
 *
 * Note: Unlike other charts, the data grid chart (and data table) use the group attribute as a keying function
 * for {@link https://github.com/mbostock/d3/wiki/Arrays#-nest nesting} the data together in groups.
 * Do not pass in a crossfilter group as this will not work.
 *
 * Examples:
 * - {@link http://europarl.me/dc.js/web/ep/index.html List of members of the european parliament}
 * @name dataGrid
 * @memberof dc
 * @mixes dc.baseMixin
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/mbostock/d3/wiki/Selections#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @return {dc.dataGrid}
 */
export default function dataGrid(parent, chartGroup) {
  const LABEL_CSS_CLASS = "dc-grid-label"
  const ITEM_CSS_CLASS = "dc-grid-item"
  const GROUP_CSS_CLASS = "dc-grid-group"
  const GRID_CSS_CLASS = "dc-grid-top"

  const _chart = baseMixin({})

  let _size = 999 // shouldn't be needed, but you might
  let _html = function(d) {
    return "you need to provide an html() handling param:  " + JSON.stringify(d)
  }
  let _sortBy = function(d) {
    return d
  }
  let _order = d3.ascending
  let _beginSlice = 0,
    _endSlice

  let _htmlGroup = function(d) {
    return (
      "<div class='" +
      GROUP_CSS_CLASS +
      "'><h1 class='" +
      LABEL_CSS_CLASS +
      "'>" +
      _chart.keyAccessor()(d) +
      "</h1></div>"
    )
  }

  _chart._doRender = function() {
    _chart.selectAll("div." + GRID_CSS_CLASS).remove()

    renderItems(renderGroups())

    return _chart
  }

  function renderGroups() {
    const groups = _chart
      .root()
      .selectAll("div." + GRID_CSS_CLASS)
      .data(nestEntries(), d => _chart.keyAccessor()(d))

    const itemGroup = groups
      .enter()
      .append("div")
      .attr("class", GRID_CSS_CLASS)

    if (_htmlGroup) {
      itemGroup.html(d => _htmlGroup(d))
    }

    groups.exit().remove()
    return itemGroup
  }

  function nestEntries() {
    const entries = _chart.dimension().top(_size)

    return d3
      .nest()
      .key(_chart.group())
      .sortKeys(_order)
      .entries(
        entries
          .sort((a, b) => _order(_sortBy(a), _sortBy(b)))
          .slice(_beginSlice, _endSlice)
      )
  }

  function renderItems(groups) {
    const items = groups
      .order()
      .selectAll("div." + ITEM_CSS_CLASS)
      .data(d => d.values)

    items
      .enter()
      .append("div")
      .attr("class", ITEM_CSS_CLASS)
      .html(d => _html(d))

    items.exit().remove()

    return items
  }

  _chart._doRedraw = function() {
    return _chart._doRender()
  }

  /**
   * Get or set the index of the beginning slice which determines which entries get displayed by the widget.
   * Useful when implementing pagination.
   * @name beginSlice
   * @memberof dc.dataGrid
   * @instance
   * @param {Number} [beginSlice=0]
   * @return {Number}
   * @return {dc.dataGrid}
   */
  _chart.beginSlice = function(beginSlice) {
    if (!arguments.length) {
      return _beginSlice
    }
    _beginSlice = beginSlice
    return _chart
  }

  /**
   * Get or set the index of the end slice which determines which entries get displayed by the widget
   * Useful when implementing pagination.
   * @name endSlice
   * @memberof dc.dataGrid
   * @instance
   * @param {Number} [endSlice]
   * @return {Number}
   * @return {dc.dataGrid}
   */
  _chart.endSlice = function(endSlice) {
    if (!arguments.length) {
      return _endSlice
    }
    _endSlice = endSlice
    return _chart
  }

  /**
   * Get or set the grid size which determines the number of items displayed by the widget.
   * @name size
   * @memberof dc.dataGrid
   * @instance
   * @param {Number} [size=999]
   * @return {Number}
   * @return {dc.dataGrid}
   */
  _chart.size = function(size) {
    if (!arguments.length) {
      return _size
    }
    _size = size
    return _chart
  }

  /**
   * Get or set the function that formats an item. The data grid widget uses a
   * function to generate dynamic html. Use your favourite templating engine or
   * generate the string directly.
   * @name html
   * @memberof dc.dataGrid
   * @instance
   * @example
   * chart.html(function (d) { return '<div class='item '+data.exampleCategory+''>'+data.exampleString+'</div>';});
   * @param {Function} [html]
   * @return {Function}
   * @return {dc.dataGrid}
   */
  _chart.html = function(html) {
    if (!arguments.length) {
      return _html
    }
    _html = html
    return _chart
  }

  /**
   * Get or set the function that formats a group label.
   * @name htmlGroup
   * @memberof dc.dataGrid
   * @instance
   * @example
   * chart.htmlGroup (function (d) { return '<h2>'.d.key . 'with ' . d.values.length .' items</h2>'});
   * @param {Function} [htmlGroup]
   * @return {Function}
   * @return {dc.dataGrid}
   */
  _chart.htmlGroup = function(htmlGroup) {
    if (!arguments.length) {
      return _htmlGroup
    }
    _htmlGroup = htmlGroup
    return _chart
  }

  /**
   * Get or set sort-by function. This function works as a value accessor at the item
   * level and returns a particular field to be sorted.
   * @name sortBy
   * @memberof dc.dataGrid
   * @instance
   * @example
   * chart.sortBy(function(d) {
   *     return d.date;
   * });
   * @param {Function} [sortByFunction]
   * @return {Function}
   * @return {dc.dataGrid}
   */
  _chart.sortBy = function(sortByFunction) {
    if (!arguments.length) {
      return _sortBy
    }
    _sortBy = sortByFunction
    return _chart
  }

  /**
   * Get or set sort order function.
   * @name order
   * @memberof dc.dataGrid
   * @instance
   * @see {@link https://github.com/mbostock/d3/wiki/Arrays#d3_ascending d3.ascending}
   * @see {@link https://github.com/mbostock/d3/wiki/Arrays#d3_descending d3.descending}
   * @example
   * chart.order(d3.descending);
   * @param {Function} [order=d3.ascending]
   * @return {Function}
   * @return {dc.dataGrid}
   */
  _chart.order = function(order) {
    if (!arguments.length) {
      return _order
    }
    _order = order
    return _chart
  }

  return _chart.anchor(parent, chartGroup)
}
