import { deregisterChart, override, transition } from "../core/core"
import { pluck, utils } from "../utils/utils"
import coordinateGridMixin from "../mixins/coordinate-grid-mixin"
import d3 from "d3"
import elasticDimensionMixin from "../mixins/elastic-dimension-mixin"
import stackMixin from "../mixins/stack-mixin"
import multiSeriesMixin from "../mixins/multi-series-mixin"

/**
 * Concrete line/area chart implementation.
 *
 * Examples:
 * - {@link https://mapd.github.io/mapd-charting/example/example1.html Number of Flights by Departure Time}
 * @name lineChart
 * @memberof dc
 * @mixes dc.stackMixin
 * @mixes dc.coordinateGridMixin
 * @example
 * // create a line chart under #chart-container1 element using the default global chart group
 * var chart1 = dc.lineChart('#chart-container1');
 * // create a line chart under #chart-container2 element using chart group A
 * var chart2 = dc.lineChart('#chart-container2', 'chartGroupA');
 * // create a sub-chart under a composite parent chart
 * var chart3 = dc.lineChart(compositeChart);
 * @param {String|node|d3.selection|dc.compositeChart} parent - Any valid
 * {@link https://github.com/mbostock/d3/wiki/Selections#selecting-elements d3 single selector}
 * specifying a dom block element such as a div; or a dom element or d3 selection.  If the line
 * chart is a sub-chart in a {@link #dc.compositeChart Composite Chart} then pass in the parent
 * composite chart instance instead.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @return {dc.lineChart}
 */
