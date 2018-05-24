import { lastFilteredSize, setLastFilteredSize } from "../core/core-async"
import {
  adjustOpacity,
  adjustRGBAOpacity,
  createRasterLayerGetterSetter,
  createVegaAttrMixin
} from "../utils/utils-vega"
import { parser } from "../utils/utils"
import * as d3 from "d3"
import {AABox2d, Point2d} from "@mapd/mapd-draw/dist/mapd-draw"

const AUTOSIZE_DOMAIN_DEFAULTS = [100000, 0]
const AUTOSIZE_RANGE_DEFAULTS = [2.0, 5.0]
const AUTOSIZE_RANGE_MININUM = [1, 1]
const SIZING_THRESHOLD_FOR_AUTOSIZE_RANGE_MININUM = 1500000

function validSymbol(type) {
  switch (type) {
    case "circle":
    case "cross":
    case "diamond":
    case "hexagon":
    case "square":
    case "triangle-down":
    case "triangle-left":
    case "triangle-right":
    case "triangle-up":
    case "hexagon-vert":
    case "hexagon-horiz":
      return true
    default:
      return false
  }
}

function getMarkType(config = { point: {} }) {
  if (validSymbol(config.point.shape)) {
    return config.point.shape
  } else {
    return "circle"
  }
}

function getSizing(
  sizeAttr,
  cap,
  lastFilteredSize = cap,
  pixelRatio,
  layerName
) {
  if (typeof sizeAttr === "number") {
    return sizeAttr
  } else if (typeof sizeAttr === "object" && sizeAttr.type === "quantitative") {
    return {
      scale: layerName + "_size",
      field: "size"
    }
  } else if (sizeAttr === "auto") {
    const size = Math.min(lastFilteredSize, cap)
    const dynamicRScale = d3.scale
      .sqrt()
      .domain(AUTOSIZE_DOMAIN_DEFAULTS)
      .range(
        size > SIZING_THRESHOLD_FOR_AUTOSIZE_RANGE_MININUM
          ? AUTOSIZE_RANGE_MININUM
          : AUTOSIZE_RANGE_DEFAULTS
      )
      .clamp(true)
    return Math.round(dynamicRScale(size) * pixelRatio)
  } else {
    return null
  }
}

function getColor(color, layerName) {
  if (typeof color === "object" && color.type === "density") {
    return {
      scale: layerName + "_fillColor",
      value: 0
    }
  } else if (
    typeof color === "object" &&
    (color.type === "ordinal" || color.type === "quantitative")
  ) {
    return {
      scale: layerName + "_fillColor",
      field: "color"
    }
  } else if (typeof color === "object") {
    return adjustOpacity(color.value, color.opacity)
  } else {
    return color
  }
}

