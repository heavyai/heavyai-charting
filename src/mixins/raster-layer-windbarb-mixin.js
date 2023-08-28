import { lastFilteredSize } from "../core/core-async"
import { createRasterLayerGetterSetter } from "../utils/utils-vega"
import { parser } from "../utils/utils"
import { AGGREGATES, isValidPostFilter } from "./raster-layer-point-mixin"
import { AABox2d } from "@heavyai/draw/dist/draw"
import {
  ColorChannelDescriptor,
  OpacityChannelDescriptor,
  PositionChannelDescriptor,
  SizeChannelDescriptor,
  PropDescriptor,
  PropLocation
} from "./render-vega-lite/PropDescriptor/CommonChannelDescriptors"
import BoolPropDescriptor from "./render-vega-lite/PropDescriptor/BaseTypes/BoolPropDescriptor"
import NumericPropDescriptor from "./render-vega-lite/PropDescriptor/BaseTypes/NumericPropDescriptor"
import { is_zero_to_one } from "./render-vega-lite/PropDescriptor/BaseTypes/NumericPropValidators"
import RasterLayerContext from "./render-vega-lite/RasterLayerContext"
import WindBarbConfigDefinitionObject from "./render-vega-lite/Definitions/Mark/WindBarbConfigDefinitionObject"
import { materializePropDescriptors } from "./render-vega-lite/RenderVegaLite"

