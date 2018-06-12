import d3 from "d3"
import { formatDataValue } from "../utils/formatting-helpers.js"
import baseMixin from "../mixins/base-mixin"
import { decrementSampledCount, incrementSampledCount } from "../core/core"
import { redrawAllAsync } from "../core/core-async"

const INITIAL_SIZE = 50
const GROUP_DATA_WIDTH = 20
const NON_GROUP_DATA_WIDTH = 8
const NON_INDEX = -1
const ADDITIONAL_HEIGHT = 18
const SCROLL_DIVISOR = 5

export const splitStrOnLastAs = str => {
  const splitStr = []
  splitStr[0] = str.substring(0, str.lastIndexOf("as") - 1)
  splitStr[1] = str.substring(str.lastIndexOf("as") + 3, str.length)
  return splitStr
}

export default function mapdTable(parent, chartGroup) {
  const _chart = baseMixin({})
  let _tableWrapper = null

  let _size = INITIAL_SIZE
  let _offset = 0
  let _scrollTop = 0
  let _pauseAutoLoad = false

  let _filteredColumns = {}
  let _columnFilterMap = {}
  let _crossfilter = null
  let _tableFilter = null
  let _sortColumn = null
  let _dimOrGroup = null
  let _isGroupedData = false
  let _colAliases = null
  let _sampling = false
  let _nullsOrder = ""

  const _table_events = ["sort"]
  const _listeners = d3.dispatch.apply(d3, _table_events)
  const _on = _chart.on.bind(_chart)

  _chart.on = function(event, listener) {
    if (_table_events.indexOf(event) === NON_INDEX) {
      _on(event, listener)
    } else {
      _listeners.on(event, listener)
    }
    return _chart
  }

  _chart._invokeSortListener = function(f) {
    if (f !== "undefined") {
      _listeners.sort(_chart, f)
    }
  }

  _chart.resetTable = function() {
    _chart.root().html("")
  }

  _chart.crossfilter = function(_) {
    if (!arguments.length) {
      return _crossfilter
    }
    _tableFilter = _.filter()
    _crossfilter = _
    return _chart
  }

  _chart.sortColumn = function(_) {
    if (!arguments.length) {
      return _sortColumn
    }
    _sortColumn = _
    return _chart
  }

  _chart.nullsOrder = function(_) {
    if (!arguments.length) {
      return _nullsOrder
    }
    _nullsOrder = _
    return _chart
  }

  _chart.tableWrapper = function(_) {
    if (!arguments.length) {
      return _tableWrapper
    }
    _tableWrapper = _
    return _chart
  }

  _chart.colAliases = function(_) {
    if (!arguments.length) {
      return _colAliases
    }
    _colAliases = _
    return _chart
  }

  _chart.addRowsCallback = function(error, data) {
    if (error) {
      return
    }
    if (data.length > 0) {
      _pauseAutoLoad = false
      _chart.dataCache = (_chart.dataCache || []).concat(data)
      _chart._doRedraw(_chart.dataCache)
    }
  }

  _chart.addRows = function() {
    _pauseAutoLoad = true
    _offset = _offset + _size
    _chart.getData(_size, _offset, _chart.addRowsCallback)
  }

  _chart.setDataAsync((group, callback) => {
    const size = _chart.resetTableStateReturnSize()
    _chart.getData(size, 0, callback)
  })

  _chart.data(() => _chart.dataCache)

  _chart.getData = function(size, offset, callback) {
    _isGroupedData = _chart.dimension().value()[0]
    _dimOrGroup = _isGroupedData ? _chart.group() : _chart.dimension()
    _dimOrGroup.order(_sortColumn ? _sortColumn.col.name : null)
    const sortFuncName =
      _sortColumn && _sortColumn.order === "asc" ? "bottomAsync" : "topAsync"

    if (!_isGroupedData) {
      _dimOrGroup.nullsOrder(_sortColumn ? _nullsOrder : "")
    }

    if (sortFuncName === "topAsync") {
      return _dimOrGroup[sortFuncName](size, offset)
        .then(result => callback(null, result))
        .catch(error => callback(error))
    } else {
      return _dimOrGroup[sortFuncName](size, offset, null, callback)
    }
  }

  _chart.resetTableStateReturnSize = function() {
    _pauseAutoLoad = false

    if (!_isGroupedData && _tableWrapper) {
      _tableWrapper.select(".md-table-scroll").node().scrollTop = 0
    }
    let size = _size

    if (_isGroupedData) {
      size = _offset > 0 ? _offset : size
    } else {
      _offset = 0
    }
    return size
  }

  _chart.addFilteredColumn = function(columnName) {
    _filteredColumns[columnName] = null
  }

  _chart.removeFilteredColumn = function(columnName) {
    delete _filteredColumns[columnName]
  }

  _chart.clearFilteredColumns = function() {
    _filteredColumns = {}
  }

  _chart.getFilteredColumns = function() {
    return _filteredColumns
  }

  _chart.clearTableFilter = function() {
    _columnFilterMap = {}
    _chart.clearFilteredColumns()
    _tableFilter.filter()
  }

  _chart._doRender = function(data) {
    if (!_tableWrapper) {
      _chart.resetTable()
      _tableWrapper = _chart
        .root()
        .append("div")
        .attr("class", "md-table-wrapper")

      _tableWrapper.append("div").attr("class", "md-header-spacer")

      _tableWrapper
        .append("div")
        .attr("class", "md-table-scroll")
        .append("table")

      _tableWrapper.append("div").attr("class", "md-table-header")
    }

    renderTable(data)

    if (_isGroupedData) {
      _tableWrapper.select(".md-table-scroll").node().scrollTop = _scrollTop
    }

    if (!_pauseAutoLoad) {
      shouldLoadMore()
    }

    return _chart
  }

  function shouldLoadMore() {
    const scrollDivNode = _tableWrapper.select(".md-table-scroll").node()
    const tableNode = _tableWrapper.select("table").node()
    if (
      tableNode.scrollHeight > 0 &&
      tableNode.scrollHeight <=
        scrollDivNode.scrollTop +
          scrollDivNode.getBoundingClientRect().height +
          ADDITIONAL_HEIGHT
    ) {
      _chart.addRows()
    }
  }

  function getMeasureColHeaderLabel(d) {
    return d.agg_mode
      ? d.agg_mode.toUpperCase() + " " + d.expression
      : d.expression
  }

  function renderTable(data = []) {
    const table = _chart
      .tableWrapper()
      .select("table")
      .html("")

    if (data.length === 0) {
      return
    }

    let cols = []

    if (_isGroupedData) {
      _chart
        .dimension()
        .getDimensionName()
        .forEach((d, i) => {
          cols.push({
            expression: d,
            name: "key" + i,
            label: _colAliases ? _colAliases[i] : d,
            type: "dimension",
            measureName: d.measureName
          })
        })
      _chart
        .group()
        .reduce()
        .forEach((d, i) => {
          if (d.expression) {
            cols.push({
              expression: d.expression,
              name: d.name,
              agg_mode: d.agg_mode,
              label: _colAliases
                ? _colAliases[_chart.dimension().value().length + i]
                : getMeasureColHeaderLabel(d),
              type: "measure",
              measureName: d.measureName
            })
          }
        })
    } else {
      cols = _chart
        .dimension()
        .getProjectOn()
        .map((d, i) => {
          const splitStr = splitStrOnLastAs(d)
          return {
            expression: splitStr[0],
            name: splitStr[1],
            label: _colAliases ? _colAliases[i] : splitStr[0],
            type: "project",
            measureName: d.measureName
          }
        })
    }

    const tableHeader = table
      .append("tr")
      .selectAll("th")
      .data(cols)
      .enter()

    tableHeader.append("th").text(d => d.label)

    const tableRows = table
      .selectAll(".table-row")
      .data(data)
      .enter()

    const rowItem = tableRows.append("tr").attr("class", d => {
      let tableRowCls = "table-row "
      if (_isGroupedData) {
        tableRowCls = tableRowCls + "grouped-data "

        if (_chart.hasFilter()) {
          const keyArray = []
          for (const key in d) {
            if (d.hasOwnProperty(key) && key.includes("key")) {
              keyArray.push(d[key])
            }
          }
          tableRowCls =
            tableRowCls +
            (!_chart.hasFilter(keyArray) ^ _chart.filtersInverse()
              ? "deselected"
              : "selected")
        }
      }
      return tableRowCls
    })

    cols.forEach(col => {
      rowItem
        .append("td")
        .html(d => {
          // use custom formatter or default one
          let customFormatter
          let val = d[col.name]
          if (col.type === "measure") {
            customFormatter = _chart.valueFormatter()
          } else if (Array.isArray(val) && val[0].value instanceof Date) {
            customFormatter = _chart.dateFormatter()
            val = val[0].value
          } else {
            customFormatter = _chart.valueFormatter()
          }

          const key = (val && val[0] && val[0].isExtract) ? null : col.measureName || col.expression
          return customFormatter && customFormatter(val, key) || formatDataValue(val)
        })
        .classed("filtered", col.expression in _filteredColumns)
        .on("click", d => {
          // detect if user is selecting text or clicking a value, if so don't filter data
          const s = window.getSelection().toString()
          if (s.length) {
            return
          }

          if (_isGroupedData) {
            _chart.onClick(d)
          } else if (col.expression in _filteredColumns) {
            clearColFilter(col.expression)
          } else {
            filterCol(col.expression, d[col.name])
            _chart.onClick(d[col.name]) // will update global filter Clear icon
          }
        })
    })

    const dockedHeader = _chart
      .tableWrapper()
      .select(".md-table-header")
      .html("")
      .append("div")
      .attr("class", "docked-table-header")
      .style(
        "left",
        () =>
          "-" +
          _tableWrapper.select(".md-table-scroll").node().scrollLeft +
          "px"
      )

    _chart
      .tableWrapper()
      .select(".md-table-scroll")
      .on("scroll", function() {
        dockedHeader.style(
          "left",
          "-" + d3.select(this).node().scrollLeft + "px"
        )

        const tableScrollElm = d3.select(this).node()

        if (!_pauseAutoLoad) {
          const scrollHeight =
            tableScrollElm.scrollTop +
            tableScrollElm.getBoundingClientRect().height

          if (
            tableScrollElm.scrollTop > _scrollTop &&
            table.node().scrollHeight <=
              scrollHeight + scrollHeight / SCROLL_DIVISOR
          ) {
            _chart.addRows()
          }
        }

        _scrollTop = tableScrollElm.scrollTop
      })

    table.selectAll("th").each(function(d, i) {
      const headerItem = dockedHeader
        .append("div")
        .attr("class", "table-header-item")
        .classed("isFiltered", () => d.expression in _filteredColumns)

      const sortLabel = headerItem
        .append("div")
        .attr("class", "table-sort")
        .classed("disabled", () => {
          const isString = data[0]
            ? typeof data[0][`col${i}`] === "string"
            : false
          return !_isGroupedData && isString
        })
        .classed("active", _sortColumn ? _sortColumn.index === i : false)
        .classed(_sortColumn ? _sortColumn.order : "", true)
        .style(
          "width",
          d3
            .select(this)
            .node()
            .getBoundingClientRect().width + "px"
        )

      const textSpan = sortLabel.append("span").text(d.label)

      const sortButton = sortLabel
        .append("div")
        .attr("class", "sort-btn")
        .on("click", () => {
          _tableWrapper
            .selectAll(".table-sort")
            .classed("active asc desc", false)

          if (_sortColumn && _sortColumn.index === i) {
            _sortColumn =
              _sortColumn.order === "desc"
                ? { index: i, col: d, order: "asc" }
                : null
          } else {
            _sortColumn = { index: i, col: d, order: "desc" }
          }

          _chart._invokeSortListener(_sortColumn)
          redrawAllAsync(_chart.chartGroup())
        })

      sortButton
        .append("svg")
        .attr("class", "svg-icon")
        .classed("icon-sort", true)
        .attr("viewBox", "0 0 48 48")
        .append("use")
        .attr("xlink:href", "#icon-sort")

      sortButton
        .append("svg")
        .attr("class", "svg-icon")
        .classed("icon-sort-arrow", true)
        .attr("viewBox", "0 0 48 48")
        .append("use")
        .attr("xlink:href", "#icon-arrow1")

      headerItem
        .append("div")
        .attr("class", "unfilter-btn")
        .attr("data-expr", d.expression)
        .on("click", function() {
          clearColFilter(d3.select(this).attr("data-expr"))
        })
        .style(
          "left",
          textSpan.node().getBoundingClientRect().width +
            GROUP_DATA_WIDTH +
            "px"
        )
        .append("svg")
        .attr("class", "svg-icon")
        .classed("icon-unfilter", true)
        .attr("viewBox", "0 0 48 48")
        .append("use")
        .attr("xlink:href", "#icon-unfilter")
    })
  }

  function filterCol(expr, val) {
    const key = _crossfilter.getTable()[0] + "." + expr
    const columns = _crossfilter.getColumns()
    const type = columns[key].type

    if (type === "TIMESTAMP") {
      val = `TIMESTAMP(0) '${val
        .toISOString()
        .slice(0, 19)
        .replace("T", " ")}'`
    } else if (type === "DATE") {
      const dateFormat = d3.time.format.utc("%Y-%m-%d")
      val = "DATE '" + dateFormat(val) + "'"
    } else if (val && typeof val === "string") {
      val = "'" + val.replace(/'/g, "''") + "'"
    }

    _chart.addFilteredColumn(expr)
    _columnFilterMap[expr] = val
    _tableFilter.filter(computeTableFilter(_columnFilterMap))

    redrawAllAsync(_chart.chartGroup())
  }

  function clearColFilter(expr) {
    delete _columnFilterMap[expr]
    _chart.removeFilteredColumn(expr)
    _tableFilter.filter(computeTableFilter(_columnFilterMap))
    _chart.filterAll()
    redrawAllAsync(_chart.chartGroup())
  }

  function computeTableFilter(columnFilterMap) {
    // should use class letiables?
    let filter = ""
    let subFilterExpression = null

    for (const expr in columnFilterMap) {
      if (columnFilterMap[expr] === "null") {
        // null gets translated to "null" by this point
        subFilterExpression = expr + " IS null"
      } else {
        subFilterExpression = expr + " = " + columnFilterMap[expr]
      }

      if (filter === "") {
        filter = filter + subFilterExpression
      } else {
        filter = filter + " AND " + subFilterExpression
      }
    }
    return filter
  }

  _chart._doRedraw = function(data) {
    return _chart._doRender(data)
  }

  _chart.size = function(size) {
    if (!arguments.length) {
      return _size
    }
    _size = size
    return _chart
  }

  _chart.pauseAutoLoad = function() {
    return _pauseAutoLoad
  }

  _chart.offset = function() {
    return _offset
  }

  _chart.destroyChart = function() {
    _chart.sampling(false)
  }

  /* istanbul ignore next */
  _chart.sampling = function(setting) {
    // setting should be true or false
    if (!arguments.length) {
      return _sampling
    }

    if (setting && !_sampling) {
      // if wasn't sampling
      incrementSampledCount()
    } else if (!setting && _sampling) {
      decrementSampledCount()
    }

    _sampling = setting

    if (_sampling === false) {
      _chart.dimension().samplingRatio(null) // unset sampling
    }

    return _chart
  }

  return _chart.anchor(parent, chartGroup)
}
