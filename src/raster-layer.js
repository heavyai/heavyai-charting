import capMixin from "./cap-mixin"
import rasterLayerPointMixin from "./raster-layer-point-mixin"
import rasterLayerPolyMixin from "./raster-layer-poly-mixin"
import {createVegaAttrMixin, createRasterLayerGetterSetter, notNull} from "./utils-vega"

var validLayerTypes = ["points", "polys"];

export default function rasterLayer (layerType) {
    var _layerType = layerType;

    var _dimension = null;
    var _group = null;
    var _groupName = null;
    var _mandatoryAttributes = ['dimension', 'group'];

    var _layer = capMixin({
        setDataAsync: function(callback) {
          // noop.
          // This is to appease mixins that require an object initialized with a baseMixin
        },

        data: function(callback) {
          // noop.
          // This is to appease mixins that require an object initialized with a baseMixin
        },

        filter: function() {
          // noop.
          // This is to appease mixins that require an object initialized with a baseMixin
        },

        _mandatoryAttributes: function (mandatoryAttributes) {
            // needed for layer mixins to control mandatory checks.

            if (!arguments.length) {
                return _mandatoryAttributes;
            }
            _mandatoryAttributes = mandatoryAttributes;
            return _layer;
        }
    });

    _layer.othersGrouper(false); // TODO(croot): what does othersGrouper in capMixin do exactly?
                                 // Always set to false for now, tho user can override.

    if (layerType == "points") {
        _layer = rasterLayerPointMixin(_layer);
    } else if (layerType == "polys") {
        _layer = rasterLayerPolyMixin(_layer);
    } else {
        throw new Error("\"" + layerType + "\" is not a valid layer type. The valid layer types are: " + validLayerTypes.join(", "));
    }


    var _opacity = 1;

    // NOTE: builds _layer.defaultFillColor(), _layer.nullFillColor(),
    //              _layer.fillColorScale(), & _layer.fillColorAttr()
    createVegaAttrMixin(_layer, "fillColor", "#22A7F0", "#CACACA", true);

    // NOTE: builds _layer.defaultStrokeColor(), _layer.nullStrokeColor(),
    //              _layer.strokeColorScale(), & _layer.strokeColorAttr()
    createVegaAttrMixin(_layer, "strokeColor", "white", "white", true);

    // NOTE: builds _layer.defaultStrokeWidth(), _layer.nullStrokeWidth(),
    //              _layer.strokeWidthScale(), & _layer.strokeWidthAttr()
    createVegaAttrMixin(_layer, "strokeWidth", 0, 0, true);

    _layer.popupColumns = createRasterLayerGetterSetter(_layer, []);
    _layer.popupColumnsMapped = createRasterLayerGetterSetter(_layer, {});
    _layer.popupFunction = createRasterLayerGetterSetter(_layer, null);
    _layer.popupStyle = createRasterLayerGetterSetter(_layer, {});

    var _popup_wrap_class = 'map-popup-wrap-new';
    var _popup_box_class = 'map-popup-box-new';
    var _popup_box_item_class = 'map-popup-item';
    var _popup_item_key_class = "popup-item-key";
    var _popup_item_val_class = "popup-item-val";
    var _layerPopups = {};

    /**
     * **mandatory**
     *
     * Set or get the dimension attribute of a chart. In `dc`, a dimension can be any valid [crossfilter
     * dimension](https://github.com/square/crossfilter/wiki/API-Reference#wiki-dimension).
     *
     * If a value is given, then it will be used as the new dimension. If no value is specified then
     * the current dimension will be returned.
     * @name dimension
     * @memberof dc.baseMixin
     * @instance
     * @see {@link https://github.com/square/crossfilter/wiki/API-Reference#dimension crossfilter.dimension}
     * @example
     * var index = crossfilter([]);
     * var dimension = index.dimension(dc.pluck('key'));
     * chart.dimension(dimension);
     * @param {crossfilter.dimension} [dimension]
     * @return {crossfilter.dimension}
     * @return {dc.baseMixin}
     */
    _layer.dimension = function (dimension) {
        if (!arguments.length) {
            return _dimension;
        }
        _dimension = dimension;
        return _layer;
    };

    /**
     * **mandatory**
     *
     * Set or get the group attribute of a chart. In `dc` a group is a
     * {@link https://github.com/square/crossfilter/wiki/API-Reference#group-map-reduce crossfilter group}.
     * Usually the group should be created from the particular dimension associated with the same chart. If a value is
     * given, then it will be used as the new group.
     *
     * If no value specified then the current group will be returned.
     * If `name` is specified then it will be used to generate legend label.
     * @name group
     * @memberof dc.baseMixin
     * @instance
     * @see {@link https://github.com/square/crossfilter/wiki/API-Reference#group-map-reduce crossfilter.group}
     * @example
     * var index = crossfilter([]);
     * var dimension = index.dimension(dc.pluck('key'));
     * chart.dimension(dimension);
     * chart.group(dimension.group(crossfilter.reduceSum()));
     * @param {crossfilter.group} [group]
     * @param {String} [name]
     * @return {crossfilter.group}
     * @return {dc.baseMixin}
     */
    _layer.group = function (group, name) {
        if (!arguments.length) {
            return _group;
        }
        _group = group;
        _layer._groupName = name;
        return _layer;
    };

    _layer.opacity = function(opacity) {
        if (!arguments.length) {
          return _opacity;
        }
        _opacity = opacity;
        return _layer;
    };

    function checkForMandatoryLayerAttr (layer, a, layerName) {
        if (!layer[a] || !layer[a]()) {
            throw new Error('Mandatory attribute chart.' + a + ' is missing on raster layer ' + layerName);
        }
    }

    _layer.genVega = function(chart, layerName) {
        _mandatoryAttributes.forEach(function (attrName) {
            checkForMandatoryLayerAttr(_layer, attrName, layerName);
        });

        var cap = _layer.cap();
        if (_layer._requiresCap && _layer._requiresCap() && cap === Infinity) {
            throw new Error('A cap for the layer ' + layerName + ' is undefined but a cap is required. Cannot create a query.');
        }

        var group = _layer.group();
        var query = "";
        if (group.type === "dimension") {
            // it's actually a dimension
            query = group.writeTopQuery(cap, undefined, true);
        } else if (group.type === "group") {
            // we're dealing with a group
            query = group.writeTopQuery(cap, undefined, false, true);
        }

        if (!query.length) {
            throw new Error("Crossfilter group/dimension did not provide a sql query string for layer " + layerName + "." + (groupType.length ? " Group type: " + (group.type || "unknown") + "." : ""));
        }

        // TODO(croot): handle an opacity per layer?
        var vega = _layer._genVega(chart, layerName, group, query);
        return vega;
    }

    _layer.hasPopupColumns = function() {
        var popCols = _layer.popupColumns();
        return !!(popCols && popCols instanceof Array && popCols.length > 0);
    };

    function addPopupColumnToSet(colAttr, popupColSet) {
        // TODO(croot): getProjectOn for groups requires the two arguments,
        // dimension.getProjectOn() doesn't have any args.
        // Need to come up with a better API for group.getProjectOn()
        // and improve the api so that "as key0" are not automatically
        // added to those projection statements.

        // TODO(croot): performance could be improved here with a better
        // data structure, but probably not an issue given the amount
        // of popup col attrs to iterate through is small
        var dim = _layer.group() || _layer.dimension();
        if (dim) {
            var projExprs = dim.getProjectOn(true); // handles the group and dimension case
            var regex = /^\s*(\S+)\s+as\s+(\S+)/i
            var funcRegex = /^\s*(\S+\s*\(.*\))\s+as\s+(\S+)/i
            for (var i=0; i<projExprs.length; ++i) {
                var projExpr = projExprs[i];
                var regexRtn = projExpr.match(regex);
                if (regexRtn) {
                    if (regexRtn[2] === colAttr) {
                        popupColSet.delete(colAttr);
                        colAttr = projExpr;
                        break;
                    }
                } else if ((regexRtn = projExpr.match(funcRegex)) && regexRtn[2] === colAttr) {
                    popupColSet.delete(colAttr);
                    colAttr = projExpr;
                    break;
                } else if (projExpr.replace(/^\s+|\s+$/g, '') === colAttr) {
                    break;
                }
            }
        }

        return popupColSet.add(colAttr);
    }

    _layer.getPopupAndRenderColumns = function(chart) {
        var popupColsSet = new Set();
        var popupCols = _layer.popupColumns();
        if (popupCols) {
            popupCols.forEach(function(colAttr) {
                addPopupColumnToSet(colAttr, popupColsSet);
            });
        }
        _layer._addRenderAttrsToPopupColumnSet(chart, popupColsSet);

        var rtnArray = [];
        popupColsSet.forEach(function(colName) {
            rtnArray.push(colName);
        });
        return rtnArray;
    };

    function mapDataViaColumns (data, popupColumns) {
      var newData = {}
      var columnSet = new Set(popupColumns);
      for (var key in data) {
        if (!columnSet.has(key)) {
            continue;
        }
        newData[key] = data[key]
      }
      return newData
    }

    _layer.areResultsValidForPopup = function(results) {
        if (!results) {
            return false
        }
        return _layer._areResultsValidForPopup(results[0]);
    }

    function renderPopupHTML(data, columnOrder, columnMap) {
        var html = '';
        columnOrder.forEach(function(key) {
            if (!data[key]) {
                return;
            }
            html += '<div class="' + _popup_box_item_class + '"><span class="' + _popup_item_key_class + '">' + (columnMap && columnMap[key] ? columnMap[key] : key) + ':</span><span class="' + _popup_item_val_class + '"> ' + data[key] +'</span></div>'
        });
        return html;
    }

    _layer.displayPopup = function(chart, parentElem, result, minPopupArea, animate) {
        var data = result.row_set[0];
        var popupColumns = _layer.popupColumns();
        var mappedColumns = _layer.popupColumnsMapped();
        var filteredData = mapDataViaColumns(data, popupColumns, mappedColumns);

        var width = (typeof chart.effectiveWidth === 'function' ? chart.effectiveWidth() : chart.width());
        var height = (typeof chart.effectiveHeight === 'function' ? chart.effectiveHeight() : chart.height());
        var margins = (typeof chart.margins === 'function' ? chart.margins() : {left: 0, right: 0, top: 0, bottom: 0});

        var xscale = chart.x();
        var yscale = chart.y();

        var origXRange = xscale.range();
        var origYRange = yscale.range();

        xscale.range([0, width]);
        yscale.range([0, height]);

        var popupData = _layer._displayPopup(chart, parentElem, data, width, height, margins, xscale, yscale, minPopupArea, animate);

        // restore the original ranges so we don't screw anything else up
        xscale.range(origXRange);
        yscale.range(origYRange);

        var rndrProps = popupData.rndrPropSet;
        var bounds = popupData.bounds;

        var boundsWidth = bounds[1] - bounds[0];
        var boundsHeight = bounds[3] - bounds[2];
        var posX = bounds[0] + boundsWidth / 2;
        var posY = bounds[2] + boundsHeight / 2;

        var parentBounds = [0, width, 0, height];

        var overlapBounds = [
            Math.max(bounds[0], parentBounds[0]),
            Math.min(bounds[1], parentBounds[1]),
            Math.max(bounds[2], parentBounds[2]),
            Math.min(bounds[3], parentBounds[3])
        ];

        if (overlapBounds[1] <= overlapBounds[0] ||
            overlapBounds[3] <= overlapBounds[2]) {
            // there is no overlap with the two bounds, we should
            // never get here
            throw new Error("Found a non-overlapping bounds for a pop-up shape and its parent div");
        }

        var overlapBoundsWidth = overlapBounds[1] - overlapBounds[0];
        var overlapBoundsHeight = overlapBounds[3] - overlapBounds[2];
        var overlapCenterX = overlapBounds[0] + overlapBoundsWidth / 2;
        var overlapCenterY = overlapBounds[2] + overlapBoundsHeight / 2;

        var padding = 6; // in pixels TODO(croot): expose in css?
        var bottom = false;
        var topOffset = 0;

        var popupDiv = parentElem.append('div')
                                 .attr('class', _popup_wrap_class)
                                 .style({left: posX + 'px', top: posY + 'px'})

        var popupBox = popupDiv.append('div')
            .attr('class', _popup_box_class)
            .html(_layer.popupFunction() ? _layer.popupFunction(filteredData, popupColumns, mappedColumns) : renderPopupHTML(filteredData, popupColumns, mappedColumns))
            .style('left', function(){
                var rect = d3.select(this).node().getBoundingClientRect();
                var boxWidth = rect.width;
                var halfBoxWidth = boxWidth / 2;
                var boxHeight = rect.height;
                var halfBoxHeight = boxHeight / 2;

                // check top first
                var left = 0;
                var hDiff = 0, wDiff = 0;

                if (overlapBoundsWidth >= boxWidth || (posX + halfBoxWidth < width && posX - halfBoxWidth >= 0)) {
                    left = posX - overlapCenterX;
                    hDiff = overlapBounds[2] - boxHeight;

                    if (hDiff >= 0) {
                        // can fit on top of shape and in the center of the shape horizontally
                        topOffset = -(posY - overlapBounds[2] + Math.min(padding, hDiff) + halfBoxHeight);
                        return left + 'px';
                    }

                    hDiff = overlapBounds[3] + boxHeight;
                    if (hDiff < height) {
                        // can fit on bottom and in the center of the shape horizontally
                        topOffset = overlapBounds[3] - posY + Math.min(padding, hDiff) + halfBoxHeight;
                        return left + 'px';
                    }
                }

                if (overlapBoundsHeight >= boxHeight || (posY + halfBoxHeight < height && posY - halfBoxHeight >= 0)) {
                    topOffset = overlapCenterY - posY;

                    wDiff = overlapBounds[0] - boxWidth;
                    if (wDiff >= 0) {
                        // can fit on the left in the center of the shape vertically
                        left = -(posX - overlapBounds[0] + Math.min(padding, wDiff) + halfBoxWidth);
                        return left + 'px';
                    }

                    wDiff = overlapBounds[1] + boxWidth;
                    if (wDiff < width) {
                        // can fit on right in the center of the shape vertically
                        left = overlapBounds[1] - posX + Math.min(padding, wDiff) + halfBoxWidth;
                        return left + 'px';
                    }
                }

                if (width - overlapBoundsWidth >= boxWidth && height - overlapBoundsHeight >= boxHeight) {
                    // we can fit the popup box in the remaining negative space.
                    // Let's figure out where exactly
                    if (Math.abs(boxHeight - overlapBoundsHeight) < Math.abs(boxWidth - overlapBoundsWidth)) {
                        hDiff = height - overlapBoundsHeight - boxHeight;
                        if (overlapBounds[2] < height - overlapBounds[3]) {
                            topOffset = Math.min(padding, hDiff) + halfBoxHeight - posY;
                        } else {
                            topOffset = height - Math.min(padding, hDiff) - halfBoxHeight - posY;
                        }

                        wDiff = overlapBounds[0] - boxWidth;
                        if (wDiff >= 0) {
                            // can fit on the left of the bounds
                            left = -(posX - overlapBounds[0] + Math.min(padding, wDiff) + halfBoxWidth);
                        } else {
                            wDiff = overlapBounds[1] + boxWidth;
                            // can fit on right right of the bounds
                            left = overlapBounds[1] - posX + Math.min(padding, wDiff) + halfBoxWidth;
                        }
                        return left + 'px';
                    } else {
                        wDiff = width - overlapBoundsWidth - boxWidth;
                        if (overlapBounds[0] < width - overlapBounds[1]) {
                            left = Math.min(padding, wDiff) + halfBoxWidth - posX;
                        } else {
                            left = width - Math.min(padding, wDiff) - halfBoxWidth - posX;
                        }

                        hDiff = overlapBounds[2] - boxHeight;
                        if (hDiff >= 0) {
                            // can fit on top of shape and in the center of the shape horizontally
                            topOffset = -(posY - overlapBounds[2] + Math.min(padding, hDiff) + halfBoxHeight);
                        } else {
                            hDiff = overlapBounds[3] + boxHeight;
                            // can fit on bottom and in the center of the shape horizontally
                            topOffset = overlapBounds[3] - posY + Math.min(padding, hDiff) + halfBoxHeight;
                        }
                        return left + 'px';
                    }
                }

                if (boxWidth * boxHeight < overlapBoundsWidth * overlapBoundsHeight) {
                    // use the center of the overlapping bounds in the case where the box
                    // can't fit anwhere on the outside
                    topOffset = overlapCenterY - posY;
                    left = overlapCenterX - posX;
                } else {
                    // use the center of the screen
                    topOffset = height / 2 - posY;
                    left = width / 2 - posX;
                }
                return left + 'px';
            })
            .style('top', function() {
                return topOffset + 'px';
            })

        _layerPopups[chart] = popupBox;

        if (!!animate) {
            popupDiv.classed('showPopup', true);
        }
    }

    _layer.isPopupDisplayed = function(chart) {
        return (_layerPopups[chart] !== undefined);
    }

    _layer.hidePopup = function(chart, hideCallback) {
        if (_layerPopups[chart]) {
            var popup = chart.select('.' + _popup_wrap_class);
            if (popup) {
                popup.classed('removePopup', true)
                        .on('animationend', function(){
                            delete _layerPopups[chart];
                            hideCallback(chart);
                        });
            }

            _layer._hidePopup(chart);
        }
    }

    _layer.destroyLayer = function (chart) {
        // need to define a "_destroyLayer" method for each
        // layer mixin
        _layer._destroyLayer(chart);
    };

    _layer._addQueryDrivenRenderPropToSet = function(setObj, markPropObj, prop) {
        if (typeof markPropObj[prop] !== 'object') {
            return;
        }

        if (typeof markPropObj[prop].field !== 'string') {
            return;
        }

        var queryAttr = markPropObj[prop].field;
        addPopupColumnToSet(queryAttr, setObj);
        return setObj;
    }

    return _layer;
}