export default function rasterLayerWindBarbMixin(_layer) {
  let state = null

  /**
   * @type {VegaPropertyOutputState}
   */
  let _vega_property_output_state = null

  _layer.setState = function(setter) {
    if (typeof setter === "function") {
      state = setter(state)
    } else {
      state = setter
    }
    return _layer
  }
  _layer.getState = function() {
    return state
  }

  function create_post_filter_transform(post_filters) {
    const post_filter =
      post_filters && Array.isArray(post_filters) ? post_filters[0] : null // may change to map when we have more than one postFilter
    if (post_filter && isValidPostFilter(post_filter)) {
      return {
        type: "postFilter",
        table: post_filter.table || null,
        aggType: post_filter.aggType,
        custom: post_filter.custom,
        fields: [post_filter.value],
        ops: post_filter.operator,
        min: post_filter.min,
        max: post_filter.max
      }
    }
    return null
  }

  // eslint-disable-next-line complexity
  _layer.getTransforms = function(
    table,
    filter,
    globalFilter,
    { transform, encoding: { x, y, size, color }, postFilters },
    lastFilteredSize,
    isDataExport
  ) {
    // NOTE: as of 11/02/22 this function might only be called from immerse via the
    // buildRasterExportSql() method in raster-sql.ts
    // Currently it appears windbarbs are not supported in buildRasterExportSql(), so
    // this method should never be called, but if windbards are included in buildRasterExportSql(),
    // then this method would need to be filled out. In the meantime, the logic in here is mostly a direct
    // copy of the equivalent getTransforms method in raster-layer-point-mixin (minus the 'orientation' prop).
    // Using a direct copy because the state object that's build for the buildRasterExportSql() call is
    // very point specific, and is completely different than the state that is used to render the wind
    // barb, so we can just plop in the point code for now. It's also worth noting that rebuilding the state
    // json object in buildRasterExportSql() is very redundant. Why rebuild the state?  I don't see why
    // we cant just supply a getter to retrieve the current sql for a layer (tho with the isDataExport,
    // which can impact how the sql is generated in the end). Wouldn't that do what's intended and yet
    // be far less error prone?

    const transforms = []

    if (
      typeof transform === "object" &&
      typeof transform.groupby === "object" &&
      transform.groupby.length
    ) {
      const fields = isDataExport ? [] : [x.field, y.field]
      const alias = isDataExport ? [] : ["x", "y"]
      const ops = isDataExport ? [] : [x.aggregate, y.aggregate]

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

      // Since we use ST_POINT for pointmap data export, we need to include /*+ cpu_mode */ in pointmap chart data export queries.
      // The reason is ST_Point projections need buffer allocation to hold the coords and thus require cpu execution
      transforms.push({
        type: "aggregate",
        fields,
        ops,
        as: alias,
        // For some reason, we're receiving duplicate tables here, causing headaches w/ export SQL generation
        //  in heavyai-data-layer2. So, just gonna filter them out.
        //  https://heavyai.atlassian.net/browse/FE-14213
        groupby: [...new Set(transform.groupby)].map((g, i) => ({
          type: "project",
          expr: `${isDataExport && i === 0 ? "/*+ cpu_mode */ " : ""}${g}`,
          as: isDataExport ? g : `key${i}`
        }))
      })
      if (isDataExport) {
        transforms.push({
          type: "project",
          expr: `ST_SetSRID(ST_Point(${AGGREGATES[x.aggregate]}(${x.field}), ${
            AGGREGATES[y.aggregate]
          }(${y.field})), 4326) AS location`
        })
      }
    } else {
      if (isDataExport) {
        transforms.push({
          type: "project",
          expr: `/*+ cpu_mode */ ST_SetSRID(ST_Point(${x.field}, ${y.field}), 4326)`
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
      }

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
            limit: transform.limit,
            sampleTable: table
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
    }

    if (typeof filter === "string" && filter.length) {
      transforms.push({
        type: "filter",
        expr: filter
      })
    }

    const post_filter_transform = create_post_filter_transform(postFilters)
    if (post_filter_transform) {
      transforms.push(post_filter_transform)
    }

    if (typeof globalFilter === "string" && globalFilter.length) {
      transforms.push({
        type: "filter",
        expr: globalFilter
      })
    }

    return transforms
  }

  const color_prop_descriptor = new ColorChannelDescriptor("color", "")
  const prop_descriptors = new Map()

  prop_descriptors.set("x", new PositionChannelDescriptor("x"))
  prop_descriptors.set("y", new PositionChannelDescriptor("y"))

  // eslint-disable-next-line no-warning-comments
  // TODO(croot): support geo columns
  // prop_descriptors.set(
  //   "longitude",
  //   new GeographicChannelDescriptor("longitude", "x")
  // );
  // prop_descriptors.set(
  //   "latitude",
  //   new GeographicChannelDescriptor("latitude", "y")
  // );

  prop_descriptors.set("size", new SizeChannelDescriptor("size"))
  prop_descriptors.set("speed", new PropDescriptor("speed"))
  prop_descriptors.set("direction", new PropDescriptor("direction"))
  prop_descriptors.set(
    "fill",
    new ColorChannelDescriptor("fill", "fillColor", color_prop_descriptor)
  )
  prop_descriptors.set(
    "stroke",
    new ColorChannelDescriptor("stroke", "strokeColor", color_prop_descriptor)
  )
  prop_descriptors.set("opacity", new OpacityChannelDescriptor("opacity"))

  prop_descriptors.set(
    "quantizeDirection",
    new BoolPropDescriptor(
      "quantizeDirection",
      null,
      PropLocation.kMarkDefOnly,
      null,
      false
    )
  )
  prop_descriptors.set(
    "anchorScale",
    new NumericPropDescriptor(
      "anchorScale",
      null,
      PropLocation.kMarkDefOnly,
      null,
      false,
      is_zero_to_one
    )
  )

  _layer.__genVega = function({
    chart,
    table,
    filter,
    lastFilteredSize,
    globalFilter,
    pixelRatio,
    layerName
  }) {
    const raster_layer_context = new RasterLayerContext(
      chart,
      table,
      WindBarbConfigDefinitionObject.key,
      this,
      layerName,
      lastFilteredSize
    )

    _vega_property_output_state = materializePropDescriptors(
      raster_layer_context,
      prop_descriptors,
      state
    )
    const {
      sql_parser_transforms,
      vega_transforms,
      vega_scales,
      mark_properties
    } = _vega_property_output_state.flatten()

    if (typeof filter === "string" && filter.length) {
      sql_parser_transforms.push({
        type: "filter",
        expr: filter
      })
    }

    const post_filter_transform = create_post_filter_transform(
      state.postFilters
    )

    if (post_filter_transform) {
      sql_parser_transforms.push(post_filter_transform)
    }

    if (typeof globalFilter === "string" && globalFilter.length) {
      sql_parser_transforms.push({
        type: "filter",
        expr: globalFilter
      })
    }

    const data = [
      {
        name: layerName,
        sql: parser.writeSQL({
          type: "root",
          source: table,
          transform: sql_parser_transforms
        }),
        enableHitTesting: state.enableHitTesting
      },
      ...vega_transforms
    ]

    const marks = [
      {
        type: WindBarbConfigDefinitionObject.key,
        from: {
          data: layerName
        },
        properties: Object.assign({}, ...mark_properties)
      }
    ]

    return { data, scales: vega_scales, marks }
  }

  _layer.xDim = createRasterLayerGetterSetter(_layer, null)
  _layer.yDim = createRasterLayerGetterSetter(_layer, null)

  let _vega = null
  const _cf = null
  _layer.crossfilter = createRasterLayerGetterSetter(_layer, _cf)

  _layer._genVega = function(chart, layerName, group, query) {
    const realLayerName = layerName
    _vega = _layer.__genVega({
      chart,
      layerName,
      table: _layer.crossfilter().getDataSource(),
      filter: _layer.crossfilter().getFilterString(realLayerName),
      globalFilter: _layer.crossfilter().getGlobalFilterString(),
      lastFilteredSize: lastFilteredSize(_layer.crossfilter().getId()),
      pixelRatio: chart._getPixelRatio()
    })
    return _vega
  }

  _layer.getPrimaryColorScaleAndLegend = function() {
    let prop_descriptor = prop_descriptors.get("stroke")
    let scale_obj = _vega_property_output_state?.getScaleForProp(
      prop_descriptor
    )
    if (!scale_obj) {
      prop_descriptor = prop_descriptors.get("fill")
      scale_obj = _vega_property_output_state?.getScaleForProp(prop_descriptor)
      if (!scale_obj) {
        prop_descriptor = null
      }
    }
    const legend_obj = prop_descriptor
      ? _vega_property_output_state?.getLegendForProperty(prop_descriptor)
      : null
    return [scale_obj, legend_obj]
  }

  _layer._addRenderAttrsToPopupColumnSet = function(chart, popupColumnsSet) {
    // currently no-op
    // eslint-disable-next-line no-warning-comments
    // TODO(croot): needs to be filled in to support windbarb hit-testing
  }

  _layer._areResultsValidForPopup = function(results) {
    // eslint-disable-next-line no-warning-comments
    // TODO(croot): needs to be filled in to support windbarb hit-testing
    return true
  }

  _layer._displayPopup = function(svgProps) {
    // currently a no-op
    // eslint-disable-next-line no-warning-comments
    // TODO(croot): needs to be filled in to support windbarb hit-testing
    return AABox2d.create()
  }

  _layer._hidePopup = function(chart, hideCallback) {
    // currently a no-op
    // eslint-disable-next-line no-warning-comments
    // TODO(croot): needs to be filled in to support windbarb hit-testing
  }

  _layer._destroyLayer = function() {
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
