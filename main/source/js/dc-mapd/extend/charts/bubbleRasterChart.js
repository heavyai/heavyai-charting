/******************************************************************************
 * EXTEND: dc.bubbleRasterChart                                               *
 * ***************************************************************************/


dc.bubbleRasterChart = function(parent, useMap, chartId, chartGroup) {
    var _chart = null;

    var _useMap = useMap !== undefined ? useMap : false;

    if (_useMap){
        _chart = dc.rasterMixin(dc.mapMixin(dc.colorMixin(dc.capMixin(dc.baseMixin({}))), chartId));
    }
    else{
        _chart = dc.rasterMixin(dc.colorMixin(dc.capMixin(dc.baseMixin({}))));
    }

    var _imageOverlay = null;

    var _activeLayer = 0;
    var _x = null;
    var _y = null;
    //var _oldRenderBounds = null;
    var _renderBoundsMap = {};
    var _r = 1; // default radius 5
    var _dynamicR = null;
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

    _chart.setDataAsync(function(group, callbacks) {
        updateXAndYScales();

        var bounds = _chart._map.getBounds();
        var renderBounds = [_.values(bounds.getNorthWest()),
          _.values(bounds.getNorthEast()),
          _.values(bounds.getSouthEast()),
          _.values(bounds.getSouthWest())]

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
        var bounds = _chart._map.getBounds();
        var renderBounds = [_.values(bounds.getNorthWest()),
          _.values(bounds.getNorthEast()),
          _.values(bounds.getSouthEast()),
          _.values(bounds.getSouthWest())]
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
                _chart._vegaSpec.scales.push({name: "color", type: colorScaleType, domain: colors.domain(), range: colors.range(), default: "#22A7F0"})
            }
            else
                colorIsConstant = true;
        }

        //_chart._vegaSpec.scales.push({name: "color", type: "ordinal", domain: [1,2,3], range: ["red", "blue", "green"]})
        _chart._vegaSpec.marks = [];
        var markObj = {};
        markObj.type = "points";
        markObj.from = {data: "table"};
        markObj.properties = {};
        //markObj.properties.x = {scale: "x", field: _chart.xDim().value()[0]};
        markObj.properties.x = {scale: "x", field: "x"};
        //markObj.properties.y = {scale: "y", field: _chart.yDim().value()[0]};
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
      var map = _chart._map;

      map.removeLayer(overlay);
      map.removeSource(overlay);
    }

    function addOverlay(data, nonce){
        var map = _chart._map;
        //console.log("out nonce: " + nonce);
        //debugger;
        var bounds = _renderBoundsMap[nonce];
        if (bounds === undefined)
           return;
        //delete _renderBoundsMap[nonce];
        var toBeRemovedOverlay = "overlay" + _activeLayer
        _activeLayer = nonce;

        var toBeAddedOverlay = "overlay" + _activeLayer
        if (toBeRemovedOverlay === toBeAddedOverlay)
            return;
        
        map.addSource(toBeAddedOverlay,{
            "id": toBeAddedOverlay,
            "type": "image",
            "url": 'data:image/png;base64,' + data,
            "coordinates": bounds 
        })
        //delete _renderBoundsMap[nonce];
        map.addLayer({
            "id": toBeAddedOverlay,
            "source": toBeAddedOverlay,
            "type": "raster",
            "paint": {"raster-opacity": 0.85}
        })
        setTimeout(function(){
          if(map.getSource(toBeRemovedOverlay)){
              removeOverlay(toBeRemovedOverlay);
          }
          //if(map.getSource(toBeRemovedOverlay)){

          //    map.batch(function (batch) {
          //        batch.setPaintProperty(toBeRemovedOverlay, 'raster-opacity', 0);
          //        batch.setPaintProperty(toBeAddedOverlay, 'raster-opacity', 0.85);
          //      });
          //    removeOverlay(toBeRemovedOverlay);
          //}
          //else {
          //    map.batch(function (batch) {
          //        batch.setPaintProperty(toBeAddedOverlay, 'raster-opacity', 0.85);
          //    });
          //}
        }, 40)

    }

    _chart.resizeImage = function (minCoord, maxCoord) {
        var xFilter = _chart.xDim().getFilter()[0];
        var yFilter = _chart.yDim().getFilter()[0];
        var oldMinCoord = [xFilter[0], yFilter[0]];
        var oldMaxCoord = [xFilter[1], yFilter[1]];
        var xZoom = (oldMaxCoord[0] - oldMinCoord[0]) / (maxCoord[0] - minCoord[0])
        var yZoom = (oldMaxCoord[1] - oldMinCoord[1]) / (maxCoord[1] - minCoord[1])
        $(".raster-overlay").css("transform", "scale(" + xZoom + "," + yZoom + ")");

    }

    _chart._doRender = function() {

      var data = _chart.data();
      addOverlay(data.image, data.nonce)

    }

    _chart._doRedraw = function() {
  
      var data = _chart.data();
      addOverlay(data.image, data.nonce)
    }

    return _chart.anchor(parent, chartGroup);
}

/******************************************************************************
 * EXTEND END: dc.bubbleRasterChart                                           *
 * ***************************************************************************/
