import { override } from "../core/core"

const LIMIT = 21
const OFFSET = 0
const TOP = 5
const MULTI_DIMENSION_INDEX = 1

function processMultiSeriesResults(results) {
  return results.reduce(
    (accum, { key1, key0, val }) => {
      if (accum.keys[key1]) {
        accum.keys[key1] = accum.keys[key1]
      } else if (key1 === "other") {
        accum.keys[key1] = key1
      } else {
        accum.keys[key1] = "series_" + (Object.keys(accum.keys).length + 1)
      }

      if (Array.isArray(key0)) {
        const { isExtract } = key0[0]
        const min = isExtract ? key0[0].value : key0[0].value || key0[0]
        const alias = key0[0].alias || min

        if (typeof accum.ranges[alias] !== "number") {
          // eslint-disable-line no-negated-condition
          accum.data[accum.data.length] = {
            key0,
            [accum.keys[key1]]: val
          }
          accum.ranges[alias] = accum.data.length - 1
        } else {
          accum.data[accum.ranges[alias]][accum.keys[key1]] = val
        }
      } else if (typeof accum.ranges[key0] !== "number") {
        // eslint-disable-line
        accum.data[accum.data.length] = {
          key0,
          [accum.keys[key1]]: val
        }
        accum.ranges[key0] = accum.data.length - 1
      } else {
        accum.data[accum.ranges[key0]][accum.keys[key1]] = val
      }

      return accum
    },
    {
      keys: {},
      ranges: {},
      data: []
    }
  )
}

function selectWithCase(dimension, values) {
  if (dimension.slice(0, 9) === "CASE when") {
    return dimension
  } else {
    const set = values.map(val => `'${val.replace(/'/, "''")}'`).join(",")
    return `CASE when ${dimension} IN (${set}) then ${dimension} ELSE 'other' END`
  }
}

function setDimensionsWithColumns(columns, selected) {
  return function setDimensions(crossfilterDimensionArray) {
    return [
      crossfilterDimensionArray[0],
      selectWithCase(columns[MULTI_DIMENSION_INDEX], selected)
    ]
  }
}

function flipKeys(keys) {
  return Object.keys(keys).reduce((accum, val) => {
    accum[keys[val]] = val
    return accum
  }, {})
}

export default function multiSeriesMixin(chart) {
  let columns = null
  let showOther = false

  const series = {
    group: null,
    values: null,
    selected: null,
    keys: null
  }

  const seriesApi = {
    group: seriesMethodWithKey("group"),
    values: seriesMethodWithKey("values"),
    selected: seriesMethodWithKey("selected"),
    keys: seriesMethodWithKey("keys")
  }

  function seriesMethodWithKey(key) {
    return function seriesMethod(value) {
      if (typeof value === "undefined") {
        return series[key]
      }
      series[key] = value
      return seriesApi
    }
  }

  override(chart, "_doRedraw", () => {
    if (chart.isMulti()) {
      setUpMultiStack()
      const rendered = chart.__doRedraw()
      chart.generatePopup()
      return rendered
    } else {
      return chart.__doRedraw()
    }
  })

  override(chart, "dimension", dimension => {
    if (!dimension) {
      return chart._dimension()
    }

    columns = dimension.value().slice()
    return chart._dimension(dimension)
  })

  chart.series = () => seriesApi

  chart.isMulti = () => chart.dimension().value().length > MULTI_DIMENSION_INDEX

  chart.showOther = other => {
    if (typeof other === "boolean") {
      showOther = other
      return chart
    }
    return showOther
  }

  function dataAsync(group, callback) {
    if (chart.isMulti()) {
      return chart
        .series()
        .group()
        .topAsync(LIMIT, OFFSET)
        .then(topValues => {
          const currentSelected = chart.series().selected()
          const hasSelected = Boolean(currentSelected && currentSelected.length)

          chart
            .series()
            .values(topValues.map(result => result.key0))
            .selected(
              hasSelected
                ? currentSelected
                : chart
                    .series()
                    .values()
                    .slice(0, TOP)
            )

          chart
            .group()
            .dimension()
            .set(setDimensionsWithColumns(columns, chart.series().selected()))

          chart
            .group()
            .dimension()
            .multiDim(false)

          return chart
            .group()
            .reduce(chart.group().reduce())
            .all((error, results) => {
              if (error) {
                return callback(error)
              } else {
                const { data, keys } = processMultiSeriesResults(results)
                chart.series().keys(flipKeys(keys))
                return callback(error, data)
              }
            })
        })
        .catch(e => callback(e))
    } else {
      return group.all(callback)
    }
  }

  function emptyStackMutation() {
    while (chart.stack().length) {
      chart.stack().pop()
    }
  }

  function addValuesWithNoKeysToKeysMutation() {
    function valuesWithNoKeys() {
      const keys = chart.series().keys()
      const selected = chart.series().selected() || []
      const values = selected.slice()
      const indexes = Object.keys(keys).reduce(
        (accum, key) => accum.concat(selected.indexOf(keys[key])),
        []
      )
      indexes.forEach(index => values.splice(index, 1))
      return values
    }

    valuesWithNoKeys().forEach(select => {
      const currentLength = Object.keys(chart.series().keys()).length
      const key = "series_" + (currentLength + 1)
      chart.series().keys()[key] = select
    })
  }

  function stackFromSelected() {
    const keys = chart.series().keys()
    chart
      .series()
      .selected()
      .forEach(value => {
        const seriesName = Object.keys(keys).reduce(
          (accum, v) => (keys[v] === value ? v : accum),
          null
        )
        chart.stack(chart.group(), seriesName, d => d[seriesName])
      })
  }

  function setUpMultiStack() {
    if (chart.isMulti()) {
      emptyStackMutation()
      stackFromSelected()
      if (
        Object.keys(chart.series().keys()).length !== chart.stack().length &&
        !chart.series().keys().other
      ) {
        addValuesWithNoKeysToKeysMutation()
      }
      if (chart.showOther()) {
        chart.stack(chart.group(), "other", d => d.other)
      }
    }
  }

  chart.setDataAsync(dataAsync)
  chart.on("preRender", setUpMultiStack)

  return chart
}
