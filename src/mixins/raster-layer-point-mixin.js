import { lastFilteredSize, setLastFilteredSize } from "../core/core-async"
import {
  adjustOpacity,
  adjustRGBAOpacity,
  createRasterLayerGetterSetter,
  createVegaAttrMixin,
  getScales,
  getSizeScaleName,
  getColorScaleName
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
      scale: getSizeScaleName(layerName),
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
      scale: getColorScaleName(layerName),
      value: 0
    }
  } else if (
    typeof color === "object" &&
    (color.type === "ordinal" || color.type === "quantitative")
  ) {
    return {
      scale: getColorScaleName(layerName),
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

export default function rasterLayerPointMixin(_layer) {
  let state = null
  _layer.colorDomain = createRasterLayerGetterSetter(_layer, null)
  _layer.sizeDomain = createRasterLayerGetterSetter(_layer, null)

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

  function usesAutoColors() {
    return state.encoding.color.domain === "auto"
  }

  function usesAutoSize() {
    return state.encoding.size.domain === "auto"
  }

  function getAutoColorVegaTransforms(aggregateNode) {
    const rtnobj = {transforms: [], fields: []}
    if (state.encoding.color.type === "quantitative") {
      const minoutput = "mincolor", maxoutput = "maxcolor"
      aggregateNode.fields = aggregateNode.fields.concat(["color", "color", "color", "color"])
      aggregateNode.ops = aggregateNode.ops.concat(["min", "max", "avg", "stddev"])
      aggregateNode.as = aggregateNode.as.concat(["mincol", "maxcol", "avgcol", "stdcol"])
      rtnobj.transforms.push(
          {
            type: "formula",
            expr: "max(mincol, avgcol-2*stdcol)",
            as: minoutput
          },
          {
            type: "formula",
            expr: "min(maxcol, avgcol+2*stdcol)",
            as: maxoutput
          }
        )
      rtnobj.fields = [minoutput, maxoutput]
    } else if (state.encoding.color.type === "ordinal") {
      const output = "distinctcolor"
      aggregateNode.fields.push("color")
      aggregateNode.ops.push("distinct")
      aggregateNode.as.push(output)
      rtnobj.fields.push(output)
    }
    return rtnobj
  }

  function getAutoSizeVegaTransforms(aggregateNode) {
    const minoutput = "minsize", maxoutput = "maxsize"
    aggregateNode.fields.push("size", "size", "size", "size")
    aggregateNode.ops.push("min", "max", "avg", "stddev")
    aggregateNode.as.push("minsz", "maxsz", "avgsz", "stdsz")
    return {
      transforms: [
        {
          type: "formula",
          expr: "max(minsz, avgsz-2*stdsz)",
          as: minoutput
        },
        {
          type: "formula",
          expr: "min(maxsz, avgsz+2*stdsz)",
          as: maxoutput
        }
      ],
      fields: [minoutput, maxoutput]
    }
  }

  _layer._updateFromMetadata = (metadata, layerName = "") => {
    const autoColors = usesAutoColors()
    const autoSize = usesAutoSize()
    if ((autoColors || autoSize) && Array.isArray(metadata.scales)) {
      const colorScaleName = getColorScaleName(layerName)
      const sizeScaleName = getSizeScaleName(layerName)
      for (const scale of metadata.scales) {
        if (autoColors && scale.name === colorScaleName) {
          _layer.colorDomain(scale.domain)
        } else if (autoSize && scale.name === sizeScaleName) {
          _layer.sizeDomain(scale.domain)
        }
      }
    }
  }

  _layer.__genVega = function({
    table,
    filter,
    lastFilteredSize,
    globalFilter,
    pixelRatio,
    layerName
  }) {
    const autocolors = usesAutoColors()
    const autosize = usesAutoSize()
    const getStatsLayerName = () => layerName + "_stats"

    const size = getSizing(
      state.encoding.size,
      state.transform && state.transform.limit,
      lastFilteredSize,
      pixelRatio,
      layerName
    )

    const markType = getMarkType(state.config)

    const data = [
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
    ]

    const scaledomainfields = {}
    if (autocolors || autosize) {
      const aggregateNode = {
        type: "aggregate",
        fields: [],
        ops: [],
        as: []
      }
      let transforms = [aggregateNode]
      if (autocolors) {
        const xformdata = getAutoColorVegaTransforms(aggregateNode)
        scaledomainfields.color = xformdata.fields
        transforms = transforms.concat(xformdata.transforms)
      }
      if (autosize) {
        const xformdata = getAutoSizeVegaTransforms(aggregateNode)
        scaledomainfields.size = xformdata.fields
        transforms = transforms.concat(xformdata.transforms)
      }
      data.push({
        name: getStatsLayerName(),
        source: layerName,
        transform: transforms
      })
    }

    const scales = getScales(state.encoding, layerName, scaledomainfields, getStatsLayerName())

    const marks = [
      {
        type: "symbol",
        from: {
          data: layerName
        },
        properties: Object.assign(
          {},
          {
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
          {
            shape: markType,
            width: size,
            height: size
          }
        )
      }
    ]

    return {
      data,
      scales,
      marks
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
    "xc",
    "yc",
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

  _layer._displayPopup = function(svgProps) {
    const {
      chart,
      parentElem,
      data,
      height,
      margins,
      xscale,
      yscale,
      minPopupArea,
      animate
    } = svgProps

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
