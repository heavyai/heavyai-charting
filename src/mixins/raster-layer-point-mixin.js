import {decrementSampledCount, incrementSampledCount} from "../core/core"
import {lastFilteredSize} from "../core/core-async"
import {
  convertHexToRGBA,
  createRasterLayerGetterSetter,
  createVegaAttrMixin
} from "../utils/utils-vega"
import {parser} from "../utils/utils"
import * as d3 from "d3"

const AUTOSIZE_DOMAIN_DEFAULTS = [100000, 0]
const AUTOSIZE_RANGE_DEFAULTS = [2.0, 5.0]
const AUTOSIZE_RANGE_MININUM = [1, 1]
const SIZING_THRESHOLD_FOR_AUTOSIZE_RANGE_MININUM = 1500000

function getSizing (sizeAttr, cap, lastFilteredSize, pixelRatio) {
  if (typeof sizeAttr === "number") {
    return sizeAttr
  } else if (typeof sizeAttr === "object" && sizeAttr.type === "quantitative") {
    return {
      scale: "points_size",
      field: "size"
    }
  } else if (sizeAttr === "auto") {
    const size = Math.min(lastFilteredSize, cap)
    const dynamicRScale = d3.scale
      .sqrt()
      .domain(AUTOSIZE_DOMAIN_DEFAULTS)
      .range(
        size > SIZING_THRESHOLD_FOR_AUTOSIZE_RANGE_MININUM ? AUTOSIZE_RANGE_MININUM : AUTOSIZE_RANGE_DEFAULTS
      )
      .clamp(true)
    return Math.round(dynamicRScale(size) * pixelRatio)
  }
}

function getColor (color) {
  if (typeof color === "object" && color.type === "density") {
    return {
      scale: "points_fillColor",
      value: 0
    }
  } else if (
    typeof color === "object" && (color.type === "ordinal" || color.type === "quantitative")
  ) {
    return {
      scale: "points_fillColor",
      field: "color"
    }
  } else {
    return color
  }
}

function getTransforms (table, filter, {x, y, size, color}) {
  const transforms = [
    {
      type: "filter",
      expr: filter
    },
    {
      type: "project",
      expr: `conv_4326_900913_x(${x.field})`,
      as: "x"
    },
    {
      type: "project",
      expr: `conv_4326_900913_y(${y.field})`,
      as: "y"
    }
  ]

  if (typeof size === "object" && size.type === "quantitative") {
    transforms.push({
      type: "project",
      expr: size.field,
      as: "size"
    })
  }

  if (
    typeof color === "object" && (color.type === "quantitative" || color.type === "ordinal")
  ) {
    transforms.push({
      type: "project",
      expr: color.field,
      as: "color"
    })
  }

  transforms.push({
    type: "project",
    expr: `${table}.rowid`
  })

  return transforms
}

function getScales ({size, color}) {
  const scales = []

  if (typeof size === "object" && size.type === "quantitative") {
    scales.push({
      name: "points_size",
      type: "linear",
      domain: size.domain,
      range: size.range,
      clamp: true
    })
  }

  if (typeof color === "object" && color.type === "density") {
    scales.push({
      name: "points_fillColor",
      type: "linear",
      domain: color.range.map(
        (c, i) => i * 100 / (color.range.length - 1) / 100
      ),
      range: color.range.map((c, i, colorArray) => {
        const normVal = i / (colorArray.length - 1)
        let interp = Math.min(normVal / 0.65, 1.0)
        interp = interp * 0.375 + 0.625
        return convertHexToRGBA(c, interp * 100)
      }),
      accumulator: "density",
      minDensityCnt: "-2ndStdDev",
      maxDensityCnt: "2ndStdDev",
      clamp: true
    })
  }

  if (typeof color === "object" && color.type === "ordinal") {
    scales.push({
      name: "points_fillColor",
      type: "ordinal",
      domain: color.domain,
      range: color.range,
      default: "#27aeef",
      nullValue: "#CACACA"
    })
  }

  return scales
}

