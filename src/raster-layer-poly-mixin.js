var vegaLineJoinOptions = ["miter", "round", "bevel"];
var polyTableGeomColumns = {
    // NOTE: the verts are interleaved x,y, so verts[0] = vert0.x, verts[1] = vert0.y, verts[2] = vert1.x, verts[3] = vert1.y, etc.
    verts: 'mapd_geo_coords',
    indices: 'mapd_geo_indices',

    // NOTE: the line draw info references the line loops in the verts. This struct looks like the following:
    // {
    //     count,         // number of verts in loop -- might include 3 duplicate verts at end for closure
    //     instanceCount, // should always be 1
    //     firstIndex,    // the index in verts (includes x & y) where the verts for the loop start
    //     baseInstance   // irrelevant for our purposes -- should always be 0
    // }
    linedrawinfo: 'mapd_geo_linedrawinfo',
    polydrawinfo: 'mapd_geo_polydrawinfo'
}

function validateLineJoin(newLineJoin, currLineJoin) {
    if (typeof newLineJoin !== "string") {
        throw new Error("Line join must be a string and must be one of " + vegaLineJoinOptions.join(', '));
    }
    var lowCase = newLineJoin.toLowerCase();
    if (vegaLineJoinOptions.indexOf(lowCase) < 0) {
        throw new Error("Line join must be a string and must be one of " + vegaLineJoinOptions.join(', '));
    }
    return lowCase;
}

function validateMiterLimit(newMiterLimit, currMiterLimit) {
    if (typeof newMiterLimit !== "number") {
        throw new Error("Miter limit must be a number.");
    } else if (newMiterLimit < 0) {
        throw new Error("Miter limit must be >= 0");
    }
}

