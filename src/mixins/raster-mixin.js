import { decrementSampledCount, incrementSampledCount } from "../core/core"
import { lastFilteredSize } from "../core/core-async"
import { utils } from "../utils/utils"
import d3 from "d3"

export default function rasterMixin(_chart) {
  let _con = window.hasOwnProperty("con") ? con : null
  let _sampling = false
  let _tableName = null
  let _popupColumns = []
  let _popupColumnsMapped = {}
  let _popupSearchRadius = 2
  let _popupFunction = null
  let _colorBy = null
  let _sizeBy = null
  const _showColorByInPopup = false
  const _mouseLeave = false // used by displayPopup to maybe return early
  const _minMaxCache = {}
  let _crossfilter = null

  const _data_events = ["preData"]
  const _listeners = d3.dispatch.apply(d3, _data_events)
  const _on = _chart.on.bind(_chart)

  let _popupDisplayable = true

  _chart.popupDisplayable = function(displayable) {
    _popupDisplayable = Boolean(displayable)
  }

  _chart.on = function(event, listener) {
    if (_data_events.indexOf(event) === -1) {
      _on(event, listener)
    } else {
      _listeners.on(event, listener)
    }
    return _chart
  }

  _chart._invokePreDataListener = function(f) {
    if (f !== "undefined") {
      _listeners.preData(_chart, f)
    }
  }

  _chart.getMinMax = function(value) {
    if (_minMaxCache[value]) {
      return Promise.resolve(_minMaxCache[value])
    }

    return _chart
      .crossfilter()
      .groupAll()
      .reduce([
        { expression: value, agg_mode: "min", name: "minimum" },
        { expression: value, agg_mode: "max", name: "maximum" }
      ])
      .valuesAsync(true)
      .then(bounds => {
        _minMaxCache[value] = [bounds.minimum, bounds.maximum]
        return _minMaxCache[value]
      })
  }

  _chart.getTopValues = function(value) {
    const NUM_TOP_VALUES = 10
    const OFFSET = 0

    if (_minMaxCache[value]) {
      return Promise.resolve(_minMaxCache[value])
    }

    return _chart
      .crossfilter()
      .dimension(value)
      .order("val")
      .group()
      .reduceCount(value)
      .topAsync(NUM_TOP_VALUES, OFFSET, null, true)
      .then(results => results.map(result => result.key0))
  }

  _chart.crossfilter = function(_) {
    if (!arguments.length) {
      return _crossfilter
    }
    _crossfilter = _
    return _chart
  }

  _chart.xRangeFilter = function(range) {
    if (!_chart.xDim()) {
      throw new Error("Must set xDim before invoking xRange")
    }

    const xValue = _chart.xDim().value()[0]

    if (!arguments.length) {
      return _minMaxCache[xValue]
    }

    _minMaxCache[xValue] = range
    return _chart
  }

  _chart.yRangeFilter = function(range) {
    if (!_chart.yDim()) {
      throw new Error("Must set yDim before invoking yRange")
    }

    const yValue = _chart.yDim().value()[0]

    if (!arguments.length) {
      return _minMaxCache[yValue]
    }

    _minMaxCache[yValue] = range
    return _chart
  }

  _chart.popupSearchRadius = function(popupSearchRadius) {
    if (!arguments.length) {
      return _popupSearchRadius
    }
    _popupSearchRadius = popupSearchRadius
    return _chart
  }

  _chart._resetVegaSpec = function() {
    const pixelRatio = this._getPixelRatio()
    _chart._vegaSpec.width = Math.round(_chart.width() * pixelRatio)
    _chart._vegaSpec.height = Math.round(_chart.height() * pixelRatio)
    _chart._vegaSpec.data = [
      {
        name: "table",
        sql: "select x, y from tweets;"
      }
    ]
    if (_tableName) {
      _chart._vegaSpec.data[0].dbTableName = _tableName
    }
    _chart._vegaSpec.scales = []
    _chart._vegaSpec.marks = []
  }

  _chart.con = function(_) {
    if (!arguments.length) {
      return _con
    }
    _con = _
    return _chart
  }

  _chart.popupColumns = function(popupColumns) {
    if (!arguments.length) {
      return _popupColumns
    }
    _popupColumns = popupColumns
    return _chart
  }

  _chart.popupColumnsMapped = function(popupColumnsMapped) {
    if (!arguments.length) {
      return _popupColumnsMapped
    }
    _popupColumnsMapped = popupColumnsMapped
    return _chart
  }

  _chart.tableName = function(tableName) {
    if (!arguments.length) {
      return _tableName
    }
    _tableName = tableName
    return _chart
  }

  _chart.popupFunction = function(popupFunction) {
    if (!arguments.length) {
      return _popupFunction
    }
    _popupFunction = popupFunction
    return _chart
  }

  // _determineScaleType because there is no way to determine the scale type
  // in d3 except for looking to see what member methods exist for it
  _chart.sampling = function(isSetting) {
    // isSetting should be true or false
    if (!arguments.length) {
      return _sampling
    }
    if (isSetting && !_sampling) {
      // if wasn't sampling
      incrementSampledCount()
    } else if (!isSetting && _sampling) {
      decrementSampledCount()
    }
    _sampling = isSetting
    if (_sampling === false) {
      _chart.dimension().samplingRatio(null) // unset sampling
    }
    return _chart
  }

  _chart.setSample = function() {
    if (_sampling) {
      const id = _chart.dimension().getCrossfilterId()
      const filterSize = lastFilteredSize(id)
      if (filterSize == undefined) {
        _chart.dimension().samplingRatio(null)
      } else {
        _chart
          .dimension()
          .samplingRatio(Math.min(_chart.cap() / filterSize, 1.0))
      }
    }
  }

  _chart._determineScaleType = function(scale) {
    const scaleType = null
    if (scale.rangeBand !== undefined) {
      return "ordinal"
    }
    if (scale.exponent !== undefined) {
      return "power"
    }
    if (scale.base !== undefined) {
      return "log"
    }
    if (scale.quantiles !== undefined) {
      return "quantiles"
    }
    if (scale.interpolate !== undefined) {
      return "linear"
    }
    return "quantize"
  }

  _chart.vegaSpec = function(_) {
    if (!arguments.length) {
      return _chart._vegaSpec
    }
    _chart._vegaSpec = _
    return _chart
  }

  _chart.colorBy = function(_) {
    if (!arguments.length) {
      return _colorBy
    }
    _colorBy = _
    return _chart
  }

  _chart.sizeBy = function(_) {
    if (!arguments.length) {
      return _sizeBy
    }
    _sizeBy = _
    return _chart
  }

  _chart.getClosestResult = function getClosestResult(point, callback) {
    if (
      (_chart.drawMode && _chart.drawMode()) ||
      !_chart.popupColumns().length
    ) {
      return
    }
    const height =
      typeof _chart.effectiveHeight === "function"
        ? _chart.effectiveHeight()
        : _chart.height()
    const pixelRatio = _chart._getPixelRatio() || 1
    const pixel = new TPixel({
      x: Math.round(point.x * pixelRatio),
      y: Math.round((height - point.y) * pixelRatio)
    })
    const tableName = _chart.tableName()
    const columns = getColumnsWithPoints()
    // TODO best to fail, skip cb, or call cb wo args?
    if (
      !point ||
      !tableName ||
      !columns.length ||
      (columns.length === 3 && hideColorColumnInPopup())
    ) {
      return
    }

    _chart
      .con()
      .getResultRowForPixelAsync(
        _chart.__dcFlag__,
        pixel,
        { table: columns },
        _popupSearchRadius * pixelRatio
      )
      .then(results => callback(results[0]))
  }

  _chart.displayPopup = function displayPopup(result) {
    if (
      !_popupDisplayable ||
      _mouseLeave ||
      !result ||
      !result.row_set ||
      !result.row_set.length
    ) {
      return
    }
    if (_chart.select(".map-popup").empty()) {
      // show only one popup at a time.
      const data = result.row_set[0]
      const mappedData = mapDataViaColumns(data, _popupColumnsMapped)
      if (Object.keys(mappedData).length === 2) {
        return
      } // xPoint && yPoint
      let offsetBridge = 0

      const width =
        typeof _chart.effectiveWidth === "function"
          ? _chart.effectiveWidth()
          : _chart.width()
      const height =
        typeof _chart.effectiveHeight === "function"
          ? _chart.effectiveHeight()
          : _chart.height()
      const margins =
        typeof _chart.margins === "function"
          ? _chart.margins()
          : { left: 0, right: 0, top: 0, bottom: 0 }

      const xscale = _chart.x()
      const yscale = _chart.y()

      const origXRange = xscale.range()
      const origYRange = yscale.range()

      xscale.range([0, width])
      yscale.range([0, height])

      const xPixel = xscale(data.xPoint) + margins.left
      const yPixel = height - yscale(data.yPoint) + margins.top

      // restore the original ranges so we don't screw anything else up
      xscale.range(origXRange)
      yscale.range(origYRange)

      const mapPopup = _chart
        .root()
        .append("div")
        .attr("class", "map-popup")
      mapPopup.on("wheel", () => {
        _chart.select(".map-popup").remove()
      })
      mapPopup
        .append("div")
        .attr("class", "map-point-wrap")
        .append("div")
        .attr("class", "map-point")
        .style({ left: xPixel + "px", top: yPixel + "px" })
        .append("div")
        .attr("class", "map-point-gfx")
        .style("background", colorPopupBackground(result.row_set[0]))
      mapPopup
        .append("div")
        .attr("class", "map-popup-wrap")
        .style({ left: xPixel + "px", top: yPixel + "px" })
        .append("div")
        .attr("class", "map-popup-box")
        .html(
          _chart.popupFunction()
            ? _popupFunction(mappedData)
            : renderPopupHTML(mappedData)
        )
        .style("left", function() {
          const boxWidth = d3
            .select(this)
            .node()
            .getBoundingClientRect().width
          const overflow =
            _chart.width() - (xPixel + boxWidth / 2) < 0
              ? _chart.width() - (xPixel + boxWidth / 2) - 6
              : xPixel - boxWidth / 2 < 0
              ? -(xPixel - boxWidth / 2) + 6
              : 0
          offsetBridge = boxWidth / 2 - overflow
          return overflow + "px"
        })
        .classed("pop-down", function() {
          const boxHeight = d3
            .select(this)
            .node()
            .getBoundingClientRect().height
          return yPixel - (boxHeight + 12) < 8
        })
        .append("div")
        .attr("class", "map-popup-bridge")
        .style("left", () => offsetBridge + "px")
    }
  }

  _chart.hidePopup = function hidePopup() {
    if (!_chart.select(".map-popup").empty()) {
      _chart
        .select(".map-popup-wrap")
        .classed("removePopup", true)
        .on("animationend", () => {
          _chart.select(".map-popup").remove()
        })
      _chart.select(".map-point").classed("removePoint", true)
    }
  }

  _chart._vegaSpec = {}

  return _chart

  function getColumnsWithPoints() {
    const columns = _chart.popupColumns().slice()

    if (typeof _chart.useLonLat === "function" && _chart.useLonLat()) {
      columns.push("conv_4326_900913_x(" + _chart._xDimName + ") as xPoint")
      columns.push("conv_4326_900913_y(" + _chart._yDimName + ") as yPoint")
    } else {
      columns.push(_chart._xDimName + " as xPoint")
      columns.push(_chart._yDimName + " as yPoint")
    }

    if (_chart.colorBy() && columns.indexOf(_chart.colorBy().value) === -1) {
      columns.push(_chart.colorBy().value)
    }

    return columns
  }

  function renderPopupHTML(data) {
    let html = ""
    for (const key in data) {
      if (
        key !== "xPoint" &&
        key !== "yPoint" &&
        !(
          _chart.colorBy() &&
          key === _chart.colorBy().value &&
          hideColorColumnInPopup()
        )
      ) {
        html =
          html +
          ('<div class="map-popup-item"><span class="popup-item-key">' +
            key +
            ':</span><span class="popup-item-val"> ' +
            utils.formatValue(data[key]) +
            "</span></div>")
      }
    }
    return html
  }

  function colorPopupBackground(data) {
    if (!_chart.colors().domain || !_chart.colorBy()) {
      return _chart.defaultColor()
    } else if (isNaN(_chart.colors().domain()[0])) {
      const matchIndex = _chart
        .colors()
        .domain()
        .indexOf(data[_chart.colorBy().value])
      return matchIndex !== -1
        ? _chart.colors().range()[matchIndex]
        : _chart.defaultColor()
    } else {
      return _chart.colors()(data[_chart.colorBy().value])
    }
  }

  function mapDataViaColumns(data, _popupColumnsMapped) {
    const newData = {}
    for (const key in data) {
      const newKey = _popupColumnsMapped[key] || key
      newData[newKey] = data[key]
    }
    return newData
  }

  function hideColorColumnInPopup() {
    return (
      _chart.colorBy() &&
      _chart.popupColumns().indexOf(_chart.colorBy().value) === -1
    )
  }
}