export default function rasterLayerPointMixin (_layer) {
  let state = null

  _layer.setState = function (setter) {
    if (typeof setter === "function") {
      state = setter(state)
    } else {
      state = setter
    }

    return _layer
  }

  _layer.getState = function () {
    return state
  }

  _layer.getProjections = function () {
    return getTransforms("", "", state.encoding)
      .filter(transform => transform.type === "project" && transform.hasOwnProperty("as"))
      .map(projection => parser.parseTransform({select: []}, projection))
      .map(sql => sql.select[0])
  }

  _layer.__genVega = function ({table, filter, lastFilteredSize, pixelRatio}) {
    return {
      data: {
        name: "points",
        sql: parser.writeSQL({
          type: "root",
          source: table,
          transform: getTransforms(table, filter, state.encoding)
        })
      },
      scales: getScales(state.encoding),
      mark: {
        type: "points",
        from: {
          data: "points"
        },
        properties: {
          x: {
            scale: "x",
            field: "x"
          },
          y: {
            scale: "y",
            field: "y"
          },
          size: getSizing(
            state.encoding.size,
            state.transform && state.transform.length && state.transform[0].row,
            lastFilteredSize,
            pixelRatio
          ),
          fillColor: getColor(state.encoding.color)
        }
      }
    }
  }

  _layer.xDim = createRasterLayerGetterSetter(_layer, null)
  _layer.yDim = createRasterLayerGetterSetter(_layer, null)

  // NOTE: builds _layer.defaultSize(), _layer.nullSize(),
  //              _layer.sizeScale(), & _layer.sizeAttr()
  createVegaAttrMixin(_layer, "size", 3, 1, true)

  _layer.dynamicSize = createRasterLayerGetterSetter(_layer, null)

  _layer.sampling = createRasterLayerGetterSetter(
    _layer,
    false,
    (doSampling, isCurrSampling) => {
      if (doSampling && !isCurrSampling) {
        incrementSampledCount()
      } else if (!doSampling && isCurrSampling) {
        decrementSampledCount()
      }
      return Boolean(doSampling)
    },
    isCurrSampling => {
      if (!isCurrSampling) {
        _layer.dimension().samplingRatio(null)
      }
    }
  )

  _layer.xAttr = createRasterLayerGetterSetter(_layer, null)
  _layer.yAttr = createRasterLayerGetterSetter(_layer, null)

  const _point_wrap_class = "map-point-wrap"
  const _point_class = "map-point-new"
  const _point_gfx_class = "map-point-gfx"

  let _vega = null
  const _scaledPopups = {}
  const _minMaxCache = {}
  let _cf = null

  _layer.crossfilter = function (cf) {
    if (!arguments.length) {
      return _cf
    }
    _cf = cf
    return _layer
  }

  _layer._requiresCap = function () {
    return true
  }

  _layer.setSample = function () {
    if (_layer.sampling() && _layer.dimension()) {
      const id = _layer.dimension().getCrossfilterId()
      const filterSize = lastFilteredSize(id)
      if (filterSize == undefined) {
        _layer.dimension().samplingRatio(null)
      } else {
        _layer
          .dimension()
          .samplingRatio(Math.min(_layer.cap() / filterSize, 1.0))
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
    _vega = _layer.__genVega({
      table: _layer.crossfilter().getTable()[0],
      filter: _layer.crossfilter().getFilterString(),
      lastFilteredSize: lastFilteredSize(0),
      pixelRatio: chart._getPixelRatio()
    })

    return _vega
  }

  const renderAttributes = ["x", "y", "size", "fillColor"]

  _layer._addRenderAttrsToPopupColumnSet = function (chart, popupColumnsSet) {
    if (_vega && _vega.mark && _vega.mark.properties) {
      renderAttributes.forEach(prop => {
        _layer._addQueryDrivenRenderPropToSet(
          popupColumnsSet,
          _vega.mark.properties,
          prop
        )
      })
    }
  }

  _layer._areResultsValidForPopup = function (results) {
    if (typeof results.x === "undefined" || typeof results.y === "undefined") {
      return false
    } else {
      return true
    }
  }

  _layer._displayPopup = function (
    chart,
    parentElem,
    data,
    width,
    height,
    margins,
    xscale,
    yscale,
    minPopupArea,
    animate
  ) {
    const rndrProps = {}
    const queryRndrProps = new Set()
    if (_vega && _vega.mark && _vega.mark.properties) {
      const propObj = _vega.mark.properties
      renderAttributes.forEach(prop => {
        if (
          typeof propObj[prop] === "object" && propObj[prop].field && typeof propObj[prop].field === "string"
        ) {
          rndrProps[prop] = propObj[prop].field
          queryRndrProps.add(propObj[prop].field)
        }
      })
    }

    const xPixel = xscale(data[rndrProps.x]) + margins.left
    const yPixel = height - yscale(data[rndrProps.y]) + margins.top

    let dotSize = _layer.getSizeVal(data[rndrProps.size])
    let scale = 1
    const scaleRatio = minPopupArea / (dotSize * dotSize)
    const isScaled = scaleRatio > 1
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

    const wrapDiv = parentElem.append("div").attr("class", _point_wrap_class)

    const pointDiv = wrapDiv
      .append("div")
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

    const gfxDiv = pointDiv
      .append("div")
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
      bounds: [
        xPixel - dotSize / 2,
        xPixel + dotSize / 2,
        yPixel - dotSize / 2,
        yPixel + dotSize / 2
      ]
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
