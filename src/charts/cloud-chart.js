import baseMixin from "../mixins/base-mixin"
import capMixin from "../mixins/cap-mixin"
import d3 from "d3"
import colorMixin from "../mixins/color-mixin"
import marginMixin from "../mixins/margin-mixin"

export default function cloudChart(parent, chartGroup) {
  let _g
  const _chart = capMixin(marginMixin(colorMixin(baseMixin({}))))
  let _cloudData
  let _cloudLayout
  let _r
  let _tags // store output of _cloudLayout
  let _noRelayout = false // flag to set on click so rerender doesn't relayout elements
  const _hasBeenRendered = false

  _chart.setNoRelayout = function(val) {
    _noRelayout = val
  }

  function drawChart() {
    _cloudData = _chart.data()
    calculateSizeScale()
    _cloudLayout = d3.layout
      .cloud()
      .size([_chart.width(), _chart.height()])
      .words(
        _cloudData.map(
          d => ({
            key0: d.key0,
            value: d.value,
            color: d.color,
            text: d.key0,
            size: _r(_chart.valueAccessor()(d))
          })

          // return {key: d.key0, value: d.value, text: d.key0, size: _r(_chart.valueAccessor()(d))};
        )
      )
      .rotate(() => 0)
      .font("Impact")
      .fontSize(d => d.size)
      .on("end", cloudDraw)
    _cloudLayout.start()
  }

  function calculateSizeScale() {
    const extent = d3.extent(_cloudData, _chart.cappedValueAccessor)

    _r = d3.scale
      .log()
      .domain(extent)
      .range([
        10,
        Math.max(
          14,
          Math.min(_chart.effectiveWidth(), _chart.effectiveHeight()) / 10
        )
      ])
  }

  function cloudDraw(newTags) {
    _tags = newTags
    const tagElems = _g
      .attr(
        "transform",
        "translate(" +
          _cloudLayout.size()[0] / 2 +
          "," +
          _cloudLayout.size()[1] / 2 +
          ")"
      )
      .selectAll("text")
      .data(_tags)
    tagElems.enter().append("text")
    tagElems.exit().remove()
    tagElems
      .style("font-size", d => d.size + "px")
      .style("font-family", "Impact")
      .style("fill", _chart.getColor) // function(d, i) { return fill(i); })
      .style("cursor", "pointer")
      .attr("text-anchor", "middle")
      .attr(
        "transform",
        d => "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")"
      )
      .text(d => d.key0)
      .on("click", onClick)
      .classed(
        "deselected",
        d => (_chart.hasFilter() ? !isSelectedTag(d) : false)
      )
      .classed("selected", d => (_chart.hasFilter() ? isSelectedTag(d) : false))

    createTitles(tagElems)
  }

  function onClick(d) {
    _noRelayout = true
    _chart.onClick(d)
  }

  function createTitles(tags) {
    if (_chart.renderTitle()) {
      tags.selectAll("title").remove()
      tags.append("title").text(_chart.title())
    }
  }

  function isSelectedTag(d) {
    return _chart.hasFilter(_chart.cappedKeyAccessor(d))
  }

  _chart.title(
    d => _chart.cappedKeyAccessor(d) + ": " + _chart.cappedValueAccessor(d)
  )

  _chart.label(_chart.cappedKeyAccessor)

  _chart._doRender = function() {
    _chart.resetSvg()
    _g = _chart
      .svg()
      .append("g")
      .attr(
        "transform",
        "translate(" + _chart.margins().left + "," + _chart.margins().top + ")"
      )

    if (_noRelayout) {
      cloudDraw(_tags) // skip layout so tags remain in place
      _noRelayout = false
    } else {
      drawChart()
    }
    const _hasBeenRendered = true

    return _chart
  }

  _chart._doRedraw = function() {
    if (!_hasBeenRendered) {
      return _chart._doRender()
    }
    if (_noRelayout) {
      cloudDraw(_tags)
      _noRelayout = false
    } else {
      drawChart()
    }
    return _chart
  }

  return _chart.anchor(parent, chartGroup)
}
