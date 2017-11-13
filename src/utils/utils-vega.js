import d3 from "d3"

export function notNull (value) { return value != null /* double-equals also catches undefined */ }

export function adjustOpacity (color, opacity = 1) {
  if (!(/#/).test(color)) {
    return color
  }
  const hex = color.replace("#", "")
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

export function adjustRGBAOpacity (rgba, opacity) {
  let [r, g, b, a] = rgba.split("(")[1].split(")")[0].split(",")
  if (a) {
    const relativeOpacity = (parseFloat(a) - (1 - opacity))
    a = `${relativeOpacity > 0 ? relativeOpacity : 0.01}`
  } else {
    a = opacity
  }
  return `rgba(${r},${g},${b},${a})`
}

const ordScale = d3.scale.ordinal()
const quantScale = d3.scale.quantize()

const capAttrMap = {
  FillColor: "color",
  Size: "size"
}

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
      if (scale && scale.domain && scale.domain().length && scale.range().length && scaleFunc === "fillColorScale") {
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
      } else if (layerObj.densityAccumulatorEnabled()) {
        const
          colorScaleName = layerName + "_" + attrName,
          colorsToUse = layerObj.defaultFillColor(),
          domainInterval = 100 / (colorsToUse.length - 1),
          linearScale = colorsToUse.map((color, i) => i * domainInterval / 100),
          range = colorsToUse.map((color, i, colorArray) => {
            const normVal = i / (colorArray.length - 1)
            let interp = Math.min(normVal / 0.65, 1.0)
            interp = interp * 0.375 + 0.625
            return convertHexToRGBA(color, interp * 100)
          })

        const rtnObj = {
          name: colorScaleName,
          type: "linear",
          domain: linearScale,
          range,
          accumulator: "density",
          minDensityCnt: "-2ndStdDev",
          maxDensityCnt: "2ndStdDev",
          clamp: true
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
      const capAttrObj = layerObj.getState().encoding[capAttrMap[capAttrName]]
      if (capAttrObj && capAttrObj.domain && capAttrObj.domain.length && capAttrObj.domain.includes(input) && capAttrObj.range.length) {
        if (capAttrObj.type === "ordinal") {
          ordScale.domain(capAttrObj.domain).range(capAttrObj.range)
          rtnVal = ordScale(input)
        } else {
          quantScale.domain(capAttrObj.domain).range(capAttrObj.range)
          rtnVal = quantScale(input)
        }
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
