import {chartRegistry, refreshDisabled, renderlet} from "./core"

let _renderId = 0
let _redrawId = 0
let _renderCount = 0
let _redrawCount = 0
let _renderIdStack = null
let _redrawIdStack = null
let _startRenderTime = null
let _startRedrawTime = null

const _groupAll = {}
const _lastFilteredSize = {}

export function startRenderTime () {
  return _startRenderTime
}

export function startRedrawTime () {
  return _startRedrawTime
}

export function incrementRedrawStack () {
  const queryGroupId = _redrawId++
  _redrawIdStack = queryGroupId
  return queryGroupId
}

export function resetRedrawStack () {
  _redrawCount = 0
  _redrawIdStack = null
}

export function isRedrawStackEmpty (queryGroupId) {
  if (typeof queryGroupId === "number") {
    return _redrawIdStack === null || _redrawIdStack === queryGroupId
  } else {
    return _redrawIdStack === null
  }
}

export function isEqualToRedrawCount (queryCount) {
  return ++_redrawCount === queryCount
}

export function incrementRenderStack () {
  const queryGroupId = _renderId++
  _renderIdStack = queryGroupId
  return queryGroupId
}

export function resetRenderStack () {
  _renderCount = 0
  _renderIdStack = null
}

export function isRenderStackEmpty (queryGroupId) {
  if (typeof queryGroupId === "number") {
    return _renderIdStack === null || _renderIdStack === queryGroupId
  } else {
    return _renderIdStack === null
  }
}

export function isEqualToRenderCount (queryCount) {
  return ++_renderCount === queryCount
}

export function redrawAllAsync (group) {
  if (refreshDisabled()) {
    return Promise.resolve()
  }

  const stackEmpty = isRedrawStackEmpty()
  const queryGroupId = incrementRedrawStack()
  if (!stackEmpty) {
    return Promise.resolve()
  }

  _startRedrawTime = new Date()

  const charts = chartRegistry.list(group)
  const createRedrawPromises = () => charts.map(chart => {
    chart.expireCache()
    chart._invokeDataFetchListener()
    return chart.redrawAsync(queryGroupId, charts.length)
      .catch(e => {
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
        resetRedrawStack()
        throw err
      })
  } else {
    return Promise.all(createRedrawPromises()).catch(err => {
      resetRedrawStack()
      throw err
    })
  }
}

export function renderAllAsync (group) {

  if (refreshDisabled()) {
    return Promise.resolve()
  }

  const stackEmpty = isRenderStackEmpty()
  const queryGroupId = incrementRenderStack()
  if (!stackEmpty) {
    return Promise.resolve()
  }

  _startRenderTime = new Date()

  const charts = chartRegistry.list(group)
  const createRenderPromises = () => charts.map(chart => {
    chart.expireCache()
    return chart.renderAsync(queryGroupId, charts.length)
  })

  if (renderlet() !== null) {
    renderlet(group)
  }

  if (groupAll()) {
    return getLastFilteredSizeAsync()
      .then(() => Promise.all(createRenderPromises()))
  } else {
    return Promise.all(createRenderPromises())
  }
}

export function groupAll (group) {
  if (!arguments.length) {
    for (var key in groupAll) {
      if (_groupAll.hasOwnProperty(key)) {
        return _groupAll;
      }
    }
    return null;
  }

  _groupAll[group.getCrossfilterId()] = group;
  return _groupAll
}

export function getLastFilteredSizeAsync (arg) {
  var keyArray = [];
  var crossfilterId;
  if (typeof arg === "number") {
    crossfilterId = arg;
  } else if (typeof arg === "object" && typeof arg.getCrossfilterId === "function") {
    crossfilterId = arg.getCrossfilterId();
  }

  if (crossfilterId !== undefined) {
    let group = _groupAll[crossfilterId];
    if (group) {
      return group.valueAsync().then(value => {
        _lastFilteredSize[crossfilterId] = value;
        return value;
      })
    } else {
      return new Promise(reject => reject("The group with crossfilterId " + crossfilterId + " is not an active groupAll() group"));
    }
  } else if (arg) {
    return new Promise(reject => reject("The argument to getLastFilteredSizeAsync must be a crossfilterId or a group/groupAll object, or call getLastFilteredSizeAsync without an argument to calculate all groupAlls"))
  }

  return Promise.all(Object.keys(_groupAll).map(function(key) {
    keyArray.push(key);
    return _groupAll[key].valueAsync();
  })).then(values => {
    for (var i=0; i<values.length; ++i) {
      _lastFilteredSize[keyArray[i]] = values[i];
    }
  });
}

export function lastFilteredSize (crossfilterId) {
  return _lastFilteredSize[crossfilterId]
}

export function resetState () {
  resetRedrawStack()
  resetRenderStack()
}
