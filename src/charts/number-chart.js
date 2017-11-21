import baseMixin from "../mixins/base-mixin"
import d3 from "d3"
import {utils} from "../utils/utils"
import {lastFilteredSize, setLastFilteredSize} from "../core/core-async"

export default function numberChart (parent, chartGroup) {
  const _chart = baseMixin({})
  let _colors = "#22a7f0"
  let _fontSize = null
  let _chartWidth = null

  _chart.formatNumber = function (formatter) {
    if (!arguments.length) {
      return _formatNumber
    }
    _formatNumber = formatter
    return _chart
  }

  _chart.colors = function (_) {
    if (!arguments.length) {
      return _colors
    }
    _colors = _
    return _chart
  }

  _chart.getColor = function (selected, all) {
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

  _chart._doRender = function (val) {
    const selected = utils.formatValue(val)

    const wrapper = _chart
      .root()
      .html("")
      .append("div")
      .attr("class", "number-chart-wrapper")

    wrapper
      .append("span")
      .attr("class", "number-chart-number")
      .style("color", _chart.getColor)
      .style(
        "font-size",
        d => Math.max(Math.floor(_chart.height() / 5), 32) + "px"
      )
      .html(selected === "-0" ? 0 : selected)
      .style("font-size", function (d) {
        const width = d3
          .select(this)
          .node()
          .getBoundingClientRect().width
        let calcFontSize = parseInt(
          d3
            .select(this)
            .node()
            .style.fontSize.replace(/\D/g, "")
        )

        if (width > _chart.width() - 64) {
          calcFontSize = Math.max(
            calcFontSize * ((_chart.width() - 64) / width),
            32
          )
        }

        _fontSize = !_fontSize || _chartWidth < _chart.width() ? calcFontSize : Math.min(_fontSize, calcFontSize)

        _chartWidth = _chart.width()

        return _fontSize + "px"
      })

    return _chart
  }

  _chart._doRedraw = function (val) {
    return _chart._doRender(val)
  }

  return _chart.anchor(parent, chartGroup)
}
