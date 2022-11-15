import assert from "assert"
import { parser } from "../utils/utils"
import { AABox2d } from "@heavyai/draw/dist/mapd-draw"
import { lastFilteredSize } from "../core/core-async"
import { createRasterLayerGetterSetter } from "../utils/utils-vega"
import { isValidPostFilter } from "./raster-layer-point-mixin"
import RasterLayerContext from "./render-vega-lite/RasterLayerContext"
import {
  ColorChannelDescriptor,
  GeographicChannelDescriptor,
  OpacityChannelDescriptor,
  PositionChannelDescriptor
} from "./render-vega-lite/PropDescriptor/CommonChannelDescriptors"
import Mesh2dConfigDefinitionObject from "./render-vega-lite/Definitions/Mark/Mesh2dConfigDefinitionObject"
import { materializePropDescriptors } from "./render-vega-lite/RenderVegaLite"

// only used for jsdoc
// eslint-disable-next-line no-unused-vars
import VegaPropertyOutputState from "./render-vega-lite/VegaPropertyOutputState"

// eslint-disable-next-line no-warning-comments
// TODO(croot): this seems like it is used in at least one other layer mixin. Make into a utility somewhere
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

export default function rasterLayerMesh2dMixin(_layer) {
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

  // NOTE: as of 11/14/22 the "getTransforms" method that is found in most of the other raster layer mixin classes
  // only seems to be called from immerse via the buildRasterExportSql() method in raster-sql.ts
  //
  // It is not currently believed that Mesh2d marks need to support export, so the "getTransforms" method is not
  // going to be included

  const color_prop_descriptor = new ColorChannelDescriptor("color", "")
  const prop_descriptors = new Map()

  prop_descriptors.set("x", new PositionChannelDescriptor("x"))
  prop_descriptors.set("y", new PositionChannelDescriptor("y"))

  prop_descriptors.set(
    "longitude",
    new GeographicChannelDescriptor("longitude", "x")
  )

  prop_descriptors.set(
    "latitude",
    new GeographicChannelDescriptor("latitude", "y")
  )

  prop_descriptors.set(
    "fill",
    new ColorChannelDescriptor("fill", "fillColor", color_prop_descriptor)
  )
  prop_descriptors.set("opacity", new OpacityChannelDescriptor("opacity"))
  prop_descriptors.set(
    "fillOpacity",
    new OpacityChannelDescriptor("fillOpacity")
  )

  _layer.__genVega = function({
    chart,
    table,
    filter,
    lastFilteredSize,
    globalFilter,
    // eslint-disable-next-line no-unused-vars
    pixelRatio,
    layerName
  }) {
    const raster_layer_context = new RasterLayerContext(
      chart,
      table,
      Mesh2dConfigDefinitionObject.key,
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
      vega_data_formats,
      vega_transforms,
      vega_scales,
      mark_properties
    } = _vega_property_output_state.flatten()

    assert(vega_data_formats.length <= 1)

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
        ...(vega_data_formats.length ? vega_data_formats[0] : {}),
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
        type: Mesh2dConfigDefinitionObject.key,
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

  // eslint-disable-next-line no-unused-vars
  _layer._genVega = function(chart, layerName, group, query) {
    const realLayerName = layerName
    _vega = _layer.__genVega({
      chart,
      layerName,
      table: _layer.crossfilter().getTable()[0],
      filter: _layer.crossfilter().getFilterString(realLayerName),
      globalFilter: _layer.crossfilter().getGlobalFilterString(),
      lastFilteredSize: lastFilteredSize(_layer.crossfilter().getId()),
      pixelRatio: chart._getPixelRatio()
    })
    return _vega
  }

  _layer.getPrimaryColorScaleAndLegend = function() {
    const prop_descriptor = prop_descriptors.get("fill")
    const scale_obj = _vega_property_output_state.getScaleForProp(
      prop_descriptor
    )
    const legend_obj = prop_descriptor
      ? _vega_property_output_state.getLegendForProperty(prop_descriptor)
      : null
    return [scale_obj, legend_obj]
  }

  _layer.useProjection = function() {
    const geographic_props = [
      prop_descriptors.get("longitude"),
      prop_descriptors.get("latitude")
    ]
    geographic_props.forEach(geographic_prop => assert(geographic_prop))
    return (
      _vega_property_output_state &&
      (_vega_property_output_state.has(geographic_props[0].prop_name) ||
        _vega_property_output_state.has(geographic_props[1].prop_name))
    )
  }

  // eslint-disable-next-line no-unused-vars
  _layer._addRenderAttrsToPopupColumnSet = function(chart, popupColumnsSet) {
    // currently no-op
    // eslint-disable-next-line no-warning-comments
    // TODO(croot): needs to be filled in to support mesh2d hit-testing
  }

  // eslint-disable-next-line no-unused-vars
  _layer._areResultsValidForPopup = function(results) {
    // eslint-disable-next-line no-warning-comments
    // TODO(croot): needs to be filled in to support mesh2d hit-testing
    return true
  }

  // eslint-disable-next-line no-unused-vars
  _layer._displayPopup = function(svgProps) {
    // currently a no-op
    // eslint-disable-next-line no-warning-comments
    // TODO(croot): needs to be filled in to support mesh2d hit-testing
    return AABox2d.create()
  }

  // eslint-disable-next-line no-unused-vars
  _layer._hidePopup = function(chart, hideCallback) {
    // currently a no-op
    // eslint-disable-next-line no-warning-comments
    // TODO(croot): needs to be filled in to support mesh2d hit-testing
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
