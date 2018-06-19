/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/assets/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 600);
/******/ })
/************************************************************************/
/******/ ({

/***/ 600:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/* global dc, mapd3, d3, crossfilter, MapdCon  */
__webpack_require__(601);

/*
 * This is example code that shows how to make 3 cross-filtered charts with the
 * dc.mapd.js and mapd3.js APIs. This example is not meant to be a replacement
 * for dc.js documentation. For the dc.js API docs, see here
 * - https://github.com/dc-js/dc.js/blob/master/web/docs/api-latest.md.
 *   For an annotated example of using dc.js - see here:
 *   https://dc-js.github.io/dc.js/docs/stock.html.
 */

function createCharts(crossFilter, connector) {

  // Helper function to request data using mapd-connector's browser connector
  var queryDB = function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(query) {
      var response, data;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.prev = 0;
              _context.next = 3;
              return connector.queryAsync(query, {});

            case 3:
              response = _context.sent;
              _context.next = 6;
              return transformData(response);

            case 6:
              data = _context.sent;
              return _context.abrupt("return", data);

            case 10:
              _context.prev = 10;
              _context.t0 = _context["catch"](0);

              console.error(_context.t0);

            case 13:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this, [[0, 10]]);
    }));

    return function queryDB(_x) {
      return _ref.apply(this, arguments);
    };
  }();

  // currently mapd3 expects data in a particular data structure, so we need to process the "raw" data returned by the database to match it


  var colorScheme = ["#22A7F0", "#3ad6cd", "#d4e666"];

  var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0) - 50;
  var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 200;

  // NEW: create a hash map to associate DC Chart properties by their id (__dcFlag__) so we can access them later
  var dcCharts = {};

  // select the DOM node for the combo chart to mount to, then pass it to mapd3.Chart
  var parentNode = document.querySelector(".chart3-example");
  var comboChart = mapd3.Chart(parentNode);

  /*
  * crossFilter is an object that handles cross-filtered the different
  * dimensions and measures that compose a dashboard's charts.
  * It has a number of methods on it.
  */

  /*
  *  getColumns() will grab all columns from the table along with metadata about
  *  those columns.
  */

  var allColumns = crossFilter.getColumns();

  /* -------------------BASIC COUNT ON CROSSFILTER---------------------------*/

  /*
  *  A basic operation is getting the filtered count and total count
  *  of crossFilter.  This performs that operation.  It is built into DC.
  *  Note that for the count we use crossFilter itself as the dimension.
  */

  var countGroup = crossFilter.groupAll();
  var countWidget = dc.countWidget(".data-count").dimension(crossFilter).group(countGroup);

  // NEW: store chart ID
  dcCharts[countWidget.chartID()] = {
    name: "countWidget",
    filterStrings: []

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

  };var rowChartDimension = crossFilter.dimension("dest_state");
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
  var rowChartGroup = rowChartDimension.group().reduceCount();

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

  var dcBarChart = dc.rowChart(".chart1-example").height(h / 1.5).width(w / 2).elasticX(true).cap(20).othersGrouper(false).ordinalColors(colorScheme).measureLabelsOn(true).dimension(rowChartDimension).group(rowChartGroup).autoScroll(true);

  // NEW: store chart id
  dcCharts[dcBarChart.chartID()] = {
    name: "rowChart",
    filterStrings: []

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

  };var scatterPlotDimension = crossFilter.dimension("carrier_name");

  /*
  *  MapD created a reduceMulti function in order to handle multiple measures.
  *  It takes an array of objects, each corresponding to a measure.
  *  Each measure object requires 3 arguments:
  *  'expression' which is the measure
  *  'agg_mode' which is the calculation to perform.
  *  'name' is how to reference the data
  *
  */

  var reduceMultiExpression1 = [{
    expression: "depdelay",
    agg_mode: "avg",
    name: "x"
  }, {
    expression: "arrdelay",
    agg_mode: "avg",
    name: "y"
  }, {
    expression: "*",
    agg_mode: "count",
    name: "size"
  }];

  var popupHeader = [{ type: "dimension", label: "carrier_name" }, { type: "measure", label: "depdelay", alias: "x" }, { type: "measure", label: "arrdelay", alias: "y" }];

  /*
  * Note the order("size") setter here. By default the bubble chart uses the
  * top function which sorts all measures in descending order.  This would
  * cause the us to take the top n (specified by cap) sorted by x, y, and
  * size in descending order.  Since we probably do not want to sort
  * primarility by departure delay, we override the sort and sort by size
  * instead, which corresponds to the count measure - i.e. we take the
  * n most popular airlines
  */

  var scatterPlotGroup = scatterPlotDimension.group().reduce(reduceMultiExpression1).order("size");

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

  var dcScatterPlot = dc.bubbleChart(".chart2-example").width(w / 2).height(h / 1.5).renderHorizontalGridLines(true).renderVerticalGridLines(true).cap(15).othersGrouper(false).keyAccessor(function (d) {
    return d.x;
  }).valueAccessor(function (d) {
    return d.y;
  }).radiusValueAccessor(function (d) {
    return d.size;
  }).colorAccessor(function (d) {
    return d.key0;
  }).maxBubbleRelativeSize(0.04).transitionDuration(500).xAxisLabel("Departure Delay").yAxisLabel("Arrival Delay").setPopupHeader(popupHeader).elasticX(true).elasticY(true).xAxisPadding("15%").yAxisPadding("15%").ordinalColors(colorScheme).dimension(scatterPlotDimension).group(scatterPlotGroup);

  // NEW: store chart id
  dcCharts[dcScatterPlot.chartID()] = {
    name: "scatterPlot",
    filterStrings: []

    /*  We create the bubble chart with the following parameters:
    *  dc.mapd.js allows functions to be applied at specific points in the chart's
    *  lifecycle.  Here we want to re-adjust our chart's x,y and r (radius) scales
    *  as data is filtered in an out to take into account the changing range of
    *  the data along these different measures.  Here we set the charts scale
    *  using standard d3 functions - telling dc.mapd.js to do this before each
    *  render and redraw */

  };var setScales = function setScales(chart, type) {
    chart.on(type, function (chart) {
      chart.x(d3.scale.linear().domain(d3.extent(chart.data(), chart.keyAccessor())));
      chart.xAxis().scale(chart.x()).tickFormat(d3.format(".2s"));
      chart.y(d3.scale.linear().domain(d3.extent(chart.data(), chart.valueAccessor())));
      chart.r(d3.scale.linear().domain(d3.extent(chart.data(), chart.radiusValueAccessor())));
    });
  };

  setScales(dcScatterPlot, "preRender");
  setScales(dcScatterPlot, "preRedraw");

  /* ----------------------MAPD3 COMBO CHART EXAMPLE----------------------------------------*/

  // create an adapter utility function that lets us tie into DC and Crossfilter
  function dcAdapter(groupName) {
    // eslint-disable-next-line no-underscore-dangle
    var _dimension = null;
    var events = mapd3.d3.dispatch("redrawGroup");

    // eslint-disable-next-line consistent-return
    function setDimension(dim) {
      _dimension = dim;
    }

    function getFilterString() {
      if (!_dimension) {
        throw new Error("Calling getfilterString before setting a dimension is not allowed.");
      }

      return _dimension.group().writeFilter();
    }

    function filter(_filter, _timeBin, _isExtract) {
      if (!_filter || !_filter.length) {
        filterAll();
        return;
      }

      var timeBin = _timeBin === "auto" && _isExtract ? "isodow" : _timeBin;

      // eslint-disable-next-line no-undefined
      _dimension.filter(_filter, undefined, undefined, undefined, [{ extract: _isExtract, timeBin: timeBin }]);
    }

    function filterAll() {
      _dimension.filterAll();
    }

    // create a chart that will allow us to hook into a dc render & redraw calls.
    var dummyChart = dc.baseMixin({});
    // dataAsync is a potential hook for introducing a loading state for the chart
    dummyChart.dataAsync = function (callback) {
      return callback();
    };
    // eslint-disable-next-line no-underscore-dangle
    dummyChart._doRender = renderRedraw;
    // eslint-disable-next-line no-underscore-dangle
    dummyChart._doRedraw = renderRedraw;
    dummyChart.dimension({});
    dummyChart.group({});
    dummyChart.generatePopup = function () {
      return null;
    };
    dc.registerChart(dummyChart, groupName);

    function renderRedraw() {
      events.call("redrawGroup", this, getFilterString());
    }

    // note: if we had multiple "groups" or datasets we could pass groupName from above as a param to dc.redrawAllAsync()
    // but in this demo we are only using one so it's unnecessary
    function redrawGroup() {
      if (dc.startRenderTime()) {
        dc.redrawAllAsync();
      } else {
        dc.renderAllAsync();
      }
    }
    return {
      setDimension: setDimension,
      filter: filter,
      redrawGroup: redrawGroup,
      events: events
    };
  }

  // brush extent
  var brushExtent = [];

  // inital SQL query for the combo chart
  var query = "SELECT date_trunc(day, dep_timestamp) as key0, COUNT(*) AS val, AVG(arrdelay) as val1 FROM flights_donotmodify WHERE (dep_timestamp >= TIMESTAMP(0) '2008-01-01 00:01:00' AND dep_timestamp <= TIMESTAMP(0) '2008-12-31 23:59:00') GROUP BY key0 ORDER BY key0";

  // create a new adapter and set its dimension
  var adapter = dcAdapter("flights_donotmodify");
  adapter.setDimension(crossFilter.dimension("dep_timestamp"));

  // When the DC Charts have finished rendering, gather their filterStrings and compose a new SQL query for the combo chart
  adapter.events.on("redrawGroup.combo", function () {
    function filterClause() {
      var wc = "";
      Object.keys(dcCharts).forEach(function (key) {
        if (dcCharts[key].name !== "countWidget" && dcCharts[key].filterStrings.length) {
          wc += " AND (" + dcCharts[key].filterStrings.join(" OR ") + ")";
        }
      });
      return wc;
    }

    var nextQuery = "SELECT date_trunc(day, dep_timestamp) as key0, COUNT(*) AS val, AVG(arrdelay) as val1 FROM flights_donotmodify WHERE (dep_timestamp >= TIMESTAMP(0) '2008-01-01 00:01:00' AND dep_timestamp <= TIMESTAMP(0) '2008-12-31 23:59:00')" + filterClause() + " GROUP BY key0 ORDER BY key0";

    // but only fire the query if it's different from the previous query
    if (nextQuery !== query) {
      // pass our next SQL query to our queryDB method and then update the comboChart's data
      queryDB(nextQuery).then(function (data) {
        return comboChart.setData(data);
      }).then(function () {
        return comboChart.setConfig({
          brushRangeMin: brushExtent.length ? brushExtent[0] : null,
          brushRangeMax: brushExtent.length ? brushExtent[1] : null
        });
      });
    }

    query = nextQuery;
  });

  // Because DCJS has no "all charts finished rendering" event we can listen for,
  // we have to listen to each dcChart's "postRedraw" event, and count the number
  // of charts that have been rendered. Though we technically have 4 DC Charts,
  // We only count up to 3, because our dummy chart from the bar adapter won't ever
  // render as it has nothing to render!
  var chartCount = 0;

  // array of all dc charts
  var charts = dc.chartRegistry.listAll();

  // set up event listeners on the DC charts
  charts.forEach(function (chart) {
    chart.on("filtered", function (chart, filter) {
      var filterString = chart.dimension().getDimensionName()[0] + " = " + "'" + filter + "'";
      var storedFilterStrings = dcCharts[chart.chartID()].filterStrings;
      var idx = storedFilterStrings.indexOf(filterString);
      if (idx === -1) {
        // if we don't have the filter string stored, add it
        storedFilterStrings.push(filterString);
      } else {
        // otherwise remove it
        storedFilterStrings.splice(idx, 1);
      }
    });
    chart.on("postRedraw", function () {
      chartCount += 1;
      // after iterating through all of our charts, call our adapter's "redrawGroup" event to update the comboChart
      if (chartCount === Object.keys(dcCharts).length) {
        adapter.events.call("redrawGroup", null);
        chartCount = 0;
      }
    });
  });function transformData(_data) {
    var series = [{
      group: 0, // will be non-zero for 2nd axis
      id: 0,
      label: "count(*)",
      dimensionName: "Departure Time",
      measureName: "Number Records",
      values: _data.map(function (d) {
        return {
          key: Array.isArray(d.key0) ? d.key0[0] : d.key0,
          value: d.val
        };
      }).reverse()
    }, {
      group: 1,
      id: 1,
      label: "avg(arrdelay)",
      dimensionName: "Departure Time",
      measureName: "Average Arrival Delay",
      values: _data.map(function (d) {
        return {
          key: Array.isArray(d.key0) ? d.key0[0] : d.key0,
          value: d.val1
        };
      }).reverse()
    }];
    return { series: series };
  }

  // render combo chart when data is formatted
  function renderComboChart(dataTransformed) {
    // the `setConfig` method determines how a chart renders in mapd3
    // more info on the options is available here: https://mapd.github.io/mapd3/doc/
    comboChart.setConfig({
      parentNode: parentNode,
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
    .setData(dataTransformed);
  }

  // set up a few event listeners for the comboChart's brush events
  comboChart
  // we can access the combo chart's event listeners using `getEvents`
  .getEvents()
  // note: it's a good idea to "throttle" the brushMove event as it gets called very frequently
  .onBrush("brushMove", throttle(function () {
    brushExtent = [].concat(arguments[0]);
    adapter.filter(brushExtent, "auto", false);
    adapter.redrawGroup();
  }, 100)).onBrush("brushEnd", function () {
    brushExtent = [].concat(arguments[0]);
    adapter.filter(brushExtent, "auto", false);
    adapter.redrawGroup();
  }).onBrush("brushClear", function () {
    brushExtent = [];
    adapter.filter();
    adapter.redrawGroup();
  });

  // make the initial query and render the combo chart
  queryDB(query).then(function (data) {
    renderComboChart(data);
  });

  // render the DC Charts
  dc.renderAllAsync();

  /* --------------------------RESIZE EVENT------------------------------*/

  /* Here we listen to any resizes of the main window.  On resize we resize the corresponding widgets and call dc.renderAll() to refresh everything */

  window.addEventListener("resize", debounce(reSizeAll, 100));

  function reSizeAll() {
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0) - 50;
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 200;

    dcBarChart.height(h / 1.5).width(w / 2);

    dcScatterPlot.height(h / 1.5).width(w / 2);

    comboChart.setConfig({
      width: w
    });

    dc.redrawAllAsync();
    comboChart.render();
  }
}

