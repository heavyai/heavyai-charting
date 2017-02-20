import baseMixin from "./base-mixin"
import capMixin from "./cap-mixin"
import colorMixin from "./color-mixin"
import coordinateGridRasterMixin from "./coordinate-grid-raster-mixin"
import d3 from "d3"
import {lastFilteredSize} from "./core-async"
import mapMixin from "./map-mixin"
import rasterMixin from "./raster-mixin"
import scatterMixin from "./scatter-mixin"
import legend from "./legend"
import {utils} from "./utils"

export default function bubbleRasterChart (parent, useMap, chartGroup, _mapboxgl) {
    var _chart = null;

    var _useMap = useMap !== undefined ? useMap : false;

    var parentDivId = parent.attributes.id.value;

    var browser = detectBrowser()
    function detectBrowser () { // from SO: http://bit.ly/1Wd156O
      var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
      var isFirefox = typeof InstallTrigger !== 'undefined';
      var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
      var isIE = /*@cc_on!@*/false || !!document.documentMode;
      var isEdge = !isIE && !!window.StyleMedia;
      var isChrome = !!window.chrome && !!window.chrome.webstore;
      return {isOpera: isOpera, isFirefox: isFirefox, isSafari: isSafari, isIE: isIE, isEdge: isEdge, isChrome: isChrome}
    }

    if (_useMap){
        _chart = rasterMixin(mapMixin(colorMixin(capMixin(baseMixin({}))), parentDivId, _mapboxgl));
    } else {
        _chart = rasterMixin(scatterMixin(capMixin(coordinateGridRasterMixin({}, _mapboxgl, browser)), _mapboxgl), parentDivId, chartGroup);
    }

    var _imageOverlay = null;
    var _x = null;
    var _y = null;
    var _defaultColor = "#22A7F0";
    var _nullColor = "#cacaca" // almost background grey
    var _renderBoundsMap = {};
    var _r = 1; // default radius 5
    var _dynamicR = null;
    var _hasBeenRendered = false;
    var counter = 0;

    var _usePixelRatio = false;
    var _pixelRatio = 1;

    _chart.x = function (x) {
        if (!arguments.length) {
            return _x;
        }
        _x = x;
        return _chart;
    };

    _chart.y = function (_) {
        if (!arguments.length) {
            return _y;
        }
        _y = _;
        return _chart;
    };

    _chart.r = function (_) {
        if (!arguments.length) {
            return _r;
        }
        _r = _;
        return _chart;
    };

    _chart.dynamicR = function(_) {
        if (!arguments.length) {
            return _dynamicR;
        }
        _dynamicR = _;
        return _chart;
    };

    _chart.defaultColor = function(_) {
        if (!arguments.length) {
            return _defaultColor;
        }
        _defaultColor = _;
        return _chart;
    }

    _chart.nullColor = function(_) {
        if (!arguments.length) {
            return _nullColor;
        }
        _nullColor = _;
        return _chart;
    }

    _chart._resetRenderBounds = function() {
        _renderBoundsMap = {};
    }

    _chart.destroyChart = function () {
        this.sampling(false)
        this.xDim().dispose()
        this.yDim().dispose()
        this.map().remove()
        if (this.legend()) {
            this.legend().removeLegend()
        }
    }

    // TODO(croot): pixel ratio should probably be configured on the backend
    // rather than here to deal with scenarios where data is used directly
    // in pixel-space.
    _chart.usePixelRatio = function(usePixelRatio) {
        if (!arguments.length) {
            return _usePixelRatio;
        }

        _usePixelRatio = !!usePixelRatio;
        if (_usePixelRatio) {
            _pixelRatio = window.devicePixelRatio || 1;
        } else {
            _pixelRatio = 1;
        }

        return _chart;
    }

    _chart._getPixelRatio = function() {
        return _pixelRatio;
    }

    _chart.colors("#22A7F0"); // set constant as picton blue as default

    function getXYRange () {
        if (_useMap) return Promise.resolve()
        return Promise.all([
            _chart.getMinMax(_chart.xDim().value()[0]),
            _chart.getMinMax(_chart.yDim().value()[0])
        ]).then(function (values) {
            _chart.filter([values[0], values[1]])
            return [values[0], values[1]]
        })
    }

    function basicColorAccessor (d) {
      return (d || d === 0) ? d.color || d.val || d : null
    }

    function customColorAccessor (d) {
      return _chart.colorDomain().includes('' + d[key0]) ? d["key0"] : "Default"
    }

    function getMinMaxOrTopColors (color) {
        if (utils.isQuantitative(color.type)) {
            return _chart.getMinMax(color.value)
        } else if (utils.isOrdinal(color.type)) {
            return _chart.getTopValues(color.value)
        } else {
            return Promise.resolve()
        }
    }

    function getColorData () {
        if (_chart.colorBy() && !_chart.colorBy().domain) {
            return getMinMaxOrTopColors(_chart.colorBy()).then(function(bounds) {

                var scale = d3.scale.ordinal().domain(bounds).range(["#ea5545", "#bdcf32", "#b33dc6", "#ef9b20", "#87bc45", "#f46a9b", "#ace5c7", "#ede15b", "#836dc5", "#86d87f", "#27aeef"])
                _chart.colors(scale).colorAccessor(customColorAccessor)

                _chart.colorBy(Object.assign({}, _chart.colorBy(), {
                    domain: bounds
                }))

                _chart
                   .legend(legend())
                   .legend()
                   .setKey("key0")


                return bounds
            })
        } else {
            return Promise.resolve()
        }
    }

    function getSizeData () {
        if (_chart.sizeBy() && !_chart.sizeBy().domain) {
            return _chart.getMinMax(_chart.sizeBy().value).then(function(bounds) {
                var DEFAULT_SIZE_RANGE = [3, 10]
                _chart.sizeBy(Object.assign({}, _chart.sizeBy(), {
                    domain: bounds
                }))
                _chart.r(d3.scale.linear().domain(bounds).range(DEFAULT_SIZE_RANGE))
                return bounds
            })
        } else {
            return Promise.resolve()
        }
    }

    function preData () {
      return Promise.all([
          getXYRange(),
          getColorData(),
          getSizeData()
      ]).then(function(values) {
          if (typeof values[0] === "undefined" && typeof values[1] === "undefined" && typeof values[2] === "undefined") {
            return
          }

          _chart._invokePreDataListener({
              range: values[0],
              color: values[1],
              size: values[2]
          })
      })
    }

    _chart.setDataAsync(function(group, callbacks) {

        return preData().then(function () {
            var bounds = _chart.getDataRenderBounds();
            _chart._updateXAndYScales(bounds);

            var sql;
            if (group.type === "dimension") {
                sql = group.writeTopQuery(_chart.cap(), undefined, true);
            } else {
                sql = group.writeTopQuery(_chart.cap(), undefined, false, true);
            }

            _chart._vegaSpec = genVegaSpec(_chart, sql, lastFilteredSize(group.getCrossfilterId()));
            var nonce = _chart.con().renderVega(_chart.__dcFlag__, JSON.stringify(_chart._vegaSpec), {}, callbacks);

            _renderBoundsMap[nonce] = bounds;
        })
    });

    _chart.data(function (group) {

        if (_chart.dataCache !== null) {
            return _chart.dataCache;
        }

        var bounds = _chart.getDataRenderBounds();
        _chart._updateXAndYScales(bounds);

        var sql;
        if (group.type === "dimension") {
            sql = group.writeTopQuery(_chart.cap(), undefined, true);
        } else {
            sql = group.writeTopQuery(_chart.cap(), undefined, false, true);
        }

        _chart._vegaSpec = genVegaSpec(_chart, sql, lastFilteredSize(group.getCrossfilterId()));

        var result = _chart.con().renderVega(_chart.__dcFlag__, JSON.stringify(_chart._vegaSpec), {});

        _renderBoundsMap[result.nonce] = bounds;
        return result;
    });

    _chart._updateXAndYScales = function(renderBounds) {
        // renderBounds should be in this order - top left, top-right, bottom-right, bottom-left
        var useRenderBounds = (renderBounds && renderBounds.length === 4 &&
                               renderBounds[0] instanceof Array && renderBounds[0].length === 2);

        if (_chart.xDim() !== null && _chart.yDim() !== null) {
            if (_x === null) {
                _x = d3.scale.linear();
            }
            var xRange = _chart.xDim().getFilter();
            if (useRenderBounds) {
                if (typeof _chart.useLonLat === "function" && _chart.useLonLat()) {
                    _x.domain([_chart.conv4326To900913X(renderBounds[0][0]), _chart.conv4326To900913X(renderBounds[1][0])]);
                } else {
                    _x.domain([renderBounds[0][0], renderBounds[1][0]])
                }

            } else if (xRange !== null) {
                xRange =  xRange[0]; // First element of range because range filter can theoretically support multiple ranges
                if (typeof _chart.useLonLat === "function" && _chart.useLonLat()) {
                  _x.domain([_chart.conv4326To900913X(xRange[0]), _chart.conv4326To900913X(xRange[1])]);
                } else {
                  _x.domain(xRange);
                }
            } else {
                _x.domain([0.001, 0.999]);
            }

            if (_y === null) {
                _y = d3.scale.linear();
            }
            var yRange = _chart.yDim().getFilter();
            if (useRenderBounds) {
                if (typeof _chart.useLonLat === "function" && _chart.useLonLat()) {
                    _y.domain([_chart.conv4326To900913Y(renderBounds[2][1]), _chart.conv4326To900913Y(renderBounds[0][1])]);
                } else {
                    _y.domain([renderBounds[2][1], renderBounds[0][1]]);
                }
            } else if (yRange !== null) {
                yRange =  yRange[0]; // First element of range because range filter can theoretically support multiple ranges
                if (typeof _chart.useLonLat === "function" && _chart.useLonLat()) {
                  _y.domain([_chart.conv4326To900913Y(yRange[0]), _chart.conv4326To900913Y(yRange[1])]);
                } else {
                  _y.domain(yRange);
                }
            } else {
                _y.domain([0.001,0.999]);
            }
        }
    }

    function removeOverlay(overlay){
        _chart._removeOverlay(overlay);
    }

    _chart._doRender = function(data, redraw, doNotForceData) {
      if (!data && !!!doNotForceData) data = _chart.data();

      if (_chart.isLoaded()) {
          if (Object.keys(data).length) {
              _chart._setOverlay(data.image, _renderBoundsMap[data.nonce], data.nonce, browser, !!redraw);
              _hasBeenRendered = true;
          } else {
              _chart._setOverlay(null, null, null, browser, !!redraw);
          }
      }
    };

    _chart._doRedraw = function() {
        _chart._doRender(null, true);
    }

    return _chart.anchor(parent, chartGroup);
}

