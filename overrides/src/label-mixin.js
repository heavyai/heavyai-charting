export default function labelMixin (chart) {
  let _measureLabelsOn = false

  chart.measureLabelsOn = function (val) {
    if (!arguments.length) {
      return _measureLabelsOn
    }
    _measureLabelsOn = val
    return chart
  }

  return chart
}