function debounce(func, wait, immediate) {
  var timeout = void 0;
  return function () {
    var context = this,
        args = arguments;
    var later = function later() {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(context, args);
    }
  };
}

function throttle(func, limit) {
  var inThrottle = void 0;
  return function () {
    var args = arguments;
    var context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(function () {
        inThrottle = false;
      }, limit);
    }
  };
}

function init() {
  /* Before doing anything we must set up a mapd connection, specifying
   * username, password, host, port, and database name */
  new MapdCon().protocol("https").host("metis.mapd.com").port("443").dbName("mapd").user("mapd").password("HyperInteractive").connect(function (error, con) {
    if (error) {
      throw error;
    }
    /*
     *  This instantiates a new crossfilter.
     *  Pass in mapdcon as the first argument to crossfilter, then the
     *  table name, then a label for the data (unused in this example).
     *
     *  to see all availables --  con.getTables()
     */
    crossfilter.crossfilter(con, "flights_donotmodify").then(function (cf) {
      createCharts(cf, con);
    });
    /*
     *  Pass instance of crossfilter into our createCharts.
     */
  });
}

document.addEventListener("DOMContentLoaded", init, false);

/***/ }),

/***/ 601:
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(602);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(62)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../css-loader/index.js!./mapd3.css", function() {
			var newContent = require("!!../../css-loader/index.js!./mapd3.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),

/***/ 602:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(61)();
// imports


// module
exports.push([module.i, ".mapd3 [contenteditable]:focus {\n  outline: 1px solid #ddd; }\n\n.mapd3 [contenteditable] {\n  border: 1px solid transparent; }\n\n.mapd3 [contenteditable]:hover, .mapd3 .axis-label:focus {\n  border: 1px solid #ddd; }\n\n.mapd3 .hidden {\n  visibility: hidden; }\n\n.mapd3 div {\n  font-size: 11px; }\n\n.mapd3.mapd3-container {\n  display: -webkit-box;\n  display: -ms-flexbox;\n  display: flex;\n  -webkit-box-align: stretch;\n      -ms-flex-align: stretch;\n          align-items: stretch; }\n  .mapd3.mapd3-container .svg-wrapper {\n    display: -webkit-box;\n    display: -ms-flexbox;\n    display: flex;\n    overflow-y: hidden;\n    overflow-x: scroll; }\n\n.mapd3 .vertical-grid-line,\n.mapd3 .horizontal-grid-line {\n  fill: none;\n  shape-rendering: crispEdges;\n  stroke: #EFF2F5;\n  stroke-width: 1;\n  stroke-dasharray: 4, 4; }\n\n.mapd3 .extended-y-line,\n.mapd3 .extended-x-line {\n  fill: none;\n  shape-rendering: crispEdges;\n  stroke: #D2D6DF;\n  stroke-width: 1; }\n\n.mapd3 .axis-group .domain {\n  fill: none;\n  stroke: #c7c7c7; }\n\n.mapd3 .axis-group .axis .tick line {\n  fill: none;\n  stroke: #c7c7c7;\n  stroke-width: 1;\n  shape-rendering: crispEdges; }\n\n.mapd3 .axis-group .axis .tick text {\n  font-size: 10px;\n  fill: #a7a7a7;\n  padding: 12px; }\n\n.mapd3 .axis-group .y-title, .mapd3 .axis-group .x-title {\n  font-size: 0.8em; }\n\n.mapd3 .tooltip-group, .mapd3 .legend-group {\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  background: white;\n  opacity: 0.9;\n  padding: 0 4px 0 4px;\n  max-width: 250px;\n  overflow: hidden; }\n  .mapd3 .tooltip-group .tooltip-title-section, .mapd3 .legend-group .tooltip-title-section {\n    display: table;\n    border-bottom: 1px solid #ddd;\n    width: 100%;\n    color: #a7a7a7; }\n  .mapd3 .tooltip-group .tooltip-title-section.collapsed:hover, .mapd3 .legend-group .tooltip-title-section.collapsed:hover {\n    cursor: pointer;\n    color: #22A7F0; }\n  .mapd3 .tooltip-group .tooltip-title-section:not(.collapsed) .tooltip-collapse:hover, .mapd3 .legend-group .tooltip-title-section:not(.collapsed) .tooltip-collapse:hover {\n    cursor: pointer;\n    color: #22A7F0; }\n  .mapd3 .tooltip-group .tooltip-title-section:hover:not(.collapsed) .tooltip-collapse, .mapd3 .legend-group .tooltip-title-section:hover:not(.collapsed) .tooltip-collapse {\n    opacity: 1; }\n  .mapd3 .tooltip-group .tooltip-title-section.collapsed .tooltip-collapse, .mapd3 .legend-group .tooltip-title-section.collapsed .tooltip-collapse {\n    display: none; }\n  .mapd3 .tooltip-group .tooltip-collapse, .mapd3 .legend-group .tooltip-collapse {\n    display: table-cell;\n    text-align: right;\n    opacity: 0; }\n  .mapd3 .tooltip-group .tooltip-title, .mapd3 .legend-group .tooltip-title {\n    display: table-cell;\n    font-size: 11px;\n    font-weight: bold; }\n  .mapd3 .tooltip-group .tooltip-body, .mapd3 .legend-group .tooltip-body {\n    display: table;\n    border-collapse: separate;\n    border-spacing: 0 5px; }\n  .mapd3 .tooltip-group .tooltip-item, .mapd3 .legend-group .tooltip-item {\n    display: -webkit-box;\n    display: -ms-flexbox;\n    display: flex;\n    -webkit-box-pack: start;\n        -ms-flex-pack: start;\n            justify-content: flex-start;\n    -webkit-box-align: center;\n        -ms-flex-align: center;\n            align-items: center; }\n  .mapd3 .tooltip-group .section.tooltip-label, .mapd3 .tooltip-group .section.value, .mapd3 .legend-group .section.tooltip-label, .mapd3 .legend-group .section.value {\n    padding-left: 5px;\n    white-space: nowrap;\n    max-width: 120px;\n    overflow: hidden;\n    text-overflow: ellipsis; }\n  .mapd3 .tooltip-group .section.tooltip-label, .mapd3 .legend-group .section.tooltip-label {\n    font-size: 12px;\n    font-weight: bold; }\n  .mapd3 .tooltip-group .section.value, .mapd3 .legend-group .section.value {\n    text-align: right;\n    font-size: 13px; }\n\n.mapd3 .tooltip-group .tooltip-item {\n  height: 18px; }\n\n.mapd3 .legend-group {\n  overflow-y: auto;\n  font-size: 11px; }\n  .mapd3 .legend-group .section.tooltip-label {\n    font-weight: normal; }\n\n.mapd3 .mapd3-legend .legend-entry.is-faded .legend-entry-name,\n.mapd3 .mapd3-legend .legend-entry.is-faded .legend-entry-value,\n.mapd3 .mapd3-legend .legend-entry.is-faded .legend-circle {\n  opacity: 0.97;\n  transition: opacity .2s ease-out;\n  -moz-transition: opacity .2s ease-out;\n  -webkit-transition: opacity .2s ease-out; }\n\n.mapd3 .mapd3-legend .legend-entry.is-faded .legend-entry-name,\n.mapd3 .mapd3-legend .legend-entry.is-faded .legend-entry-value,\n.mapd3 .mapd3-legend .legend-entry.is-faded .legend-circle {\n  opacity: 0.2; }\n\n.mapd3 .bar .axis.x > path.domain,\n.mapd3 .stackedBar .axis.x > path.domain {\n  display: none; }\n\n.mapd3 .chart .masking-rectangle {\n  fill: #ffffff; }\n\n.mapd3 .chart .vertical-grid-line, .mapd3 .chart .horizontal-grid-line {\n  stroke-dasharray: none; }\n\n.mapd3 .chart .line, .mapd3 .chart .area, .mapd3 .chart .stacked-area {\n  stroke-width: 1.5px;\n  stroke-linecap: round;\n  stroke-linejoin: round; }\n\n.mapd3 .chart .line {\n  fill: none; }\n\n.mapd3 .chart .area {\n  fill-opacity: 0.5; }\n\n.mapd3 .chart .stacked-area {\n  fill-opacity: 0.5; }\n\n.mapd3 .chart .bar {\n  stroke-width: 0.5; }\n\n.mapd3 .brush-chart .brush-area {\n  fill: #EFF2F5; }\n\n.mapd3 .brush-chart rect.brush-rect.selection {\n  fill-opacity: 0.08;\n  fill: url(\"#brush-area-gradient\");\n  stroke-linejoin: round; }\n\n.mapd3 .brush-chart rect.brush-rect.handle {\n  fill: #00d8d2;\n  width: 0.2rem; }\n\n.mapd3 .brush-chart .axis path {\n  display: none; }\n\n.mapd3 .brush-group .selection {\n  fill: #22A7F0; }\n\n.mapd3 .brush-group .handle {\n  fill: #eee; }\n\n.mapd3 .binning-group {\n  font-size: 11px;\n  color: #868686; }\n  .mapd3 .binning-group .item, .mapd3 .binning-group .bin-label {\n    float: left;\n    padding-right: 4px; }\n  .mapd3 .binning-group .item {\n    cursor: pointer; }\n  .mapd3 .binning-group .item.selected {\n    color: #22A7F0;\n    font-weight: bold;\n    border-bottom: #22A7F0 2px solid;\n    text-decoration: none; }\n  .mapd3 .binning-group .item.selected.item-auto {\n    border-bottom: none; }\n  .mapd3 .binning-group .dimmed {\n    font-weight: normal; }\n  .mapd3 .binning-group .bin-label {\n    font-weight: bold; }\n\n.mapd3 .hover-group .vertical-marker {\n  stroke: #D2D6DF;\n  stroke-width: 1;\n  fill: none; }\n\n.mapd3 .domain-input-group .domain-input {\n  font-size: 10px;\n  background: white; }\n\n.mapd3 .domain-input-group .domain-lock.locked {\n  background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNDggNDgiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ4IDQ4OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHN0eWxlIHR5cGU9InRleHQvY3NzIj4uc3Qwe2ZpbGw6I0E3QTdBNzt9LnN0MXtmaWxsOiNGRkZGRkY7fTwvc3R5bGU+PGc+PHBhdGggY2xhc3M9InN0MCIgZD0iTTcsNDFWMTloNnYtM2MwLTYuMSw0LjktMTEsMTEtMTFzMTEsNC45LDExLDExdjNoNnYyMkg3eiBNMjksMTl2LTNjMC0yLjgtMi4yLTUtNS01cy01LDIuMi01LDV2M0gyOXoiLz48cGF0aCBjbGFzcz0ic3QxIiBkPSJNMjQsNmM1LjUsMCwxMCw0LjUsMTAsMTB2NGg2djIwSDhWMjBoNnYtNEMxNCwxMC41LDE4LjUsNiwyNCw2IE0xOCwyMGgxMnYtNGMwLTMuMy0yLjctNi02LTZzLTYsMi43LTYsNlYyMCBNMjQsNGMtNi42LDAtMTIsNS40LTEyLDEydjJIOEg2djJ2MjB2MmgyaDMyaDJ2LTJWMjB2LTJoLTJoLTR2LTJDMzYsOS40LDMwLjYsNCwyNCw0TDI0LDR6IE0yMCwxOHYtMmMwLTIuMiwxLjgtNCw0LTRzNCwxLjgsNCw0djJIMjBMMjAsMTh6Ii8+PC9nPjwvc3ZnPg==); }\n\n.mapd3 .domain-input-group .domain-lock {\n  background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNDggNDgiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ4IDQ4OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHN0eWxlIHR5cGU9InRleHQvY3NzIj4uc3Qwe2ZpbGw6I0E3QTdBNzt9LnN0MXtmaWxsOiNGRkZGRkY7fTwvc3R5bGU+PGc+PHBhdGggY2xhc3M9InN0MCIgZD0iTTcsNDFWMTloNnYtN2MwLTYuMSw0LjktMTEsMTEtMTFzMTEsNC45LDExLDExdjNoLTZ2LTNjMC0yLjgtMi4yLTUtNS01cy01LDIuMi01LDV2N2gyMnYyMkg3eiIvPjxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0yNCwyYzUuNSwwLDEwLDQuNSwxMCwxMHYyaC00di0yYzAtMy4zLTIuNy02LTYtNnMtNiwyLjctNiw2djhoMjJ2MjBIOFYyMGg2di04QzE0LDYuNSwxOC41LDIsMjQsMiBNMjQsMGMtNi42LDAtMTIsNS40LTEyLDEydjZIOEg2djJ2MjB2MmgyaDMyaDJ2LTJWMjB2LTJoLTJIMjB2LTZjMC0yLjIsMS44LTQsNC00czQsMS44LDQsNHYydjJoMmg0aDJ2LTJ2LTJDMzYsNS40LDMwLjYsMCwyNCwwTDI0LDB6Ii8+PC9nPjwvc3ZnPg==); }\n\n.mapd3 .domain-input-group .domain-lock {\n  cursor: pointer; }\n\n.mapd3 .brush-range-input-group {\n  white-space: nowrap;\n  color: #868686;\n  font-weight: bold; }\n  .mapd3 .brush-range-input-group .brush-range-input, .mapd3 .brush-range-input-group .separator {\n    padding: 0 2px; }\n\n.mapd3 .label-group {\n  position: absolute;\n  top: 0;\n  left: 0;\n  white-space: nowrap; }\n  .mapd3 .label-group .axis-label {\n    position: absolute;\n    color: #a7a7a7;\n    font-weight: bold;\n    font-size: 13px;\n    overflow: hidden; }\n  .mapd3 .label-group .axis-label.x {\n    -webkit-transform: translate(-50%);\n            transform: translate(-50%); }\n  .mapd3 .label-group .axis-label.y {\n    left: 0;\n    -webkit-transform: translate(-50%) rotate(90deg);\n            transform: translate(-50%) rotate(90deg); }\n  .mapd3 .label-group .axis-label.y2 {\n    -webkit-transform: translate(-50%) rotate(90deg);\n            transform: translate(-50%) rotate(90deg); }\n\n/*# sourceMappingURL=mapd3.css.map*/", ""]);

// exports


/***/ }),

