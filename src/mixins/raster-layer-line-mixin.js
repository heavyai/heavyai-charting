import {
  adjustOpacity, adjustRGBAOpacity, createRasterLayerGetterSetter,
  createVegaAttrMixin
} from "../utils/utils-vega";
import {lastFilteredSize, setLastFilteredSize} from "../core/core-async";
import {parser} from "../utils/utils";
import * as d3 from "d3";

const AUTOSIZE_DOMAIN_DEFAULTS = [100000, 0]
const AUTOSIZE_RANGE_DEFAULTS = [2.0, 5.0]
const AUTOSIZE_RANGE_MININUM = [1, 1]
const SIZING_THRESHOLD_FOR_AUTOSIZE_RANGE_MININUM = 1500000

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

  if (typeof color === "object" && color.type === "density") {
    scales.push({
      name: getColorScaleName(layerName),
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
      range: color.range
    })
  }

  return scales
}

export default function rasterLayerLineMixin(_layer) {
  let state = null
  _layer.colorDomain = createRasterLayerGetterSetter(_layer, null)
  _layer.sizeDomain = createRasterLayerGetterSetter(_layer, null)
debugger
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

  function usesAutoColors() {
    return state.encoding.color.domain === "auto"
  }

  function usesAutoSize() {
    return state.encoding.size.domain === "auto"
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
    // const autocolors = usesAutoColors()
    // const autosize = usesAutoSize()
    const getStatsLayerName = () => layerName + "_stats"
    const size = getSizing(
      state.encoding.size,
      state.transform && state.transform.limit,
      lastFilteredSize,
      pixelRatio,
      layerName
    )
\
    const rowIdTable = state.data[0].table

    const data = [
      {
        name: layerName,
        format: {
          type: "lines",
          coords: {
            x: [state.data[0].attr],
            y: [{"from": state.data[0].attr}]
          },
          "layout": "interleaved"
        },
        sql: parser.writeSQL({
          type: "root",
          source: table,
          transform: [
            {
            type: "project",
            expr:  `${rowIdTable}.${state.data[0].attr}`,
            as: state.data[0].attr
          }
          ]
          // transform: getTransforms(
          //   table,
          //   filter,
          //   globalFilter,
          //   lastFilteredSize
          // )
        })
      }
    ]
    const scaledomainfields = {}
    // if (autocolors || autosize) {
    //   const aggregateNode = {
    //     type: "aggregate",
    //     fields: [],
    //     ops: [],
    //     as: []
    //   }
    //   let transforms = [aggregateNode]
    //   if (autocolors) {
    //     const xformdata = getAutoColorVegaTransforms(aggregateNode)
    //     scaledomainfields.color = xformdata.fields
    //     transforms = transforms.concat(xformdata.transforms)
    //   }
    //   if (autosize) {
    //     const xformdata = getAutoSizeVegaTransforms(aggregateNode)
    //     scaledomainfields.size = xformdata.fields
    //     transforms = transforms.concat(xformdata.transforms)
    //   }
    //   data.push({
    //     name: getStatsLayerName(),
    //     source: layerName,
    //     transform: transforms
    //   })
    // }

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
            // strokeColor: getColor(state.encoding.color, layerName)
            strokeColor:
              typeof state.mark === "object" ? state.mark.strokeColor : "black",
            strokeWidth:
              typeof state.mark === "object" ? state.mark.strokeWidth : 1,
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

  _layer._destroyLayer = function(chart) {
  }

  return _layer
}