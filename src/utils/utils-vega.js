export function notNull (value) { return value != null /* double-equals also catches undefined */ }

export function createVegaAttrMixin(layerObj, attrName, defaultVal, nullVal, useScale, prePostFuncs) {
    var scaleFunc = "", fieldAttrFunc = "";
    var capAttrName = attrName.charAt(0).toUpperCase() + attrName.slice(1);
    var defaultFunc = "default" + capAttrName;
    var nullFunc = "null" + capAttrName;
    layerObj[defaultFunc] = createRasterLayerGetterSetter(layerObj, defaultVal, (prePostFuncs ? prePostFuncs.preDefault : null), (prePostFuncs ? prePostFuncs.postDefault : null));
    layerObj[nullFunc] = createRasterLayerGetterSetter(layerObj, nullVal, (prePostFuncs ? prePostFuncs.preNull : null), (prePostFuncs ? prePostFuncs.postNull : null));

    if (useScale) {
        scaleFunc = attrName + "Scale";
        fieldAttrFunc = attrName + "Attr";
        layerObj[scaleFunc] = createRasterLayerGetterSetter(layerObj, null, (prePostFuncs ? prePostFuncs.preScale : null), (prePostFuncs ? prePostFuncs.postScale : null));
        layerObj[fieldAttrFunc] = createRasterLayerGetterSetter(layerObj, null, (prePostFuncs ? prePostFuncs.preField : null), (prePostFuncs ? prePostFuncs.postField : null));

        layerObj["_build" + capAttrName + "Scale"] = function(chart, layerName) {
            var scale = layerObj[scaleFunc]();
            if (scale && scale.domain && scale.domain().length && scale.range().length) {
                var colorScaleName = layerName + "_" + attrName;
                var rtnObj = {
                    name: colorScaleName,
                    type: chart._determineScaleType(scale),
                    domain: scale.domain().filter(notNull),
                    range: scale.range(),
                    default: layerObj[defaultFunc](),
                    nullValue: layerObj[nullFunc]()
                };

                if (scale.clamp) {
                    rtnObj.clamp = scale.clamp();
                }

                return rtnObj;
            }
        };
    }

    var getValFunc = "get" + capAttrName + "Val";
    layerObj[getValFunc] = function(input) {
        var rtnVal = layerObj[defaultFunc]();
        if (input === null) {
            rtnVal = layerObj[nullFunc]();
        } else if (input !== undefined && useScale) {
            var scaleObj = layerObj[scaleFunc]();
            if (scaleObj && scaleObj.domain && scaleObj.domain().length && scaleObj.range().length) {
                rtnVal = scaleObj(input);
            }
        }

        return rtnVal;
    }
}

export function createRasterLayerGetterSetter (layerObj, attrVal, preSetFunc, postSetFunc) {
    return function(newVal) {
        if (!arguments.length) {
            return attrVal;
        }
        if (preSetFunc) {
            var rtnVal = preSetFunc(newVal, attrVal);
            if (rtnVal !== undefined) {
                newVal = rtnVal;
            }
        }
        attrVal = newVal;
        if (postSetFunc) {
            var rtnVal = postSetFunc(attrVal);
            if (rtnVal !== undefined) {
                attrVal = rtnVal;
            }
        }
        return layerObj;
    }
}
