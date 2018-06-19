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
/******/ 	return __webpack_require__(__webpack_require__.s = 592);
/******/ })
/************************************************************************/
/******/ ({

/***/ 37:
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
module.exports = function(src) {
	function log(error) {
		(typeof console !== "undefined")
		&& (console.error || console.log)("[Script Loader]", error);
	}

	// Check for IE =< 8
	function isIE() {
		return typeof attachEvent !== "undefined" && typeof addEventListener === "undefined";
	}

	try {
		if (typeof execScript !== "undefined" && isIE()) {
			execScript(src);
		} else if (typeof eval !== "undefined") {
			eval.call(null, src);
		} else {
			log("EvalError: No eval function available");
		}
	} catch (error) {
		log(error);
	}
}


/***/ }),

/***/ 592:
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(37)(__webpack_require__(593))

/***/ }),

/***/ 593:
/***/ (function(module, exports) {

module.exports = "document.addEventListener(\"DOMContentLoaded\", function init() {\n  var config = {\n    table: \"contributions_donotmodify\",\n    valueColumn: \"amount\",\n    joinColumn: \"contributor_zipcode\",\n    polyTable: \"zipcodes\",\n    polyJoinColumn: \"ZCTA5CE10\",\n    timeColumn: \"contrib_date\",\n    timeLabel: \"Number of Contributions\",\n    domainBoundMin: 1,\n    domainBoundMax: 2600, //00000,\n    numTimeBins: 423\n  }\n\n  new MapdCon()\n    .protocol(\"https\")\n    .host(\"metis.mapd.com\")\n    .port(\"443\")\n    .dbName(\"mapd\")\n    .user(\"mapd\")\n    .password(\"HyperInteractive\")\n    .connect(function(error, con) {\n      crossfilter\n        .crossfilter(con, \"contributions_donotmodify\")\n        .then(function(cf) {\n          crossfilter\n            .crossfilter(con, \"contributions_donotmodify\")\n            .then(cf2 => {\n              createPolyMap(cf, con, dc, config, cf2)\n              createTimeChart(cf, dc, config, cf2)\n            })\n        })\n    })\n\n  function createPolyMap(crossFilter, con, dc, config, cf2) {\n    window.cf = crossFilter\n    var parent = document.getElementById(\"polymap\")\n    // The values in the table and column specified in crossFilter.dimension\n    // must correspond to values in the table and keysColumn specified in polyRasterChart.polyJoin.\n    var dim = crossFilter.dimension(config.joinColumn) // Values to join on.\n    // var grp = dim\n    //   .group()\n    //   .reduceAvg(\"contributions_donotmodify.amount\", \"avgContrib\") // Values to color on.\n    // // var dim = crossFilter.dimension(\"tweets_nov_feb.state_abbr\") // Values to join on.\n    // // var grp = dim.group().reduceAvg(\"tweets_nov_feb.tweet_count\") // Values to color on.\n\n    // Can use getDomainBounds to dynamically find min and max of values that will be colored,\n    // or the domain [min, max] can be set directly\n    // (in which case nesting chart creation inside this callback is unnecessary).\n    getDomainBounds(config.valueColumn, cf2.groupAll(), function(domainBounds) {\n      // Can set colorDomain directly or use domainFromBoundsAndRange to generate a .\n      var colorRange = [\n        \"#115f9a\",\n        \"#1984c5\",\n        \"#22a7f0\",\n        \"#48b5c4\",\n        \"#76c68f\",\n        \"#a6d75b\",\n        \"#c9e52f\",\n        \"#d0ee11\",\n        \"#d0f400\"\n      ]\n      var colorDomain = [config.domainBoundMin, config.domainBoundMax]\n      // domainFromBoundsAndRange(\n      //   config.domainBoundMin,\n      //   config.domainBoundMax,\n      //   colorRange\n      // )\n      // var colorDomain = domainFromBoundsAndRange(domainBounds.minimum, domainBounds.maximum, colorRange)\n      var mapboxToken =\n        \"pk.eyJ1IjoibWFwZCIsImEiOiJjaWV1a3NqanYwajVsbmdtMDZzc2pneDVpIn0.cJnk8c2AxdNiRNZWtx5A9g\"\n\n      var polyMap = dc\n        .rasterChart(parent, true)\n        .con(con)\n        .height(height() / 1.5)\n        .width(width())\n        .mapUpdateInterval(750) // ms\n        .mapStyle(\"mapbox://styles/mapbox/light-v8\")\n        .mapboxToken(mapboxToken) // need a mapbox accessToken for loading the tiles\n\n      var polyLayer = dc\n        .rasterLayer(\"polys\")\n        .crossfilter(crossFilter)\n        .dimension(dim)\n        .setState({\n          data: [\n            {\n              table: config.table,\n              attr: config.joinColumn\n            },\n            {\n              table: config.polyTable,\n              attr: config.polyJoinColumn\n            }\n          ],\n          mark: {\n            type: \"poly\",\n            strokeColor: \"white\",\n            strokeWidth: 0,\n            lineJoin: \"miter\",\n            miterLimit: 10\n          },\n          encoding: {\n            color: {\n              type: \"quantitative\",\n              aggregrate: `SUM(${config.valueColumn})`,\n              domain: colorDomain,\n              range: colorRange\n            }\n          }\n        })\n\n      polyLayer.popupColumns([\"key0\", \"color\"])\n      polyLayer.popupColumnsMapped({\"key0\": \"zipcode\", \"color\": \"total amount\"})\n\n      polyMap\n        .pushLayer(\"polys\", polyLayer)\n        .init()\n        .then(() => {\n          // polyMap.borderWidth(zoomToBorderWidth(polyMap.map().getZoom()))\n          // Keeps the border widths reasonable regardless of zoom level.\n          polyMap.map().on(\"zoom\", function() {\n            // polyMap.borderWidth(zoomToBorderWidth(polyMap.map().getZoom()))\n          })\n\n          dc.renderAllAsync()\n\n          window.addEventListener(\n            \"resize\",\n            _.debounce(function() {\n              resizeChart(polyMap, 1.5)\n            }, 500)\n          )\n        })\n\n      // hover effect with popup\n      var debouncedPopup = _.debounce(displayPopupWithData, 250)\n      polyMap.map().on(\"mousewheel\", polyMap.hidePopup)\n      polyMap.map().on(\"wheel\", polyMap.hidePopup)\n      polyMap.map().on(\"mousemove\", polyMap.hidePopup)\n      polyMap.map().on(\"mousemove\", debouncedPopup)\n      function displayPopupWithData(event) {\n        polyMap.getClosestResult(event.point, polyMap.displayPopup)\n      }\n    })\n  }\n\n  function getDomainBounds(column, groupAll, callback) {\n    groupAll\n      .reduce([\n        { expression: column, agg_mode: \"min\", name: \"minimum\" },\n        { expression: column, agg_mode: \"max\", name: \"maximum\" }\n      ])\n      .valuesAsync(true)\n      .then(callback)\n  }\n\n  function domainFromBoundsAndRange(min, max, range) {\n    return _.range(0, range.length).map(\n      (_, i) => min + Math.round(i * max / (range.length - 1))\n    )\n  }\n\n  function zoomToBorderWidth(zoomLevel) {\n    var MIN_ZOOM = 0.8626373575587937\n    var ZOOM_BORDER_DIVISOR = 20\n    return zoomLevel / ZOOM_BORDER_DIVISOR - MIN_ZOOM / ZOOM_BORDER_DIVISOR\n  }\n\n  function createTimeChart(crossFilter, dc, config, cf2) {\n    getDomainBounds(config.timeColumn, cf2.groupAll(), function(\n      timeChartBounds\n    ) {\n      var timeChartDimension = crossFilter.dimension(config.timeColumn)\n      var timeChartGroup = timeChartDimension.group().reduceCount(\"*\")\n\n      var timeChart = dc\n        .lineChart(\"#timechart\")\n        .width(width())\n        .height(height() / 2.5)\n        .elasticY(true)\n        .renderHorizontalGridLines(true)\n        .brushOn(true)\n        .xAxisLabel(\"Time\")\n        .yAxisLabel(config.timeLabel)\n        .dimension(timeChartDimension)\n        .group(timeChartGroup)\n        .binParams({\n          numBins: config.numTimeBins,\n          binBounds: [timeChartBounds.minimum, timeChartBounds.maximum]\n        })\n\n      timeChart.x(\n        d3.time.scale\n          .utc()\n          .domain([timeChartBounds.minimum, timeChartBounds.maximum])\n      )\n      timeChart.yAxis().ticks(5)\n      timeChart\n        .xAxis()\n        .scale(timeChart.x())\n        .tickFormat(dc.utils.customTimeFormat)\n        .orient(\"bottom\")\n\n      dc.renderAllAsync()\n\n      window.addEventListener(\n        \"resize\",\n        _.debounce(function() {\n          resizeChart(timeChart, 2.5)\n        }, 500)\n      )\n    })\n  }\n\n  function width() {\n    return document.documentElement.clientWidth - 30\n  }\n\n  function height() {\n    return (\n      Math.max(document.documentElement.clientHeight, window.innerHeight || 0) -\n      200\n    )\n  }\n\n  function resizeChart(chart, heightDivisor) {\n    if (typeof chart.map === \"function\") {\n      chart.map().resize()\n      chart.isNodeAnimate = false\n    }\n    chart\n      .width(width())\n      .height(height() / heightDivisor)\n      .renderAsync()\n    dc.redrawAllAsync()\n  }\n\n  function noop() {}\n})\n"

/***/ })

/******/ });
//# sourceMappingURL=example3.bundle.js.map