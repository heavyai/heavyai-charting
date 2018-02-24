import d3 from "d3"
import { override } from "../core/core"
import {
  groupAll,
  lastFilteredSize,
  setLastFilteredSize
} from "../core/core-async"
import baseMixin from "../mixins/base-mixin"

export default function countWidget(parent, chartGroup) {
  const _chart = baseMixin({})

  let _formatNumber = d3.format(",")
  let _countLabel = "rows"
  let _tot = null

  override(_chart, "group", function(group, name) {
    if (!arguments.length) {
      return _chart._group()
    }

    groupAll(group)
    return _chart._group(group, name)
  })

  const noop = () => null
  _chart.isCountChart = () => true
  _chart.dataFetchRequestCallback(noop)
  _chart.dataFetchSuccessfulCallback(noop)

  _chart.formatNumber = function(formatter) {
    if (!arguments.length) {
      return _formatNumber
    }
    _formatNumber = formatter
    return _chart
  }

  _chart.countLabel = function(_) {
    if (!arguments.length) {
      return _countLabel
    }
    _countLabel = _
    return _chart
  }

  _chart.tot = function(number) {
    if (!arguments.length) {
      return _tot
    }
    _tot = number
    return _chart
  }

  _chart.getTotalRecordsAsync = function() {
    if (_chart.tot()) {
      return Promise.resolve()
    }

    return _chart
      .dimension()
      .sizeAsync()
      .then(tot => {
        _chart.tot(tot)
        return Promise.resolve()
      })
  }

  _chart.setDataAsync((group, callbacks) =>
    _chart
      .getTotalRecordsAsync()
      .then(() => {
        const id = group.getCrossfilterId()
        const filterSize = lastFilteredSize(id)
        if (filterSize !== undefined) {
          return Promise.resolve(filterSize)
        } else {
          return group.valueAsync().then(value => {
            setLastFilteredSize(id, value)
            return value
          })
        }
      })
      .then(value => {
        callbacks(null, value)
      })
      .catch(error => {
        callbacks(error)
      })
  )

  _chart._doRender = function(val) {
    const all = _formatNumber(_chart.tot())
    const selected = _formatNumber(val)

    const wrapper = _chart
      .root()
      .style("width", "auto")
      .style("height", "auto")
      .html("")
      .append("div")
      .attr("class", "count-widget")

    wrapper
      .append("span")
      .attr("class", "count-selected")
      .classed("not-filtered", selected === all)
      .text(selected === "-0" ? 0 : selected)

    wrapper
      .append("span")
      .classed("not-filtered", selected === all)
      .text(" of ")

    wrapper
      .append("span")
      .attr("class", "count-all")
      .text(all)

    wrapper
      .append("span")
      .attr("class", "count-label")
      .text(" " + _countLabel)

    return _chart
  }

  _chart._doRedraw = function(val) {
    return _chart._doRender(val)
  }

  return _chart.anchor(parent, chartGroup)
}
