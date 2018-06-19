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
/******/ 	return __webpack_require__(__webpack_require__.s = 595);
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

/***/ 595:
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(37)(__webpack_require__(596))

/***/ }),

/***/ 596:
/***/ (function(module, exports) {

module.exports = "/*\n * This is example code that shows how to make a map widget that backend\n * renders multiple layers.\n */\n\ndocument.addEventListener(\"DOMContentLoaded\", function init() {\n  // A MapdCon instance is used for performing raw queries on a MapD GPU database.\n  new MapdCon()\n    .protocol(\"https\")\n    .host(\"metis.mapd.com\")\n    .port(\"443\")\n    .dbName(\"mapd\")\n    .user(\"mapd\")\n    .password(\"HyperInteractive\")\n    .connect(function(error, con) {\n      con.logging(true)\n      // Tables for the first layer of the pointmap.\n      // This layer will be polygons of zipcodes and\n      // will be colored by data joined from the contributions\n      // table\n      var tableName1 = [\"contributions_donotmodify\", \"zipcodes\"];\n      var table1Joins = [{\n        table1: \"contributions_donotmodify\",\n        attr1: \"contributor_zipcode\",\n        table2: \"zipcodes\",\n        attr2: \"ZCTA5CE10\"\n      }];\n      // Table to use for the 2nd layer, which will be points\n      // from a tweets table.\n      var tableName2 = 'tweets_nov_feb';\n\n      // Table to use for the 3nd layer, which will be points\n      // from the contributions table.\n      var tableName3 = 'contributions_donotmodify';\n\n      // make 3 crossfilters for all 3 layers\n      // A CrossFilter instance is used for generating the raw query strings for your MapdCon.\n\n      // first layer\n      var crossFilter = crossfilter.crossfilter(con, tableName1, table1Joins).then(function(cf1) {\n\n        // second layer\n        var crossFilter = crossfilter.crossfilter(con, tableName2).then(function(cf2) {\n\n          // third layer\n          var crossFilter = crossfilter.crossfilter(con, tableName3).then(function(cf3) {\n              createPointMap(cf1, cf2, cf3, con)\n          });\n        });\n      });\n    });\n\n  // function to create the backend-rendered map.\n  function createPointMap(polycfLayer1, pointcfLayer2, pointcfLayer3, con) {\n    var w = document.documentElement.clientWidth - 30;\n    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 150;\n    var mapboxToken = \"pk.eyJ1IjoibWFwZCIsImEiOiJjaWV1a3NqanYwajVsbmdtMDZzc2pneDVpIn0.cJnk8c2AxdNiRNZWtx5A9g\";\n\n    /*---------------------BASIC COUNT ON CROSSFILTER--------------------------*/\n    /*\n     *  Adding a basic count of the point layers using crossfilter.\n     *  Note that for the count we use crossFilter itself as the dimension.\n     */\n    var countGroup1 = pointcfLayer2.groupAll();\n    var dataCount1 = dc.countWidget(\".data-count1\")\n                       .dimension(pointcfLayer2)\n                       .group(countGroup1);\n\n    var countGroup2 = pointcfLayer3.groupAll();\n    var dataCount2 = dc.countWidget(\".data-count2\")\n      .dimension(pointcfLayer3)\n      .group(countGroup2);\n\n\n    /*----------------BUILD THE LAYERS OF THE POINTMAP-------------------------*/\n\n    /*-----BUILD LAYER #1, POLYGONS OF ZIPCODES COLORED BY AVG CONTRIBUTION----*/\n\n    // get the dimensions used for the first layer, the polygon layer\n    // we need the rowid for polygon rendering, so the dimension will be based on\n    // the rowid of the zipcodes\n    var polyDim1 = polycfLayer1.dimension(\"contributions_donotmodify.amount\");\n\n    // we're going to color based on the average contribution of the zipcode,\n    // so reduce the average from the join\n    // var polyGrp1 = polyDim1.group().reduceAvg(\"contributions_donotmodify.amount\", \"avgContrib\");\n\n    // create the scale to use for the fill color of the polygons.\n    // We're going to use the avg contribution of the zipcode to color the poly.\n    // First, we define a range of colors to use. And then create a quantize scale\n    // to map avg contributions to a color. In this case, quantize equally divides the\n    // domain of the scale into bins to match with the # of colors. We're going to use\n    // a domain of avg contributions of $0-5000. Since we've got 9 colors, the domain\n    // will be split up into 9 equally-sized bins for coloring:\n    // [0, 555], [556, 1100], [1101, 1665], etc.\n    var polyColorRange = [\"#115f9a\",\"#1984c5\",\"#22a7f0\",\"#48b5c4\",\"#76c68f\",\"#a6d75b\",\"#c9e52f\",\"#d0ee11\",\"#d0f400\"]\n    var polyFillColorScale = d3.scale.quantize().domain([0, 5000]).range(polyColorRange)\n\n    // setup the first layer, the zipcode polygons\n    var polyLayer1 = dc.rasterLayer(\"polys\")\n                       .crossfilter(polycfLayer1)\n                       .dimension(polyDim1)\n                       .setState({\n                         data: [\n                           {\n                             table: \"contributions_donotmodify\",\n                             attr: \"contributor_zipcode\"\n                           }, {\n                             table: \"zipcodes\",\n                             attr: \"ZCTA5CE10\"\n                           }\n                         ],\n                         transform: {\n                           limit: 1000000\n                         },\n                         mark: {\n                           type: \"poly\",\n                           strokeColor: \"white\",\n                           strokeWidth: 0,\n                           lineJoin: \"miter\",\n                           miterLimit: 10\n                         },\n                         encoding: {\n                           color: {\n                             type: \"quantitative\",\n                             aggregrate: \"AVG(contributions_donotmodify.amount)\",\n                             domain: [0, 5000],\n                             range: polyColorRange,\n                             legend: {\n                               title: \"contribs[avg(amount)]\"\n                             }\n                           }\n                         }\n                       })\n                       .popupColumns(['color', 'key0'])\n                       .popupColumnsMapped({color: \"avg contribution\", key0: 'zipcode'})\n\n    /*-----------BUILD LAYER #2, POINTS OF TWEETS-------------*/\n    /*-----SIZED BY # OF FOLLOWERS AND COLORED BY LANGUAGE----*/\n\n    // build the dimensions for the 2rd layer, to be rendered as points from a tweets table.\n    // Note that we're converting longitude and latitude to mercator-projected x,y respectively\n    // as the map is a mercator-projected map.\n    // We're also grabbing the language of the tweet as well as the number\n    // of followers the twitter user has to color and size the points\n    var pointMapDim2 = pointcfLayer2.dimension(null).projectOn([\"conv_4326_900913_x(lon) as x\", \"conv_4326_900913_y(lat) as y\", \"lang as color\", \"followers as size\"]);\n\n    // we need separate dimensions for the x and y coordinates for point layers.\n    // A filter is applied to these dimensions under the hood so that we only\n    // render points that are within the view.\n    var xDim2 = pointcfLayer2.dimension(\"lon\");\n    var yDim2 = pointcfLayer2.dimension(\"lat\");\n\n    // setup a d3 scale for the tweet layer to scale the points based on the number of\n    // followers of the user.\n    // # of followers will be mapped to point sizes that are linearly scaled from 2 to 12 pixels\n    // 0 followers = 2 pixels in size, 5000 followers = 12 pixels, and is linearly interpolated\n    // for values in between, so 2500 followers will get a point size of 7.\n    // We'll clamp this scale, so points will go no smaller than 2 and no larger than 12.\n    var sizeScaleLayer2 = d3.scale.linear().domain([0,5000]).range([2,12]).clamp(true);\n\n    // setup a d3 scale to color the points. In this case we're going to color by\n    // the language of the tweets. As language is a string, or category, and not a numeric domain\n    // we need to use an ordinal scale, which is used to map categories to output values.\n    var langDomain = ['en', 'pt', 'es', 'in', 'und', 'ja', 'tr', 'fr', 'tl', 'ru', 'ar']\n    var langColors = [\"#27aeef\", \"#ea5545\", \"#87bc45\", \"#b33dc6\", \"#f46a9b\", \"#ede15b\", \"#bdcf32\", \"#ef9b20\", \"#4db6ac\", \"#edbf33\", \"#7c4dff\"]\n\n    var layer2ColorScale = d3.scale.ordinal().domain(langDomain).range(langColors);\n\n    // setup the second layer, points of the tweets.\n    var pointLayer2 = dc.rasterLayer(\"points\")\n                        .crossfilter(pointcfLayer2)\n                        .xDim(xDim2)              // add the x dimension\n                        .yDim(yDim2)              // add the y dimension\n                        .setState({\n                          transform: {\n                              sample: true,\n                              limit: 500000\n                            },\n                          mark: \"point\",\n                          encoding: {\n                            x: {\n                              type: \"quantitative\",\n                              field: \"conv_4326_900913_x(lon)\"\n                            },\n                            y: {\n                              type: \"quantitative\",\n                              field: \"conv_4326_900913_y(lat)\"\n                            },\n                            size: {\n                              type: \"quantitative\",\n                              field: \"followers\",\n                              domain: [0, 5000],\n                              range: [2, 12]\n                            },\n                            color: {\n                              type: \"ordinal\",\n                              field: \"lang\",\n                              domain: langDomain,\n                              range: langColors,\n                              legend: {\n                                title: \"tweets[lang]\"\n                              }\n                            }\n                          },\n                          config: {\n                            point: {\n                              shape: \"circle\"\n                            }\n                          }\n                        })\n                        .popupColumns(['tweet_text', 'sender_name', 'tweet_time', 'lang', 'origin', 'followers'])\n                                                  // setup the columns to show when a point is properly hit-tested\n                                                  // against\n\n\n    /*---------------BUILD LAYER #3, POINTS OF CONTRIBUTIONS-------------------*/\n    /*--------COLORED BY THE CONTRIBUTION RECIPIENT'S PARTY AFFILIATON---------*/\n    /*--AND WHOSE SIZE IS DYNAMICALLY CONTROLLED BASED ON NUMBER OF PTS DRAWN--*/\n\n    // build the dimensions for the 3nd layer, to be rendered as points from the contributions table\n    // Note that we're converting longitude and latitude to mercator-projected x,y respectively\n    // here as well. We're also going to color by the recepient's\n    // party affiliation, so need to project on that column as well.\n    var pointMapDim3 = pointcfLayer3.dimension(null).projectOn([\"conv_4326_900913_x(lon) as x\", \"conv_4326_900913_y(lat) as y\", \"recipient_party as color\"]);\n\n    // we need separate dimensions for the x and y coordinates for point layers.\n    // A filter is applied to these dimensions under the hood so that we only\n    // render points that are within the view.\n    var xDim3 = pointcfLayer3.dimension(\"lon\");\n    var yDim3 = pointcfLayer3.dimension(\"lat\");\n\n    // we're going to dynamically scale the size of the points here based on how many\n    // points in this layer are visible in the current view.\n    // If there are 20,000 pts in view, the point size will be 1, if there is 1\n    // point, it's size will be 7 pixels. We'll use a non-linear scale, sqrt in this case,\n    // so that sizes will converge to 7.0 faster as the # of pts goes fro 20K to 1.\n    // We'll also clamp so that sizes go no less than 1 and no greater than 7 pixels.\n    var dynamicSizeScale = d3.scale.sqrt().domain([100000,0]).range([1.0,7.0]).clamp(true)\n\n    // setup a categorical, in other words ordinal, scale for the fill color of the\n    // points based on the contribution recipient's party affiliation. Republicans\n    // will be red and democrats will be blue.\n    var layer3ColorScale = d3.scale.ordinal().domain([\"D\", \"R\"]).range([\"blue\", \"red\"]);\n\n    var pointLayer3 = dc.rasterLayer(\"points\")\n                        .crossfilter(pointcfLayer3)\n                        .xDim(xDim3)              // add the x dimension\n                        .yDim(yDim3)              // add the y dimension\n                        .setState({\n                          transform: {\n                              sample: true,\n                              limit: 500000\n                            },\n                          mark: \"point\",\n                          encoding: {\n                            x: {\n                              type: \"quantitative\",\n                              field: \"conv_4326_900913_x(lon)\"\n                            },\n                            y: {\n                              type: \"quantitative\",\n                              field: \"conv_4326_900913_y(lat)\"\n                            },\n                            size: \"auto\",\n                            color: {\n                              type: \"ordinal\",\n                              field: \"recipient_party\",\n                              domain: [\"D\", \"R\"],\n                              range: [\"blue\", \"red\"],\n                              legend: {\n                                title: \"contributions[recipient_party]\"\n                              }\n                            }\n                          },\n                          config: {\n                            point: {\n                              shape: \"circle\"\n                            }\n                          }\n                        })\n                                                  // for point layers\n                                                  // distributed\n                        .popupColumns(['amount', 'recipient_party', 'recipient_name'])\n                                                  // setup columns to show when a point is properly hit-tested\n\n\n\n\n    /*---------------BUILD THE POINTMAP-------------*/\n    // grab the parent div.\n    var parent = document.getElementById(\"chart1-example\");\n\n    var pointMapChart = dc.rasterChart(parent, true) // create a raster chart. true indicates a pointmap\n                          .con(con)             // indicate the connection layer\n                          .usePixelRatio(true)  // tells the widget to use the pixel ratio of the\n                                                // screen for proper sizing of the backend-rendered image\n                          .useLonLat(true)    // all point layers need their x,y coordinates, which\n                                              // are lon,lat converted to mercator.\n                          .height(h)  // set width/height\n                          .width(w)\n                          .mapUpdateInterval(750)\n                          .mapStyle('mapbox://styles/mapbox/light-v8')\n                          .mapboxToken(mapboxToken) // need a mapbox accessToken for loading the tiles\n\n                          // add the layers to the pointmap\n                          .pushLayer('polytable1', polyLayer1)\n                          .pushLayer('pointtable1', pointLayer2)\n                          .pushLayer('pointtable2', pointLayer3)\n\n                          // and setup a buffer radius around the pixels for hit-testing\n                          // This radius helps to properly resolve hit-testing at boundaries\n                          .popupSearchRadius(2)\n\n    pointMapChart.init().then(function() {\n      // now render the pointmap\n      dc.renderAllAsync()\n\n\n      /*---------------SETUP HIT-TESTING-------------*/\n      // hover effect with popup\n      // Use a flag to determine if the map is in motion\n      // or not (pan/zoom/etc)\n      var mapmove = false;\n\n      // debounce the popup - we only want to show the popup when the\n      // cursor is idle for a portion of a second.\n      var debouncedPopup = _.debounce(displayPopupWithData, 250)\n      pointMapChart.map().on('movestart', function() {\n        // map has started moving in some way, so cancel\n        // any debouncing, and hide any current popups.\n        mapmove = true;\n        debouncedPopup.cancel();\n        pointMapChart.hidePopup();\n      });\n\n      pointMapChart.map().on('moveend', function(event) {\n        // map has stopped moving, so start a debounce event.\n        // If the cursor is idle, a popup will show if the\n        // cursor is over a layer element.\n        mapmove = false;\n        debouncedPopup(event);\n        pointMapChart.hidePopup();\n      });\n\n      pointMapChart.map().on('mousemove', function(event) {\n        // mouse has started moving, so hide any existing\n        // popups. 'true' in the following call says to\n        // animate the hiding of the popup\n        pointMapChart.hidePopup(true);\n\n        // start a debound popup event if the map isn't\n        // in motion\n        if (!mapmove) {\n          debouncedPopup(event);\n        }\n      })\n\n      // callback function for when the mouse has been idle for a moment.\n      function displayPopupWithData (event) {\n        if (event.point) {\n          // check the pointmap for hit-testing. If a layer's element is found under\n          // the cursor, then display a popup of the resulting columns\n          pointMapChart.getClosestResult(event.point, function(closestPointResult) {\n            // 'true' indicates to animate the popup when starting to display\n            pointMapChart.displayPopup(closestPointResult, true)\n          });\n        }\n      }\n\n      /*--------------------------RESIZE EVENT------------------------------*/\n      /* Here we listen to any resizes of the main window.  On resize we resize the corresponding widgets and call dc.renderAll() to refresh everything */\n\n      window.addEventListener(\"resize\", _.debounce(reSizeAll, 500));\n\n      function reSizeAll() {\n        var w = document.documentElement.clientWidth - 30;\n        var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 150;\n\n        pointMapChart\n          .width(w)\n          .height(h/1.5);\n\n        dc.redrawAllAsync();\n      }\n    })\n  }\n\n});\n"

/***/ })

/******/ });
//# sourceMappingURL=multilayermap.bundle.js.map