function getTransforms(
  table,
  filter,
  globalFilter,
  { transform, encoding: { x, y, size, color } },
  lastFilteredSize
) {
  const transforms = []

  if (
    typeof transform === "object" &&
    typeof transform.groupby === "object" &&
    transform.groupby.length
  ) {
    const fields = [x.field, y.field]
    const alias = ["x", "y"]
    const ops = [x.aggregate, y.aggregate]

    if (typeof size === "object" && size.type === "quantitative") {
      fields.push(size.field)
      alias.push("size")
      ops.push(size.aggregate)
    }

    if (
      typeof color === "object" &&
      (color.type === "quantitative" || color.type === "ordinal")
    ) {
      fields.push(color.field)
      alias.push("color")
      ops.push(color.aggregate)
    }

    transforms.push({
      type: "aggregate",
      fields,
      ops,
      as: alias,
      groupby: transform.groupby.map((g, i) => ({
        type: "project",
        expr: g,
        as: `key${i}`
      }))
    })
  } else {
    transforms.push({
      type: "project",
      expr: x.field,
      as: "x"
    })
    transforms.push({
      type: "project",
      expr: y.field,
      as: "y"
    })

    if (typeof transform.limit === "number") {
      transforms.push({
        type: "limit",
        row: transform.limit
      })
      if (transform.sample) {
        transforms.push({
          type: "sample",
          method: "multiplicative",
          size: lastFilteredSize || transform.tableSize,
          limit: transform.limit
        })
      }
    }

    if (typeof size === "object" && size.type === "quantitative") {
      transforms.push({
        type: "project",
        expr: size.field,
        as: "size"
      })
    }

    if (
      typeof color === "object" &&
      (color.type === "quantitative" || color.type === "ordinal")
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
  }

  if (typeof filter === "string" && filter.length) {
    transforms.push({
      type: "filter",
      expr: filter
    })
  }

  if (typeof globalFilter === "string" && globalFilter.length) {
    transforms.push({
      type: "filter",
      expr: globalFilter
    })
  }

  return transforms
}

function getScales({ size, color }, layerName) {
  const scales = []

  if (typeof size === "object" && size.type === "quantitative") {
    scales.push({
      name: layerName + "_size",
      type: "linear",
      domain: size.domain,
      range: size.range,
      clamp: true
    })
  }

  if (typeof color === "object" && color.type === "density") {
    scales.push({
      name: layerName + "_fillColor",
      type: "linear",
      domain: color.range.map(
        (c, i) => i * 100 / (color.range.length - 1) / 100
      ),
      range: color.range
        .map(c => adjustOpacity(c, color.opacity))
        .map((c, i, colorArray) => {
          const normVal = i / (colorArray.length - 1)
          let interp = Math.min(normVal / 0.65, 1.0)
          interp = interp * 0.375 + 0.625
          return adjustRGBAOpacity(c, interp)
        }),
      accumulator: "density",
      minDensityCnt: "-2ndStdDev",
      maxDensityCnt: "2ndStdDev",
      clamp: true
    })
  }

  if (typeof color === "object" && color.type === "ordinal") {
    scales.push({
      name: layerName + "_fillColor",
      type: "ordinal",
      domain: color.domain,
      range: color.range.map(c => adjustOpacity(c, color.opacity)),
      default: adjustOpacity(
        color.range[color.range.length - 1],
        color.opacity
      ), // in current implementation 'Other' is always added as last element in the array
      nullValue: adjustOpacity("#CACACA", color.opacity)
    })
  }

  if (typeof color === "object" && color.type === "quantitative") {
    scales.push({
      name: layerName + "_fillColor",
      type: "quantize",
      domain: color.domain.map(c => adjustOpacity(c, color.opacity)),
      range: color.range,
      clamp: true
    })
  }

  return scales
}

export default function rasterLayerPointMixin(_layer) {
  let state = null

  _layer.setState = function(setter) {
    if (typeof setter === "function") {
      state = setter(state)
    } else {
      state = setter
    }

    if (!state.hasOwnProperty("transform")) {
      state.transform = {}
    }

    return _layer
  }

  _layer.getState = function() {
    return state
  }

  _layer.getProjections = function() {
    return getTransforms(
      "",
      "",
      "",
      state,
      lastFilteredSize(_layer.crossfilter().getId())
    )
      .filter(
        transform =>
          transform.type === "project" && transform.hasOwnProperty("as")
      )
      .map(projection => parser.parseTransform({ select: [] }, projection))
      .map(sql => sql.select[0])
  }

  _layer.__genVega = function({
    table,
    filter,
    lastFilteredSize,
    globalFilter,
    pixelRatio,
    layerName
  }) {
    const size = getSizing(
      state.encoding.size,
      state.transform && state.transform.limit,
      lastFilteredSize,
      pixelRatio,
      layerName
    )

    const markType = getMarkType(state.config)

    return {
      data: [
        {
          name: layerName,
          sql: parser.writeSQL({
            type: "root",
            source: table,
            transform: getTransforms(
              table,
              filter,
              globalFilter,
              state,
              lastFilteredSize
            )
          })
        }
      ],
      scales: getScales(state.encoding, layerName),
      marks: [
        {
          type: markType === "circle" ? "points" : "symbol",
          from: {
            data: layerName
          },
          properties: Object.assign(
            {},
            markType === "circle"
              ? {
                  x: {
                    scale: "x",
                    field: "x"
                  },
                  y: {
                    scale: "y",
                    field: "y"
                  },
                  fillColor: getColor(state.encoding.color, layerName)
                }
              : {
                  xc: {
                    scale: "x",
                    field: "x"
                  },
                  yc: {
                    scale: "y",
                    field: "y"
                  },
                  fillColor: getColor(state.encoding.color, layerName)
                },
            markType === "circle"
              ? { size }
              : {
                  shape: markType,
                  width: size,
                  height: size
                }
          )
        }
      ]
    }
  }

  _layer.xDim = createRasterLayerGetterSetter(_layer, null)
  _layer.yDim = createRasterLayerGetterSetter(_layer, null)

  // NOTE: builds _layer.defaultSize(), _layer.nullSize(),
  //              _layer.sizeScale(), & _layer.sizeAttr()
  createVegaAttrMixin(_layer, "size", 3, 1, true)

  _layer.dynamicSize = createRasterLayerGetterSetter(_layer, null)

  _layer.xAttr = createRasterLayerGetterSetter(_layer, null)
  _layer.yAttr = createRasterLayerGetterSetter(_layer, null)

  const _point_wrap_class = "map-point-wrap"
  const _point_class = "map-point-new"
  const _point_gfx_class = "map-point-gfx"

  let _vega = null
  const _scaledPopups = {}
  const _minMaxCache = {}
  let _cf = null

  _layer.crossfilter = function(cf) {
    if (!arguments.length) {
      return _cf
    }
    _cf = cf
    return _layer
  }

  _layer._requiresCap = function() {
    return false
  }

  _layer.xRangeFilter = function(range) {
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

  _layer.yRangeFilter = function(range) {
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

  _layer._genVega = function(chart, layerName, group, query) {

    // needed to set LastFilteredSize when point map first initialized
    if (
      _layer.yDim()
    ) {
      _layer.yDim().groupAll().valueAsync().then(value => {
        setLastFilteredSize(_layer.crossfilter().getId(), value)
      })
    }

    _vega = _layer.__genVega({
      layerName,
      table: _layer.crossfilter().getTable()[0],
      filter: _layer.crossfilter().getFilterString(),
      globalFilter: _layer.crossfilter().getGlobalFilterString(),
      lastFilteredSize: lastFilteredSize(_layer.crossfilter().getId()),
      pixelRatio: chart._getPixelRatio()
    })

    return _vega
  }

  const renderAttributes = [
    "x",
    "y",
    "xc",
    "yc",
    "size",
    "width",
    "height",
    "fillColor"
  ]

  _layer._addRenderAttrsToPopupColumnSet = function(chart, popupColumnsSet) {
    if (
      _vega &&
      Array.isArray(_vega.marks) &&
      _vega.marks.length > 0 &&
      _vega.marks[0].properties
    ) {
      renderAttributes.forEach(prop => {
        _layer._addQueryDrivenRenderPropToSet(
          popupColumnsSet,
          _vega.marks[0].properties,
          prop
        )
      })
    }
  }

  _layer._areResultsValidForPopup = function(results) {
    if (typeof results.x === "undefined" || typeof results.y === "undefined") {
      return false
    } else {
      return true
    }
  }

  _layer._displayPopup = function(
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
    if (
      _vega &&
      Array.isArray(_vega.marks) &&
      _vega.marks.length > 0 &&
      _vega.marks[0].properties
    ) {
      const propObj = _vega.marks[0].properties
      renderAttributes.forEach(prop => {
        if (
          typeof propObj[prop] === "object" &&
          propObj[prop].field &&
          typeof propObj[prop].field === "string"
        ) {
          rndrProps[prop] = propObj[prop].field
        }
      })
    }

    const pixel = Point2d.create(xscale(data[rndrProps.xc || rndrProps.x]) + margins.left,
                                 height - yscale(data[rndrProps.yc || rndrProps.y]) + margins.top)

    let sizeFromData =
      data[rndrProps.size || rndrProps.width || rndrProps.height]
    sizeFromData = Math.max(sizeFromData, 1) // size must be > 0 (#164)
    let dotSize = _layer.getSizeVal(sizeFromData)

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
      .style({ left: pixel[0] + "px", top: pixel[1] + "px" })

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

    return AABox2d.initCenterExtents(AABox2d.create(), pixel, [dotSize / 2, dotSize / 2])
  }

  _layer._hidePopup = function(chart, hideCallback) {
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

  _layer._destroyLayer = function(chart) {
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
