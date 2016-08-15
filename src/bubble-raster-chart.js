/******************************************************************************
 * EXTEND: dc.bubbleRasterChart                                               *
 * ***************************************************************************/

dc.bubbleRasterChart = function(parent, useMap, chartGroup, _mapboxgl) {
    var _chart = null;

    var _useMap = useMap !== undefined ? useMap : false;

    var parentDivId = parent.attributes.id.value;

    if (_useMap){
        _chart = dc.rasterMixin(dc.mapMixin(dc.colorMixin(dc.capMixin(dc.baseMixin({}))), parentDivId, _mapboxgl));
    } else {
        _chart = dc.rasterMixin(dc.colorMixin(dc.capMixin(dc.baseMixin({}))));
    }

    var _imageOverlay = null;
    var _activeLayer = null;
    var _x = null;
    var _y = null;
    var _defaultColor = "#22A7F0";
    var _renderBoundsMap = {};
    var _r = 1; // default radius 5
    var _dynamicR = null;
    var _hasBeenRendered = false;
    var counter = 0;

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

    _chart.resetLayer = function() {
        console.log("reset layer");
        _renderBoundsMap = {};
        _activeLayer = null;
    }

    _chart.destroyChart = function () {
        this.xDim().dispose()
        this.yDim().dispose()
        this.map().remove()
        if (this.legend()) {
            this.legend().removeLegend()
        }
    }

    _chart.colors("#22A7F0"); // set constant as picton blue as default

    _chart.setDataAsync(function(group, callbacks) {
        updateXAndYScales();

        var bounds = _chart.map().getBounds();
        var renderBounds = [valuesOb(bounds.getNorthWest()),
          valuesOb(bounds.getNorthEast()),
          valuesOb(bounds.getSouthEast()),
          valuesOb(bounds.getSouthWest())]

        _chart._vegaSpec = genVegaSpec(_chart, dc._lastFilteredSize);

        var nonce = null;
        if (_chart.cap() === Infinity) {
          nonce = group.allAsync(callbacks);
        }
        else {
          nonce = group.top(_chart.cap(),undefined, JSON.stringify(_chart._vegaSpec), callbacks);
        }
        _renderBoundsMap[nonce] = renderBounds;
    });

    _chart.data(function (group) {

        if (_chart.dataCache !== null) {
            return _chart.dataCache;
        }
        var bounds = _chart.map().getBounds();
        var renderBounds = [valuesOb(bounds.getNorthWest()),
          valuesOb(bounds.getNorthEast()),
          valuesOb(bounds.getSouthEast()),
          valuesOb(bounds.getSouthWest())]
        updateXAndYScales();

        _chart._vegaSpec = genVegaSpec(_chart, dc._lastFilteredSize);

        var result = null;
        if (_chart.cap() === Infinity) {
            result = group.all(JSON.stringify(_chart._vegaSpec));
        }
        else {
            result = group.top(_chart.cap(), undefined, JSON.stringify(_chart._vegaSpec));
        }
        _renderBoundsMap[result.nonce] = renderBounds;
        return result;
    });

    function updateXAndYScales () {
        if (_chart.xDim() !== null && _chart.yDim() !== null) {
            if (_x === null) {
                _x = d3.scale.linear();
                _x.domain([0.001,0.999]);
            }
            var xRange = _chart.xDim().getFilter();
            if (xRange !== null) {
                xRange =  xRange[0]; // First element of range because range filter can theoretically support multiple ranges
                if (_chart.useLonLat())
                  _x.domain([_chart.conv4326To900913X(xRange[0]), _chart.conv4326To900913X(xRange[1])]);
                else
                  _x.domain(xRange);
            }
            if (_y === null) {
                _y = d3.scale.linear();
                _y.domain([0.001,0.999]);
            }
            var yRange = _chart.yDim().getFilter();
            if (yRange !== null) {
                yRange =  yRange[0]; // First element of range because range filter can theoretically support multiple ranges
                if (_chart.useLonLat())
                  _y.domain([_chart.conv4326To900913Y(yRange[0]), _chart.conv4326To900913Y(yRange[1])]);
                else
                  _y.domain(yRange);
            }
        }
    }

    function removeOverlay(overlay){
      var map = _chart.map();

      map.removeLayer(overlay);
      map.removeSource(overlay);
    }

    function b64toBlob(b64Data, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 512;

        var byteCharacters = atob(b64Data);
        var byteArrays = [];

        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            var slice = byteCharacters.slice(offset, offset + sliceSize);

            var byteNumbers = new Array(slice.length);
            for (var i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            var byteArray = new Uint8Array(byteNumbers);

            byteArrays.push(byteArray);
        }

        var blob = new Blob(byteArrays, {type: contentType});
        return blob;
    }

    function setOverlay(data, nonce){
        var map = _chart.map();
        var bounds = _renderBoundsMap[nonce];
        if (bounds === undefined) { return; }

        if(browser.isSafari || browser.isIE || browser.isEdge){
            var blob = b64toBlob(data, 'image/png');
            var blobUrl = URL.createObjectURL(blob);
        } else {
            var blobUrl = 'data:image/png;base64,' + data;
        }

        if (!_activeLayer) {
            _activeLayer = "_points";
            var toBeAddedOverlay = "overlay" + _activeLayer;
            map.addSource(toBeAddedOverlay,{
                id: toBeAddedOverlay,
                type: "image",
                url: blobUrl,
                coordinates: bounds
            });
            map.addLayer({
                id: toBeAddedOverlay,
                source: toBeAddedOverlay,
                type: "raster",
                paint: {"raster-opacity": 0.85}
            });
        } else {
            var overlayName = "overlay" + _activeLayer;
            var imageSrc = map.getSource(overlayName);
            imageSrc.updateImage({
                url: blobUrl,
                coordinates: bounds
            });
        }
    }

    _chart._doRender = function() {
      var data = _chart.data();
      if (Object.keys(data).length && _chart.map()._loaded) {
          setOverlay(data.image, data.nonce);
          _hasBeenRendered = true;
      }
    };

    _chart._doRedraw = _chart._doRender;

    return _chart.anchor(parent, chartGroup);
}

