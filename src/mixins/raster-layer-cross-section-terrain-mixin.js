import assert from "assert"
import { parser } from "../utils/utils"
import { AABox2d } from "@heavyai/draw/dist/draw"
import { lastFilteredSize } from "../core/core-async"
import { createRasterLayerGetterSetter } from "../utils/utils-vega"
import { isValidPostFilter } from "./raster-layer-point-mixin"
import RasterLayerContext from "./render-vega-lite/RasterLayerContext"
import {
  GeographicChannelDescriptor,
  PositionChannelDescriptor,
  PropLocation
} from "./render-vega-lite/PropDescriptor/CommonChannelDescriptors"
import StringPropDescriptor from "./render-vega-lite/PropDescriptor/BaseTypes/StringPropDescriptor"
import NumericPropDescriptor from "./render-vega-lite/PropDescriptor/BaseTypes/NumericPropDescriptor"
import { is_zero_to_one } from "./render-vega-lite/PropDescriptor/BaseTypes/NumericPropValidators"
import CrossSectionTerrainConfigDefinitionObject from "./render-vega-lite/Definitions/Mark/CrossSectionTerrainConfigDefinitionObject"
import { materializePropDescriptors } from "./render-vega-lite/RenderVegaLite"

// only used for jsdoc
// eslint-disable-next-line no-unused-vars
import VegaPropertyOutputState from "./render-vega-lite/VegaPropertyOutputState"

function createPostFilterTransform(post_filters) {
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

export default function rasterLayerCrossSectionTerrainMixin(_layer) {
  let state = null
  let yScaleName = "y"

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

  _layer.setYScaleName = function(setter) {
    if (typeof setter === "function") {
      yScaleName = setter(yScaleName)
    } else {
      yScaleName = setter
    }
    return _layer
  }

  _layer._getYScaleName = function() {
    return yScaleName
  }

  // NOTE: as of 11/14/22 the "getTransforms" method that is found in most of the other raster layer mixin classes
  // only seems to be called from immerse via the buildRasterExportSql() method in raster-sql.ts
  //
  // It is not currently believed that terrain layer marks need to support export, so the "getTransforms" method is not
  // going to be included

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
    "strokeColor",
    new StringPropDescriptor(
      "strokeColor",
      null,
      PropLocation.kMarkDefOnly,
      null,
      false
    )
  )
  prop_descriptors.set(
    "strokeWidth",
    new NumericPropDescriptor(
      "strokeWidth",
      null,
      PropLocation.kMarkDefOnly,
      null,
      false,
      is_zero_to_one
    )
  )
  prop_descriptors.set(
    "fillBelowLine",
    new NumericPropDescriptor(
      "fillBelowLine",
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
    layerName
  }) {
    const raster_layer_context = new RasterLayerContext(
      chart,
      table,
      CrossSectionTerrainConfigDefinitionObject.key,
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

    const post_filter_transform = createPostFilterTransform(state.postFilters)

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
        type: CrossSectionTerrainConfigDefinitionObject.key,
        from: {
          data: layerName
        },
        properties: Object.assign({}, ...mark_properties)
      }
    ]

    return { data, scales: vega_scales, marks }
  }

  function isCrossFilterObject(obj) {
    if (
      Object.hasOwn(obj, "type") &&
      Object.hasOwn(obj, "getCrossfilter") &&
      Object.hasOwn(obj, "filter")
    ) {
      // is this safe to assume that if these properties exist, then the object
      // is a crossfilter-related object?
      return true
    }
    return false
  }

  function createCrossfilterDimensionProxy(range) {
    let range_ = [...range]
    return {
      type: "crossfilter_dimension_proxy",
      getFilter: () => [range_],
      filter: new_range => {
        range_ = new_range
      },
      dispose: () => {}
    }
  }

  _layer.xDim = createRasterLayerGetterSetter(_layer, null, new_val => {
    if (isCrossFilterObject(new_val)) {
      return new_val
    }
    return createCrossfilterDimensionProxy(new_val)
  })
  _layer.yDim = createRasterLayerGetterSetter(_layer, null, new_val => {
    if (isCrossFilterObject(new_val)) {
      return new_val
    }
    return createCrossfilterDimensionProxy(new_val)
  })

  let _vega = null
  const _cf = null
  _layer.crossfilter = createRasterLayerGetterSetter(_layer, _cf)

  _layer._genVega = function(chart, layerName) {
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
