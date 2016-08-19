export default function debounceFilterRedrawMixin (dc) {
  return function debounceFilterRedrawMixinWithDc (_chart) {
    _chart.redrawGroup = function (callback) {
      if (_chart.commitHandler()) {
        _chart.commitHandler()(false, (error) => {
          if (error) {
            callback && callback(error)
          } else {
            dc.redrawAllAsyncWithDebounce(_chart.chartGroup())
          }
        })
      } else {
        dc.redrawAllAsyncWithDebounce(_chart.chartGroup())
      }
      return _chart
    }
    return _chart
  }
}
