import d3 from "d3"

const OFFSET_WIDTH = 8

function unLockedPreRedrawRenderHandler(chart, data = chart.data()) {
  if (!data.image) {
    chart.colorDomain(d3.extent(data, chart.colorAccessor()))
  }
}

export default function legendCont() {
  const _legend = {}
  let _parent = null
  let _legendTitle = ""
  let _chartType = ""
  let _wrapper = null
  let _lock = null
  let _minMax = null
  let _isLocked = false

  _legend.legendType = function() {
    return "quantitative"
  }

  _legend.isLocked = function(_) {
    if (!arguments.length) {
      return _isLocked
    }
    _isLocked = _
    return _legend
  }

  _legend.parent = function(p) {
    if (!arguments.length) {
      return _parent
    }
    _parent = p
    return _legend
  }

  _legend.minMax = function(_) {
    if (!arguments.length) {
      return _minMax
    }
    _minMax = _
    return _legend
  }

  _legend.legendTitle = function(_) {
    if (!arguments.length) {
      return _legendTitle
    }
    _legendTitle = _
    return _legend
  }

  _legend.chartType = function(_) {
    if (!arguments.length) {
      return _chartType
    }
    _chartType = _
    return _legend
  }

  _legend.removeLegend = function() {
    _parent
      .root()
      .select(".legend-cont")
      .remove()
    _parent._invokeClearCustomContLegendListener()
    _parent.legend(null)
  }

  _legend.render = function() {
    _parent
      .root()
      .select(".legend-cont")
      .remove()

    _wrapper = _parent
      .root()
      .append("div")
      .attr("class", "legend-cont")

    const legendGroup = _wrapper.append("div").attr("class", "legend-group")

    initLock()

    const legendables = _parent.legendablesContinuous()

    const itemEnter = legendGroup
      .selectAll(".legend-item")
      .data(legendables)
      .enter()
      .append("div")
      .attr("class", "legend-item")

    itemEnter
      .append("div")
      .attr("class", "legend-swatch")
      .style("background-color", d => (d ? d.color : "#e2e2e2")) // eslint-disable-line no-confusing-arrow

    itemEnter
      .append("div")
      .attr("class", "legend-label")
      .append("span")
      .text(d => (typeof d === "object" && d.value !== "NaN" ? d.value : 0)) // eslint-disable-line no-confusing-arrow

    legendGroup
      .selectAll(".legend-item:first-child , .legend-item:last-child")
      .on("mouseenter", function() {
        const item = d3.select(this)
        const w =
          item
            .select("span")
            .node()
            .getBoundingClientRect().width + OFFSET_WIDTH
        item.select(".legend-input input").style("width", w + "px")
      })
      .selectAll(".legend-label")
      .append("div")
      .attr("class", "legend-input")
      .append("input")
      .attr(
        "value",
        d => (typeof d === "object" && d.value !== "NaN" ? d.value : 0)
      ) // eslint-disable-line no-confusing-arrow
      .on("click", function() {
        this.select()
        const item = d3.select(this.parentNode.parentNode)
        item.classed("active", true)

        const w =
          item
            .select("span")
            .node()
            .getBoundingClientRect().width + OFFSET_WIDTH
        item.select(".legend-input input").style("width", w + "px")
      })
      .on("blur", function() {
        d3.select(this.parentNode.parentNode).classed("active", false)
      })
      .on("change", onChange)
  }

  function initLock() {
    _lock = _wrapper
      .append("div")
      .attr("class", "legend-lock")
      .classed("js-isLocked", _isLocked)
      .on("click", toggleLock)

    const lockIcon = _lock
      .append("svg")
      .attr("class", "svg-icon")
      .classed("icon-lock", true)
      .attr("viewBox", "0 0 48 48")

    lockIcon
      .append("g")
      .style("stroke", "white")
      .style("stroke-width", "6")
      .append("use")
      .attr("xlink:href", "#icon-lock")

    lockIcon.append("use").attr("xlink:href", "#icon-lock")

    const unLockIcon = _lock
      .append("svg")
      .attr("class", "svg-icon")
      .classed("icon-unlock", true)
      .attr("viewBox", "0 0 48 48")

    unLockIcon
      .append("g")
      .style("stroke", "white")
      .style("stroke-width", "6")
      .append("use")
      .attr("xlink:href", "#icon-unlock")

    unLockIcon.append("use").attr("xlink:href", "#icon-unlock")

    if (_isLocked) {
      _parent.on("preRender.color", null)
      _parent.on("preRedraw.color", null)
    } else {
      _parent.on("preRender.color", unLockedPreRedrawRenderHandler)
      _parent.on("preRedraw.color", unLockedPreRedrawRenderHandler)
    }
  }

  function toggleLock() {
    _isLocked = !_isLocked

    if (_isLocked) {
      _parent._invokeSetCustomContLegendListener({
        detail: _parent.colors().domain()
      })
    } else {
      const minMax =
        _chartType === "pointmap" || _chartType === "backendScatter"
          ? _minMax
          : d3.extent(_parent.data(), _parent.colorAccessor())
      if (minMax) {
        _parent.colorDomain(minMax)
      }
      _parent._invokeClearCustomContLegendListener()
    }
    _parent.redrawAsync()
  }

  function onChange() {
    const parseVal = function(val) {
      return parseFloat(val.replace(/,/g, ""))
    }
    const currVal = d3.select(this).attr("value")
    const inputBox1 = parseVal(
      _wrapper.select(".legend-item:first-child .legend-input input").node()
        .value
    )
    const inputBox2 = parseVal(
      _wrapper.select(".legend-item:last-child .legend-input input").node()
        .value
    )

    const startVal = isFinite(inputBox1) ? inputBox1 : _parent.colorDomain()[0]
    const endVal = isFinite(inputBox2) ? inputBox2 : _parent.colorDomain()[1]

    if (!isNaN(startVal) && !isNaN(endVal)) {
      _isLocked = true
      _parent
        .colorDomain([startVal, endVal])
        .on("preRedraw.color", null)
        .redrawAsync()
      _parent._invokeSetCustomContLegendListener({
        detail: [startVal, endVal]
      })
    } else {
      d3.select(this).property("value", currVal)
    }
  }

  return _legend
}
