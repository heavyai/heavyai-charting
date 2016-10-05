import d3 from "d3"
import dc from "../../mapdc"

const NON_INDEX = -1

export default function asyncMixin (_chart) {
  const events = ["dataFetch", "dataError"]
  const _listeners = d3.dispatch.apply(d3, events)
  const _on = _chart.on.bind(_chart)

  _chart.dataCache = null
  _chart.queryId = 0

  let _dataAsync = function (group, callback) {
    group.allAsync(callback)
  }

  _chart.on = function (event, listener) {
    if (events.indexOf(event) === NON_INDEX) {
      _on(event, listener)
    } else {
      _listeners.on(event, listener)
    }
    return _chart
  }

  _chart._invokeDataFetchListener = function () {
    _listeners.dataFetch(_chart)
  }

  _chart._invokeDataErrorListener = function () {
    _listeners.dataError(_chart)
  }

  _chart.dataAsync = function (callback) {
    return _dataAsync.call(_chart, _chart.group(), callback)
  }

  _chart.setDataAsync = function (callback) {
    _dataAsync = callback
    _chart.expireCache()
    return _chart
  }

  _chart.data(group => {
    if (_chart.dataCache !== null) { // eslint-disable-line no-negated-condition
      return _chart.dataCache
    } else {
      console.log("Warning: Deprecate sync method .data()") // eslint-disable-line no-console
      return group.all()
    }
  })

  _chart.renderAsync = function (queryGroupId, queryCount) {
    if (dc._refreshDisabled) {
      return Promise.resolve()
    }

    if (_chart.hasOwnProperty("setSample")) {
      _chart.setSample()
    }
    const id = _chart.queryId++

    return new Promise((resolve, reject) => {
      const renderCallback = function (error, data) {
        if (error) {
          reject(error)
        } else {
          resolve(data)
        }
      }

      const dataCallback = function (error, data) {
        if (error) {
          dc._renderIdStack = null
          reject(error)
        } else {
          _chart.render(id, queryGroupId, queryCount, data, renderCallback)
        }
      }
      return _chart.dataAsync(dataCallback)
    })
  }

  _chart.redrawAsync = function (queryGroupId, queryCount) {
    if (dc._refreshDisabled) {
      return Promise.resolve()
    }

    if (_chart.hasOwnProperty("setSample")) {
      _chart.setSample()
    }
    const id = _chart.queryId++

    return new Promise((resolve, reject) => {
      const redrawCallback = function (error, data) {
        if (error) {
          reject(error)
        } else {
          resolve(data)
        }
      }

      const dataCallback = function (error, data) {
        if (error) {
          dc.resetRedrawStack()
          reject(error)
        } else {
          _chart.redraw(id, queryGroupId, queryCount, data, redrawCallback)
        }
      }
      _chart.dataAsync(dataCallback)
    })
  }

  _chart.redrawGroup = function () {
    function logRedrawGroupError (e) {
      if (dc._logging) {
        console.log("Redraw Group Error", e) // eslint-disable-line no-console
      }
    }

    if (_chart.commitHandler()) {
      _chart.commitHandler()(false, error => {
        if (error) {
          logRedrawGroupError(error)
        } else {
          dc.redrawAllAsync(_chart.chartGroup())
            .catch(e => logRedrawGroupError(e))
        }
      })
    } else {
      dc.redrawAllAsync(_chart.chartGroup())
        .catch(e => logRedrawGroupError(e))
    }
    return _chart
  }

  return _chart
}
