dc.rasterLayerPointMixin = function(_layer) {
    _layer.xDim = createRasterLayerGetterSetter(_layer, null);
    _layer.yDim = createRasterLayerGetterSetter(_layer, null);

    // NOTE: builds _layer.defaultSize(), _layer.nullSize(),
    //              _layer.sizeScale(), & _layer.sizeAttr()
    createVegaAttrMixin(_layer, "size", 3, 1, true);

    _layer.dynamicSize = createRasterLayerGetterSetter(_layer, null);

    _layer.sampling = createRasterLayerGetterSetter(_layer, false,
                          function(doSampling, isCurrSampling) {
                              if (doSampling && !isCurrSampling) {
                                  dc._sampledCount++;
                              } else if (!doSampling && isCurrSampling) {
                                  dc._sampledCount--;
                              }
                              return !!doSampling;
                          },
                          function(isCurrSampling) {
                              if (!isCurrSampling) {
                                _layer.dimension().samplingRatio(null);
                              }
                          });

    _layer.xAttr = createRasterLayerGetterSetter(_layer, null);
    _layer.yAttr = createRasterLayerGetterSetter(_layer, null);

    var _point_wrap_class = 'map-point-wrap';
    var _point_class = 'map-point-new';
    var _point_gfx_class = 'map-point-gfx';

    var _vega = null;
    var _scaledPopups = {};

    _layer._mandatoryAttributes(_layer._mandatoryAttributes().concat(["xAttr", "yAttr"]));

    var _renderProps = {
        // NOTE: the x/y scales will be built by the primary chart
        x: {
            getQueryAttr: function() {
                return _layer.xAttr();
            },

            genVega: function(chart, layerName, group, pixelRatio, markPropObj, scales) {
                markPropObj.x = {scale: chart._getXScaleName(), field: this.getQueryAttr()};
            },
        },

        y: {
            getQueryAttr: function() {
                return _layer.yAttr();
            },


            genVega: function(chart, layerName, group, pixelRatio, markPropObj, scales) {
                markPropObj.y = {scale: chart._getYScaleName(), field: this.getQueryAttr()};
            },
        },
        size: {
            getQueryAttr: function() {
                return _layer.sizeAttr();
            },

            genVega: function(chart, layerName, group, pixelRatio, markPropObj, scales) {
                var sizeScale = _layer.sizeScale();
                var sizeAttr = this.getQueryAttr();
                if (typeof sizeScale === 'function') {
                    if (sizeAttr === null) {
                        throw new Error("Error trying to reference a size scale for raster layer " + layerName + ". The layer does not have sizeAttr defined. Please call the sizeAttr() setter to set a size attribute in the dimension for the layer");
                    }

                    var sizeScaleName = layerName + "_size";
                    var scaleRange = sizeScale.range();
                    if (pixelRatio !== 1) {
                        scaleRange = scaleRange.map(function(rangeVal) {
                            return rangeVal * pixelRatio;
                        });
                    }

                    scales.push({
                        name: sizeScaleName,
                        type: chart._determineScaleType(sizeScale),
                        domain: sizeScale.domain(),
                        range: scaleRange,
                        clamp: true
                    });

                    // TODO(croot): do additional dynamic sizing here?
                    markPropObj.size = {scale: sizeScaleName, field: sizeAttr};
                } else if (sizeAttr) {
                    // TODO(croot): do dynamic additional dynamic sizing?
                    var sizeAttrType = typeof sizeAttr;
                    if (sizeAttrType === 'string') {
                        // indicates that the sizeAttr directly references a value in the query
                        markPropObj.size = {field: sizeAttr};
                    } else if (sizeAttrType === 'number') {
                        markPropObj.size = sizeAttr;
                    } else {
                        throw new Error("Type error for the sizeAttr property for layer " + layerName + ". The sizeAttr must be a string (referencing an column in the query) or a number.");
                    }
                } else if (_layer.dynamicSize() !== null && _layer.sampling() && dc.lastFilteredSize(group.getCrossfilterId()) !== undefined) {
                    // @TODO don't tie this to sampling - meaning having a dynamicSize will also require count to be computed first by dc
                    var cap = _layer.cap();
                    markPropObj.size = Math.round(_layer.dynamicSize()(Math.min(dc.lastFilteredSize(group.getCrossfilterId()), cap)) * pixelRatio);
                } else {
                    markPropObj.size = _layer.defaultSize() * pixelRatio;
                }
            }
        },

        fillColor: {
            getQueryAttr: function() {
                return _layer.fillColorAttr();
            },

            genVega: function(chart, layerName, group, pixelRatio, markPropObj, scales) {
                var colorScale = _layer._buildFillColorScale(chart, layerName);
                var colorAttr = this.getQueryAttr();
                if (colorScale) {
                    if (!colorScale.name) {
                        throw new Error("Error trying to reference a fill color scale for raster layer " + layerName + ". The vega color scale does not have a name.");
                    }

                    if (colorAttr === null) {
                        throw new Error("Error trying to reference a fill color scale for raster layer " + layerName + ". The layer does not have a fillColorAttr defined.");
                    }

                    markPropObj.fillColor = {
                        scale: colorScale.name,
                        field: colorAttr
                    };
                    scales.push(colorScale);
                } else if (colorAttr) {
                    var colorAttrType = typeof colorAttr;
                    if (colorAttrType === 'string') {
                        // indicates that the colorAttr directly references a value in the query
                        markPropObj.fillColor = {field: colorAttr};
                    } else {
                        throw new Error("Type error for the fillColorAttr property for layer " + layerName + ". The fillColorAttr must be a string (referencing an column in the query).");
                    }
                } else {
                    markPropObj.fillColor = _layer.defaultFillColor();
                }
            }
        }
    }

    // points require a cap
    _layer._requiresCap = function() {
        return true;
    }

    _layer.setSample = function() {
        if (_layer.sampling() && _layer.dimension()) {
            var id = _layer.dimension().getCrossfilterId();
            var filterSize = dc.lastFilteredSize(id);
            if (filterSize == undefined)
                _layer.dimension().samplingRatio(null);
            else {
                _layer.dimension().samplingRatio(Math.min(_layer.cap()/filterSize, 1.0))
            }
        }
    }

    _layer._genVega = function(chart, layerName, group, query) {
        var data = {
            name: layerName,
            sql: query
        };

        var scales = [];
        var pixelRatio = chart._getPixelRatio();
        var props = {};

        for (var rndrProp in _renderProps) {
            if (_renderProps.hasOwnProperty(rndrProp)) {
                _renderProps[rndrProp].genVega(chart, layerName, group, pixelRatio, props, scales);
            }
        }

        var mark = {
            type: "points",
            from: {data: layerName},
            properties: props
        };

        _vega = {
            data: data,
            scales: scales,
            mark: mark
        };

        return _vega;
    };

    _layer._addRenderAttrsToPopupColumnSet = function(chart, popupColumnsSet) {
        if (_vega && _vega.mark && _vega.mark.properties) {
            for (var rndrProp in _renderProps) {
                if (_renderProps.hasOwnProperty(rndrProp)) {
                    _layer._addQueryDrivenRenderPropToSet(popupColumnsSet, _vega.mark.properties, rndrProp);
                }
            }
        }
    };

    _layer._areResultsValidForPopup = function(results) {
        // NOTE: it is implied that the _renderProps.[x/y].getQueryAttr()
        // will be the field attr in the vega
        if (results[_renderProps.x.getQueryAttr()] === undefined ||
            results[_renderProps.y.getQueryAttr()] === undefined) {
            return false;
        }
        return true;
    }

    _layer._displayPopup = function(chart, parentElem, data, width, height, margins, xscale, yscale, minPopupArea, animate) {
        var rndrProps = {};
        var queryRndrProps = new Set();
        if (_vega && _vega.mark && _vega.mark.properties) {
            var propObj = _vega.mark.properties;
            for (var rndrProp in _renderProps) {
                if (_renderProps.hasOwnProperty(rndrProp) &&
                    typeof propObj[rndrProp] === "object" &&
                    propObj[rndrProp].field &&
                    typeof propObj[rndrProp].field === "string") {
                    rndrProps[rndrProp] = propObj[rndrProp].field;
                    queryRndrProps.add(propObj[rndrProp].field);
                }
            }
        }

        var xPixel = xscale(data[rndrProps.x]) + margins.left;
        var yPixel = (height - yscale(data[rndrProps.y])) + margins.top;

        var dotSize = _layer.getSizeVal(data[rndrProps.size]);
        var scale = 1;
        var scaleRatio = minPopupArea / (dotSize * dotSize);
        var isScaled = (scaleRatio > 1);
        if (isScaled) {
            scale = Math.sqrt(scaleRatio);
            dotSize *= scale;
        }

        var popupStyle = _layer.popupStyle();
        var bgColor = _layer.getFillColorVal(data[rndrProps.fillColor]);
        var strokeColor, strokeWidth;
        if (typeof popupStyle === 'object' && !isScaled) {
            bgColor = popupStyle.fillColor || bgColor;
            strokeColor = popupStyle.strokeColor;
            strokeWidth = popupStyle.strokeWidth;
        }

        var wrapDiv = parentElem.append('div')
                                .attr('class', _point_wrap_class)

        var pointDiv = wrapDiv.append('div')
                              .attr('class', _point_class)
                              .style({left: xPixel + 'px', top: yPixel + 'px'})

        if (!!animate) {
            if (isScaled) {
                pointDiv.classed('popupPoint', true);
            } else {
                pointDiv.classed('fadeInPoint', true);
            }
        }

        _scaledPopups[chart] = isScaled;

        var gfxDiv = pointDiv.append('div')
                             .attr('class', _point_gfx_class)
                             .style('background', bgColor)
                             .style('width', dotSize + 'px')
                             .style('height', dotSize + 'px')

        if (strokeColor) {
            gfxDiv.style('border-color', strokeColor);
        }

        if (typeof strokeWidth === 'number') {
            gfxDiv.style('border-width', strokeWidth);
        }

        return {
            rndrPropSet: queryRndrProps,
            bounds: [xPixel - dotSize/2, xPixel + dotSize/2, yPixel - dotSize/2, yPixel + dotSize/2]
        };
    };

    _layer._hidePopup = function(chart, hideCallback) {
        var mapPoint = chart.select('.' + _point_class);
        if (mapPoint) {
            if (_scaledPopups[chart]) {
                mapPoint.classed('removePoint', true);
            } else {
                mapPoint.classed('fadeOutPoint', true);
            }

            if (hideCallback) {
                mapPoint.on('animationend', function(){
                    hideCallback(chart);
                });
            }

            delete _scaledPopups[chart];
        }
    };

    _layer._destroyLayer = function (chart) {
        _layer.sampling(false)
        var xDim = _layer.xDim();
        if (xDim) {
          xDim.dispose();
        }

        var yDim = _layer.yDim();
        if (yDim) {
          yDim.dispose();
        }
    };

    return _layer;
}