export default function lineChart(parent, chartGroup) {
  const DEFAULT_DOT_RADIUS = 5
  const TOOLTIP_G_CLASS = "dc-tooltip"
  const DOT_CIRCLE_CLASS = "dot"
  const Y_AXIS_REF_LINE_CLASS = "yRef"
  const X_AXIS_REF_LINE_CLASS = "xRef"
  const DEFAULT_DOT_OPACITY = 1e-6

  let _chart = elasticDimensionMixin(stackMixin(coordinateGridMixin({})))
  let _renderArea = false
  let _dotRadius = DEFAULT_DOT_RADIUS
  let _dataPointRadius = null
  let _dataPointFillOpacity = DEFAULT_DOT_OPACITY
  let _dataPointStrokeOpacity = DEFAULT_DOT_OPACITY
  let _interpolate = "linear"
  let _tension = 0.7
  let _defined
  let _dashStyle
  let _xyTipsOn = true

  _chart.transitionDuration(500)
  _chart._rangeBandPadding(1)

  _chart.plotData = function() {
    const chartBody = _chart.chartBodyG()
    let layersList = chartBody.selectAll("g.stack-list")

    if (layersList.empty()) {
      layersList = chartBody.append("g").attr("class", "stack-list")
    }

    const layers = layersList.selectAll("g.stack").data(_chart.data())

    const layersEnter = layers
      .enter()
      .append("g")
      .attr("class", (d, i) => "stack " + "_" + i)

    drawLine(layersEnter, layers)

    drawArea(layersEnter, layers)

    drawDots(chartBody, layers)
  }

  /**
   * Gets or sets the interpolator to use for lines drawn, by string name, allowing e.g. step
   * functions, splines, and cubic interpolation.  This is passed to
   * {@link https://github.com/mbostock/d3/wiki/SVG-Shapes#line_interpolate d3.svg.line.interpolate} and
   * {@link https://github.com/mbostock/d3/wiki/SVG-Shapes#area_interpolate d3.svg.area.interpolate},
   * where you can find a complete list of valid arguments
   * @name interpolate
   * @memberof dc.lineChart
   * @instance
   * @see {@link https://github.com/mbostock/d3/wiki/SVG-Shapes#line_interpolate d3.svg.line.interpolate}
   * @see {@link https://github.com/mbostock/d3/wiki/SVG-Shapes#area_interpolate d3.svg.area.interpolate}
   * @param  {String} [interpolate='linear']
   * @return {String}
   * @return {dc.lineChart}
   */
  _chart.interpolate = function(interpolate) {
    if (!arguments.length) {
      return _interpolate
    }
    _interpolate = interpolate
    return _chart
  }

  /**
   * Gets or sets the tension to use for lines drawn, in the range 0 to 1.
   * This parameter further customizes the interpolation behavior.  It is passed to
   * {@link https://github.com/mbostock/d3/wiki/SVG-Shapes#line_tension d3.svg.line.tension} and
   * {@link https://github.com/mbostock/d3/wiki/SVG-Shapes#area_tension d3.svg.area.tension}.
   * @name tension
   * @memberof dc.lineChart
   * @instance
   * @see {@link https://github.com/mbostock/d3/wiki/SVG-Shapes#line_interpolate d3.svg.line.interpolate}
   * @see {@link https://github.com/mbostock/d3/wiki/SVG-Shapes#area_interpolate d3.svg.area.interpolate}
   * @param  {Number} [tension=0.7]
   * @return {Number}
   * @return {dc.lineChart}
   */
  _chart.tension = function(tension) {
    if (!arguments.length) {
      return _tension
    }
    _tension = tension
    return _chart
  }

  /**
   * Gets or sets a function that will determine discontinuities in the line which should be
   * skipped: the path will be broken into separate subpaths if some points are undefined.
   * This function is passed to
   * {@link https://github.com/mbostock/d3/wiki/SVG-Shapes#line_defined d3.svg.line.defined}
   *
   * Note: crossfilter will sometimes coerce nulls to 0, so you may need to carefully write
   * custom reduce functions to get this to work, depending on your data. See
   * https://github.com/dc-js/dc.js/issues/615#issuecomment-49089248
   * @name defined
   * @memberof dc.lineChart
   * @instance
   * @see {@link https://github.com/mbostock/d3/wiki/SVG-Shapes#line_defined d3.svg.line.defined}
   * @param  {Function} [defined]
   * @return {Function}
   * @return {dc.lineChart}
   */
  _chart.defined = function(defined) {
    if (!arguments.length) {
      return _defined
    }
    _defined = defined
    return _chart
  }

  /**
   * Set the line's d3 dashstyle. This value becomes the 'stroke-dasharray' of line. Defaults to empty
   * array (solid line).
   * @name dashStyle
   * @memberof dc.lineChart
   * @instance
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray stroke-dasharray}
   * @example
   * // create a Dash Dot Dot Dot
   * chart.dashStyle([3,1,1,1]);
   * @param  {Array<Number>} [dashStyle=[]]
   * @return {Array<Number>}
   * @return {dc.lineChart}
   */
  _chart.dashStyle = function(dashStyle) {
    if (!arguments.length) {
      return _dashStyle
    }
    _dashStyle = dashStyle
    return _chart
  }

  _chart.measureValue = function(value) {
    const customFormatter = _chart.valueFormatter()
    return (
      (customFormatter && customFormatter(value)) || utils.formatValue(value)
    )
  }

  _chart.dimensionValue = function(value) {
    const customFormatter = _chart.dateFormatter()
    return (
      (customFormatter && customFormatter(value)) || utils.formatValue(value)
    )
  }
  /**
   * Get or set render area flag. If the flag is set to true then the chart will render the area
   * beneath each line and the line chart effectively becomes an area chart.
   * @name renderArea
   * @memberof dc.lineChart
   * @instance
   * @param  {Boolean} [renderArea=false]
   * @return {Boolean}
   * @return {dc.lineChart}
   */
  _chart.renderArea = function(renderArea) {
    if (!arguments.length) {
      return _renderArea
    }
    _renderArea = renderArea
    return _chart
  }

  function colors(d, i) {
    if (d.name) {
      d.layer = d.name
      return _chart.getColor(d, i)
    } else {
      return _chart.getColor(d, i)
    }
  }

  function drawLine(layersEnter, layers) {
    const line = d3.svg
      .line()
      .x(d => _chart.x()(d.x))
      .y(d => {
        /* OVERRIDE ---------------------------------------------------------------- */
        if (_renderArea) {
          return _chart.y()(d.y + d.y0)
        } else {
          return _chart.y()(d.y)
        }
        /* ------------------------------------------------------------------------- */
      })
      .interpolate(_interpolate)
      .tension(_tension)
    if (_defined) {
      line.defined(_defined)
    }

    const path = layersEnter
      .append("path")
      .attr("class", "line")
      .attr("stroke", colors)
    if (_dashStyle) {
      path.attr("stroke-dasharray", _dashStyle)
    }

    transition(layers.select("path.line"), _chart.transitionDuration())
      // .ease('linear')
      .attr("stroke", colors)
      .attr("d", d => safeD(line(d.values)))
  }

  function drawArea(layersEnter, layers) {
    if (_renderArea) {
      const area = d3.svg
        .area()
        .x(d => _chart.x()(d.x))
        .y(d => _chart.y()(d.y + d.y0))
        .y0(d => _chart.y()(d.y0))
        .interpolate(_interpolate)
        .tension(_tension)
      if (_defined) {
        area.defined(_defined)
      }

      layersEnter
        .append("path")
        .attr("class", "area")
        .attr("fill", colors)
        .attr("d", d => safeD(area(d.values)))

      transition(layers.select("path.area"), _chart.transitionDuration())
        // .ease('linear')
        .attr("fill", colors)
        .attr("d", d => safeD(area(d.values)))
    }
  }

  function safeD(d) {
    return !d || d.indexOf("NaN") >= 0 ? "M0,0" : d
  }

  function hoverOverBrush() {
    var g = _chart
      .g()
      .on("mouseout", () => {
        hideBrushDots()
      })
      .on("mousemove", function() {
        if (_chart.isBrushing()) {
          hidePopup()
        } else {
          showBrushDots(g, this)
        }
      })
  }

  function hideBrushDots() {
    _chart
      .g()
      .selectAll(".dot")
      .style("fill-opacity", 0)
    hidePopup()
  }

  function showBrushDots(g, e) {
    let coordinates = [0, 0]
    coordinates = _chart.popupCoordinates(d3.mouse(e))
    const x = coordinates[0]
    const y = coordinates[1]
    const xAdjusted = x - _chart.margins().left

    const popupRows = []

    const toolTips = g.selectAll(".dc-tooltip").each(function() {
      let lastDot = null
      let hoverDot = null

      const dots = d3
        .select(this)
        .selectAll(".dot")
        .style("fill-opacity", 0)

      dots[0].sort((a, b) => d3.select(a).attr("cx") - d3.select(b).attr("cx"))

      dots[0].some((obj, i) => {
        const elm = d3.select(obj)

        if (xAdjusted < elm.attr("cx")) {
          hoverDot = { elm, datum: elm.datum(), i }
          return true
        }

        lastDot = { elm, datum: elm.datum(), i }
      })

      hoverDot =
        lastDot && hoverDot
          ? Math.abs(lastDot.elm.attr("cx") - xAdjusted) <
            Math.abs(hoverDot.elm.attr("cx") - xAdjusted)
            ? lastDot
            : hoverDot
          : hoverDot

      if (hoverDot && Math.abs(hoverDot.elm.attr("cx") - xAdjusted) < 32) {
        hoverDot.elm.style("fill-opacity", 1)
        popupRows.push(hoverDot)
      }
    })

    if (popupRows.length > 0) {
      showPopup(popupRows, x, y)
    } else {
      hidePopup()
    }
  }

  function showPopup(arr, x, y) {
    if (!_chart.popupIsEnabled()) {
      hidePopup()
      return false
    }
    const popup = _chart.popup()

    const popupBox = popup
      .select(".chart-popup-content")
      .html("")
      .classed("popup-list", true)

    popupBox
      .append("div")
      .attr("class", "popup-header")
      .text(_chart.popupTextAccessor(arr))

    const popupItems = popupBox
      .selectAll(".popup-item")
      .data(
        arr.sort(
          (a, b) =>
            _renderArea
              ? b.datum.y + b.datum.y0 - (a.datum.y + a.datum.y0)
              : b.datum.y - a.datum.y
        )
      )
      .enter()
      .append("div")
      .attr("class", "popup-item")

    popupItems
      .append("div")
      .attr("class", "popup-legend")
      .style("background-color", d => colors(d.datum, d.i))

    if (_chart.series().keys()) {
      popupItems
        .append("div")
        .attr("class", "popup-item-key")
        .text(d => _chart.colorDomain()[d.datum.idx])
    }

    popupItems
      .append("div")
      .attr("class", "popup-item-value")
      .classed("text-align-right", Boolean(_chart.series().keys()))
      .text(d => _chart.measureValue(d.datum.y))

    positionPopup(x, y)
    popup.classed("js-showPopup", true)
  }

  function hidePopup() {
    _chart.popup().classed("js-showPopup", false)
  }

  function positionPopup(x, y) {
    const popup = _chart
      .popup()
      .attr("style", () => "transform:translate(" + x + "px," + y + "px)")

    popup
      .select(".chart-popup-box")
      .classed("align-left-center", true)
      .classed("align-right-center", function() {
        return (
          x +
            (d3
              .select(this)
              .node()
              .getBoundingClientRect().width +
              32) >
          _chart.width()
        )
      })
  }

  function drawDots(chartBody, layers) {
    /* OVERRIDE ---------------------------------------------------------------- */
    // if (!_chart.brushOn() && _chart.xyTipsOn()) {
    /* ------------------------------------------------------------------------- */

    const tooltipListClass = TOOLTIP_G_CLASS + "-list"
    let tooltips = chartBody.select("g." + tooltipListClass)

    if (tooltips.empty()) {
      tooltips = chartBody.append("g").attr("class", tooltipListClass)
    }

    layers.each((d, layerIndex) => {
      let points = d.values
      if (_defined) {
        points = points.filter(_defined)
      }

      let g = tooltips.select("g." + TOOLTIP_G_CLASS + "._" + layerIndex)
      if (g.empty()) {
        g = tooltips
          .append("g")
          .attr("class", TOOLTIP_G_CLASS + " _" + layerIndex)
      }

      createRefLines(g)

      const dots = g
        .selectAll("circle." + DOT_CIRCLE_CLASS)
        .data(points, pluck("x"))

      dots
        .enter()
        .append("circle")
        .attr("class", DOT_CIRCLE_CLASS)
        .attr("r", getDotRadius())
        .style("fill-opacity", _dataPointFillOpacity)
        .style("stroke-opacity", _dataPointStrokeOpacity)
        .on("mousemove", function() {
          const dot = d3.select(this)
          showDot(dot)
          showRefLines(dot, g)
        })
        .on("mouseout", function() {
          const dot = d3.select(this)
          hideDot(dot)
          hideRefLines(g)
        })

      dots
        .attr("cx", d => utils.safeNumber(_chart.x()(d.x)))
        .attr("cy", d => {
          /* OVERRIDE ---------------------------------------------------------------- */
          if (_renderArea) {
            return utils.safeNumber(_chart.y()(d.y + d.y0))
          } else {
            return utils.safeNumber(_chart.y()(d.y))
          }
          /* ------------------------------------------------------------------------- */
        })
        .attr("fill", colors)
        .call(renderTitle, d)

      dots.exit().remove()
    })

    if (_chart.brushOn() && !_chart.focusChart()) {
      hoverOverBrush()
    }

    /* OVERRIDE ---------------------------------------------------------------- */
    // }
    /* ------------------------------------------------------------------------- */
  }

  function createRefLines(g) {
    const yRefLine = g.select("path." + Y_AXIS_REF_LINE_CLASS).empty()
      ? g.append("path").attr("class", Y_AXIS_REF_LINE_CLASS)
      : g.select("path." + Y_AXIS_REF_LINE_CLASS)
    yRefLine.style("display", "none").attr("stroke-dasharray", "5,5")

    const xRefLine = g.select("path." + X_AXIS_REF_LINE_CLASS).empty()
      ? g.append("path").attr("class", X_AXIS_REF_LINE_CLASS)
      : g.select("path." + X_AXIS_REF_LINE_CLASS)
    xRefLine.style("display", "none").attr("stroke-dasharray", "5,5")
  }

  function showDot(dot) {
    dot.style("fill-opacity", 0.8)
    dot.style("stroke-opacity", 0.8)
    dot.attr("r", _dotRadius)
    return dot
  }

  function showRefLines(dot, g) {
    const x = dot.attr("cx")
    const y = dot.attr("cy")
    const yAxisX = _chart._yAxisX() - _chart.margins().left
    const yAxisRefPathD = "M" + yAxisX + " " + y + "L" + x + " " + y
    const xAxisRefPathD =
      "M" + x + " " + _chart.yAxisHeight() + "L" + x + " " + y
    g
      .select("path." + Y_AXIS_REF_LINE_CLASS)
      .style("display", "")
      .attr("d", yAxisRefPathD)
    g
      .select("path." + X_AXIS_REF_LINE_CLASS)
      .style("display", "")
      .attr("d", xAxisRefPathD)
  }

  function getDotRadius() {
    return _dataPointRadius || _dotRadius
  }

  function hideDot(dot) {
    dot
      .style("fill-opacity", _dataPointFillOpacity)
      .style("stroke-opacity", _dataPointStrokeOpacity)
      .attr("r", getDotRadius())
  }

  function hideRefLines(g) {
    g.select("path." + Y_AXIS_REF_LINE_CLASS).style("display", "none")
    g.select("path." + X_AXIS_REF_LINE_CLASS).style("display", "none")
  }

  function renderTitle(dot, d) {
    if (_chart.renderTitle()) {
      dot.selectAll("title").remove()
      dot.append("title").text(pluck("data", _chart.title(d.name)))
    }
  }

  /**
   * Turn on/off the mouseover behavior of an individual data point which renders a circle and x/y axis
   * dashed lines back to each respective axis.  This is ignored if the chart
   * {@link #dc.coordinateGridMixin+brushOn brush} is on
   * @name xyTipsOn
   * @memberof dc.lineChart
   * @instance
   * @param  {Boolean} [xyTipsOn=false]
   * @return {Boolean}
   * @return {dc.lineChart}
   */
  _chart.xyTipsOn = function(xyTipsOn) {
    if (!arguments.length) {
      return _xyTipsOn
    }
    _xyTipsOn = xyTipsOn
    return _chart
  }

  /**
   * Get or set the radius (in px) for dots displayed on the data points.
   * @name dotRadius
   * @memberof dc.lineChart
   * @instance
   * @param  {Number} [dotRadius=5]
   * @return {Number}
   * @return {dc.lineChart}
   */
  _chart.dotRadius = function(dotRadius) {
    if (!arguments.length) {
      return _dotRadius
    }
    _dotRadius = dotRadius
    return _chart
  }

  /**
   * Always show individual dots for each datapoint.
   * If `options` is falsy, it disables data point rendering.
   *
   * If no `options` are provided, the current `options` values are instead returned.
   * @name renderDataPoints
   * @memberof dc.lineChart
   * @instance
   * @example
   * chart.renderDataPoints({radius: 2, fillOpacity: 0.8, strokeOpacity: 0.8})
   * @param  {{fillOpacity: Number, strokeOpacity: Number, radius: Number}} [options={fillOpacity: 0.8, strokeOpacity: 0.8, radius: 2}]
   * @return {{fillOpacity: Number, strokeOpacity: Number, radius: Number}}
   * @return {dc.lineChart}
   */
  _chart.renderDataPoints = function(options) {
    if (!arguments.length) {
      return {
        fillOpacity: _dataPointFillOpacity,
        strokeOpacity: _dataPointStrokeOpacity,
        radius: _dataPointRadius
      }
    } else if (!options) {
      _dataPointFillOpacity = DEFAULT_DOT_OPACITY
      _dataPointStrokeOpacity = DEFAULT_DOT_OPACITY
      _dataPointRadius = null
    } else {
      _dataPointFillOpacity = options.fillOpacity || 0.8
      _dataPointStrokeOpacity = options.strokeOpacity || 0.8
      _dataPointRadius = options.radius || 2
    }
    return _chart
  }

  function colorFilter(color, dashstyle, inv) {
    return function() {
      const item = d3.select(this)
      const match =
        (item.attr("stroke") === color &&
          item.attr("stroke-dasharray") ===
            (dashstyle instanceof Array ? dashstyle.join(",") : null)) ||
        item.attr("fill") === color
      return inv ? !match : match
    }
  }

  _chart.legendHighlight = function(d) {
    if (!_chart.isLegendableHidden(d)) {
      _chart
        .g()
        .selectAll("path.line, path.area")
        .classed("highlight", colorFilter(d.color, d.dashstyle))
        .classed("fadeout", colorFilter(d.color, d.dashstyle, true))
    }
  }

  _chart.legendReset = function() {
    _chart
      .g()
      .selectAll("path.line, path.area")
      .classed("highlight", false)
      .classed("fadeout", false)
  }

  override(_chart, "legendables", () => {
    const legendables = _chart._legendables()
    if (!_dashStyle) {
      return legendables
    }
    return legendables.map(l => {
      l.dashstyle = _dashStyle
      return l
    })
  })

  _chart = multiSeriesMixin(_chart)

  _chart.destroyChart = function() {
    deregisterChart(_chart, _chart.chartGroup())
    _chart.on("filtered", null)
    _chart.filterAll()
    _chart.resetSvg()
    _chart
      .root()
      .attr("style", "")
      .attr("class", "")
      .html("")
    _chart._doRender = () => _chart
  }

  return _chart.anchor(parent, chartGroup)
}
