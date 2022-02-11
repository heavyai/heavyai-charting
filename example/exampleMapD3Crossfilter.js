/* global dc, mapd3, d3, crossfilter, MapdCon  */
require("mapd3/dist/mapd3.css")

/*
 * This is example code that shows how to make 3 cross-filtered charts with the
 * dc.mapd.js and mapd3.js APIs. This example is not meant to be a replacement
 * for dc.js documentation. For the dc.js API docs, see here
 * - https://github.com/dc-js/dc.js/blob/master/web/docs/api-latest.md.
 *   For an annotated example of using dc.js - see here:
 *   https://dc-js.github.io/dc.js/docs/stock.html.
 */

function createCharts(crossFilter, connector) {
  const colorScheme = ["#22A7F0", "#3ad6cd", "#d4e666"]

  const w =
    Math.max(document.documentElement.clientWidth, window.innerWidth || 0) - 50
  const h =
    Math.max(document.documentElement.clientHeight, window.innerHeight || 0) -
    200

  // NEW: create a hash map to associate DC Chart properties by their id (__dcFlag__) so we can access them later
  const dcCharts = {}

  // select the DOM node for the combo chart to mount to, then pass it to mapd3.Chart
  const parentNode = document.querySelector(".chart3-example")
  const comboChart = mapd3.Chart(parentNode)

  /*
 * crossFilter is an object that handles cross-filtered the different
 * dimensions and measures that compose a dashboard's charts.
 * It has a number of methods on it.
 */

  /*
 *  getColumns() will grab all columns from the table along with metadata about
 *  those columns.
 */

  const allColumns = crossFilter.getColumns()

  /* -------------------BASIC COUNT ON CROSSFILTER---------------------------*/

  /*
 *  A basic operation is getting the filtered count and total count
 *  of crossFilter.  This performs that operation.  It is built into DC.
 *  Note that for the count we use crossFilter itself as the dimension.
*/

  const countGroup = crossFilter.groupAll()
  const countWidget = dc
    .countWidget(".data-count")
    .dimension(crossFilter)
    .group(countGroup)

  // NEW: store chart ID
  dcCharts[countWidget.chartID()] = {
    name: "countWidget",
    filterStrings: []
  }

  /* ------------------------CHART 1 EXAMPLE------------------------------*/

  /*
 *  In crossfilter dimensions can function as what we would like to "group by"
 *  in the SQL sense of the term. We'd like to create a bar chart of number of
 *  flights by destination state ("dest_state") - so we create a crossfilter dimension
 *  on "dest_state"
 *
 *  Here lies one of the chief differences between crossfilter.mapd.js and the
 *  original crossfilter.js.  In the original crossfilter you could provide
 *  javascript expressions like d.dest_state.toLowerCase() as part of
 *  dimension, group and order functions.  However since ultimately our
 *  dimensions and measures are transformed into SQL that hit our backend, we
 *  require string expressions. (i.e "extract(year from dep_timestamp))"
 */

  const rowChartDimension = crossFilter.dimension("dest_state")
  /*
 * To group by a variable, we call group() on the function and then specify
 * a "reducer".  Here we want to get the count for each state, so we use the
 * crossfilter reduceCount() method.
 *
 * More crossfilter Methods here:
 * https://github.com/square/crossfilter/wiki/API-Reference#dimension
 * https://github.com/square/crossfilter/wiki/API-Reference#group-map-reduce
 * https://github.com/square/crossfilter/wiki/API-Reference#group_reduceCount
 */
  const rowChartGroup = rowChartDimension.group().reduceCount()

  /*
 *  We create a horizontal bar chart with the data specified above (count by destination
 *  state) by using a dc.rowChart (i.e. a horizontal bar chart)
 *
 *  We invoke the following options on the rowChart using chaining.
 *
 *  Height and width - match the containing div
 *
 *  elasticX - a dc option to cause the axis to rescale as other filters are
 *  applied
 *
 *  cap(20) - Only show the top 20 groups.  By default crossFilter will sort
 *  the dimension expression (here, "dest_state"), by the reduce expression (here, count),
 *  so we end up with the top 20 destination states ordered by count.
 *
 *  othersGrouper(false) - We only would like the top 20 states and do not want
 *  a separate bar combining all other states.
 *
 *  ordinalColors(colorScheme) - we want to color the bars by dimension, i.e. dest_state,
 *  using the color ramp defined above (an array of rgb or hex values)
 *
 *  measureLabelsOn(true) - a mapd.dc.js add-on which allows not only the dimension
 *  labels (i.e. Texas) to be displayed but also the measures (i.e. the number
 *  of flights with Texas as dest_state)
 *
 *  Simple Bar Chart Example using DC api here:
 *  https://github.com/dc-js/dc.js/blob/master/web/docs/api-latest.md
 */

  const dcBarChart = dc
    .rowChart(".chart1-example")
    .height(h / 1.5)
    .width(w / 2)
    .elasticX(true)
    .cap(20)
    .othersGrouper(false)
    .ordinalColors(colorScheme)
    .measureLabelsOn(true)
    .dimension(rowChartDimension)
    .group(rowChartGroup)
    .autoScroll(true)

  // NEW: store chart id
  dcCharts[dcBarChart.chartID()] = {
    name: "rowChart",
    filterStrings: []
  }

  /* --------------------------CHART 2 EXAMPLE------------------------------*/

  /*
 *  Bubble Chart Example:
 *  Here we will create a bubble chart (scatter plot with sized circles).
 *  We want to make a circle for each airline carrier - i.e. group by
 *  carrier ("carrier_name" in the dataset), with the x coordinate
 *  corresponding to average departure delay ("depdelay"), the y coordinate
 *  corresponding to average arrival delay ("arrdelay"), and the size of the
 *  circle corresponding to the number of flights for that carrier (the count).
 *  We will color by the group or key, i.e. carrier_name.
 *
 */

  const scatterPlotDimension = crossFilter.dimension("carrier_name")

  /*
 *  MapD created a reduceMulti function in order to handle multiple measures.
 *  It takes an array of objects, each corresponding to a measure.
 *  Each measure object requires 3 arguments:
 *  'expression' which is the measure
 *  'agg_mode' which is the calculation to perform.
 *  'name' is how to reference the data
 *
 */

  const reduceMultiExpression1 = [
    {
      expression: "depdelay",
      agg_mode: "avg",
      name: "x"
    },
    {
      expression: "arrdelay",
      agg_mode: "avg",
      name: "y"
    },
    {
      expression: "*",
      agg_mode: "count",
      name: "size"
    }
  ]

  const popupHeader = [
    { type: "dimension", label: "carrier_name" },
    { type: "measure", label: "depdelay", alias: "x" },
    { type: "measure", label: "arrdelay", alias: "y" }
  ]

  /*
 * Note the order("size") setter here. By default the bubble chart uses the
 * top function which sorts all measures in descending order.  This would
 * cause the us to take the top n (specified by cap) sorted by x, y, and
 * size in descending order.  Since we probably do not want to sort
 * primarility by departure delay, we override the sort and sort by size
 * instead, which corresponds to the count measure - i.e. we take the
 * n most popular airlines
 */

  const scatterPlotGroup = scatterPlotDimension
    .group()
    .reduce(reduceMultiExpression1)
    .order("size")

  /*  We create the bubble chart with the following parameters:
 *
 *  Width and height - as above
 *
 *  renderHorizontalGridLines(true)
 *
 *  renderVerticalGridLines(true) - create grid under points
 *
 *  cap(15) - only show top 15 airlines
 *
 *  othersGrouper(false) - do not have a bubble for airlines not in top 15
 *
 *  **Note for all accessors below the variables correspond to variables
 *  defined in reduceMulti above**
 *
 *  keyAccessor - specify variable in result set associated with key (x-axis in
 *  bubble chart)
 *
 *  valueAccessor - specify variable in result set associated with value (y-axis in bubble chart)
 *
 *  radiusValueAccessor - specify variable in result set associated with radius of the bubbles
 *
 *  colorAccessor - specify variable in result set associated with color of the
 *  bubbles.  Here we are not coloring by a measure but instead by the groups
 *  themselves so we specify the first (and only) key, key0,  If we were
 *  grouping by multiple (N) attributes we would have key0, key1... keyN
 *
 *  maxBubbleRelativeSize(0.04) - specifies the max radius relative to length
 *  of the x axis. This means we cap the bubble radius at 4% of the length of
 *  the x axis.
 *
 *  transitionDuration(500) - DC (via D3) will animate movement of the points
 *  between filter changes.  This specifies that the animation duration should
 *  be 500 ms.
 *
 *  xAxisLabel, yAxisLabel - specify the labels of the charts
 *
 *  elasticX(true), elasticY(true) - allow the axes to readjust as filters are
 *  changed
 *
 *  xAxisPadding('15%'), yAxisPadding('15%') - Without padding the min and max
 *  points for the x and y scales will be on the edge of the graph.  This tells
 *  the chart to add an extra 15% margin to the axes beyond the min and max of
 *  that axis
 *
 *  ordinalColors(colorScheme) - we want to color the bars by dimension, i.e. dest_state,
 *  using the color ramp defined above (an array of rgb or hex values)
 */

  const dcScatterPlot = dc
    .bubbleChart(".chart2-example")
    .width(w / 2)
    .height(h / 1.5)
    .renderHorizontalGridLines(true)
    .renderVerticalGridLines(true)
    .cap(15)
    .othersGrouper(false)
    .keyAccessor((d) => d.x)
    .valueAccessor((d) => d.y)
    .radiusValueAccessor((d) => d.size)
    .colorAccessor((d) => d.key0)
    .maxBubbleRelativeSize(0.04)
    .transitionDuration(500)
    .xAxisLabel("Departure Delay")
    .yAxisLabel("Arrival Delay")
    .setPopupHeader(popupHeader)
    .elasticX(true)
    .elasticY(true)
    .xAxisPadding("15%")
    .yAxisPadding("15%")
    .ordinalColors(colorScheme)
    .dimension(scatterPlotDimension)
    .group(scatterPlotGroup)

  // NEW: store chart id
  dcCharts[dcScatterPlot.chartID()] = {
    name: "scatterPlot",
    filterStrings: []
  }

  /*  We create the bubble chart with the following parameters:
 *  dc.mapd.js allows functions to be applied at specific points in the chart's
 *  lifecycle.  Here we want to re-adjust our chart's x,y and r (radius) scales
 *  as data is filtered in an out to take into account the changing range of
 *  the data along these different measures.  Here we set the charts scale
 *  using standard d3 functions - telling dc.mapd.js to do this before each
 *  render and redraw */

  const setScales = function(chart, type) {
    chart.on(type, (chart) => {
      chart.x(
        d3.scale.linear().domain(d3.extent(chart.data(), chart.keyAccessor()))
      )
      chart
        .xAxis()
        .scale(chart.x())
        .tickFormat(d3.format(".2s"))
      chart.y(
        d3.scale.linear().domain(d3.extent(chart.data(), chart.valueAccessor()))
      )
      chart.r(
        d3.scale
          .linear()
          .domain(d3.extent(chart.data(), chart.radiusValueAccessor()))
      )
    })
  }

  setScales(dcScatterPlot, "preRender")
  setScales(dcScatterPlot, "preRedraw")

  /* ----------------------MAPD3 COMBO CHART EXAMPLE----------------------------------------*/

  // create an adapter utility function that lets us tie into DC and Crossfilter
  function dcAdapter(groupName) {
    // eslint-disable-next-line no-underscore-dangle
    let _dimension = null
    const events = mapd3.d3.dispatch("redrawGroup")

    // eslint-disable-next-line consistent-return
    function setDimension(dim) {
      _dimension = dim
    }

    function getFilterString() {
      if (!_dimension) {
        throw new Error(
          "Calling getfilterString before setting a dimension is not allowed."
        )
      }

      return _dimension.group().writeFilter()
    }

    function filter(_filter, _timeBin, _isExtract) {
      if (!_filter || !_filter.length) {
        filterAll()
        return
      }

      const timeBin = _timeBin === "auto" && _isExtract ? "isodow" : _timeBin

      // eslint-disable-next-line no-undefined
      _dimension.filter(_filter, undefined, undefined, undefined, [
        { extract: _isExtract, timeBin }
      ])
    }

    function filterAll() {
      _dimension.filterAll()
    }

    // create a chart that will allow us to hook into a dc render & redraw calls.
    const dummyChart = dc.baseMixin({})
    // dataAsync is a potential hook for introducing a loading state for the chart
    dummyChart.dataAsync = callback => callback()
    // eslint-disable-next-line no-underscore-dangle
    dummyChart._doRender = renderRedraw
    // eslint-disable-next-line no-underscore-dangle
    dummyChart._doRedraw = renderRedraw
    dummyChart.dimension({})
    dummyChart.group({})
    dummyChart.generatePopup = () => null
    dc.registerChart(dummyChart, groupName)

    function renderRedraw() {
      events.call("redrawGroup", this, getFilterString())
    }

    // note: if we had multiple "groups" or datasets we could pass groupName from above as a param to dc.redrawAllAsync()
    // but in this demo we are only using one so it's unnecessary
    function redrawGroup() {
      if (dc.startRenderTime()) {
        dc.redrawAllAsync()
      } else {
        dc.renderAllAsync()
      }
    }
    return {
      setDimension,
      filter,
      redrawGroup,
      events
    }
  }

  // brush extent
  let brushExtent = []

  // inital SQL query for the combo chart
  let query = "SELECT date_trunc(day, dep_timestamp) as key0, COUNT(*) AS val, AVG(arrdelay) as val1 FROM flights_donotmodify WHERE (dep_timestamp >= TIMESTAMP(0) '2008-01-01 00:01:00' AND dep_timestamp <= TIMESTAMP(0) '2008-12-31 23:59:00') GROUP BY key0 ORDER BY key0"

  // create a new adapter and set its dimension
  const adapter = dcAdapter("flights_donotmodify")
  adapter.setDimension(crossFilter.dimension("dep_timestamp"))

  // When the DC Charts have finished rendering, gather their filterStrings and compose a new SQL query for the combo chart
  adapter.events.on("redrawGroup.combo", () => {
    function filterClause() {
      let wc = ""
      Object.keys(dcCharts).forEach((key) => {
        if (
          dcCharts[key].name !== "countWidget" &&
          dcCharts[key].filterStrings.length
        ) {
          wc += " AND (" + dcCharts[key].filterStrings.join(" OR ") + ")"
        }
      })
      return wc
    }

    const nextQuery =
      "SELECT date_trunc(day, dep_timestamp) as key0, COUNT(*) AS val, AVG(arrdelay) as val1 FROM flights_donotmodify WHERE (dep_timestamp >= TIMESTAMP(0) '2008-01-01 00:01:00' AND dep_timestamp <= TIMESTAMP(0) '2008-12-31 23:59:00')" +
      filterClause() +
      " GROUP BY key0 ORDER BY key0"

    // but only fire the query if it's different from the previous query
    if (nextQuery !== query) {
      // pass our next SQL query to our queryDB method and then update the comboChart's data
      queryDB(nextQuery)
        .then(data => comboChart.setData(data))
        .then(() =>
          comboChart.setConfig({
            brushRangeMin: brushExtent.length ? brushExtent[0] : null,
            brushRangeMax: brushExtent.length ? brushExtent[1] : null
          })
        )
    }

    query = nextQuery
  })

  // Because DCJS has no "all charts finished rendering" event we can listen for,
  // we have to listen to each dcChart's "postRedraw" event, and count the number
  // of charts that have been rendered. Though we technically have 4 DC Charts,
  // We only count up to 3, because our dummy chart from the bar adapter won't ever
  // render as it has nothing to render!
  let chartCount = 0

  // array of all dc charts
  const charts = dc.chartRegistry.listAll()

  // set up event listeners on the DC charts
  charts.forEach((chart) => {
    chart.on("filtered", (chart, filter) => {
      const filterString =
        chart.dimension().getDimensionName()[0] + " = " + "'" + filter + "'"
      const storedFilterStrings = dcCharts[chart.chartID()].filterStrings
      const idx = storedFilterStrings.indexOf(filterString)
      if (idx === -1) {
        // if we don't have the filter string stored, add it
        storedFilterStrings.push(filterString)
      } else {
        // otherwise remove it
        storedFilterStrings.splice(idx, 1)
      }
    })
    chart.on("postRedraw", () => {
      chartCount += 1
      // after iterating through all of our charts, call our adapter's "redrawGroup" event to update the comboChart
      if (chartCount === Object.keys(dcCharts).length) {
        adapter.events.call("redrawGroup", null)
        chartCount = 0
      }
    })
  })

  // Helper function to request data using mapd-connector's browser connector
  async function queryDB(query) {
    try {
      const response = await connector.queryAsync(query, {})
      // transform the data from the response to be compatible with mapd3.Chart().setData()
      const data = await transformData(response)
      return data
    } catch (error) {
      console.error(error)
    }
  }

  // currently mapd3 expects data in a particular data structure, so we need to process the "raw" data returned by the database to match it
  function transformData(_data) {
    const series = [
      {
        group: 0, // will be non-zero for 2nd axis
        id: 0,
        label: "count(*)",
        dimensionName: "Departure Time",
        measureName: "Number Records",
        values: _data
          .map(d => ({
            key: Array.isArray(d.key0) ? d.key0[0] : d.key0,
            value: d.val
          }))
          .reverse()
      },
      {
        group: 1,
        id: 1,
        label: "avg(arrdelay)",
        dimensionName: "Departure Time",
        measureName: "Average Arrival Delay",
        values: _data
          .map(d => ({
            key: Array.isArray(d.key0) ? d.key0[0] : d.key0,
            value: d.val1
          }))
          .reverse()
      }
    ]
    return { series }
  }

  // render combo chart when data is formatted
  function renderComboChart(dataTransformed) {
    // the `setConfig` method determines how a chart renders in mapd3
    // more info on the options is available here: https://mapd.github.io/mapd3/doc/
    comboChart
      .setConfig({
        parentNode,
        margin: {
          top: 32,
          right: 70,
          bottom: 64,
          left: 70
        },
        width: "auto",
        height: "auto",
        palette: null,
        chartType: "line",
        xLabel: "Departure Time",
        yLabel: "Count",
        y2Label: "Average Arrival Delay",
        xDomainEditorIsEnabled: false,
        yDomainEditorIsEnabled: false,
        y2DomainEditorIsEnabled: false,
        legendIsEnabled: false,
        tooltipIsEnabled: true,
        legendTitle: "",
        brushIsEnabled: true,
        brushRangeMin: null,
        brushRangeMax: null,
        brushRangeIsEnabled: false,
        binExtent: [],
        rangeBrushExtent: [],
        timeBin: null,
        extract: null,
        autoBin: null,
        binningIsEnabled: false,
        brushExtent: [],
        keyType: "time",
        yTicks: "auto",
        xDomain: "auto",
        yDomain: "auto",
        y2Domain: "auto",
        xLock: false,
        yLock: false,
        y2Lock: false,
        hasRightAxis: false,
        hasLeftAxis: true,
        yAxisFormat: "auto",
        y2AxisFormat: "auto",
        tooltipFormat: "auto",
        tooltipTitleFormat: "auto",
        xAxisFormat: "auto",
        measureFormats: [],
        dimensionFormats: []
      })
      // the `setData` method will cause a re-render
      .setData(dataTransformed)
  }

  // set up a few event listeners for the comboChart's brush events
  comboChart
    // we can access the combo chart's event listeners using `getEvents`
    .getEvents()
    // note: it's a good idea to "throttle" the brushMove event as it gets called very frequently
    .onBrush(
      "brushMove",
      throttle(function() {
        brushExtent = [].concat(arguments[0])
        adapter.filter(brushExtent, "auto", false)
        adapter.redrawGroup()
      }, 100)
    )
    .onBrush("brushEnd", function() {
      brushExtent = [].concat(arguments[0])
      adapter.filter(brushExtent, "auto", false)
      adapter.redrawGroup()
    })
    .onBrush("brushClear", () => {
      brushExtent = []
      adapter.filter()
      adapter.redrawGroup()
    })

  // make the initial query and render the combo chart
  queryDB(query).then(data => {
    renderComboChart(data)
  })

  // render the DC Charts
  dc.renderAllAsync()

  /* --------------------------RESIZE EVENT------------------------------*/

  /* Here we listen to any resizes of the main window.  On resize we resize the corresponding widgets and call dc.renderAll() to refresh everything */

  window.addEventListener("resize", debounce(reSizeAll, 100))

  function reSizeAll() {
    const w =
      Math.max(document.documentElement.clientWidth, window.innerWidth || 0) -
      50
    const h =
      Math.max(document.documentElement.clientHeight, window.innerHeight || 0) -
      200

    dcBarChart.height(h / 1.5).width(w / 2)

    dcScatterPlot.height(h / 1.5).width(w / 2)

    comboChart.setConfig({
      width: w
    })

    dc.redrawAllAsync()
    comboChart.render()
  }
}

function debounce(func, wait, immediate) {
  let timeout
  return function() {
    let context = this,
      args = arguments
    const later = function() {
      timeout = null
      if (!immediate) {func.apply(context, args)}
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) {func.apply(context, args)}
  }
}

function throttle(func, limit) {
  let inThrottle
  return function() {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

function init() {
  /* Before doing anything we must set up a mapd connection, specifying
   * username, password, host, port, and database name */
  new MapdCon()
    .protocol("https")
    .host("metis.omnisci.com")
    .port("443")
    .dbName("mapd")
    .user("mapd")
    .password("HyperInteractive")
    .connect((error, con) => {
      if (error) { throw error }
      /*
       *  This instantiates a new crossfilter.
       *  Pass in mapdcon as the first argument to crossfilter, then the
       *  table name, then a label for the data (unused in this example).
       *
       *  to see all availables --  con.getTables()
       */
      crossfilter.crossfilter(con, "flights_donotmodify").then((cf) => {
        createCharts(cf, con)
      })
      /*
       *  Pass instance of crossfilter into our createCharts.
       */
    })
}

document.addEventListener("DOMContentLoaded", init, false)