/***/ 61:
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
module.exports = function() {
	var list = [];

	// return the list of modules as css string
	list.toString = function toString() {
		var result = [];
		for(var i = 0; i < this.length; i++) {
			var item = this[i];
			if(item[2]) {
				result.push("@media " + item[2] + "{" + item[1] + "}");
			} else {
				result.push(item[1]);
			}
		}
		return result.join("");
	};

	// import a list of modules into the list
	list.i = function(modules, mediaQuery) {
		if(typeof modules === "string")
			modules = [[null, modules, ""]];
		var alreadyImportedModules = {};
		for(var i = 0; i < this.length; i++) {
			var id = this[i][0];
			if(typeof id === "number")
				alreadyImportedModules[id] = true;
		}
		for(i = 0; i < modules.length; i++) {
			var item = modules[i];
			// skip already imported module
			// this implementation is not 100% perfect for weird media query combinations
			//  when a module is imported multiple times with different media queries.
			//  I hope this will never occur (Hey this way we have smaller bundles)
			if(typeof item[0] !== "number" || !alreadyImportedModules[item[0]]) {
				if(mediaQuery && !item[2]) {
					item[2] = mediaQuery;
				} else if(mediaQuery) {
					item[2] = "(" + item[2] + ") and (" + mediaQuery + ")";
				}
				list.push(item);
			}
		}
	};
	return list;
};


