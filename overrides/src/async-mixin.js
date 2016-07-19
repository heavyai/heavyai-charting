var dc = require("../../mapdc")

export default function asyncMixin (_chart) {
  _chart.dataCache = null
  _chart.queryId = 0

  var _dataAsync = function (group, callback) {
    group.allAsync(callback)
  }

  _chart.dataAsync = function (callback) {
    return _dataAsync.call(_chart, _chart.group(), callback)
  }

  _chart.setDataAsync = function (callback) {
    _dataAsync = callback
    _chart.expireCache()
    return _chart
  }

  _chart.data(function (group) {
    if (_chart.dataCache != null) {
      return _chart.dataCache
    } else {
      console.log("Warning: Deprecate sync method .data()")
      return group.all()
    }
  })

  _chart.renderAsync = function (queryGroupId, queryCount) {
    if (dc._refreshDisabled) return

    if (_chart.hasOwnProperty("setSample")) {
      _chart.setSample()
    }
    var id = _chart.queryId++

    return new Promise(function (resolve, reject) {
      var renderCallback = function (error, data) {
        if (error) {
          reject(error)
        } else {
          resolve(data)
        }
      }

      var dataCallback = function (error, data) {
        if (error) {
          reject(error)
        } else {
          _chart.render(id, queryGroupId, queryCount, data, renderCallback)
        }
      }
      _chart.dataAsync(dataCallback)
    })
  }

  _chart.redrawAsync = function (queryGroupId, queryCount) {
    if (dc._refreshDisabled) return

    if (_chart.hasOwnProperty("setSample")) {
      _chart.setSample()
    }
    var id = _chart.queryId++

    return new Promise(function (resolve, reject) {
      var redrawCallback = function (error, data) {
        if (error) {
          reject(error)
        } else {
          resolve(data)
        }
      }

      var dataCallback = function (error, data) {
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

  _chart.redrawGroup = function (callback) {
    if (_chart.commitHandler()) {
      _chart.commitHandler()(false, function (error, result) {
        if (error) {
          callback && callback(error)
        } else {
          dc.redrawAllAsync(_chart.chartGroup())
        }
      })
    } else {
      dc.redrawAllAsync(_chart.chartGroup())
    }
    return _chart
  }

  return _chart
}
