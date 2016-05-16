/******************************************************************************
 * EXTEND: dc.bubbleRasterChart                                               *
 * ***************************************************************************/

dc.bubbleRasterChart = function(parent, useMap, chartGroup, _mapboxgl) {
    var _chart = null;

    var _useMap = useMap !== undefined ? useMap : false;

    var parentDivId = parent.attributes.id.value;

    if (_useMap){
        _chart = dc.rasterMixin(dc.mapMixin(dc.colorMixin(dc.capMixin(dc.baseMixin({}))), parentDivId, _mapboxgl));
    }
    else{
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
    _chart.colors("#22A7F0"); // set constant as picton blue as default
     /**
     #### .x([scale])
     Gets or sets the x scale. The x scale can be any d3
     [quantitive scale](https://github.com/mbostock/d3/wiki/Quantitative-Scales)
     **/
    _chart.x = function (x) {
        if (!arguments.length) {
            return _x;
        }
        _x = x;
        return _chart;
    };

    /**
    #### .y([yScale])
    Get or set the y scale. The y scale is typically automatically determined by the chart implementation.

    **/
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

    _chart.setDataAsync(function(group, callbacks) {
        updateXAndYScales();

        var bounds = _chart.map().getBounds();
        var renderBounds = [valuesOb(bounds.getNorthWest()),
          valuesOb(bounds.getNorthEast()),
          valuesOb(bounds.getSouthEast()),
          valuesOb(bounds.getSouthWest())]

        _chart._resetVegaSpec();
        genVegaSpec();

        var nonce = null;
        if (_chart.cap() === Infinity) {
          nonce = group.allAsync(callbacks);
        }
        else {
          nonce = group.topAsync(_chart.cap(),undefined, JSON.stringify(_chart._vegaSpec), callbacks);
        }
        //console.log("in nonce: " + nonce);
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
        _chart._resetVegaSpec();
        genVegaSpec();

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


    function genVegaSpec() {

        // scales
        _chart._vegaSpec.scales = [];
        if (_x === null || _y === null || _r === null)
            return;
            //throw ("Bubble raster chart missing mandatory scale");

        var xScaleType = _chart._determineScaleType(_x);
        _chart._vegaSpec.scales.push({name: "x", type: xScaleType, domain: _x.domain(), range: "width"})

        var yScaleType = _chart._determineScaleType(_y);
        _chart._vegaSpec.scales.push({name: "y", type: yScaleType, domain: _y.domain(),range: "height"})
        var rIsConstant = false;
        if (typeof _r === 'function') {
            var rScaleType = _chart._determineScaleType(_r);
            _chart._vegaSpec.scales.push({name: "size", type: rScaleType, domain: _r.domain(), range: _r.range(), clamp: true});
        }
        else {
            rIsConstant = true;

        }
        var colorIsConstant = false;

        var colors = _chart.colors();
        if (colors !== null) {
            if (colors.domain !== undefined) {
                var colorScaleType = _chart._determineScaleType(colors);
                _chart._vegaSpec.scales.push({name: "color", type: colorScaleType, domain: colors.domain(), range: colors.range(), default: _defaultColor})
            }
            else
                colorIsConstant = true;
        }

        _chart._vegaSpec.marks = [];
        var markObj = {};
        markObj.type = "points";
        markObj.from = {data: "table"};
        markObj.properties = {};
        markObj.properties.x = {scale: "x", field: "x"};
        markObj.properties.y = {scale: "y", field: "y"};
        if (colorIsConstant)
            markObj.properties.fillColor = {value: _chart.colors()()};
        else
            markObj.properties.fillColor = {scale: "color", field: "color"};

        if (rIsConstant) {
            var r = _r;
            if (_dynamicR !== null && _chart.sampling() && dc._lastFilteredSize !== null) {
                //@todo don't tie this to sampling - meaning having a dynamicR will
                //also require count to be computed first by dc
                r = Math.round(_dynamicR(Math.min(dc._lastFilteredSize, _chart.cap() !== Infinity ? _chart.cap() : dc._lastFilteredSize )))
            }

            markObj.properties.size = {value: r};
        }
        else
            markObj.properties.size = {scale: "size", field: "size"};

        _chart._vegaSpec.marks.push(markObj);
    }

    function updateXAndYScales () {
        if (_chart.xDim() !== null && _chart.yDim() !== null) {
            if (_x === null) {
                _x = d3.scale.linear();
                _x.domain([0.001,0.999]);
            }
            var xRange = _chart.xDim().getFilter();
            if (xRange !== null)
                _x.domain(xRange[0]); // First element of range because range filter can theoretically support multiple ranges
            if (_y === null) {
                _y = d3.scale.linear();
                _y.domain([0.001,0.999]);
            }
            var yRange = _chart.yDim().getFilter();
            if (yRange !== null)
                _y.domain(yRange[0]); // First element of range because range filter can theoretically support multiple ranges

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

    _chart._doRedraw = function() {
      if (!_hasBeenRendered)
          return _chart._doRender();
      var data = _chart.data();
      setOverlay(data.image, data.nonce);
    };

    return _chart.anchor(parent, chartGroup);
}

function valuesOb (obj) { return Object.keys(obj).map(function (key) { return obj[key]; }) }

/******************************************************************************
 * EXTEND END: dc.bubbleRasterChart                                           *
 * ***************************************************************************/