export default function rasterLayerPolyMixin (_layer) {
    createVegaAttrMixin(_layer, "lineJoin", vegaLineJoinOptions[0], vegaLineJoinOptions[0], false, {
        preDefault: validateLineJoin,
        preNull: validateLineJoin
    });

    createVegaAttrMixin(_layer, "miterLimit", 10, 10, false, {
        preDefault: validateMiterLimit,
        preNull: validateMiterLimit
    });

    var _vega = null;
    var _scaledPopups = {};

    var _renderProps = {
        // NOTE: the x/y scales will be built by the primary chart
        x: {
            genVega: function(chart, layerName, group, pixelRatio, markPropObj, scales) {
                markPropObj.x = {scale: chart._getXScaleName(), field: "x"}; // x is implied when poly-rendering
            },
        },

        y: {
            genVega: function(chart, layerName, group, pixelRatio, markPropObj, scales) {
                markPropObj.y = {scale: chart._getYScaleName(), field: "y"}; // y is implied when poly-rendering
            },
        },

        fillColor: {
            getQueryAttr: function() {
                return _layer.fillColorAttr();
            },

            genVega: function(chart, layerName, group, pixelRatio, markPropObj, scales) {
                var fillColorScale = _layer._buildFillColorScale(chart, layerName);
                var fillColorAttr = this.getQueryAttr();
                if (fillColorScale) {
                    if (!fillColorScale.name) {
                        throw new Error("Error trying to reference a fill color scale for raster layer " + layerName + ". The vega fill color scale does not have a name.");
                    }

                    if (fillColorAttr === null) {
                        throw new Error("Error trying to reference a fill color scale for raster layer " + layerName + ". The layer does not have a fillColorAttr defined.");
                    }

                    markPropObj.fillColor = {
                        scale: fillColorScale.name,
                        field: fillColorAttr
                    };
                    scales.push(fillColorScale);
                } else if (fillColorAttr) {
                    var fillColorAttrType = typeof fillColorAttr;
                    if (fillColorAttrType === 'string') {
                        // indicates that the fillColorAttr directly references a value in the query
                        markPropObj.fillColor = {field: fillColorAttr};
                    } else {
                        throw new Error("Type error for the fillColorAttr property for layer " + layerName + ". The fillColorAttr must be a string (referencing an column in the query).");
                    }
                } else {
                    markPropObj.fillColor = _layer.defaultFillColor();
                }
            }
        },

        strokeColor: {
            getQueryAttr: function() {
                return _layer.strokeColorAttr();
            },

            genVega: function(chart, layerName, group, pixelRatio, markPropObj, scales) {
                var strokeColorScale = _layer._buildStrokeColorScale(chart, layerName);
                var strokeColorAttr = this.getQueryAttr();
                if (strokeColorScale) {
                    if (!strokeColorScale.name) {
                        throw new Error("Error trying to reference a stroke color scale for raster layer " + layerName + ". The vega stroke color scale does not have a name.");
                    }

                    if (strokeColorAttr === null) {
                        throw new Error("Error trying to reference a stroke color scale for raster layer " + layerName + ". The layer does not have a strokeColorAttr defined.");
                    }

                    markPropObj.strokeColor = {
                        scale: strokeColorScale.name,
                        field: strokeColorAttr
                    };
                    scales.push(strokeColorScale);
                } else if (strokeColorAttr) {
                    var strokeColorAttrType = typeof strokeColorAttr;
                    if (strokeColorAttrType === 'string') {
                        // indicates that the strokeColorAttr directly references a value in the query
                        markPropObj.strokeColor = {field: strokeColorAttr};
                    } else {
                        throw new Error("Type error for the strokeColorAttr property for layer " + layerName + ". The strokeColorAttr must be a string (referencing an column in the query).");
                    }
                } else {
                    markPropObj.strokeColor = _layer.defaultStrokeColor();
                }
            }
        },

        strokeWidth: {
            getQueryAttr: function() {
                return _layer.strokeWidthAttr();
            },

            genVega: function(chart, layerName, group, pixelRatio, markPropObj, scales) {
                var strokeWidthScale = _layer._buildStrokeWidthScale(chart, layerName);
                var strokeWidthAttr = this.getQueryAttr();
                if (strokeWidthScale) {
                    if (!strokeWidthScale.name) {
                        throw new Error("Error trying to reference a stroke color scale for raster layer " + layerName + ". The vega stroke color scale does not have a name.");
                    }

                    if (strokeWidthAttr === null) {
                        throw new Error("Error trying to reference a stroke color scale for raster layer " + layerName + ". The layer does not have a strokeWidthAttr defined.");
                    }

                    markPropObj.strokeWidth = {
                        scale: strokeWidthScale.name,
                        field: strokeWidthAttr
                    };
                    scales.push(strokeWidthScale);
                } else if (strokeWidthAttr) {
                    var strokeWidthAttrType = typeof strokeWidthAttr;
                    if (strokeWidthAttrType === 'string') {
                        // indicates that the strokeWidthAttr directly references a value in the query
                        markPropObj.strokeWidth = {field: strokeWidthAttr};
                    } else if (strokeWidthAttrType === 'number') {
                        markPropObj.strokeWidth = strokeWidthAttr;
                    } else {
                        throw new Error("Type error for the strokeWidthAttr property for layer " + layerName + ". The strokeWidthAttr must be a string (referencing an column in the query) or a number.");
                    }
                } else {
                    markPropObj.strokeWidth = _layer.defaultStrokeWidth();
                }
            }
        },

        lineJoin: {
            genVega: function(chart, layerName, group, pixelRatio, markPropObj, scales) {
                markPropObj.lineJoin = _layer.defaultLineJoin();
            }
        },

        miterLimit: {
            genVega: function(chart, layerName, group, pixelRatio, markPropObj, scales) {
                markPropObj.miterLimit = _layer.defaultMiterLimit();
            }
        }
    }

    _layer._requiresCap = function() {
        // polys don't require a cap
        return false;
    }

    _layer._genVega = function(chart, layerName, group, query) {
        var data = {
            name: layerName,
            format: "polys",
            shapeColGroup: "mapd",
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
            type: "polys",
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

    _layer._addRenderAttrsToPopupColumnSet = function(chart, popupColsSet) {
        popupColsSet.add(polyTableGeomColumns.verts); // add the poly geometry to the query
        popupColsSet.add(polyTableGeomColumns.linedrawinfo); // need to get the linedrawinfo beause there can be
                                                        // multiple polys per row, and linedrawinfo will
                                                        // tell us this

        if (_vega && _vega.mark && _vega.mark.properties) {
            for (var rndrProp in _renderProps) {
                // x & y are implied, and are added by the verts and linedrawinfo
                // so don't need to add those here
                if (_renderProps.hasOwnProperty(rndrProp) && rndrProp !== 'x' && rndrProp !== 'y') {
                    _layer._addQueryDrivenRenderPropToSet(popupColsSet, _vega.mark.properties, rndrProp);
                }
            }
        }
    };

    _layer._areResultsValidForPopup = function(results) {
        if (results[polyTableGeomColumns.verts] &&
            results[polyTableGeomColumns.linedrawinfo]) {
            return true;
        }
        return false;
    }

    _layer._displayPopup = function(chart, parentElem, data, width, height, margins, xscale, yscale, minPopupArea, animate) {
        // verts and drawinfo should be valid as the _resultsAreValidForPopup()
        // method should've been called beforehand
        var verts = data[polyTableGeomColumns.verts];
        var drawinfo = data[polyTableGeomColumns.linedrawinfo];

        var polys = []

        // TODO(croot): when the bounds is added as a column to the poly db table, we
        // can just use those bounds rather than build our own
        // But until then, we need to build our own bounds -- we use this to
        // find the reasonable center of the geom and scale from there when
        // necessary

        // bounds: [minX, maxX, minY, maxY]
        var bounds = [Infinity, -Infinity, Infinity, -Infinity];
        var startIdxDiff = (drawinfo.length ? drawinfo[2] : 0);

        for (var i=0; i<drawinfo.length; i+=4) {
            // Draw info struct:
            //     0: count,         // number of verts in loop -- might include 3 duplicate verts at end for closure
            //     1: instanceCount, // should always be 1
            //     2: firstIndex,    // the start index (includes x & y) where the verts for the loop start
            //     3: baseInstance   // irrelevant for our purposes -- should always be 0
            var polypts = [];
            var count = (drawinfo[i] - 3) * 2; // include x&y, and drop 3 duplicated pts at the end
            var startIdx = (drawinfo[i+2] - startIdxDiff) * 2; // include x&y
            var endIdx = startIdx + count; // remove the 3 duplicate pts at the end
            for (var idx = startIdx; idx < endIdx; idx+=2) {
                var screenX = xscale(verts[idx]) + margins.left;
                var screenY = height - yscale(verts[idx+1]) - 1 + margins.top;

                if (screenX >= 0 && screenX <= width &&
                    screenY >= 0 && screenY <= height) {
                    if (bounds[0] === Infinity) {
                        bounds[0] = screenX;
                        bounds[1] = screenX;
                        bounds[2] = screenY;
                        bounds[3] = screenY;
                    } else {
                        if (screenX < bounds[0]) {
                            bounds[0] = screenX;
                        } else if (screenX > bounds[1]) {
                            bounds[1] = screenX;
                        }

                        if (screenY < bounds[2]) {
                            bounds[2] = screenY;
                        } else if (screenY > bounds[3]) {
                            bounds[3] = screenY;
                        }
                    }
                }
                polypts.push(screenX);
                polypts.push(screenY);
            }

            polys.push(polypts);
        }

        if (bounds[0] === Infinity) {
            bounds[0] = 0;
        }
        if (bounds[1] === -Infinity) {
            bounds[1] = width;
        }
        if (bounds[2] === Infinity) {
            bounds[2] = 0;
        }
        if (bounds[3] === -Infinity) {
            bounds[3] = height;
        }

        // NOTE: we could hit the case where the bounds is 0
        // if 1 point is visible in screen
        // Handle that here
        if (bounds[0] === bounds[1]) {
            bounds[0] = 0;
            bounds[1] = width;
        }
        if (bounds[2] === bounds[3]) {
            bounds[2] = 0;
            bounds[3] = height;
        }

        var rndrProps = {};
        var queryRndrProps = new Set([polyTableGeomColumns.verts, polyTableGeomColumns.linedrawinfo]);
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

        var boundsWidth = bounds[1] - bounds[0];
        var boundsHeight = bounds[3] - bounds[2];
        var scale = 1;
        var scaleRatio = minPopupArea / (boundsWidth * boundsHeight);
        var isScaled = (scaleRatio > 1);
        if (isScaled) {
            scale = Math.sqrt(scaleRatio);
        }

        var popupStyle = _layer.popupStyle();
        var fillColor = _layer.getFillColorVal(data[rndrProps.fillColor]);
        var strokeColor = _layer.getStrokeColorVal(data[rndrProps.strokeColor]);
        var strokeWidth;
        if (typeof popupStyle === 'object' && !isScaled) {
            fillColor = popupStyle.fillColor || fillColor;
            strokeColor = popupStyle.strokeColor || strokeColor;
            strokeWidth = popupStyle.strokeWidth;
        }


        var svg = parentElem.append('svg')
                          .attr('width', width)
                          .attr('height', height)

        var xform = svg.append('g')
                       .attr('class', 'map-poly-xform')
                       .attr('transform', 'translate(' + (scale * bounds[0] - (scale - 1) * (bounds[0] + (boundsWidth / 2))) + ', ' + (scale * (bounds[2]+1) - (scale - 1) * (bounds[2] + 1 + (boundsHeight / 2))) + ')')

        var group = xform.append('g')
                         .attr('class', 'map-poly')
                         .attr('transform-origin', (boundsWidth/2), (boundsHeight/2))
                         .style('fill', fillColor)
                         .style('stroke', strokeColor)

        if (typeof strokeWidth === 'number') {
            group.style('stroke-width', strokeWidth);
        }

        if (!!animate) {
            if (isScaled) {
                group.classed('popupPoly', true);
            } else {
                group.classed('fadeInPoly', true);
            }
        }

        polys.forEach(function(pts) {
            if (!pts) {
                return;
            }

            var pointStr = "";
            for (var i=0; i<pts.length; i+=2) {
                pointStr += (scale * (pts[i] - bounds[0])) + " " + (scale * (pts[i+1] - bounds[2])) + ", ";
            }
            pointStr = pointStr.slice(0, pointStr.length-2);

            group.append('polygon')
                 .attr('points', pointStr)
        });

        _scaledPopups[chart] = isScaled;

        return {
            posX: bounds[0] + (boundsWidth / 2),
            posY: bounds[2] + (boundsHeight / 2),
            rndrPropSet: queryRndrProps,
            bounds: bounds
        };
    }

    _layer._hidePopup = function(chart, hideCallback) {
        var mapPoly = chart.select('.map-poly');
        if (mapPoly) {

            if (_scaledPopups[chart]) {
                mapPoly.classed('removePoly', true);
            } else {
                mapPoly.classed('fadeOutPoly', true);
                // mapPoly.attr('transform', 'scale(0, 0)');
            }

            if (hideCallback) {
                mapPoly.on('animationend', function(){
                    hideCallback(chart);
                });
            }

            delete _scaledPopups[chart];
        }
    };

    _layer._destroyLayer = function (chart) {
        deleteCanvas(chart);
    }

    return _layer;
}
