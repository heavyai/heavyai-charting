import {
  adjustOpacity, adjustRGBAOpacity, createRasterLayerGetterSetter,
  createVegaAttrMixin
} from "../utils/utils-vega";
import {lastFilteredSize, setLastFilteredSize} from "../core/core-async";
import {parser} from "../utils/utils";
import * as d3 from "d3";
import {AABox2d, Point2d} from "@mapd/mapd-draw/dist/mapd-draw";
import {events} from "../core/events";
import wellknown from "wellknown";

const AUTOSIZE_DOMAIN_DEFAULTS = [100000, 0]
const AUTOSIZE_RANGE_DEFAULTS = [1.0, 3.0]
const AUTOSIZE_RANGE_MININUM = [1, 1]
const SIZING_THRESHOLD_FOR_AUTOSIZE_RANGE_MININUM = 1500000

const polyTableGeomColumns = {
  // NOTE: the verts are interleaved x,y, so verts[0] = vert0.x, verts[1] = vert0.y, verts[2] = vert1.x, verts[3] = vert1.y, etc.
  // NOTE: legacy columns can be removed once pre-geo rendering is no longer used
  verts_LEGACY: "mapd_geo_coords",
  indices_LEGACY: "mapd_geo_indices",
  linedrawinfo_LEGACY: "mapd_geo_linedrawinfo",
  polydrawinfo_LEGACY: "mapd_geo_polydrawinfo"
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

function getSizeScaleName(layerName) {
  return `${layerName}_strokeWidth`
}

function getColorScaleName(layerName) {
  return `${layerName}_strokeColor`
}

function getColor(color, layerName) {
  if (
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

function doJoin() {
  return state.data.length > 1
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
  const { size, color, geocol } = state.encoding
  const rowIdTable = doJoin() ? state.data[1].table : state.data[0].table

  function doJoin() {
    return state.data.length > 1
  }

  if (
    typeof transform === "object" &&
    typeof transform.groupby === "object" &&
    transform.groupby.length
  ) {

    const groupby = doJoin()
      ? {
        type: "project",
        expr: `${state.data[0].table}.${state.data[0].attr}`,
        as: "key0"
      }
      : {}

    const colorProjection =
      color.type === "quantitative"
        ? parser.parseExpression(color.aggregate)
        : `LAST_SAMPLE(${color.field})`

    if (doJoin()) {
      // Join
      transforms.push({
        type: "filter",
        expr: `${state.data[0].table}.${state.data[0].attr} = ${
          state.data[1].table
          }.${state.data[1].attr}`
      })
    }

    if (typeof size === "object" && size.type === "quantitative") {
      transforms.push({
        type: "aggregate",
        fields: [size.field],
        ops: [size.aggregate] ,
        as: ["strokeWidth"],
        groupby: transform.groupby.map((g, i) => ({
          type: "project",
          expr: g,
          as: `key${i}`
        }))
      })
    }

    if (
      typeof color === "object" &&
      (color.type === "quantitative" || color.type === "ordinal")
    ) {
      transforms.push({
        type: "aggregate",
        fields: [colorProjection],
        ops: [null] ,
        as: ["strokeColor"],
        groupby: transform.groupby.map((g, i) => ({
          type: "project",
          expr: g,
          as: `key${i}`
        }))
      })
    }
    else {
      transforms.push({
        type: "aggregate",
        fields: [],
        ops: [null],
        as: [],
        groupby
      })
    }
    transforms.push({
      type: "project",
      expr: `LAST_SAMPLE(${rowIdTable}.rowid)`,
      as: "rowid"
    })

  } else {
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
        as: "strokeWidth"
      })
    }

    if (
      typeof color === "object" &&
      (color.type === "quantitative" || color.type === "ordinal")
    ) {
      transforms.push({
        type: "project",
        expr: color.type === "quantitative" ? color.aggregate.field : color.field,
        as: "strokeColor"
      })
    }

    transforms.push({
      type: "project",
      expr: `${rowIdTable}.rowid`,
      as: "rowid"
    })
    transforms.push({
      type: "project",
      expr: `${geocol}`
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

function getScales({ size, color }, layerName, scaleDomainFields, xformDataSource) {
  const scales = []

  if (typeof size === "object" && size.type === "quantitative") {
    scales.push({
      name: getSizeScaleName(layerName),
      type: "linear",
      domain: (size.domain === "auto" ? {data: xformDataSource, fields: scaleDomainFields.size} : size.domain),
      range: size.range,
      clamp: true
    })
  }

  if (typeof color === "object" && color.type === "ordinal") {
    scales.push({
      name: getColorScaleName(layerName),
      type: "ordinal",
      domain: (color.domain === "auto" ? {data: xformDataSource, fields: scaleDomainFields.color} : color.domain),
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
      name: getColorScaleName(layerName),
      type: "quantize",
      domain: (color.domain === "auto" ? {data: xformDataSource, fields: scaleDomainFields.color} : color.domain.map(c => adjustOpacity(c, color.opacity))),
      range: color.range,
      nullValue: adjustOpacity("#CACACA", color.opacity)
    })
  }

  return scales
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

  function getAutoColorVegaTransforms(aggregateNode) {
    const rtnobj = {transforms: [], fields: []}
    if (state.encoding.color.type === "quantitative") {
      const minoutput = "mincolor", maxoutput = "maxcolor"
      aggregateNode.fields = aggregateNode.fields.concat(["strokeColor", "strokeColor", "strokeColor", "strokeColor"])
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
        format: {
          type: "lines",
          coords: {
            x: [state.encoding.geocol],
            y: [{"from": state.encoding.geocol}]
          },
          "layout": "interleaved"
        },
        geocolumn: state.encoding.geocol,
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

      data.push({
        name: getStatsLayerName(),
        source: layerName,
        transform: transforms
      })
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
              typeof state.mark === "object" ? state.mark.lineJoin : "miter",
            miterLimit:
              typeof state.mark === "object" ? state.mark.miterLimit : 10
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

  createVegaAttrMixin(_layer, "size", 3, 1, true)

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

  _layer._genVega = function(chart, layerName, group, query) {

    // needed to set LastFilteredSize when point map first initialized
    // if (
    //   _layer.yDim()
    // ) {
    //   _layer.yDim().groupAll().valueAsync().then(value => {
    //     setLastFilteredSize(_layer.crossfilter().getId(), value)
    //   })
    // }

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

  const renderAttributes = [
    "x",
    "y",
    "strokeColor",
    "strokeWidth",
    "lineJoin",
    "miterLimit"
  ]

  _layer._addRenderAttrsToPopupColumnSet = function(chart, popupColsSet) {
    // add the poly geometry to the query

    if (chart._useGeoTypes) {
      if (state.encoding.geocol) {
        popupColsSet.add(state.encoding.geocol)
      }
    } else {
      popupColsSet.add(polyTableGeomColumns.verts_LEGACY)
      popupColsSet.add(polyTableGeomColumns.linedrawinfo_LEGACY)
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
    if (
      (state.encoding.geocol && results[state.encoding.geocol]) ||
      (results[polyTableGeomColumns.verts_LEGACY] &&
        results[polyTableGeomColumns.linedrawinfo_LEGACY])
    ) {
      return true
    }
    return false
  }


  _layer._destroyLayer = function(chart) {
  }

  return _layer
}