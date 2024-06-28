/* eslint-disable complexity */
import {
  createRasterLayerGetterSetter,
  createVegaAttrMixin,
  __displayPopup,
  renderAttributes,
  getScales,
  getSizeScaleName,
  getColorScaleName,
  adjustOpacity
} from "../utils/utils-vega"
import { lastFilteredSize, setLastFilteredSize } from "../core/core-async"
import { parser } from "../utils/utils"
import * as d3 from "d3"
import {
  buildOptimizedContourSQL,
  getContourBoundingBox,
  getContourMarks,
  getContourScales,
  isContourType,
  validateContourState
} from "../utils/utils-contour"

const AUTOSIZE_DOMAIN_DEFAULTS = [100000, 1000]
const AUTOSIZE_RANGE_DEFAULTS = [1.0, 3.0]
const AUTOSIZE_RANGE_MININUM = [1, 1]
const SIZING_THRESHOLD_FOR_AUTOSIZE_RANGE_MININUM = 100000

function getSizing(
  sizeAttr,
  cap,
  lastFilteredSize = cap,
  pixelRatio,
  layerName
) {
  if (typeof sizeAttr === "number") {
    return sizeAttr
  } else if (
    typeof sizeAttr === "object" &&
    (sizeAttr.type === "quantitative" || sizeAttr.type === "custom")
  ) {
    return {
      scale: getSizeScaleName(layerName),
      field: "strokeWidth"
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
      field: "strokeColor"
    }
  } else if (typeof color === "object") {
    return adjustOpacity(color.value, color.opacity)
  } else {
    return color
  }
}