function valuesOb (obj) { return Object.keys(obj).map(function (key) { return obj[key]; }) }

function genVegaSpec(chart, lastFilteredSize) {
  var vegaSpec = {
    data: [{
        name: "table",
        sql: "select x, y from tweets;" // placeholder, the actual sql will be put in that slot w the vega-first interface -cRoot 8/2/16
    }],
    height: Math.round(chart.height()),
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
    width: Math.round(chart.width())
  }

  if (chart.tableName()) { vegaSpec.data[0].dbTableName = chart.tableName() }

  if (chart.colors().domain) {
    vegaSpec.scales.push({name: "color", type: chart._determineScaleType(chart.colors()), domain: chart.colors().domain(), range: chart.colors().range(), default: chart.defaultColor()})
    vegaSpec.marks[0].properties.fillColor = {scale: "color", field: "color"}
  } else {
    vegaSpec.marks[0].properties.fillColor = {value: chart.colors()()}
  }

  if (typeof chart.r() === 'function') {
    vegaSpec.scales.push({name: "size", type: chart._determineScaleType(chart.r()), domain: chart.r().domain(), range: chart.r().range(), clamp: true})
    vegaSpec.marks[0].properties.size = {scale: "size", field: "size"}
  } else if (chart.dynamicR() !== null && chart.sampling() && lastFilteredSize !== null) { // @TODO don't tie this to sampling - meaning having a dynamicR will also require count to be computed first by dc
    var rangeCap = chart.cap() !== Infinity ? chart.cap() : lastFilteredSize
    vegaSpec.marks[0].properties.size = {value: Math.round(chart.dynamicR()(Math.min(lastFilteredSize, rangeCap)))}
  } else {
    vegaSpec.marks[0].properties.size = {value: chart.r()}
  }

  return vegaSpec
}

/******************************************************************************
 * EXTEND END: dc.bubbleRasterChart                                           *
 * ***************************************************************************/