/***/ }),

/***/ 62:
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var stylesInDom = {},
	memoize = function(fn) {
		var memo;
		return function () {
			if (typeof memo === "undefined") memo = fn.apply(this, arguments);
			return memo;
		};
	},
	isOldIE = memoize(function() {
		return /msie [6-9]\b/.test(self.navigator.userAgent.toLowerCase());
	}),
	getHeadElement = memoize(function () {
		return document.head || document.getElementsByTagName("head")[0];
	}),
	singletonElement = null,
	singletonCounter = 0,
	styleElementsInsertedAtTop = [];

module.exports = function(list, options) {
	if(typeof DEBUG !== "undefined" && DEBUG) {
		if(typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
	}

	options = options || {};
	// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
	// tags it will allow on a page
	if (typeof options.singleton === "undefined") options.singleton = isOldIE();

	// By default, add <style> tags to the bottom of <head>.
	if (typeof options.insertAt === "undefined") options.insertAt = "bottom";

	var styles = listToStyles(list);
	addStylesToDom(styles, options);

	return function update(newList) {
		var mayRemove = [];
		for(var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];
			domStyle.refs--;
			mayRemove.push(domStyle);
		}
		if(newList) {
			var newStyles = listToStyles(newList);
			addStylesToDom(newStyles, options);
		}
		for(var i = 0; i < mayRemove.length; i++) {
			var domStyle = mayRemove[i];
			if(domStyle.refs === 0) {
				for(var j = 0; j < domStyle.parts.length; j++)
					domStyle.parts[j]();
				delete stylesInDom[domStyle.id];
			}
		}
	};
}

