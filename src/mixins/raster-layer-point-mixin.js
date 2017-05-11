import {decrementSampledCount, incrementSampledCount} from "../core/core"
import {lastFilteredSize} from "../core/core-async"
import {createRasterLayerGetterSetter, createVegaAttrMixin} from "../utils/utils-vega"

export default function rasterLayerPointMixin (_layer) {
  _layer.xDim = createRasterLayerGetterSetter(_layer, null)
  _layer.yDim = createRasterLayerGetterSetter(_layer, null)

    // NOTE: builds _layer.defaultSize(), _layer.nullSize(),
    //              _layer.sizeScale(), & _layer.sizeAttr()
  createVegaAttrMixin(_layer, "size", 3, 1, true)

  _layer.dynamicSize = createRasterLayerGetterSetter(_layer, null)

  _layer.sampling = createRasterLayerGetterSetter(_layer, false,
                          (doSampling, isCurrSampling) => {
                            if (doSampling && !isCurrSampling) {
                              incrementSampledCount()
                            } else if (!doSampling && isCurrSampling) {
                              decrementSampledCount()
                            }
                            return Boolean(doSampling)
                          },
                          (isCurrSampling) => {
                            if (!isCurrSampling) {
                              _layer.dimension().samplingRatio(null)
                            }
                          })

  _layer.xAttr = createRasterLayerGetterSetter(_layer, null)
  _layer.yAttr = createRasterLayerGetterSetter(_layer, null)

  const _point_wrap_class = "map-point-wrap"
  const _point_class = "map-point-new"
  const _point_gfx_class = "map-point-gfx"

  let _vega = null
  const _scaledPopups = {}
  const _minMaxCache = {}

  _layer._mandatoryAttributes(_layer._mandatoryAttributes().concat(["xAttr", "yAttr"]))

  const _renderProps = {
        // NOTE: the x/y scales will be built by the primary chart
    x: {
      getQueryAttr () {
        return _layer.xAttr()
      },

      genVega (chart, layerName, group, pixelRatio, markPropObj, scales) {
        markPropObj.x = {scale: chart._getXScaleName(), field: this.getQueryAttr()}
      }
    },

    y: {
      getQueryAttr () {
        return _layer.yAttr()
      },


      genVega (chart, layerName, group, pixelRatio, markPropObj, scales) {
        markPropObj.y = {scale: chart._getYScaleName(), field: this.getQueryAttr()}
      }
    },
    size: {
      getQueryAttr () {
        return _layer.sizeAttr()
      },

      genVega (chart, layerName, group, pixelRatio, markPropObj, scales) {
        const sizeScale = _layer.sizeScale()
        const sizeAttr = this.getQueryAttr()
        if (typeof sizeScale === "function") {
          if (sizeAttr === null) {
            throw new Error("Error trying to reference a size scale for raster layer " + layerName + ". The layer does not have sizeAttr defined. Please call the sizeAttr() setter to set a size attribute in the dimension for the layer")
          }

          const sizeScaleName = layerName + "_size"
          let scaleRange = sizeScale.range()
          if (pixelRatio !== 1) {
            scaleRange = scaleRange.map((rangeVal) => rangeVal * pixelRatio)
          }

          scales.push({
            name: sizeScaleName,
            type: chart._determineScaleType(sizeScale),
            domain: sizeScale.domain(),
            range: scaleRange,
            clamp: true
          })

                    // TODO(croot): do additional dynamic sizing here?
          markPropObj.size = {scale: sizeScaleName, field: sizeAttr}
        } else if (sizeAttr) {
                    // TODO(croot): do dynamic additional dynamic sizing?
          const sizeAttrType = typeof sizeAttr
          if (sizeAttrType === "string") {
                        // indicates that the sizeAttr directly references a value in the query
            markPropObj.size = {field: sizeAttr}
          } else if (sizeAttrType === "number") {
            markPropObj.size = sizeAttr
          } else {
            throw new Error("Type error for the sizeAttr property for layer " + layerName + ". The sizeAttr must be a string (referencing an column in the query) or a number.")
          }
        } else if (_layer.dynamicSize() !== null && _layer.sampling() && lastFilteredSize(group.getCrossfilterId()) !== undefined) {
                    // @TODO don't tie this to sampling - meaning having a dynamicSize will also require count to be computed first by dc
          const cap = _layer.cap()
          markPropObj.size = Math.round(_layer.dynamicSize()(Math.min(lastFilteredSize(group.getCrossfilterId()), cap)) * pixelRatio)
        } else {
          markPropObj.size = _layer.defaultSize() * pixelRatio
        }
      }
    },

    fillColor: {
      getQueryAttr () {
        return _layer.fillColorAttr()
      },

      genVega (chart, layerName, group, pixelRatio, markPropObj, scales) {
        const colorScale = _layer._buildFillColorScale(chart, layerName)
        const colorAttr = this.getQueryAttr()
        if (colorScale) {
          if (!colorScale.name) {
            throw new Error("Error trying to reference a fill color scale for raster layer " + layerName + ". The vega color scale does not have a name.")
          }

          if (colorScale.hasOwnProperty("accumulator")) {
            markPropObj.fillColor = {
              scale: colorScale.name,
              value: 0
            }
          } else {
            if (colorAttr === null) {
              throw new Error("Error trying to reference a fill color scale for raster layer " + layerName + ". The layer does not have a fillColorAttr defined.")
            }

            markPropObj.fillColor = {
              scale: colorScale.name,
              field: colorAttr
            }
          }
          scales.push(colorScale)
        } else if (colorAttr) {
          const colorAttrType = typeof colorAttr
          if (colorAttrType === "string") {
                        // indicates that the colorAttr directly references a value in the query
            markPropObj.fillColor = {field: colorAttr}
          } else {
            throw new Error("Type error for the fillColorAttr property for layer " + layerName + ". The fillColorAttr must be a string (referencing an column in the query).")
          }
        } else {
          markPropObj.fillColor = _layer.defaultFillColor()
        }
      }
    }
  }

    // points require a cap
  _layer._requiresCap = function () {
    return true
  }

  _layer.setSample = function () {
    if (_layer.sampling() && _layer.dimension()) {
      const id = _layer.dimension().getCrossfilterId()
      const filterSize = lastFilteredSize(id)
      if (filterSize == undefined) { _layer.dimension().samplingRatio(null) } else {
        _layer.dimension().samplingRatio(Math.min(_layer.cap() / filterSize, 1.0))
      }
    }
  }

  _layer.xRangeFilter = function (range) {
    if (!_layer.xDim()) {
      throw new Error("Must set layer's xDim before invoking xRange")
    }

    const xValue = _layer.xDim().value()[0]

    if (!arguments.length) {
      return _minMaxCache[xValue]
    }

    _minMaxCache[xValue] = range
    return _layer
  }

  _layer.yRangeFilter = function (range) {
    if (!_layer.yDim()) {
      throw new Error("Must set layer's yDim before invoking yRange")
    }

    const yValue = _layer.yDim().value()[0]

    if (!arguments.length) {
      return _minMaxCache[yValue]
    }

    _minMaxCache[yValue] = range
    return _layer
  }

  _layer._genVega = function (chart, layerName, group, query) {
    const data = {
      name: layerName,
      sql: query
    }

    const scales = []
    const pixelRatio = chart._getPixelRatio()
    const props = {}

    for (const rndrProp in _renderProps) {
      if (_renderProps.hasOwnProperty(rndrProp)) {
        _renderProps[rndrProp].genVega(chart, layerName, group, pixelRatio, props, scales)
      }
    }

    const mark = {
      type: "points",
      from: {data: layerName},
      properties: props
    }

    _vega = {
      data,
      scales,
      mark
    }

    return _vega
  }

  _layer._addRenderAttrsToPopupColumnSet = function (chart, popupColumnsSet) {
    if (_vega && _vega.mark && _vega.mark.properties) {
      for (const rndrProp in _renderProps) {
        if (_renderProps.hasOwnProperty(rndrProp)) {
          _layer._addQueryDrivenRenderPropToSet(popupColumnsSet, _vega.mark.properties, rndrProp)
        }
      }
    }
  }

  _layer._areResultsValidForPopup = function (results) {
        // NOTE: it is implied that the _renderProps.[x/y].getQueryAttr()
        // will be the field attr in the vega
    if (results[_renderProps.x.getQueryAttr()] === undefined || results[_renderProps.y.getQueryAttr()] === undefined) {
      return false
    }
    return true
  }

  _layer._displayPopup = function (chart, parentElem, data, width, height, margins, xscale, yscale, minPopupArea, animate) {
    const rndrProps = {}
    const queryRndrProps = new Set()
    if (_vega && _vega.mark && _vega.mark.properties) {
      const propObj = _vega.mark.properties
      for (const rndrProp in _renderProps) {
        if (_renderProps.hasOwnProperty(rndrProp) && typeof propObj[rndrProp] === "object" && propObj[rndrProp].field && typeof propObj[rndrProp].field === "string") {
          rndrProps[rndrProp] = propObj[rndrProp].field
          queryRndrProps.add(propObj[rndrProp].field)
        }
      }
    }

    const xPixel = xscale(data[rndrProps.x]) + margins.left
    const yPixel = (height - yscale(data[rndrProps.y])) + margins.top

    let dotSize = _layer.getSizeVal(data[rndrProps.size])
    let scale = 1
    const scaleRatio = minPopupArea / (dotSize * dotSize)
    const isScaled = (scaleRatio > 1)
    if (isScaled) {
      scale = Math.sqrt(scaleRatio)
      dotSize = dotSize * scale
    }

    const popupStyle = _layer.popupStyle()
    let bgColor = _layer.getFillColorVal(data[rndrProps.fillColor])
    let strokeColor, strokeWidth
    if (typeof popupStyle === "object" && !isScaled) {
      bgColor = popupStyle.fillColor || bgColor
      strokeColor = popupStyle.strokeColor
      strokeWidth = popupStyle.strokeWidth
    }

    const wrapDiv = parentElem.append("div")
                                .attr("class", _point_wrap_class)

    const pointDiv = wrapDiv.append("div")
                              .attr("class", _point_class)
                              .style({left: xPixel + "px", top: yPixel + "px"})

    if (animate) {
      if (isScaled) {
        pointDiv.classed("popupPoint", true)
      } else {
        pointDiv.classed("fadeInPoint", true)
      }
    }

    _scaledPopups[chart] = isScaled

    const gfxDiv = pointDiv.append("div")
                             .attr("class", _point_gfx_class)
                             .style("background", bgColor)
                             .style("width", dotSize + "px")
                             .style("height", dotSize + "px")

    if (strokeColor) {
      gfxDiv.style("border-color", strokeColor)
    }

    if (typeof strokeWidth === "number") {
      gfxDiv.style("border-width", strokeWidth)
    }

    return {
      rndrPropSet: queryRndrProps,
      bounds: [xPixel - dotSize / 2, xPixel + dotSize / 2, yPixel - dotSize / 2, yPixel + dotSize / 2]
    }
  }

  _layer._hidePopup = function (chart, hideCallback) {
    const mapPoint = chart.select("." + _point_class)
    if (mapPoint) {
      if (_scaledPopups[chart]) {
        mapPoint.classed("removePoint", true)
      } else {
        mapPoint.classed("fadeOutPoint", true)
      }

      if (hideCallback) {
        mapPoint.on("animationend", () => {
          hideCallback(chart)
        })
      }

      delete _scaledPopups[chart]
    }
  }

  _layer._destroyLayer = function (chart) {
    _layer.sampling(false)
    const xDim = _layer.xDim()
    if (xDim) {
      xDim.dispose()
    }

    const yDim = _layer.yDim()
    if (yDim) {
      yDim.dispose()
    }
  }

  return _layer
}
