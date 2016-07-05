var dc = require('../mapdc')

exports.redrawAllAsync = function(group) {
  if (dc._refreshDisabled) {
      return;
  }

  var queryGroupId = dc._redrawId++;
  var stackEmpty = false;

  dc._startRedrawTime = new Date();

  var charts = dc.chartRegistry.list(group);

  var redrawPromises = charts.map(function (chart) {
      chart.expireCache()
      if (dc._sampledCount > 0) {
          return chart.redrawAsync(queryGroupId, charts.length)
      } else {
          return chart.redrawAsync(queryGroupId, charts.length)
      }
  })

   if (dc._renderlet !== null) {
      dc._renderlet(group);
  }

  return Promise.all(redrawPromises)
}

exports.renderAllAsync = function(group) {
    if (dc._refreshDisabled) {
        return;
    }

    var queryGroupId = dc._renderId++;
    var stackEmpty = dc._renderIdStack === null;
    dc._renderIdStack = queryGroupId;

    if (!stackEmpty) {
        return;
    }

    dc._startRenderTime = new Date();

    var charts = dc.chartRegistry.list(group);
    var renderPromises = charts.map(function (chart) {
        chart.expireCache()
        if (dc._sampledCount > 0) {
            return chart.renderAsync(queryGroupId, charts.length - 1, callback);
        } else {
            return chart.renderAsync(queryGroupId, charts.length, callback);
        }
    })

    if (dc._renderlet !== null) {
        dc._renderlet(group);
    }

    return Promise.all(renderPromises)
}