function addStylesToDom(styles, options) {
	for(var i = 0; i < styles.length; i++) {
		var item = styles[i];
		var domStyle = stylesInDom[item.id];
		if(domStyle) {
			domStyle.refs++;
			for(var j = 0; j < domStyle.parts.length; j++) {
				domStyle.parts[j](item.parts[j]);
			}
			for(; j < item.parts.length; j++) {
				domStyle.parts.push(addStyle(item.parts[j], options));
			}
		} else {
			var parts = [];
			for(var j = 0; j < item.parts.length; j++) {
				parts.push(addStyle(item.parts[j], options));
			}
			stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
		}
	}
}

function listToStyles(list) {
	var styles = [];
	var newStyles = {};
	for(var i = 0; i < list.length; i++) {
		var item = list[i];
		var id = item[0];
		var css = item[1];
		var media = item[2];
		var sourceMap = item[3];
		var part = {css: css, media: media, sourceMap: sourceMap};
		if(!newStyles[id])
			styles.push(newStyles[id] = {id: id, parts: [part]});
		else
			newStyles[id].parts.push(part);
	}
	return styles;
}

function insertStyleElement(options, styleElement) {
	var head = getHeadElement();
	var lastStyleElementInsertedAtTop = styleElementsInsertedAtTop[styleElementsInsertedAtTop.length - 1];
	if (options.insertAt === "top") {
		if(!lastStyleElementInsertedAtTop) {
			head.insertBefore(styleElement, head.firstChild);
		} else if(lastStyleElementInsertedAtTop.nextSibling) {
			head.insertBefore(styleElement, lastStyleElementInsertedAtTop.nextSibling);
		} else {
			head.appendChild(styleElement);
		}
		styleElementsInsertedAtTop.push(styleElement);
	} else if (options.insertAt === "bottom") {
		head.appendChild(styleElement);
	} else {
		throw new Error("Invalid value for parameter 'insertAt'. Must be 'top' or 'bottom'.");
	}
}

