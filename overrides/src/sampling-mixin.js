export default function createSamplingMixin (dc) {
  return function samplingMixin (_chart) {
    let _sampling = false

    /* istanbul ignore next */
    _chart.sampling = function (setting) { // setting should be true or false
      if (!arguments.length) {
        return _sampling
      }

      if (setting && !_sampling) { // if wasn't sampling
        dc._sampledCount++
      } else if (!setting && _sampling) {
        dc._sampledCount--
      }

      _sampling = setting

      if (_sampling === false) {
        _chart.dimension().samplingRatio(null) // unset sampling
      }

      return _chart
    }
    return _chart
  }
}
