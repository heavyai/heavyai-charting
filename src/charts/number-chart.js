import baseMixin from "../mixins/base-mixin"
import d3 from "d3"
import { utils } from "../utils/utils"
import { lastFilteredSize, setLastFilteredSize } from "../core/core-async"

export default function numberChart(parent, chartGroup) {
  const _chart = baseMixin({})
  let _colors = "#22a7f0"
  const _fontSize = null
  const _chartWidth = null

  _chart.colors = function(_) {
    if (!arguments.length) {
      return _colors
    }
    _colors = _
    return _chart
  }

  _chart.getColor = function(selected, all) {
    return typeof _colors === "string" ? _colors : _colors[0]
  }

  _chart.setDataAsync((group, callbacks) =>
    group
      .valueAsync()
      .then(data => {
        if (group.getReduceExpression() === "COUNT(*) AS val") {
          const id = group.getCrossfilterId()
          const filterSize = lastFilteredSize(id)
          if (filterSize !== undefined) {
            return Promise.resolve(filterSize)
          } else {
            return _chart
              .dimension()
              .sizeAsync()
              .then(group.valueAsync)
              .then(value => {
                setLastFilteredSize(id, value)
                return value
              })
          }
        } else {
          return data
        }
      })
      .then(data => {
        callbacks(null, data)
      })
      .catch(error => {
        callbacks(error)
      })
  )

  _chart._doRender = function(val) {
    const customFormatter = _chart.valueFormatter()
    let formattedValue = val
    if (customFormatter && customFormatter(val)) {
      formattedValue = customFormatter(val)
    } else {
      formattedValue = utils.formatValue(val)
      if (formattedValue === "-0") {
        formattedValue = 0
      }
    }

    const wrapper = _chart
      .root()
      .html("")
      .append("div")
      .attr("class", "number-chart-wrapper")

    const TEXT_MARGINS = 64
    const chartWidth = _chart.width() - TEXT_MARGINS
    const chartHeight = _chart.height() - TEXT_MARGINS
    const fontSize = utils.getFontSizeFromWidth(formattedValue, chartWidth, chartHeight)
    wrapper
      .append("span")
      .attr("class", "number-chart-number")
      .style("color", _chart.getColor)
      .style("font-size", fontSize + "px")
      .html(formattedValue)

    return _chart
  }

  _chart._doRedraw = function(val) {
    return _chart._doRender(val)
  }

  return _chart.anchor(parent, chartGroup)
}
