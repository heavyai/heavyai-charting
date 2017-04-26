import d3 from "d3"
import bubbleMixin from "../mixins/bubble-mixin"
import capMixin from "../mixins/cap-mixin"
import coordinateGridMixin from "../mixins/coordinate-grid-mixin"
import {utils} from "../utils/utils"
import {transition} from "../core/core"

/**
 * A concrete implementation of a general purpose bubble chart that allows data visualization using the
 * following dimensions:
 * - x axis position
 * - y axis position
 * - bubble radius
 * - color
 * Examples:
 * - {@link https://mapd.github.io/mapd-charting/example/example1.html Carrier Departure Delay by Arrival Delay (Minutes)
}
 * @name bubbleChart
 * @memberof dc
 * @mixes dc.bubbleMixin
 * @mixes dc.coordinateGridMixin
 * @example
 * // create a bubble chart under #chart-container1 element using the default global chart group
 * var bubbleChart1 = dc.bubbleChart('#chart-container1');
 * // create a bubble chart under #chart-container2 element using chart group A
 * var bubbleChart2 = dc.bubbleChart('#chart-container2', 'chartGroupA');
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/mbostock/d3/wiki/Selections#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @return {dc.bubbleChart}
 */
export default function bubbleChart (parent, chartGroup) {

/* OVERRIDE -----------------------------------------------------------------*/
  const _chart = bubbleMixin(capMixin(coordinateGridMixin({})))
  let _popupHeader = []
  let _isHoverNode = null
/* --------------------------------------------------------------------------*/

  let _elasticRadius = false
  let _sortBubbleSize = false

  _chart.transitionDuration(750)

  const bubbleLocator = function (d) {
    return "translate(" + (bubbleX(d)) + "," + (bubbleY(d)) + ")"
  }

/* OVERRIDE -----------------------------------------------------------------*/
  _chart.setPopupHeader = function (_) {
    if (!arguments.length) {
      return _popupHeader
    }
    _popupHeader = _
    return _chart
  }

  _chart.hideOverlappedLabels = function () {

    const nodes = _chart.svg().selectAll(".node")

    const labelHeight = 10
    const letterWidth = 5

    nodes[0].reverse()

    nodes
            .classed("hide-label", (d) => _chart.bubbleR(d) < _chart.minRadiusWithLabel())
            .each(function (d, i) {

              const a = this
              const aR = i > 0 ? d.radius : _chart.bubbleR(d)
              const aX = i > 0 ? d.xPixel : bubbleX(d)
              const aY = i > 0 ? d.yPixel : bubbleY(d)
              const aKey = d.key0

              if (d3.select(a).classed("hide-label")) { return }

              for (let j = i + 1; j < nodes[0].length; j++) {

                const b = d3.select(nodes[0][j])
                var d = b.datum()

                const bX = d.xPixel = bubbleX(d)
                const bY = d.yPixel = bubbleY(d)
                const bR = d.radius = _chart.bubbleR(d)
                const bKey = d.key0

                if (Math.abs(aY - bY) > labelHeight || bR < _chart.minRadiusWithLabel() || b.classed("hide-label")) {
                  continue
                }

                const aXmin = aX - (String(aKey)).length * letterWidth / 2
                const aXmax = aX + (String(aKey)).length * letterWidth / 2

                const bXmin = bX - (String(bKey)).length * letterWidth / 2
                const bXmax = bX + (String(bKey)).length * letterWidth / 2

                const isLabelOverlapped = aXmin >= bXmin && aXmin <= bXmax || aXmax >= bXmin && aXmax <= bXmax || aXmin <= bXmin && aXmax >= bXmax

                if (isLabelOverlapped) {
                  b.classed("hide-label", true)
                }
              }
            })
  }

  function isNodeOverlapped (d1, d2) {
    const dist = Math.sqrt((d1.xPixel - d2.xPixel) * (d1.xPixel - d2.xPixel) + (d1.yPixel - d2.yPixel) * (d1.yPixel - d2.yPixel))
    return d1.radius + 8 >= dist
  }


  _chart.showPopup = function (d, i) {

    if (_chart.svg().select(".mouse-out-detect").empty()) {
      _chart.svg().insert("rect", ":first-child")
                .attr("class", "mouse-out-detect")
                .attr({width: _chart.width(), height: _chart.height()})
                .on("mousemove", _chart.hidePopup)
    }

    _isHoverNode = d

    const popup = _chart.popup()

    const popupBox = popup.select(".chart-popup-content").html("")

    popupBox.append("div")
            .attr("class", "popup-bridge")
            .style("width", (_chart.bubbleR(d) * 2) + "px")
            .style("height", (_chart.bubbleR(d) + 24) + "px")
            .style("border-radius", "0 0 " + _chart.bubbleR(d) + "px " + _chart.bubbleR(d) + "px")
            .on("click", () => {
              _chart.onClick(d)
            })
            .append("div")
            .attr("class", "bridge-hitbox")

    const popupTableWrap = popupBox.append("div")
            .attr("class", "popup-table-wrap")
            .on("mouseleave", _chart.hidePopup)

    const popupTable = popupTableWrap.append("table")
            .attr("class", "popup-table")


    const popupTableHeader = popupTable.append("tr")

    const headerItems = popupTableHeader.selectAll("th")
            .data(_popupHeader)
            .enter()
            .append("th")

    headerItems.append("div")
            .attr("class", "ellipse-text")
            .text((d) => d.label)
            .append("div")
            .attr("class", "full-text")
            .text((d) => d.label)
            .on("mouseenter", function () {
              d3.select(this)
                    .style("transform", function () {
                      const elm = d3.select(this)
                      const textWidth = elm.node().getBoundingClientRect().width
                      const boxWidth = elm.node().parentNode.getBoundingClientRect().width

                      if (textWidth < boxWidth) {
                        elm.classed("scroll-text", false)
                        return "none"
                      }
                      const dist = textWidth - boxWidth

                      elm.style("transition-duration", (dist * 0.05 + "s"))
                        .classed("scroll-text", true)
                        .on("webkitTransitionEnd", () => {

                          setTimeout(() => {
                            elm.classed("scroll-text", false)
                                .style("transform", "translateX(0)")
                          }, 500)


                          setTimeout(() => {
                            elm.style("transform", "translateX(" + -dist + "px)")
                                    .classed("scroll-text", true)
                          }, 1000)
                        })

                      return "translateX(" + -dist + "px)"
                    })
            })
            .on("mouseleave", function () {
              d3.select(this)
                    .classed("scroll-text", false)
                    .style("transform", "translateX(0)")
            })

    const dataRows = [d]
    const nodes = _chart.svg().selectAll(".node")
    let foundCurrentNode = false

    nodes[0].reverse()

    nodes.each((node, i) => {

      if (d === node) {
        foundCurrentNode = true
        return
      }

      if (foundCurrentNode && isNodeOverlapped(d, node)) {
        dataRows.push(node)
      }
    })

    const rowItems = popupTable.selectAll(".popup-row-item")
            .data(dataRows)
            .enter()
            .append("tr")
            .html((d) => renderPopupRow(d))
            .on("click", (d) => {
              _chart.onClick(d)
            })
            .attr("class", "popup-row-item")

    _chart.updatePopup()

    popup.classed("js-showPopup popup-scrollable delay-pointer scatter-plot-popup", true)

    _chart.root().node().parentNode.parentNode.style.zIndex = 1

    setTimeout(() => { popup.classed("delay-pointer", false) }, 250)

    positionPopup(d, this)
  }

  _chart.updatePopup = function () {

    if (_chart.hasFilter()) {
      _chart.popup().selectAll(".popup-row-item")
            .each(function (d) {

              d3.select(this)
                    .classed("deselected", !_chart.isSelectedNode(d))
                    .classed("selected", _chart.isSelectedNode(d))
            })
    } else {
      _chart.popup().selectAll(".popup-row-item")
                .classed("deselected", false)
                .classed("selected", false)
    }

  }

  function renderPopupRow (d) {

    let str = `
            <td>
                <div class="table-dim">
                    <div class="table-legend" style="background:${_chart.getColor(d)}"></div>
                    <div class="table-dim-val">${_chart.label()(d)}</div>
                </div>
            </td>
        `

    for (let i = 1; i < _popupHeader.length; i++) {
      if (_popupHeader[i].alias) {
        str += "<td>" + utils.formatValue(d[_popupHeader[i].alias]) + "</td>"
      }
    }
    return str
  }

  _chart.hidePopup = function () {
    _chart.popup().classed("js-showPopup", false)

    _chart.root().node().parentNode.parentNode.style.zIndex = "auto"

    d3.selectAll(".node-hover")
            .classed("node-hover", false)

    _isHoverNode = null
  }

  function positionPopup (d, e) {

    const x = bubbleX(d) + _chart.margins().left
    const y = bubbleY(d) + _chart.margins().top

    const popup = _chart.popup()
            .style("transform", function () {
              const popupWidth = d3.select(this).select(".chart-popup-box").node().getBoundingClientRect().width / 2
              const offsetX = x - popupWidth < 0 ? popupWidth - x - 16 : (x + popupWidth > _chart.width() ? _chart.width() - (x + popupWidth) + 16 : 0)

              d3.select(this).select(".popup-bridge")
                    .style("left", () => offsetX !== 0 ? popupWidth - offsetX + "px" : "50%")
              return "translate(" + (x + offsetX) + "px," + y + "px)"
            })

    popup.select(".chart-popup-box")
            .classed("align-center", true)
            .classed("popdown", function () {
              return popup.node().getBoundingClientRect().top - 76 < d3.select(this).node().getBoundingClientRect().height
            })
            .select(".popup-table-wrap").style("overflow-y", () => popup.select(".popup-table").node().getBoundingClientRect().height > 160 ? "scroll" : "hidden")


  }

/* --------------------------------------------------------------------------*/

    /**
     * Turn on or off the elastic bubble radius feature, or return the value of the flag. If this
     * feature is turned on, then bubble radii will be automatically rescaled to fit the chart better.
     * @name elasticRadius
     * @memberof dc.bubbleChart
     * @instance
     * @param {Boolean} [elasticRadius=false]
     * @return {Boolean}
     * @return {dc.bubbleChart}
     */
  _chart.elasticRadius = function (elasticRadius) {
    if (!arguments.length) {
      return _elasticRadius
    }
    _elasticRadius = elasticRadius
    return _chart
  }

    /**
     * Turn on or off the bubble sorting feature, or return the value of the flag. If enabled,
     * bubbles will be sorted by their radius, with smaller bubbles in front.
     * @name sortBubbleSize
     * @memberof dc.bubbleChart
     * @instance
     * @param {Boolean} [sortBubbleSize=false]
     * @return {Boolean}
     * @return {dc.bubbleChart}
     */
  _chart.sortBubbleSize = function (sortBubbleSize) {
    if (!arguments.length) {
      return _sortBubbleSize
    }
    _sortBubbleSize = sortBubbleSize
    return _chart
  }

  _chart.plotData = function () {
    if (_elasticRadius) {
      _chart.r().domain([_chart.rMin(), _chart.rMax()])
    }

    _chart.r().range([_chart.MIN_RADIUS, _chart.xAxisLength() * _chart.maxBubbleRelativeSize()])

    const data = _chart.data()
    if (_sortBubbleSize) {
            // sort descending so smaller bubbles are on top
      const radiusAccessor = _chart.radiusValueAccessor()
      data.sort((a, b) => d3.descending(radiusAccessor(a), radiusAccessor(b)))
    }
    const bubbleG = _chart.chartBodyG().selectAll("g." + _chart.BUBBLE_NODE_CLASS)

/* OVERRIDE -----------------------------------------------------------------*/
            .data(data)
/* --------------------------------------------------------------------------*/

    if (_sortBubbleSize) {
            // Call order here to update dom order based on sort
      bubbleG.order()
    }

    renderNodes(bubbleG)

    updateNodes(bubbleG)

    removeNodes(bubbleG)

    _chart.fadeDeselectedArea()

  }

  function renderNodes (bubbleG) {
    let bubbleGEnter
    bubbleGEnter = bubbleG.enter().append("g")
    bubbleGEnter
            .append("circle").attr("class", (d, i) => _chart.BUBBLE_CLASS + " _" + i)
            .on("click", _chart.onClick)
            .attr("fill", _chart.getColor)
            .attr("r", 0)

    const debouncePopUp = _chart.debounce((d, i, elm) => {
      d3.select(elm).classed("node-hover", true)
      _chart.showPopup(d, i)
    }, 250)

    bubbleGEnter
            .attr("class", _chart.BUBBLE_NODE_CLASS)
            .attr("transform", bubbleLocator)
/* OVERRIDE -----------------------------------------------------------------*/
            .on("mouseover", function (d, i) {
              if (JSON.stringify(_isHoverNode) !== JSON.stringify(d)) {
                debouncePopUp(d, i, this)
                _chart.hidePopup()
              }
            })
/* --------------------------------------------------------------------------*/

    transition(bubbleG, _chart.transitionDuration())
            .selectAll("circle." + _chart.BUBBLE_CLASS)
            .attr("r", (d) => _chart.bubbleR(d))
            .attr("opacity", (d) => (_chart.bubbleR(d) > 0) ? 1 : 0)

    _chart._doRenderLabel(bubbleGEnter)

    _chart.prepareLockAxis("x")

  }

  function updateNodes (bubbleG) {
    transition(bubbleG, _chart.transitionDuration())
            .attr("transform", bubbleLocator)

/* OVERRIDE -----------------------------------------------------------------*/
            .select("circle." + _chart.BUBBLE_CLASS)
/* --------------------------------------------------------------------------*/

            .attr("fill", _chart.getColor)
            .attr("r", (d) => _chart.bubbleR(d))
            .attr("opacity", (d) => (_chart.bubbleR(d) > 0) ? 1 : 0)

    _chart.doUpdateLabels(bubbleG)
    _chart.doUpdateTitles(bubbleG)


  }

  function removeNodes (bubbleG) {
    bubbleG.exit().remove()
  }

  function bubbleX (d) {
    let x = _chart.x()(_chart.keyAccessor()(d))
    if (isNaN(x)) {
      x = 0
    }
    return x
  }

  function bubbleY (d) {
    let y = _chart.y()(_chart.valueAccessor()(d))
    if (isNaN(y)) {
      y = 0
    }
    return y
  }

  _chart.renderBrush = function () {
        // override default x axis brush from parent chart
  }

  _chart.redrawBrush = function () {
        // override default x axis brush from parent chart
    _chart.fadeDeselectedArea()
  }

  return _chart.anchor(parent, chartGroup)
}
