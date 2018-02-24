import { chartRegistry, refreshDisabled, renderlet } from "./core"

let _renderId = 0
let _redrawId = 0
let _renderCount = 0
let _redrawCount = 0
let _renderIdStack = null
let _redrawIdStack = null
let _renderStackEmpty = true
let _redrawStackEmpty = true
let _startRenderTime = null
let _startRedrawTime = null

let _groupAll = {}
let _lastFilteredSize = {}

export function startRenderTime() {
  return _startRenderTime
}

export function startRedrawTime() {
  return _startRedrawTime
}

export function resetRedrawStack() {
  _redrawCount = 0
  _redrawIdStack = null
}

export function redrawStackEmpty(isRedrawStackEmpty) {
  if (!arguments.length) {
    return _redrawStackEmpty
  }
  _redrawStackEmpty = isRedrawStackEmpty
  return _redrawStackEmpty
}

export function renderStackEmpty(isRenderStackEmpty) {
  if (!arguments.length) {
    return _renderStackEmpty
  }
  _renderStackEmpty = isRenderStackEmpty
  return _renderStackEmpty
}

export function isEqualToRedrawCount(queryCount) {
  return ++_redrawCount === queryCount
}

export function incrementRenderStack() {
  const queryGroupId = _renderId++
  _renderIdStack = queryGroupId
  return queryGroupId
}

export function resetRenderStack() {
  _renderCount = 0
  _renderIdStack = null
}

export function isEqualToRenderCount(queryCount) {
  return ++_renderCount === queryCount
}

export function redrawAllAsync(group, allCharts) {
  if (refreshDisabled()) {
    return Promise.resolve()
  }

  if (!startRenderTime()) {
    return Promise.reject(
      "redrawAllAsync() is called before renderAllAsync(), please call renderAllAsync() first."
    )
  }

  const queryGroupId = _redrawId++
  const stackEmpty = _redrawIdStack === null
  _redrawIdStack = queryGroupId

  if (!stackEmpty) {
    _redrawStackEmpty = false
    return Promise.resolve()
  }

  _startRedrawTime = new Date()

  const charts = allCharts ? chartRegistry.listAll() : chartRegistry.list(group)

  const createRedrawPromises = () =>
    charts.map(chart => {
      chart.expireCache()
      chart._invokeDataFetchListener()
      return chart.redrawAsync(queryGroupId, charts.length).catch(e => {
        chart._invokeDataErrorListener()
        throw e
      })
    })

  if (renderlet() !== null) {
    renderlet(group)
  }

  if (groupAll()) {
    return getLastFilteredSizeAsync()
      .then(() => Promise.all(createRedrawPromises()))
      .catch(err => {
        console.log(err)
        resetRedrawStack()
        throw err
      })
  } else {
    return Promise.all(createRedrawPromises()).catch(err => {
      console.log(err)
      resetRedrawStack()
      throw err
    })
  }
}

export function renderAllAsync(group, allCharts) {
  if (refreshDisabled()) {
    return Promise.resolve()
  }

  const queryGroupId = _renderId++
  const stackEmpty = _renderIdStack === null
  _renderIdStack = queryGroupId

  if (!stackEmpty) {
    _renderStackEmpty = false
    return Promise.resolve()
  }

  _startRenderTime = new Date()

  const charts = allCharts ? chartRegistry.listAll() : chartRegistry.list(group)

  const createRenderPromises = () =>
    charts.map(chart => {
      chart.expireCache()
      return chart.renderAsync(queryGroupId, charts.length)
    })

  if (renderlet() !== null) {
    renderlet(group)
  }

  if (groupAll()) {
    return getLastFilteredSizeAsync().then(() =>
      Promise.all(createRenderPromises())
    )
  } else {
    return Promise.all(createRenderPromises())
  }
}

export function groupAll(group) {
  if (!arguments.length) {
    for (const key in _groupAll) {
      if (_groupAll.hasOwnProperty(key)) {
        return _groupAll
      }
    }
    return null
  }

  _groupAll[group.getCrossfilterId()] = group

  return _groupAll
}

export function getLastFilteredSizeAsync(arg) {
  const keyArray = []
  let crossfilterId = null
  if (typeof arg === "number") {
    crossfilterId = arg
  } else if (
    typeof arg === "object" &&
    typeof arg.getCrossfilterId === "function"
  ) {
    crossfilterId = arg.getCrossfilterId()
  }

  if (crossfilterId !== null) {
    const group = _groupAll[crossfilterId]
    if (group) {
      return group.valueAsync().then(value => {
        _lastFilteredSize[crossfilterId] = value
        return value
      })
    } else {
      return new Promise(reject =>
        reject(
          "The group with crossfilterId " +
            crossfilterId +
            " is not an active groupAll() group"
        )
      )
    }
  } else if (arg) {
    return new Promise(reject =>
      reject(
        "The argument to getLastFilteredSizeAsync must be a crossfilterId or a group/groupAll object, or call getLastFilteredSizeAsync without an argument to calculate all groupAlls"
      )
    )
  }

  return Promise.all(
    Object.keys(_groupAll).map(key => {
      keyArray.push(key)
      return _groupAll[key].valueAsync()
    })
  ).then(values => {
    for (let i = 0; i < values.length; ++i) {
      _lastFilteredSize[keyArray[i]] = values[i]
    }
  })
}

export function lastFilteredSize(crossfilterId) {
  return _lastFilteredSize[crossfilterId]
}

export function setLastFilteredSize(crossfilterId, value) {
  _lastFilteredSize[crossfilterId] = value
}

export function resetState() {
  _groupAll = {}
  _lastFilteredSize = {}
  resetRedrawStack()
  resetRenderStack()
}
