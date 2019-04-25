import { chartRegistry, refreshDisabled, renderlet } from "./core"

let _renderId = 0
let _redrawId = 0
let _renderCount = 0
let _redrawCount = 0
let _renderStackEmpty = true
let _redrawStackEmpty = true
let _startRenderTime = null
let _startRedrawTime = null

let _groupAll = {}
let _lastFilteredSize = {}

export class LockTracker {
  all = false
  groups = new Set()
  pendingAll = false
  pendingGroups = new Set()

  constructor(renderOrRedrawFunc) {
    this.renderOrRedrawFunc = renderOrRedrawFunc
  }

  // Utility function to check if a render/redraw should start for the given
  // group or "all".
  shouldStart(group, all) {
    // 1. If currently rendering/redrawing all, return false.
    // 2. If we're requesting a render/redraw all and *anything* is currently
    //    rendering/redrawing, return false.
    // 3. Otherwise, if the requested group is rendering/redrawing, return
    //    false.
    return !this.all && (all ? this.groups.size === 0 : !this.groups.has(group))
  }

  // Call at the start of the render/redraw function. Returns true if the
  // render/redraw should happen, otherwise, false.
  request(group, all) {
    // If it's safe to start this render/redraw, do it and return true
    if (this.shouldStart(group, all)) {
      if (all) {
        this.all = true
      } else {
        this.groups.add(group)
      }
      return true
    }

    // If we already have a pending render/redraw all, do nothing
    if (!this.pendingAll) {
      if (all) {
        // record request to render/redraw everything
        this.pendingAll = true
        this.pendingGroups.clear()
      } else {
        // record request to render/redraw this group
        this.pendingGroups.add(group)
      }
    }

    // Return false: render/redraw should not happen
    return false
  }

  // Call when the render/redraw finishes. Returns a function, which returns a
  // Promise so it can be chained with the Promise returned by render/redraw.
  finished(group, all) {
    const that = this
    return function() {
      if (all) {
        that.all = false
      } else {
        that.groups.delete(group)
      }

      if (that.pendingAll) {
        that.pendingAll = false
        return that.renderOrRedrawFunc(null, true)
      } else if (that.pendingGroups.delete(group)) {
        return that.renderOrRedrawFunc(group)
      }
      return Promise.resolve()
    }
  }
}

const renderAllTracker = new LockTracker(renderAllAsync)
const redrawAllTracker = new LockTracker(redrawAllAsync)

export function startRenderTime() {
  return _startRenderTime
}

export function startRedrawTime() {
  return _startRedrawTime
}

export function resetRedrawStack() {
  _redrawCount = 0
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
  return queryGroupId
}

export function resetRenderStack() {
  _renderCount = 0
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

  if (!redrawAllTracker.request(group, allCharts)) {
    _redrawStackEmpty = false
    return Promise.resolve()
  }

  const queryGroupId = _redrawId++
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
      .then(redrawAllTracker.finished(group, allCharts))
      .catch(err => {
        console.log(err)
        resetRedrawStack()
        throw err
      })
  } else {
    return Promise.all(createRedrawPromises())
      .then(redrawAllTracker.finished(group, allCharts))
      .catch(err => {
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

  if (!renderAllTracker.request(group, allCharts)) {
    _renderStackEmpty = false
    return Promise.resolve()
  }

  const queryGroupId = _renderId++
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
    return getLastFilteredSizeAsync()
      .then(() => Promise.all(createRenderPromises()))
      .then(renderAllTracker.finished(group, allCharts))
  } else {
    return Promise.all(createRenderPromises()).then(
      renderAllTracker.finished(group, allCharts)
    )
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
