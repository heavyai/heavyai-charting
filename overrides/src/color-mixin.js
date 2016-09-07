import dc from "../../mapdc"

const GREY = "#e2e2e2"

export default function colorMixin (chart) {

  dc.override(chart, "getColor", (data, index) => {
    if (typeof data === "undefined") {
      return GREY
    }
    const range = chart.colors().range()
    const middleColor = range[Math.floor(range.length / 2)]
    return chart._getColor(data, index) || middleColor
  })

  return chart
}