function genVegaSpec(chart, sqlstr, lastFilteredSize) {
  var pixelRatio = chart._getPixelRatio();
  var width = (typeof chart.effectiveWidth === 'function' ? chart.effectiveWidth() : chart.width()) * pixelRatio;
  var height = (typeof chart.effectiveHeight === 'function' ? chart.effectiveHeight() : chart.height()) * pixelRatio;
  var vegaSpec = {
    data: [{
        name: "table",
        sql: sqlstr
    }],
    height: Math.round(height),
    marks: [{
      type: "points",
      from: {data: "table"},
      properties: {
        x: {scale: "x", field: "x"},
        y: {scale: "y", field: "y"}
      }
    }],
    scales: [
      {name: "x", type: chart._determineScaleType(chart.x()), domain: chart.x().domain(), range: "width"},
      {name: "y", type: chart._determineScaleType(chart.y()), domain: chart.y().domain(), range: "height"}
    ],
    width: Math.round(width)
  }

  if (chart.tableName()) { vegaSpec.data[0].dbTableName = chart.tableName() }

  if (chart.colors().domain && chart.colors().domain().length && chart.colors().range().length) {
    vegaSpec.scales.push({name: "color", type: chart._determineScaleType(chart.colors()), domain: chart.colors().domain().filter(notNull), range: chart.colors().range(), default: chart.defaultColor(), nullValue: chart.nullColor()})
    vegaSpec.marks[0].properties.fillColor = {scale: "color", field: "color"}
  } else {
    vegaSpec.marks[0].properties.fillColor = {value: chart.colors()() || chart.defaultColor()}
  }

  if (typeof chart.r() === 'function') {
    var rscale = chart.r();
    var scaleRange = rscale.range();
    if (pixelRatio !== 1) {
        scaleRange = scaleRange.map(function(rangeVal) {
            return rangeVal * pixelRatio;
        });
    }
    vegaSpec.scales.push({name: "size", type: chart._determineScaleType(chart.r()), domain: chart.r().domain(), range: scaleRange, clamp: true})
    vegaSpec.marks[0].properties.size = {scale: "size", field: "size"}
  } else if (chart.dynamicR() !== null && chart.sampling() && typeof lastFilteredSize !== "undefined" && lastFilteredSize !== null) { // @TODO don't tie this to sampling - meaning having a dynamicR will also require count to be computed first by dc
    var rangeCap = chart.cap() !== Infinity ? chart.cap() : lastFilteredSize
    var dynamicRange = Math.min(lastFilteredSize, rangeCap) < 1500000 ? chart.dynamicR().range : [1, 1];
    var dynamicRScale = d3.scale.sqrt().domain(chart.dynamicR().domain).range(dynamicRange).clamp(true)
    vegaSpec.marks[0].properties.size = {value: Math.round(dynamicRScale(Math.min(lastFilteredSize, rangeCap)) * pixelRatio)}
  } else {
    var rval = chart.r() * pixelRatio;
    vegaSpec.marks[0].properties.size = {value: rval};
  }

  return vegaSpec
}

function notNull (value) { return value != null /* double-equals also catches undefined */ }
