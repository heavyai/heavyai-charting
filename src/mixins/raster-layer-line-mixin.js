import {
  createRasterLayerGetterSetter,
  createVegaAttrMixin,
  __displayPopup,
  renderAttributes,
  getScales,
  getSizeScaleName,
  getColorScaleName, adjustOpacity
} from "../utils/utils-vega";
import {lastFilteredSize, setLastFilteredSize} from "../core/core-async";
import {parser} from "../utils/utils";
import * as d3 from "d3";

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
  } else if (typeof sizeAttr === "object" && (sizeAttr.type === "quantitative" || sizeAttr.type === "custom")) {
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
  }
  else {
    return color
  }
}

function getTransforms(
  table,
  filter,
  globalFilter,
  state,
  lastFilteredSize
) {
  const transforms = []
  const { transform } = state
  const { size, color, geocol, geoTable } = state.encoding
  const rowIdTable = doJoin() ? state.data[1].table : state.data[0].table

  const fields = []
  const alias = []
  const ops = []

  const colorProjection =
    color.type === "quantitative"
      ? parser.parseExpression(color.aggregate)
      : `SAMPLE(${rowIdTable}.${color.field})`

  function doJoin() {
    return state.data.length > 1
  }

  const groupbyDim = state.transform.groupby ? state.transform.groupby.map((g, i) => ({
    type: "project",
    expr: `${state.data[0].table}.${g}`,
    as: `key${i}`
  })) : []

  const groupby = doJoin()
    ? [{
      type: "project",
      expr: `${state.data[0].table}.${state.data[0].attr}`,
      as: "key0"
    }]
    : groupbyDim

  if (typeof size === "object" && (size.type === "quantitative" || size.type === "custom")) {
    if(groupby.length > 0 && size.type === "quantitative") {
      fields.push(`${state.data[0].table}.${size.field}`)
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
    if(groupby.length > 0 && color.colorMeasureAggType !== "Custom") {
      fields.push(colorProjection)
      alias.push("strokeColor")
      ops.push(null)
    } else {
      let expression = null
      if(color.colorMeasureAggType === "Custom") {
        expression = color.field ? color.field : color.aggregate
      } else if (color.type === "quantitative") {
        expression = color.aggregate.field
      } else {
        expression = color.field
      }
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
      expr: `${state.data[0].table}.${state.data[0].attr} = ${
        state.data[1].table
        }.${state.data[1].attr}`
    })
  }


  if(groupby.length > 0) {
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
      as: geocol
    })
  } else {
    transforms.push({
      type: "project",
      expr: `${rowIdTable}.rowid`,
      as: "rowid"
    })
    transforms.push({
      type: "project",
      expr: `${geoTable}.${geocol}`
    })
  }

  if (typeof transform.limit === "number") {
    if (transform.sample && !doJoin()) { // use Knuth's hash sampling on single data source chart
      transforms.push({
        type: "sample",
        method: "multiplicative",
        size: lastFilteredSize || transform.tableSize,
        limit: transform.limit
      })
    } else { // when geo join is applied, we won't use Knuth's sampling but use LIMIT
      transforms.push({
        type: "limit",
        row: transform.limit
      })
    }
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

export default function rasterLayerLineMixin(_layer) {
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

  function getAutoColorVegaTransforms(data, layerName, statsLayerName) {

    const aggregateNode = {
      type: "aggregate",
      fields: [],
      ops: [],
      as: []
    }

    const transforms = [aggregateNode]
    if (state.encoding.color.type === "quantitative") {
      aggregateNode.fields = aggregateNode.fields.concat(["strokeColor", "strokeColor", "strokeColor", "strokeColor"])
      aggregateNode.ops = aggregateNode.ops.concat(["min", "max", "avg", "stddev"])
      aggregateNode.as = aggregateNode.as.concat(["mincol", "maxcol", "avgcol", "stdcol"])
      transforms.push(
        {
          type: "formula",
          expr: "max(mincol, avgcol-2*stdcol)",
          as:  "mincolor"
        },
        {
          type: "formula",
          expr: "min(maxcol, avgcol+2*stdcol)",
          as: "maxcolor"
        }
      )
    } else if (state.encoding.color.type === "ordinal") { // will be used when we support auto for ordinal color type
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
    return state.encoding.color.domain === "auto"
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
                                table,
                                filter,
                                lastFilteredSize,
                                globalFilter,
                                pixelRatio,
                                layerName,
                                useProjection
                              }) {
    const autocolors = usesAutoColors()
    const getStatsLayerName = () => layerName + "_stats"

    const size = getSizing(
      state.encoding.size,
      state.transform && state.transform.limit,
      lastFilteredSize,
      pixelRatio,
      layerName
    )

    const data = [
      {
        name: layerName,
        format: "lines",
        sql: parser.writeSQL({
          type: "root",
          source: [...new Set(state.data.map(source => source.table))].join(
            ", "
          ),
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

    if (autocolors) {
      getAutoColorVegaTransforms(data, layerName, getStatsLayerName())

      if(state.encoding.color.type === "quantitative") {
        scaledomainfields.color = ["mincolor", "maxcolor"]
      } else if(state.encoding.color.type === "ordinal") { // will be used when we support auto for ordinal color type
        scaledomainfields.color = ["distinctcolor"]
      }
    }

    const scales = getScales(state.encoding, layerName, scaledomainfields, getStatsLayerName())

    const marks = [
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
    if (
      _layer.viewBoxDim()
    ) {
      _layer.viewBoxDim().groupAll().valueAsync().then(value => {
        setLastFilteredSize(_layer.crossfilter().getId(), value)
      })
    }

    _vega = _layer.__genVega({
      layerName,
      table: _layer.crossfilter().getTable()[0],
      filter: _layer.crossfilter().getFilterString(),
      globalFilter: _layer.crossfilter().getGlobalFilterString(),
      lastFilteredSize: lastFilteredSize(_layer.crossfilter().getId()),
      pixelRatio: chart._getPixelRatio(),
      useProjection: chart._useGeoTypes
    })

    return _vega
  }


  _layer._addRenderAttrsToPopupColumnSet = function(chart, popupColsSet) {
    // add the poly geometry to the query

    if (chart._useGeoTypes) {
      if (state.encoding.geocol) {
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
    if (state.encoding.geocol && results[state.encoding.geocol]) {
      return true
    }
    return false
  }

  _layer._displayPopup = function(svgProps) {
    return __displayPopup({ ...svgProps, _vega, _layer, state})
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