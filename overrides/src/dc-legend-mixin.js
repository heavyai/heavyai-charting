export default function legendMixin (legend) {
  legend._scrollPos = 0
  legend._expanded = true
  legend._heightRatio = 3
  legend._title = "Legends"
  legend._key = "key0"

  legend.render = function () {
    legend.parent().root().select(".dc-legend").remove()

    const wrapper = legend.parent().root().append("div")
      .attr("class", "dc-legend")
      .classed("collapsed", !legend._expanded)

    const header = wrapper.append("div")
      .attr("class", "dc-legend-header")
      .text(legend._expanded ? legend._title : "Legends")
      .on("click", () => {
        legend._expanded = !legend._expanded
        legend.render()
      })

    if (legend._expanded) {
      header.append("div")
        .attr("class", "toggle-btn")

      const body = wrapper.append("div")
        .attr("class", "dc-legend-body")
        .style("max-height", legend.parent().height() / legend._heightRatio + "px")
        .on("scroll", () => {
          legend._scrollPos = body.node().scrollTop
        })

      const legendables = legend.legendables()

      const itemEnter = body.selectAll(".dc-legend-item")
        .data(legendables)
        .enter()
        .append("div")
        .attr("class", "dc-legend-item")

      itemEnter.append("div")
        .attr("class", "legend-item-color")
        .style("background", d => (d ? d.color : "#a7a7a7"))

      itemEnter.append("div")
        .attr("class", "legend-item-text")
        .text(d => (d.name))

      body.node().scrollTop = legend._scrollPos
    }
  }

  legend.removeLegend = function () {
    legend.parent().root().select(".dc-legend").remove()
    legend.parent().legend(null)
  }

  legend.legendables = function () {
    return uniqueKeys(legend.parent().data(), legend._key).map((d, i) => {
      const legendable = {
        name: d[legend._key],
        data: d.val,
        others: d.others,
        chart: legend.parent()
      }

      legendable.color = legend.parent().getColor(d, i)
      return legendable
    })
  }

  legend.setTitle = function (title) {
    legend._title = title
    return legend
  }

  legend.setKey = function (key) {
    legend._key = key
    return legend
  }

  function uniqueKeys (myArr, key) {
    return myArr.filter((obj, pos, arr) => (
      arr.map(mapObj => mapObj[key]).indexOf(obj[key]) === pos
    ))
  }

  return legend
}
