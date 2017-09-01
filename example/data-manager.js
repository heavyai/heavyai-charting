export default function DataManager () {

  let crossfilter, crossfilterManager, connection
  function init (_crossfilter, _connection) {
    crossfilterManager = _crossfilter
    connection = _connection
    return this
  }

  function getCrossfilter (tableName) {
    const promise = crossfilterManager.crossfilter(connection, tableName)
    promise.then((_crossfilter) => {
        crossfilter = _crossfilter
      })
    return promise
  }

  function getDimension (dimensionName) {
    return crossfilter.dimension(dimensionName)
  }

  function query (vegaSpec) {
    return new Promise((resolve, reject) => {
      connection.renderVega(0, JSON.stringify(vegaSpec), {}, (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      })
    })
  }

  return {
    init,
    query,
    getCrossfilter,
    getDimension
  }
}