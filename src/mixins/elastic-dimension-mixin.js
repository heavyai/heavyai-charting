import { adjust, set, lensProp } from "ramda";
import d3 from "d3";

export default function elasticDimensionMixin(_chart) {
  const NON_INDEX = -1;
  const _binEvents = ["updateBinBounds"];
  const _listeners = d3.dispatch.apply(d3, _binEvents);
  const _on = _chart.on.bind(_chart);
  let _dataAsync = _chart.getDataAsync();

  _chart.on = function(event, listener) {
    const baseEvent = event.includes(".") ? event.slice(0, event.indexOf(".")) : event;
    if (_binEvents.indexOf(baseEvent) === NON_INDEX) {
      _on(event, listener);
    } else {
      _listeners.on(event, listener);
    }
    return _chart;
  };

  _chart._invokeBinBoundsListener = function(binBounds) {
    if (typeof binBounds !== "undefined") {
      _listeners.updateBinBounds(_chart, binBounds);
    }
  };

  function updateBinRange(group, callback) {
    if (
      !_chart.elasticX() ||
      !_chart.binParams()[0] ||
      (_chart.rangeChartEnabled() && _chart.rangeChart() && _chart.rangeChart().filter())
    ) {
      return _dataAsync(group, callback);
    }

    group
      .getMinMaxWithFilters()
      .then(bounds => {
        if (!bounds) {
          return _dataAsync(group, callback);
        }

        _chart.binParams(
          adjust(
            set(lensProp("binBounds"), [bounds.min_val, bounds.max_val]),
            0,
            _chart.binParams()
          )
        );

        if (_chart._isRangeChart && _chart.filter()) {
          _chart
            .focusChart()
            ._invokeBinBoundsListener([bounds.min_val, bounds.max_val]);
        } else {
          _chart._invokeBinBoundsListener([bounds.min_val, bounds.max_val]);
        }
        _dataAsync(group, callback);
      })
      .catch(err => callback(err));
  }

  _chart.on("dataFetch.reBin", () => {
    if (_chart.elasticX() && _chart.getDataAsync() !== updateBinRange) {
      _dataAsync = _chart.getDataAsync();
      _chart.setDataAsync(updateBinRange);
    }
  });

  _chart.on("preRedraw.maybeRemoveRangeFilter", () => {
    const range = _chart.rangeChart();

    if (_chart.rangeChartEnabled() && range && range.filter()) {
      if (
        range.filter()[0] < range.x().domain()[0] ||
        range.filter()[1] > range.x().domain()[1]
      ) {
        _chart.filterAll();
        range.filterAll();
      }
    }
  });

  return _chart;
}
