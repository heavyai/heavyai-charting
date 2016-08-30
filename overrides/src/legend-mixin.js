import d3 from "d3"

const PERCENTAGE = 100.0
const LOWER_THAN_START_RANGE = 1000

export default function legendMixin (chart) {
  chart.legendablesContinuous = function () {

    const legends = []
    const colorDomain = chart.colors().domain()

    const colorDomainSize = colorDomain[1] - colorDomain[0]
    const colorRange = chart.colors().range()
    const numColors = colorRange.length
    const commafy = d3.format(",")

    for (let c = 0; c < numColors; c++) {
      let startRange = (c / numColors) * colorDomainSize + colorDomain[0]

      if (chart.isTargeting()) {
        startRange = "%" + (parseFloat(startRange) * PERCENTAGE).toFixed(2)
      } else if (chart.colorByExpr() === "count(*)") {
        startRange = parseInt(startRange) // eslint-disable-line radix
      } else {
        startRange = parseFloat(startRange).toFixed(2)
        startRange = (startRange >= LOWER_THAN_START_RANGE ? Math.round(startRange) : startRange)
      }

      let color = null

      if (colorDomainSize === 0) {
        color = colorRange[Math.floor(numColors / 2)]
      } else {
        color = colorRange[c]
      }

      legends.push({
        color,
        value: isNaN(startRange) ? startRange : commafy(startRange)
      })
    }

    return legends
  }

  return chart
}
