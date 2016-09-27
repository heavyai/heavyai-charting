export default function asyncCoreMixin (dc) {
  dc._renderId = 0
  dc._redrawId = 0
  dc._renderCount = 0
  dc._redrawCount = 0
  dc._renderIdStack = null
  dc._redrawIdStack = null
  dc._startRenderTime = null
  dc._startRedrawTime = null

  dc.incrementRedrawStack = function () {
    const queryGroupId = dc._redrawId++
    dc._redrawIdStack = queryGroupId
    return queryGroupId
  }

  dc.resetRedrawStack = function () {
    dc._redrawCount = 0
    dc._redrawIdStack = null
  }

  dc.isRedrawStackEmpty = function (queryGroupId) {
    if (typeof queryGroupId === "number") {
      return dc._redrawIdStack === null || dc._redrawIdStack === queryGroupId
    } else {
      return dc._redrawIdStack === null
    }
  }

  dc.isEqualToRedrawCount = function (queryCount) {
    return ++dc._redrawCount === queryCount
  }

  dc.incrementRenderStack = function () {
    const queryGroupId = dc._renderId++
    dc._renderIdStack = queryGroupId
    return queryGroupId
  }

  dc.resetRenderStack = function () {
    dc._renderCount = 0
    dc._renderIdStack = null
  }

  dc.isRenderStackEmpty = function (queryGroupId) {
    if (typeof queryGroupId === "number") {
      return dc._renderIdStack === null || dc._renderIdStack === queryGroupId
    } else {
      return dc._renderIdStack === null
    }
  }

  dc.isEqualToRenderCount = function (queryCount) {
    return ++dc._renderCount === queryCount
  }

  dc.redrawAllAsync = function (group) {
    if (dc._refreshDisabled) {
      return Promise.resolve()
    }

    const stackEmpty = dc.isRedrawStackEmpty()
    const queryGroupId = dc.incrementRedrawStack()
    if (!stackEmpty) {
      return Promise.resolve()
    }

    dc._startRedrawTime = new Date()

    const charts = dc.chartRegistry.list(group)
    const createRedrawPromises = () => charts.map(chart => {
      chart.expireCache()
      chart._invokeDataFetchListener()
      return chart.redrawAsync(queryGroupId, charts.length)
        .catch(e => {
          chart._invokeDataErrorListener()
          throw e
        })
    })

    if (dc._renderlet !== null) {
      dc._renderlet(group)
    }

    if (dc.groupAll()) {
      return dc.getLastFilteredSizeAsync()
        .then(() => Promise.all(createRedrawPromises()))
        .catch(err => {
          dc.resetRedrawStack()
          throw err
        })
    } else {
      return Promise.all(createRedrawPromises()).catch(err => {
        dc.resetRedrawStack()
        throw err
      })
    }
  }

  dc.renderAllAsync = function (group) {
    if (dc._refreshDisabled) {
      return Promise.resolve()
    }

    const stackEmpty = dc.isRenderStackEmpty()
    const queryGroupId = dc.incrementRenderStack()
    if (!stackEmpty) {
      return Promise.resolve()
    }


    dc._startRenderTime = new Date()

    const charts = dc.chartRegistry.list(group)
    const createRenderPromises = () => charts.map(chart => {
      chart.expireCache()
      return chart.renderAsync(queryGroupId, charts.length)
    })

    if (dc._renderlet !== null) {
      dc._renderlet(group)
    }

    if (dc.groupAll()) {
      return dc.getLastFilteredSizeAsync()
        .then(() => Promise.all(createRenderPromises()))
    } else {
      return Promise.all(createRenderPromises())
    }
  }

  return dc
}
