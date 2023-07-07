import { chartRegistry, refreshDisabled, renderlet } from "./core"

let _renderId = 0
let _redrawId = 0
let _renderCount = 0
let _redrawCount = 0
let _startRenderTime = null
let _startRedrawTime = null

let _groupAll = {}
let _lastFilteredSize = {}

// NOTE: a "group" of null is valid!
export class LockTracker {
  all = null
  groups = {}
  pendingAll = null
  pendingGroups = {}

  // Utility function to check if a render/redraw should start for the given
  // group or "all".
  shouldStart(group, all) {
    // Conditions are checked in this order:
    // 1. If currently rendering/redrawing all, return false.
    // 2. If we're requesting a render/redraw all and *anything* is currently
    //    rendering/redrawing, return false.
    // 3. If the requested group is rendering/redrawing, return false.
    // 4. Otherwise, return true.
    return (
      !this.all &&
      (all ? Object.keys(this.groups).length === 0 : !this.groups[group])
    )
  }

  // Returns true if nothing is currently rendering. If a "group" is given,
  // returns true if neither "all" nor the group is rendering.
  isEmpty(group) {
    if (typeof group !== "undefined") {
      return this.shouldStart(group, false)
    }
    return this.shouldStart(null, true)
  }

  start(group, all, runner) {
    // if we can safely start this group/all, go for it!
    if (this.shouldStart(group, all)) {
      return this._run(group, all, runner)
    }

    // otherwise, if we already have a pending promise, return it
    if (this.pendingAll) {
      return this.pendingAll
    } else if (this.pendingGroups[group]) {
      return this.pendingGroups[group]
    }

    // Ok, we can't start running now, and we don't already have a pending
    // promise. We need to create a new pending promise to run after the
    // currently running promise is finished. If we got this far, one of the
    // following states must be true, otherwise shouldStart would have returned
    // true and we would have started running already:
    // 1. this.all is not-null, which means we can wait on that promise
    // 2. "all" is truthy, which means we need to wait on all of the groups
    //    that are currently running to finish
    // 3. "all" is not set, so we only need to wait on the group to finish
    let promise =
      this.all ||
      (all
        ? // Promise.all returns immediately if any of the promises reject - we
          // want to wait on them all regardless if any reject, so we
          // explicitly catch and return an empty array so that if the promise
          // rejects, it'll end up resolving in this context
          Promise.all(Object.values(this.groups).map(p => p.catch(() => [])))
        : this.groups[group])

    // Whether or not the running promise is resolved or rejected, we want to
    // run the next promise. Maybe if the current promise failed, re-running it
    // will succeed. We use then(nextRunner, nextRunner) in both blocks below
    // instead of finally() because we need nextRunner to return a new promise.
    // The return value from finally() is ignored. Not to mention, the
    // es6/es2015 polyfill doesn't include finally() anyway =)
    if (all) {
      const nextRunner = () => {
        this.pendingAll = null
        return this._run(group, all, runner)
      }
      promise = promise.then(nextRunner, nextRunner)
      this.pendingAll = promise
    } else {
      const nextRunner = () => {
        delete this.pendingGroups[group]

        if (this.pendingAll) {
          // Group was queued before "all", so, we just return the pendingAll
          // promise. When pendingAll is done, this group will technically
          // have been run along with all the other groups, so there's no
          // reason to handle the group individually.
          return this.pendingAll
        }

        return this._run(group, all, runner)
      }
      promise = promise.then(nextRunner, nextRunner)
      this.pendingGroups[group] = promise
    }
    return promise
  }

  // private method to start a runner and save the promise
  _run(group, all, runner) {
    const cleanup = () => {
      if (all) {
        this.all = null
      } else {
        delete this.groups[group]
      }
    }

    // Start the runner - whether it succeeds or not, cleanup.
    // The es6/es2015 polyfill doesn't include .finally(), so we use .then()
    // and make sure to pass the resolved/rejected state up the stack. If we
    // ever upgrade to the es7 polyfill, this can be rewritten as:
    // runner().finally(clean)
    let promise = null
    try {
      promise = runner()
    } catch (err) {
      promise = Promise.reject(err)
    }
    promise = promise.then(
      val => {
        cleanup()
        return val
      },
      err => {
        cleanup()
        console.error(err)
        throw err
      }
    )

    // store a reference to the promise
    if (all) {
      this.all = promise
    } else {
      this.groups[group] = promise
    }

    return promise
  }
}

const renderAllTracker = new LockTracker()
const redrawAllTracker = new LockTracker()

export function startRenderTime() {
  return _startRenderTime
}

export function startRedrawTime() {
  return _startRedrawTime
}

export function resetRedrawStack() {
  _redrawCount = 0
}

export function redrawStackEmpty(group) {
  return redrawAllTracker.isEmpty(group)
}

export function renderStackEmpty(group) {
  return renderAllTracker.isEmpty(group)
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

export function redrawAllAsync(group, allCharts, excludeChart) {
  if (refreshDisabled()) {
    const charts = allCharts
      ? chartRegistry.listAll()
      : chartRegistry.list(group)
    return Promise.resolve(charts)
  }

  if (!startRenderTime()) {
    return Promise.reject(
      "redrawAllAsync() is called before renderAllAsync(), please call renderAllAsync() first."
    )
  }

  return redrawAllTracker.start(group, allCharts, () => {
    const queryGroupId = _redrawId++
    _startRedrawTime = new Date()

    const createRedrawPromises = () => {
      let charts = allCharts
        ? chartRegistry.listAll()
        : chartRegistry.list(group)
      if (excludeChart) {
        charts = charts.filter(c => c.__dcFlag__ !== excludeChart.__dcFlag__)
      }
      return charts.map(chart => {
        chart.expireCache()
        chart._invokeDataFetchListener()
        // We have to force a render for HEATMAP, not redraw for crossfilters to
        //  work properly.  Mea culpa, mea culpa.
        return chart.isHeatMap
          ? chart.renderAsync(queryGroupId, charts.length).catch(e => {
              chart._invokeDataErrorListener(e)
              throw e
            })
          : chart.redrawAsync(queryGroupId, charts.length).catch(e => {
              chart._invokeDataErrorListener(e)
              throw e
            })
      })
    }

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
  })
}

export function renderAllAsync(group, allCharts) {
  if (refreshDisabled()) {
    const charts = allCharts
      ? chartRegistry.listAll()
      : chartRegistry.list(group)
    return Promise.resolve(charts)
  }

  return renderAllTracker.start(group, allCharts, () => {
    const queryGroupId = _renderId++
    _startRenderTime = new Date()

    const createRenderPromises = () => {
      const charts = allCharts
        ? chartRegistry.listAll()
        : chartRegistry.list(group)
      return charts.map(chart => {
        chart.expireCache()
        return chart.renderAsync(queryGroupId, charts.length)
      })
    }

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
  })
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
}
