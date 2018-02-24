import d3 from "d3"
import { pluck } from "../utils/utils"
import legendMixin from "../mixins/dc-legend-mixin"
/**
 * Legend is a attachable widget that can be added to other dc charts to render horizontal legend
 * labels.
 *
 * @name legend
 * @memberof dc
 * @example
 * chart.legend(dc.legend().x(400).y(10).itemHeight(13).gap(5))
 * @return {dc.legend}
 */
export default function legend() {
  const LABEL_GAP = 2

  let _legend = {},
    _parent,
    _x = 0,
    _y = 0,
    _itemHeight = 12,
    _gap = 5,
    _horizontal = false,
    _legendWidth = 560,
    _itemWidth = 70,
    _autoItemWidth = false

  let _g

  _legend.parent = function(p) {
    if (!arguments.length) {
      return _parent
    }
    _parent = p
    return _legend
  }

  _legend.render = function() {
    _parent
      .svg()
      .select("g.dc-legend")
      .remove()
    _g = _parent
      .svg()
      .append("g")
      .attr("class", "dc-legend")
      .attr("transform", "translate(" + _x + "," + _y + ")")
    const legendables = _parent.legendables()

    const itemEnter = _g
      .selectAll("g.dc-legend-item")
      .data(legendables)
      .enter()
      .append("g")
      .attr("class", "dc-legend-item")
      .on("mouseover", d => {
        _parent.legendHighlight(d)
      })
      .on("mouseout", d => {
        _parent.legendReset(d)
      })
      .on("click", d => {
        d.chart.legendToggle(d)
      })

    _g
      .selectAll("g.dc-legend-item")
      .classed("fadeout", d => d.chart.isLegendableHidden(d))

    if (legendables.some(pluck("dashstyle"))) {
      itemEnter
        .append("line")
        .attr("x1", 0)
        .attr("y1", _itemHeight / 2)
        .attr("x2", _itemHeight)
        .attr("y2", _itemHeight / 2)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", pluck("dashstyle"))
        .attr("stroke", pluck("color"))
    } else {
      itemEnter
        .append("rect")
        .attr("width", _itemHeight)
        .attr("height", _itemHeight)
        .attr("fill", d => (d ? d.color : "blue"))
    }

    itemEnter
      .append("text")
      .text(pluck("name"))
      .attr("x", _itemHeight + LABEL_GAP)
      .attr("y", function() {
        return (
          _itemHeight / 2 + (this.clientHeight ? this.clientHeight : 13) / 2 - 2
        )
      })

    let _cumulativeLegendTextWidth = 0
    let row = 0
    itemEnter.attr("transform", function(d, i) {
      if (_horizontal) {
        const translateBy =
          "translate(" +
          _cumulativeLegendTextWidth +
          "," +
          row * legendItemHeight() +
          ")"
        const itemWidth =
          _autoItemWidth === true ? this.getBBox().width + _gap : _itemWidth

        if (_cumulativeLegendTextWidth + itemWidth >= _legendWidth) {
          ++row
          _cumulativeLegendTextWidth = 0
        } else {
          _cumulativeLegendTextWidth = _cumulativeLegendTextWidth + itemWidth
        }
        return translateBy
      } else {
        return "translate(0," + i * legendItemHeight() + ")"
      }
    })
  }

  function legendItemHeight() {
    return _gap + _itemHeight
  }

  /**
   * Set or get x coordinate for legend widget.
   * @name x
   * @memberof dc.legend
   * @instance
   * @param  {Number} [x=0]
   * @return {Number}
   * @return {dc.legend}
   */
  _legend.x = function(x) {
    if (!arguments.length) {
      return _x
    }
    _x = x
    return _legend
  }

  /**
   * Set or get y coordinate for legend widget.
   * @name y
   * @memberof dc.legend
   * @instance
   * @param  {Number} [y=0]
   * @return {Number}
   * @return {dc.legend}
   */
  _legend.y = function(y) {
    if (!arguments.length) {
      return _y
    }
    _y = y
    return _legend
  }

  /**
   * Set or get gap between legend items.
   * @name gap
   * @memberof dc.legend
   * @instance
   * @param  {Number} [gap=5]
   * @return {Number}
   * @return {dc.legend}
   */
  _legend.gap = function(gap) {
    if (!arguments.length) {
      return _gap
    }
    _gap = gap
    return _legend
  }

  /**
   * Set or get legend item height.
   * @name itemHeight
   * @memberof dc.legend
   * @instance
   * @param  {Number} [itemHeight=12]
   * @return {Number}
   * @return {dc.legend}
   */
  _legend.itemHeight = function(itemHeight) {
    if (!arguments.length) {
      return _itemHeight
    }
    _itemHeight = itemHeight
    return _legend
  }

  /**
   * Position legend horizontally instead of vertically.
   * @name horizontal
   * @memberof dc.legend
   * @instance
   * @param  {Boolean} [horizontal=false]
   * @return {Boolean}
   * @return {dc.legend}
   */
  _legend.horizontal = function(horizontal) {
    if (!arguments.length) {
      return _horizontal
    }
    _horizontal = horizontal
    return _legend
  }

  /**
   * Maximum width for horizontal legend.
   * @name legendWidth
   * @memberof dc.legend
   * @instance
   * @param  {Number} [legendWidth=500]
   * @return {Number}
   * @return {dc.legend}
   */
  _legend.legendWidth = function(legendWidth) {
    if (!arguments.length) {
      return _legendWidth
    }
    _legendWidth = legendWidth
    return _legend
  }

  /**
   * legendItem width for horizontal legend.
   * @name itemWidth
   * @memberof dc.legend
   * @instance
   * @param  {Number} [itemWidth=70]
   * @return {Number}
   * @return {dc.legend}
   */
  _legend.itemWidth = function(itemWidth) {
    if (!arguments.length) {
      return _itemWidth
    }
    _itemWidth = itemWidth
    return _legend
  }

  /**
   * Turn automatic width for legend items on or off. If true, {@link #dc.legend+itemWidth itemWidth} is ignored.
   * This setting takes into account {@link #dc.legend+gap gap}.
   * @name autoItemWidth
   * @memberof dc.legend
   * @instance
   * @param  {Boolean} [autoItemWidth=false]
   * @return {Boolean}
   * @return {dc.legend}
   */
  _legend.autoItemWidth = function(autoItemWidth) {
    if (!arguments.length) {
      return _autoItemWidth
    }
    _autoItemWidth = autoItemWidth
    return _legend
  }

  /**
    #### .legendText([legendTextFunction])
    Set or get the legend text function. The legend widget uses this function to render
    the legend text on each item. If no function is specified the legend widget will display
    the names associated with each group.

    Default: pluck('name')

    ```js
    // create numbered legend items
    chart.legend(dc.legend().legendText(function(d, i) { return i + '. ' + d.name; }))

    // create legend displaying group counts
    chart.legend(dc.legend().legendText(function(d) { return d.name + ': ' d.data; }))
    ```
    **/
  _legend.legendText = function(_) {
    if (!arguments.length) {
      return _legendText
    }
    _legendText = _
    return _legend
  }

  _legend = legendMixin(_legend)

  return _legend
}
