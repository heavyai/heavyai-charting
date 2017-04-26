export function notNull (value) { return value != null /* double-equals also catches undefined */ }

export function createVegaAttrMixin (layerObj, attrName, defaultVal, nullVal, useScale, prePostFuncs) {
  let scaleFunc = "", fieldAttrFunc = ""
  const capAttrName = attrName.charAt(0).toUpperCase() + attrName.slice(1)
  const defaultFunc = "default" + capAttrName
  const nullFunc = "null" + capAttrName
  layerObj[defaultFunc] = createRasterLayerGetterSetter(layerObj, defaultVal, (prePostFuncs ? prePostFuncs.preDefault : null), (prePostFuncs ? prePostFuncs.postDefault : null))
  layerObj[nullFunc] = createRasterLayerGetterSetter(layerObj, nullVal, (prePostFuncs ? prePostFuncs.preNull : null), (prePostFuncs ? prePostFuncs.postNull : null))

  if (useScale) {
    scaleFunc = attrName + "Scale"
    fieldAttrFunc = attrName + "Attr"
    layerObj[scaleFunc] = createRasterLayerGetterSetter(layerObj, null, (prePostFuncs ? prePostFuncs.preScale : null), (prePostFuncs ? prePostFuncs.postScale : null))
    layerObj[fieldAttrFunc] = createRasterLayerGetterSetter(layerObj, null, (prePostFuncs ? prePostFuncs.preField : null), (prePostFuncs ? prePostFuncs.postField : null))

    layerObj["_build" + capAttrName + "Scale"] = function (chart, layerName) {
      const scale = layerObj[scaleFunc]()
      if (scale && scale.domain && scale.domain().length && scale.range().length) {
        const colorScaleName = layerName + "_" + attrName
        const rtnObj = {
          name: colorScaleName,
          type: chart._determineScaleType(scale),
          domain: scale.domain().filter(notNull),
          range: scale.range(),
          default: layerObj[defaultFunc](),
          nullValue: layerObj[nullFunc]()
        }

        if (scale.clamp) {
          rtnObj.clamp = scale.clamp()
        }

        return rtnObj
      }
    }
  }

  const getValFunc = "get" + capAttrName + "Val"
  layerObj[getValFunc] = function (input) {
    let rtnVal = layerObj[defaultFunc]()
    if (input === null) {
      rtnVal = layerObj[nullFunc]()
    } else if (input !== undefined && useScale) {
      const scaleObj = layerObj[scaleFunc]()
      if (scaleObj && scaleObj.domain && scaleObj.domain().length && scaleObj.range().length) {
        rtnVal = scaleObj(input)
      }
    }

    return rtnVal
  }
}

export function createRasterLayerGetterSetter (layerObj, attrVal, preSetFunc, postSetFunc) {
  return function (newVal) {
    if (!arguments.length) {
      return attrVal
    }
    if (preSetFunc) {
      var rtnVal = preSetFunc(newVal, attrVal)
      if (rtnVal !== undefined) {
        newVal = rtnVal
      }
    }
    attrVal = newVal
    if (postSetFunc) {
      var rtnVal = postSetFunc(attrVal)
      if (rtnVal !== undefined) {
        attrVal = rtnVal
      }
    }
    return layerObj
  }
}