function removeStyleElement(styleElement) {
	styleElement.parentNode.removeChild(styleElement);
	var idx = styleElementsInsertedAtTop.indexOf(styleElement);
	if(idx >= 0) {
		styleElementsInsertedAtTop.splice(idx, 1);
	}
}

function createStyleElement(options) {
	var styleElement = document.createElement("style");
	styleElement.type = "text/css";
	insertStyleElement(options, styleElement);
	return styleElement;
}

function createLinkElement(options) {
	var linkElement = document.createElement("link");
	linkElement.rel = "stylesheet";
	insertStyleElement(options, linkElement);
	return linkElement;
}

function addStyle(obj, options) {
	var styleElement, update, remove;

	if (options.singleton) {
		var styleIndex = singletonCounter++;
		styleElement = singletonElement || (singletonElement = createStyleElement(options));
		update = applyToSingletonTag.bind(null, styleElement, styleIndex, false);
		remove = applyToSingletonTag.bind(null, styleElement, styleIndex, true);
	} else if(obj.sourceMap &&
		typeof URL === "function" &&
		typeof URL.createObjectURL === "function" &&
		typeof URL.revokeObjectURL === "function" &&
		typeof Blob === "function" &&
		typeof btoa === "function") {
		styleElement = createLinkElement(options);
		update = updateLink.bind(null, styleElement);
		remove = function() {
			removeStyleElement(styleElement);
			if(styleElement.href)
				URL.revokeObjectURL(styleElement.href);
		};
	} else {
		styleElement = createStyleElement(options);
		update = applyToTag.bind(null, styleElement);
		remove = function() {
			removeStyleElement(styleElement);
		};
	}

	update(obj);

	return function updateStyle(newObj) {
		if(newObj) {
			if(newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap)
				return;
			update(obj = newObj);
		} else {
			remove();
		}
	};
}

