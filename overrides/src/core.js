var dc = require("../../mapdc")

export default function asyncCoreMixin (dc) {
  dc._renderFlag = false
  dc._redrawFlag = false
  dc._renderId = 0
  dc._redrawId = 0
  dc._renderCount = 0
  dc._redrawCount = 0
  dc._renderIdStack = null
  dc._redrawIdStack = null
  dc._startRenderTime = null
  dc._startRedrawTime = null
  return dc
}

export function redrawAllAsync (group) {
  if (dc._refreshDisabled) {
    return Promise.resolve()
  }

  var queryGroupId = dc._redrawId++
  var stackEmpty = dc._redrawIdStack === null
  dc._redrawIdStack = queryGroupId

  if (!stackEmpty) {
    return Promise.resolve()
  }

  dc._startRedrawTime = new Date()

  var charts = dc.chartRegistry.list(group)

  var redrawPromises = charts.map(function (chart) {
    chart.expireCache()
    if (dc._sampledCount > 0) {
      return chart.redrawAsync(queryGroupId, charts.length - 1)
    } else {
      return chart.redrawAsync(queryGroupId, charts.length)
    }
  })

  if (dc._renderlet !== null) {
    dc._renderlet(group)
  }

  return Promise.all(redrawPromises)
}

export function renderAllAsync (group) {
  if (dc._refreshDisabled) {
    return Promise.resolve()
  }

  var queryGroupId = dc._renderId++
  var stackEmpty = dc._renderIdStack === null
  dc._renderIdStack = queryGroupId

  if (!stackEmpty) {
    return Promise.resolve()
  }

  dc._startRenderTime = new Date()

  var charts = dc.chartRegistry.list(group)
  var renderPromises = charts.map(function (chart) {
    chart.expireCache()
    if (dc._sampledCount > 0) {
      return chart.renderAsync(queryGroupId, charts.length - 1, callback)
    } else {
      return chart.renderAsync(queryGroupId, charts.length, callback)
    }
  })

  if (dc._renderlet !== null) {
    dc._renderlet(group)
  }

  return Promise.all(renderPromises)
}