export default function rasterLayerLineMixin(_layer) {
  let state = null
  _layer.colorDomain = createRasterLayerGetterSetter(_layer, null)
  _layer.sizeDomain = createRasterLayerGetterSetter(_layer, null)
  _layer.lastFilteredSize = 0

  _layer.getLastFilteredSize = function () {
    return _layer.lastFilteredSize
  }

  _layer.setLastFilteredSize = function (value) {
    _layer.lastFilteredSize = value
  }

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

  function doJoin() {
    return state.data.length > 1
  }

  _layer.getTransforms = function(
    table,
    filter,
    globalFilter,
    state,
    lastFilteredSize,
    isDataExport
  ) {
    const transforms = []
    const { transform } = state
    const { size, color, geocol, geoTable } = state.encoding
    const rowIdTable = doJoin() ? state.data[1].table : state.data[0].table

    const fields = []
    const alias = []
    const ops = []

    const isJoin = _layer.crossfilter().getTables().length > 1
    // Adds /*+ cpu_mode */ in data export query since we are limiting to some number of rows.
    const groupbyDim = state.transform.groupby
      ? state.transform.groupby.map((g, i) => ({
          type: "project",
          expr: `${isDataExport && i === 0 ? "/*+ cpu_mode */ " : ""}${
            state.data[0].table
          }.${g}`,
          as: `key${i}`
        }))
      : []

    const groupby = doJoin()
      ? [
          {
            type: "project",
            expr: `${state.data[0].table}.${state.data[0].attr}`,
            as: "key0"
          }
        ]
      : groupbyDim

    const colorProjection =
      groupby.length && color.type === "quantitative"
        ? parser.parseExpression(color.aggregate)
        : `SAMPLE(${rowIdTable}.${color.field})`

    if (groupby.length > 0) {
      transforms.push({
        type: "aggregate",
        fields,
        ops,
        as: alias,
        groupby
      })
      transforms.push({
        type: "project",
        expr: `LAST_SAMPLE(${rowIdTable}.rowid)`,
        as: "rowid"
      })
      transforms.push({
        type: "project",
        expr: `SAMPLE(${geoTable}.${geocol})`,
        as: "sampled_geo"
      })
    } else if (isJoin) {
      // Group by geometry by assuming all rows are a unique
      // geometry, and grouping by rowid
      transforms.push({
        type: "aggregate",
        fields: [],
        ops: [null],
        as: [],
        groupby: `${geoTable}.rowid`
      })

      // Select any_value, as the original col name
      transforms.push({
        type: "project",
        expr: `ANY_VALUE(${geoTable}.${geocol})`,
        as: geocol
      })
    } else {
      transforms.push({
        type: "project",
        expr: `${isDataExport ? "/*+ cpu_mode */ " : ""}${geoTable}.${geocol}`
      })
    }

    if (
      typeof size === "object" &&
      (size.type === "quantitative" || size.type === "custom")
    ) {
      if (groupby.length > 0 && size.type === "quantitative") {
        fields.push(`${size.table || state.data[0].table}.${size.field}`)
        alias.push("strokeWidth")
        ops.push(size.aggregate)
      } else {
        transforms.push({
          type: "project",
          expr: size.field,
          as: "strokeWidth"
        })
      }
    }

    if (
      typeof color === "object" &&
      (color.type === "quantitative" || color.type === "ordinal")
    ) {
      if (groupby.length > 0 && color.colorMeasureAggType !== "Custom") {
        fields.push(colorProjection)
        alias.push("strokeColor")
        ops.push(null)
      } else {
        const expression = color.field || color.aggregate

        transforms.push({
          type: "project",
          expr: expression,
          as: "strokeColor"
        })
      }
    }

    if (doJoin()) {
      transforms.push({
        type: "filter",
        expr: `${state.data[0].table}.${state.data[0].attr} = ${state.data[1].table}.${state.data[1].attr}`
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

    if (typeof transform.limit === "number") {
      if (transform.sample && !doJoin()) {
        // use Knuth's hash sampling on single data source chart
        transforms.push({
          type: "sample",
          method: "multiplicative",
          size: lastFilteredSize || transform.tableSize,
          limit: transform.limit,
          sampleTable: geoTable
        })
      } else {
        // when geo join is applied, we won't use Knuth's sampling but use LIMIT
        transforms.push({
          type: "limit",
          row: transform.limit
        })
      }
    }

    return transforms
  }

  _layer.getProjections = function() {
    return _layer
      .getTransforms(
        "",
        "",
        "",
        state,
          _layer.lastFilteredSize()
      )
      .filter(
        transform =>
          transform.type === "project" && transform.hasOwnProperty("as")
      )
      .map(projection => parser.parseTransform({ select: [] }, projection))
      .map(sql => sql.select[0])
  }

  function getAutoColorVegaTransforms(data, layerName, statsLayerName) {
    const aggregateNode = {
      type: "aggregate",
      fields: [],
      ops: [],
      as: []
    }

    const transforms = [aggregateNode]
    if (state.encoding.color.type === "quantitative") {
      aggregateNode.fields = aggregateNode.fields.concat([
        "strokeColor",
        "strokeColor",
        "strokeColor",
        "strokeColor"
      ])
      aggregateNode.ops = aggregateNode.ops.concat([
        "min",
        "max",
        "avg",
        "stddev"
      ])
      aggregateNode.as = aggregateNode.as.concat([
        "mincol",
        "maxcol",
        "avgcol",
        "stdcol"
      ])
      transforms.push(
        {
          type: "formula",
          expr: "max(mincol, avgcol-2*stdcol)",
          as: "mincolor"
        },
        {
          type: "formula",
          expr: "min(maxcol, avgcol+2*stdcol)",
          as: "maxcolor"
        }
      )
    } else if (state.encoding.color.type === "ordinal") {
      // will be used when we support auto for ordinal color type
      aggregateNode.fields.push("color")
      aggregateNode.ops.push("distinct")
      aggregateNode.as.push("distinctcolor")
    }

    data.push({
      name: statsLayerName,
      source: layerName,
      transform: transforms
    })
  }

  function usesAutoColors() {
    return state.encoding.color && state.encoding.color.domain === "auto"
  }

  _layer._updateFromMetadata = (metadata, layerName = "") => {
    if (usesAutoColors() && Array.isArray(metadata.scales)) {
      const colorScaleName = getColorScaleName(layerName)
      for (const scale of metadata.scales) {
        if (scale.name === colorScaleName) {
          _layer.colorDomain(scale.domain)
        }
      }
    }
  }

  _layer.__genVega = function({
    chart,
    table,
    filter,
    globalFilter,
    pixelRatio,
    layerName,
    useProjection
  }) {
    const autocolors = usesAutoColors()
    const getStatsLayerName = () => layerName + "_stats"
    const state = _layer.getState()

    const size = getSizing(
      state.encoding.size,
      state.transform && state.transform.limit,
          _layer.getLastFilteredSize(),
      pixelRatio,
      layerName
    )

    let sql
    if (isContourType(state)) {
      validateContourState(state)
      const filterTransforms = _layer
        .getTransforms(table, filter, globalFilter, state, _layer.getLastFilteredSize())
        .filter(f => f.type === "filter")
      const bboxFilter = getContourBoundingBox(
        state.data[0],
        chart.map().getBounds()
      )
      filterTransforms.push({
        type: "filter",
        expr: bboxFilter
      })
      sql = buildOptimizedContourSQL({
        state,
        filterTransforms
      })
    } else {
      const source = doJoin()
        ? [...new Set(state.data.map(source => source.table))].join(", ")
        : table
      sql = parser.writeSQL({
        type: "root",
        source,
        transform: _layer.getTransforms(
          table,
          filter,
          globalFilter,
          state,
            _layer.getLastFilteredSize()
        )
      })
    }
    const data = [
      {
        name: layerName,
        format: "lines",
        sql,
        enableHitTesting: state.enableHitTesting
      }
    ]

    const scaledomainfields = {}

    if (autocolors) {
      getAutoColorVegaTransforms(data, layerName, getStatsLayerName())

      if (state.encoding.color.type === "quantitative") {
        scaledomainfields.color = ["mincolor", "maxcolor"]
      } else if (state.encoding.color.type === "ordinal") {
        // will be used when we support auto for ordinal color type
        scaledomainfields.color = ["distinctcolor"]
      }
    }

    let scales
    if (isContourType(state)) {
      scales = getContourScales(layerName, state.encoding)
    } else {
      scales = getScales(
        state.encoding,
        layerName,
        scaledomainfields,
        getStatsLayerName()
      )
    }

    let marks
    if (isContourType(state)) {
      marks = getContourMarks(layerName, state)
    } else {
      marks = [
        {
          type: "lines",
          from: {
            data: layerName
          },
          properties: Object.assign(
            {},
            {
              x: {
                field: "x"
              },
              y: {
                field: "y"
              },
              strokeColor: getColor(state.encoding.color, layerName),
              strokeWidth: size,
              lineJoin:
                typeof state.mark === "object" ? state.mark.lineJoin : "bevel"
            }
          )
        }
      ]
    }

    if (useProjection) {
      marks[0].transform = {
        projection: "mercator_map_projection"
      }
    } else {
      marks[0].properties.x.scale = "x"
      marks[0].properties.y.scale = "y"
    }

    return {
      data,
      scales,
      marks
    }
  }

  _layer.viewBoxDim = createRasterLayerGetterSetter(_layer, null)

  // linemap bbox filter gets broken if these are set for its layer, but contour
  // needs them to be set for its bbox filter; therefore wrap in a method that
  // can be called from contour setup prior to setting vals
  _layer.initializeXYDims = function() {
    _layer.xDim = createRasterLayerGetterSetter(_layer, null)
    _layer.yDim = createRasterLayerGetterSetter(_layer, null)
  }

  createVegaAttrMixin(_layer, "size", 3, 1, true)

  let _vega = null
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

  _layer._genVega = function(chart, layerName, group, query) {
    // needed to set LastFilteredSize when linemap map first initialized
    if (_layer.viewBoxDim()) {
      _layer
        .viewBoxDim()
        .groupAll()
        .valueAsync()
        .then(value => {
          _layer.setLastFilteredSize(_layer.crossfilter().getId(), value)
        })
    }
    _vega = _layer.__genVega({
      chart,
      layerName,
      table: _layer.crossfilter().getDataSource(),
      filter: _layer.crossfilter().getFilterString(layerName),
      globalFilter: _layer.crossfilter().getGlobalFilterString(),
      pixelRatio: chart._getPixelRatio(),
      useProjection: chart.useGeoTypes()
    })

    return _vega
  }

  _layer._addRenderAttrsToPopupColumnSet = function(chart, popupColsSet) {
    if (chart.useGeoTypes()) {
      if (
        state.encoding.geocol &&
        state.transform.groupby &&
        state.transform.groupby.length
      ) {
        popupColsSet.add("sampled_geo")
      } else if (state.encoding.geocol) {
        popupColsSet.add(state.encoding.geocol)
      }
    }

    if (
      _vega &&
      Array.isArray(_vega.marks) &&
      _vega.marks.length > 0 &&
      _vega.marks[0].properties
    ) {
      renderAttributes.forEach(rndrProp => {
        if (rndrProp !== "x" && rndrProp !== "y") {
          _layer._addQueryDrivenRenderPropToSet(
            popupColsSet,
            _vega.marks[0].properties,
            rndrProp
          )
        }
      })
    }
  }

  _layer._areResultsValidForPopup = function(results) {
    return Boolean(
      state.encoding.geocol &&
        (results[state.encoding.geocol] || results.sampled_geo)
    )
  }

  _layer._displayPopup = function(svgProps) {
    return __displayPopup({ ...svgProps, _vega, _layer, state })
  }

  const _scaledPopups = {}
  _layer._hidePopup = function(chart, hideCallback) {
    const mapPoly = chart.select(".map-polyline")

    if (mapPoly) {
      if (_scaledPopups[chart]) {
        mapPoly.classed("removePoly", true)
      } else {
        mapPoly.classed("fadeOutPoly", true)
        // mapPoly.attr('transform', 'scale(0, 0)');
      }

      if (hideCallback) {
        mapPoly.on("animationend", () => {
          hideCallback(chart)
        })
      }

      delete _scaledPopups[chart]
    }
  }

  _layer._destroyLayer = function(chart) {
    const viewBoxDim = _layer.viewBoxDim()
    if (viewBoxDim) {
      viewBoxDim.dispose()
    }
  }

  return _layer
}
