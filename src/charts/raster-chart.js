import coordinateGridRasterMixin from "../mixins/coordinate-grid-raster-mixin"
import mapMixin from "../mixins/map-mixin"
import baseMixin from "../mixins/base-mixin"
import scatterMixin from "../mixins/scatter-mixin"
import {rasterDrawMixin} from "../mixins/raster-draw-mixin"
import {lastFilteredSize} from "../core/core-async"

export default function rasterChart (parent, useMap, chartGroup, _mapboxgl) {
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
        _chart = mapMixin(baseMixin({}), parentDivId, _mapboxgl, true, false);
    } else {
        _chart = scatterMixin(coordinateGridRasterMixin({}, _mapboxgl, browser), _mapboxgl, false);
    }

    // unset predefined mandatory attributes
    _chart._mandatoryAttributes([]);

    var _con = window.hasOwnProperty('con') ? con : null;
    var _imageOverlay = null;
    var _renderBoundsMap = {};
    var _layerNames = {};
    var _layers = [];
    var _hasBeenRendered = false;

    var _x = null;
    var _y = null;
    var _xScaleName = "x";
    var _yScaleName = "y";

    var _usePixelRatio = false;
    var _pixelRatio = 1;

    var _minPopupShapeBoundsArea = 16*16;
    var _popupSearchRadius = 2;
    var _popupDivClassName = "map-popup";
    var _popupDisplayable = true

    _chart.popupDisplayable = function(displayable) {
        _popupDisplayable = Boolean(displayable)
    }

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

    _chart._resetRenderBounds = function() {
        _renderBoundsMap = {};
    }

    _chart._resetLayers = function() {
      _layers = [];
      _layerNames = {};
    }

    _chart.pushLayer = function(layerName, layer) {
      if (_layerNames[layerName]) {
        throw new Error("A layer with name \"" + layerName + "\" already exists.");
      } else if (!layerName.match(/^\w+$/)) {
        throw new Error("A layer name can only have alpha numeric characters (A-Z, a-z, 0-9, or _)")
      }

      _layers.push(layerName);
      _layerNames[layerName] = layer;
      return _chart;
    }

    _chart.popLayer = function() {
      var layerName = _layers.pop();
      var layer = _layerNames[layerName];
      delete _layerNames[layerName];
      return layer;
    }

    _chart.getLayer = function(layerName) {
        return _layerNames[layerName];
    }

    _chart.getLayerAt = function(idx) {
      var layerName = _layers[idx];
      return _layerNames[layerName];
    }

    _chart.getLayers = function() {
      return _layers.map(function(layerName) {
        return _layerNames[layerName];
      });
    }

    _chart.getLayerNames = function() {
        return _layers;
    }

    _chart.destroyChart = function () {
        for (let layerName in _layerNames) {
            const layer = _layerNames[layerName]
            layer.destroyLayer(_chart);
        }

        this.map().remove()
        if (this.legend()) {
            this.legend().removeLegend()
        }
    }

    _chart.con = function(_) {
        if(!arguments.length){ return _con; }
        _con = _;
        return _chart;
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

    _chart.setSample = function() {
        _layers.forEach(function(layerName) {
            var layer = _layerNames[layerName];
            if (layer && typeof layer.setSample === 'function') {
                layer.setSample();
            }
        });
    }

    _chart.setDataAsync(function(group, callbacks) {
        var bounds = _chart.getDataRenderBounds();
        _chart._updateXAndYScales(bounds);

        _chart._vegaSpec = genLayeredVega(_chart);

        var nonce = _chart.con().renderVega(_chart.__dcFlag__, JSON.stringify(_chart._vegaSpec), {}, callbacks);

        _renderBoundsMap[nonce] = bounds;
    });

    _chart.data(function (group) {

        if (_chart.dataCache !== null) {
            return _chart.dataCache;
        }

        var bounds = _chart.getDataRenderBounds();
        _chart._updateXAndYScales(bounds);

        _chart._vegaSpec = genLayeredVega(_chart, group, lastFilteredSize(group.getCrossfilterId()));

        var result = _chart.con().renderVega(_chart.__dcFlag__, JSON.stringify(_chart._vegaSpec));

        _renderBoundsMap[result.nonce] = bounds;
        return result;
    });

    _chart._getXScaleName = function() {
        return _xScaleName;
    };

    _chart._getYScaleName = function() {
        return _yScaleName;
    };

    _chart._updateXAndYScales = function(renderBounds) {
        // renderBounds should be in this order - top left, top-right, bottom-right, bottom-left
        var useRenderBounds = (renderBounds && renderBounds.length === 4 &&
                               renderBounds[0] instanceof Array && renderBounds[0].length === 2);

        if (_x === null) {
            _x = d3.scale.linear();
        }

        if (_y === null) {
            _y = d3.scale.linear();
        }

        if (useRenderBounds) {
            if (typeof _chart.useLonLat === "function" && _chart.useLonLat()) {
                _x.domain([_chart.conv4326To900913X(renderBounds[0][0]), _chart.conv4326To900913X(renderBounds[1][0])]);
                _y.domain([_chart.conv4326To900913Y(renderBounds[2][1]), _chart.conv4326To900913Y(renderBounds[0][1])]);
            } else {
                _x.domain([renderBounds[0][0], renderBounds[1][0]])
                _y.domain([renderBounds[2][1], renderBounds[0][1]]);
            }
        } else {
            var layers = getLayers();
            var xRanges = [];
            var yRanges = [];

            for (layer in layers) {
                var xDim = layer.xDim(), yDim = layer.yDim();
                if (xDim) {
                    var range = xDim.getFilter();
                    if (range !== null) {
                        xRanges.push(range);
                    }
                }
                if (yDim) {
                    var range = yDim.getFilter();
                    if (range !== null) {
                        yRanges.push(range);
                    }
                }
            }

            if (xRanges.length) {
                var xRange = xRanges.reduce(function(prevVal, currVal) {
                        return [Math.min(prevVal[0], currVal[0]), Math.max(prevVal[1], currVal[1])];
                    }, [Number.MAX_VALUE, -Number.MAX_VALUE]);

                if (typeof _chart.useLonLat === "function" && _chart.useLonLat()) {
                    _x.domain([_chart.conv4326To900913X(xRange[0]), _chart.conv4326To900913X(xRange[1])]);
                } else {
                    _x.domain(xRange);
                }
            } else {
                _x.domain([0.001, 0.999]);
            }

            if (yRanges.length) {
                var yRange = yRanges.reduce(function(prevVal, currVal) {
                        return [Math.min(prevVal[0], currVal[0]), Math.max(prevVal[1], currVal[1])];
                    }, [Number.MAX_VALUE, -Number.MAX_VALUE]);

                if (typeof _chart.useLonLat === "function" && _chart.useLonLat()) {
                    _y.domain([_chart.conv4326To900913X(yRange[0]), _chart.conv4326To900913X(yRange[1])]);
                } else {
                    _y.domain(yRange);
                }
            } else {
                _y.domain([0.001, 0.999]);
            }
        }
    }

    _chart._determineScaleType = function(scale) {
        var scaleType = null;
        if (scale.rangeBand !== undefined){ return "ordinal"; }
        if (scale.exponent !== undefined){ return "power"; }
        if (scale.base !== undefined){ return "log"; }
        if (scale.quantiles !== undefined){ return "quantiles"; }
        if (scale.interpolate !== undefined){ return "linear"; }
        return "quantize";
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

    _chart.minPopupShapeBoundsArea = function(minPopupShapeBoundsArea) {
        if (!arguments.length){ return _minPopupShapeBoundsArea; }
        _minPopupShapeBoundsArea = minPopupShapeBoundsArea;
        return _chart;
    }

    _chart.popupSearchRadius = function (popupSearchRadius) {
        if (!arguments.length){ return _popupSearchRadius; }
        _popupSearchRadius = popupSearchRadius;
        return _chart;
    };

    _chart.getClosestResult = function getClosestResult(point, callback) {
        var height = (typeof _chart.effectiveHeight === 'function' ? _chart.effectiveHeight() : _chart.height());
        var pixelRatio = _chart._getPixelRatio() || 1;
        var pixel = new TPixel({x: Math.round(point.x * pixelRatio), y: Math.round((height - point.y) * pixelRatio)})

        if (!point) {
            return;
        }

        var cnt = 0;
        var layerObj = {};
        _layers.forEach(function(layerName) {
            var layer = _layerNames[layerName];
            if (layer.getPopupAndRenderColumns && layer.hasPopupColumns && layer.hasPopupColumns()) {
                layerObj[layerName] = layer.getPopupAndRenderColumns(_chart);
                ++cnt;
            }
        });

        // TODO best to fail, skip cb, or call cb wo args?
        if (!cnt ) {
            return;
        }

        return _chart.con().getResultRowForPixel(_chart.__dcFlag__, pixel, layerObj, [function(results){
            return callback(results[0])
        }], Math.ceil(_popupSearchRadius * pixelRatio))
    };

    _chart.displayPopup = function displayPopup (result, animate) {
        if(!_popupDisplayable || !result || !result.row_set || !result.row_set.length){ return }
        if (_chart.select('.' + _popupDivClassName).empty()) { // only one popup at a time
            var layer = _layerNames[result.vega_table_name];
            if (layer && layer.areResultsValidForPopup(result.row_set)) {
                var mapPopup = _chart.root().append('div').attr('class', _popupDivClassName);
                layer.displayPopup(_chart, mapPopup, result, _minPopupShapeBoundsArea, animate);
            }
        }
    };

    _chart.hidePopup = function hidePopup(animate) {
      var popupElem = _chart.select('.' + _popupDivClassName);
      if (!popupElem.empty()) {
        for (var i=0; i<_layers.length; ++i) {
            var layerName = _layers[i];
            var layer = _layerNames[layerName];
            if (layer && layer.isPopupDisplayed(_chart)) {
                // TODO(croot): can this be improved? I presume only
                // one popup can be shown at a time
                if (!!animate) {
                    layer.hidePopup(_chart, function() {
                        _chart.select('.' + _popupDivClassName).remove();
                    });
                } else {
                    _chart.select('.' + _popupDivClassName).remove();
                }
                break;
            }
        }
      }
    }

    return _chart.anchor(parent, chartGroup);
}

function valuesOb (obj) { return Object.keys(obj).map(function (key) { return obj[key]; }) }

function genLayeredVega(chart) {
    var pixelRatio = chart._getPixelRatio();
    var width = (typeof chart.effectiveWidth === 'function' ? chart.effectiveWidth() : chart.width()) * pixelRatio;
    var height = (typeof chart.effectiveHeight === 'function' ? chart.effectiveHeight() : chart.height()) * pixelRatio;

    var xdom = chart.x().domain();
    var ydom = chart.y().domain();

    var data = [];

    var scales = [
        {name: chart._getXScaleName(), type: chart._determineScaleType(chart.x()), domain: chart.x().domain(), range: "width"},
        {name: chart._getYScaleName(), type: chart._determineScaleType(chart.y()), domain: chart.y().domain(), range: "height"}
    ];
    var marks = [];

    chart.getLayerNames().forEach(function (layerName) {
        var layerVega = chart.getLayer(layerName).genVega(chart, layerName);

        data.push(layerVega.data);
        scales = scales.concat(layerVega.scales);
        marks.push(layerVega.mark);
    });

    var vegaSpec = {
        width: Math.round(width),
        height: Math.round(height),
        data: data,
        scales: scales,
        marks: marks
    }

    return vegaSpec
}
