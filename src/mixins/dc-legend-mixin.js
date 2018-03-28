export default function legendMixin(legend) {
  legend._scrollPos = 0
  legend._expanded = true
  legend._heightRatio = 3
  legend._title = "Legend"
  legend._key = "key0"

  legend.legendType = function() {
    return "custom"
  }

  legend.render = function() {
    // Does not re-render if a custom cursor is on the screen
    if (document.getElementById("cursor") !== null) {
      return
    }

    legend
      .parent()
      .root()
      .select(".dc-legend")
      .remove()

    const wrapper = legend
      .parent()
      .root()
      .append("div")
      .attr("class", "dc-legend")
      .classed("collapsed", !legend._expanded)

    const header = wrapper
      .append("div")
      .attr("class", "dc-legend-header")
      .text(legend._expanded ? legend._title : "Legend")
      .on("click", () => {
        legend._expanded = !legend._expanded
        legend.render()
      })

    if (legend._expanded) {
      header.append("div").attr("class", "toggle-btn")

      const body = wrapper
        .append("div")
        .attr("class", "dc-legend-body")
        .style(
          "max-height",
          legend.parent().height() / legend._heightRatio + "px"
        )
        .on("scroll", () => {
          legend._scrollPos = body.node().scrollTop
        })

      const legendables = legend.legendables()

      const itemEnter = body
        .selectAll(".dc-legend-item")
        .data(legendables)
        .enter()
        .append("div")
        .attr("class", "dc-legend-item")

      itemEnter
        .append("div")
        .attr("class", "legend-item-color")
        .style("background", d => (d ? d.color : "#a7a7a7"))

      itemEnter
        .append("div")
        .attr("class", "legend-item-text")
        .text(d => d.name)

      const bodyNode = body.node()
      if (bodyNode) {
        // fix for #4196#issuecomment-376704328
        bodyNode.scrollTop = legend._scrollPos
      }
    }
  }

  legend.removeLegend = function() {
    legend
      .parent()
      .root()
      .select(".dc-legend")
      .remove()
    legend.parent().legend(null)
  }

  legend.legendables = function() {
    const colors = legend.parent().colors()
    return zip2(colors.domain(), colors.range()).map(data => ({
      name: data[0],
      color: data[1],
      chart: legend.parent()
    }))
  }

  legend.setTitle = function(title) {
    legend._title = title
    return legend
  }

  legend.setKey = function(key) {
    legend._key = key
    return legend
  }

  function zip2(list1, list2) {
    return (list1.length < list2.length ? list1 : list2).map((_, i) => [
      list1[i],
      list2[i]
    ])
  }

  return legend
}
