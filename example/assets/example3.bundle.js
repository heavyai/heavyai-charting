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
/******/ 	return __webpack_require__(__webpack_require__.s = 222);
/******/ })
/************************************************************************/
/******/ ({

/***/ 222:
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(9)(__webpack_require__(223))

/***/ }),

/***/ 223:
/***/ (function(module, exports) {

module.exports = "document.addEventListener(\"DOMContentLoaded\", function init() {\n\n  var config = {\n    table: \"contributions_donotmodify\",\n    valueColumn: \"contributions_donotmodify.amount\",\n    joinColumn: \"contributions_donotmodify.contributor_zipcode\",\n    polyTable: \"zipcodes\",\n    polyJoinColumn: \"ZCTA5CE10\",\n    timeColumn: \"contrib_date\",\n    timeLabel: \"Number of Contributions\",\n    domainBoundMin: 0,\n    domainBoundMax: 2600,\n    numTimeBins: 423\n  }\n\n  new MapdCon()\n    .protocol(\"https\")\n    .host(\"metis.mapd.com\")\n    .port(\"443\")\n    .dbName(\"mapd\")\n    .user(\"mapd\")\n    .password(\"HyperInteractive\")\n    .connect(function(error, con) {\n      crossfilter.crossfilter(con, [\"contributions_donotmodify\", \"zipcodes\"], [{\n        table1: \"contributions_donotmodify\",\n        attr1: \"contributor_zipcode\",\n        table2: \"zipcodes\",\n        attr2: \"ZCTA5CE10\"\n      }]).then(function(cf) {\n        crossfilter.crossfilter(con, \"contributions_donotmodify\").then(cf2 => {\n          createPolyMap(cf, con, dc, config, cf2)\n          createTimeChart(cf, dc, config, cf2)\n        })\n      })\n    })\n\n  function createPolyMap(crossFilter, con, dc, config, cf2) {\n    var parent = document.getElementById(\"polymap\")\n    // The values in the table and column specified in crossFilter.dimension\n    // must correspond to values in the table and keysColumn specified in polyRasterChart.polyJoin.\n    var dim = crossFilter.dimension(\"zipcodes.rowid\") // Values to join on.\n    var grp = dim.group().reduceAvg(\"contributions_donotmodify.amount\", \"avgContrib\") // Values to color on.\n    // var dim = crossFilter.dimension(\"tweets_nov_feb.state_abbr\") // Values to join on.\n    // var grp = dim.group().reduceAvg(\"tweets_nov_feb.tweet_count\") // Values to color on.\n\n    // Can use getDomainBounds to dynamically find min and max of values that will be colored,\n    // or the domain [min, max] can be set directly\n    // (in which case nesting chart creation inside this callback is unnecessary).\n    getDomainBounds(config.valueColumn, cf2.groupAll(), function(domainBounds){\n      // Can set colorDomain directly or use domainFromBoundsAndRange to generate a .\n      var colorRange = [\"#115f9a\",\"#1984c5\",\"#22a7f0\",\"#48b5c4\",\"#76c68f\",\"#a6d75b\",\"#c9e52f\",\"#d0ee11\",\"#d0f400\"]\n      var colorDomain = domainFromBoundsAndRange(config.domainBoundMin, config.domainBoundMax, colorRange)\n      // var colorDomain = domainFromBoundsAndRange(domainBounds.minimum, domainBounds.maximum, colorRange)\n      var mapboxToken = \"pk.eyJ1IjoibWFwZCIsImEiOiJjaWV1a3NqanYwajVsbmdtMDZzc2pneDVpIn0.cJnk8c2AxdNiRNZWtx5A9g\";\n\n      var polyMap = dc\n      .rasterChart(parent, true)\n      .con(con)\n      .height(height()/1.5)\n      .width(width())\n      .mapUpdateInterval(750) // ms\n      .mapStyle(\"mapbox://styles/mapbox/light-v8\")\n      .mapboxToken(mapboxToken) // need a mapbox accessToken for loading the tiles\n\n      var polyLayer = dc\n      .rasterLayer(\"polys\")\n      .cap(Infinity)\n      .dimension(dim)\n      .group(grp)\n      .cap(1000000)\n      .fillColorAttr('avgContrib')\n      .defaultFillColor(\"green\")\n      .fillColorScale(d3.scale.linear().domain(colorDomain).range(colorRange))\n\n      polyMap.pushLayer(\"polys\", polyLayer).init().then(() => {\n        // polyMap.borderWidth(zoomToBorderWidth(polyMap.map().getZoom()))\n        // Keeps the border widths reasonable regardless of zoom level.\n        polyMap.map().on(\"zoom\", function() {\n          // polyMap.borderWidth(zoomToBorderWidth(polyMap.map().getZoom()))\n        })\n\n        dc.renderAllAsync()\n\n        window.addEventListener(\"resize\", _.debounce(function(){ resizeChart(polyMap, 1.5) }, 500))\n      })\n    })\n  }\n\n  function getDomainBounds (column, groupAll, callback) {\n    groupAll.reduce([\n      {expression: column, agg_mode: \"min\", name: \"minimum\"},\n      {expression: column, agg_mode: \"max\", name: \"maximum\"}\n    ]).valuesAsync(true).then(callback)\n  }\n\n  function domainFromBoundsAndRange (min, max, range) {\n    return _.range(0, range.length).map((_, i) => min + Math.round(i * max / (range.length - 1)))\n  }\n\n  function zoomToBorderWidth (zoomLevel) {\n    var MIN_ZOOM = 0.8626373575587937\n    var ZOOM_BORDER_DIVISOR = 20\n    return zoomLevel / ZOOM_BORDER_DIVISOR - MIN_ZOOM / ZOOM_BORDER_DIVISOR\n  }\n\n  function createTimeChart(crossFilter, dc, config, cf2) {\n    getDomainBounds(config.timeColumn, cf2.groupAll(), function(timeChartBounds){\n      var timeChartDimension = crossFilter.dimension(config.timeColumn)\n      var timeChartGroup = timeChartDimension\n      .group()\n      .reduceCount(\"*\")\n\n      var timeChart = dc.lineChart(\"#timechart\")\n      .width(width())\n      .height(height()/2.5)\n      .elasticY(true)\n      .renderHorizontalGridLines(true)\n      .brushOn(true)\n      .xAxisLabel(\"Time\")\n      .yAxisLabel(config.timeLabel)\n      .dimension(timeChartDimension)\n      .group(timeChartGroup)\n      .binParams({\n        numBins: config.numTimeBins,\n        binBounds: [timeChartBounds.minimum, timeChartBounds.maximum]\n      })\n\n      timeChart.x(d3.time.scale.utc().domain([timeChartBounds.minimum, timeChartBounds.maximum]))\n      timeChart.yAxis().ticks(5)\n      timeChart\n        .xAxis()\n        .scale(timeChart.x())\n        .tickFormat(dc.utils.customTimeFormat)\n        .orient('bottom');\n\n      dc.renderAllAsync()\n\n      window.addEventListener(\"resize\", _.debounce(function () { resizeChart(timeChart, 2.5) }, 500))\n    })\n  }\n\n  function width () {\n    return document.documentElement.clientWidth - 30\n  }\n\n  function height () {\n    return (Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 200)\n  }\n\n  function resizeChart (chart, heightDivisor) {\n    if(typeof chart.map === \"function\"){\n      chart.map().resize()\n      chart.isNodeAnimate = false\n    }\n    chart\n    .width(width())\n    .height(height()/heightDivisor)\n    .renderAsync()\n    dc.redrawAllAsync()\n  }\n\n  function noop () {}\n})\n"

/***/ }),

/***/ 9:
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
module.exports = function(src) {
	if (typeof execScript !== "undefined")
		execScript(src);
	else
		eval.call(null, src);
}


/***/ })

/******/ });
//# sourceMappingURL=example3.bundle.js.map