var replaceText = (function () {
	var textStore = [];

	return function (index, replacement) {
		textStore[index] = replacement;
		return textStore.filter(Boolean).join('\n');
	};
})();

function applyToSingletonTag(styleElement, index, remove, obj) {
	var css = remove ? "" : obj.css;

	if (styleElement.styleSheet) {
		styleElement.styleSheet.cssText = replaceText(index, css);
	} else {
		var cssNode = document.createTextNode(css);
		var childNodes = styleElement.childNodes;
		if (childNodes[index]) styleElement.removeChild(childNodes[index]);
		if (childNodes.length) {
			styleElement.insertBefore(cssNode, childNodes[index]);
		} else {
			styleElement.appendChild(cssNode);
		}
	}
}

function applyToTag(styleElement, obj) {
	var css = obj.css;
	var media = obj.media;

	if(media) {
		styleElement.setAttribute("media", media)
	}

	if(styleElement.styleSheet) {
		styleElement.styleSheet.cssText = css;
	} else {
		while(styleElement.firstChild) {
			styleElement.removeChild(styleElement.firstChild);
		}
		styleElement.appendChild(document.createTextNode(css));
	}
}

function updateLink(linkElement, obj) {
	var css = obj.css;
	var sourceMap = obj.sourceMap;

	if(sourceMap) {
		// http://stackoverflow.com/a/26603875
		css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
	}

	var blob = new Blob([css], { type: "text/css" });

	var oldSrc = linkElement.href;

	linkElement.href = URL.createObjectURL(blob);

	if(oldSrc)
		URL.revokeObjectURL(oldSrc);
}


/***/ })

/******/ });
//# sourceMappingURL=exampleMapD3Crossfilter.bundle.js.map