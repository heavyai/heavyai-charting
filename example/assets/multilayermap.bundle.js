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
/******/ 	return __webpack_require__(__webpack_require__.s = 225);
/******/ })
/************************************************************************/
/******/ ({

/***/ 225:
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(9)(__webpack_require__(226))

/***/ }),

/***/ 226:
/***/ (function(module, exports) {

module.exports = "\ndocument.addEventListener(\"DOMContentLoaded\", () => {\n\n  new MapdCon()\n    .protocol(\"https\")\n    .host(\"metis.mapd.com\")\n    .port(\"443\")\n    .dbName(\"mapd\")\n    .user(\"mapd\")\n    .password(\"HyperInteractive\")\n    .connect((error, con) => {\n\n      const tableName1 = [\"contributions_donotmodify\", \"zipcodes\"]\n      const table1Joins = [{\n        table1: \"contributions_donotmodify\",\n        attr1: \"contributor_zipcode\",\n        table2: \"zipcodes\",\n        attr2: \"ZCTA5CE10\"\n      }]\n\n      crossfilter.crossfilter(con, tableName1, table1Joins).then((cf1) => {\n        createPointMap(cf1, con)\n      })\n    })\n\n  function createPointMap (polycfLayer1, con) {\n    const w = document.documentElement.clientWidth - 30\n    const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 150\n    const mapboxToken = \"pk.eyJ1IjoibWFwZCIsImEiOiJjaWV1a3NqanYwajVsbmdtMDZzc2pneDVpIn0.cJnk8c2AxdNiRNZWtx5A9g\"\n\n    // const polyDim1 = polycfLayer1.dimension(\"zipcodes.rowid\")\n\n    // const polyGrp1 = polyDim1.group().reduceAvg(\"contributions_donotmodify.amount\", \"avgContrib\")\n\n    // const polyColorRange = [\"#115f9a\", \"#1984c5\", \"#22a7f0\", \"#48b5c4\", \"#76c68f\", \"#a6d75b\", \"#c9e52f\", \"#d0ee11\", \"#d0f400\"]\n    // const polyFillColorScale = d3.scale.quantize().domain([0, 5000]).range(polyColorRange)\n\n    // setup the first layer, the zipcode polygons\n    // const polyLayer1 = dc.rasterLayer(\"polys\")\n    //                    .dimension(polyDim1)\n    //                    .group(polyGrp1)\n    //                    .cap(Infinity)\n    //                    .fillColorScale(polyFillColorScale)\n    //                    .fillColorAttr(\"avgContrib\")\n    //                    .defaultFillColor(\"green\")\n\n    // BUILD THE POINTMAP\n    const parent = document.getElementById(\"chart1-example\")\n\n    const pointMapChart = dc.rasterChart(parent, true)\n                          .con(con)\n                          .usePixelRatio(true)\n                          .useLonLat(true)\n                          .height(h)\n                          .width(w)\n                          .mapUpdateInterval(750)\n                          .mapStyle(\"mapbox://styles/mapbox/light-v8\")\n                          .mapboxToken(mapboxToken)\n                          // add the layers to the pointmap\n                          // .pushLayer(\"polytable1\", polyLayer1)\n\n    pointMapChart.init().then(() => {\n      dc.renderAllAsync()\n\n      // const mapmove = false\n      // const debouncedPopup = _.debounce(displayPopupWithData, 250)\n      // pointMapChart.map().on(\"movestart\", function() {\n      //   mapmove = true\n      //   debouncedPopup.cancel()\n      //   pointMapChart.hidePopup()\n      // })\n\n      // pointMapChart.map().on(\"moveend\", function(event) {\n      //   mapmove = false\n      //   debouncedPopup(event)\n      //   pointMapChart.hidePopup()\n      // })\n\n      // pointMapChart.map().on(\"mousemove\", function(event) {\n      //   pointMapChart.hidePopup(true)\n      //   if (!mapmove) {\n      //     debouncedPopup(event)\n      //   }\n      // })\n\n      // function displayPopupWithData (event) {\n      //   if (event.point) {\n      //     pointMapChart.getClosestResult(event.point, function(closestPointResult) {\n      //       pointMapChart.displayPopup(closestPointResult, true)\n      //     })\n      //   }\n      // }\n\n      // RESIZE EVENT\n      // window.addEventListener(\"resize\", _.debounce(reSizeAll, 500))\n\n      // function reSizeAll() {\n      //   const w = document.documentElement.clientWidth - 30\n      //   const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 150\n\n      //   pointMapChart\n      //     .width(w)\n      //     .height(h/1.5)\n\n      //   dc.redrawAllAsync()\n      // }\n    })\n\n  }\n\n})\n"

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
//# sourceMappingURL=multilayermap.bundle.js.map