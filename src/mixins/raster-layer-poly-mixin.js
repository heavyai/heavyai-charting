import {
  adjustOpacity,
  createRasterLayerGetterSetter,
  createVegaAttrMixin,
  __displayPopup,
  renderAttributes
} from "../utils/utils-vega"
import d3 from "d3"
import { events } from "../core/events"
import { parser } from "../utils/utils"


const polyDefaultScaleColor = "rgba(214, 215, 214, 0.65)"
const polyNullScaleColor = "rgba(214, 215, 214, 0.65)"

const vegaLineJoinOptions = ["miter", "round", "bevel"]
const polyTableGeomColumns = {
  // NOTE: the verts are interleaved x,y, so verts[0] = vert0.x, verts[1] = vert0.y, verts[2] = vert1.x, verts[3] = vert1.y, etc.
  // NOTE: legacy columns can be removed once pre-geo rendering is no longer used
  verts_LEGACY: "mapd_geo_coords",
  indices_LEGACY: "mapd_geo_indices",
  linedrawinfo_LEGACY: "mapd_geo_linedrawinfo",
  polydrawinfo_LEGACY: "mapd_geo_polydrawinfo"
}

function validateLineJoin(newLineJoin, currLineJoin) {
  if (typeof newLineJoin !== "string") {
    throw new Error(
      "Line join must be a string and must be one of " +
        vegaLineJoinOptions.join(", ")
    )
  }
  const lowCase = newLineJoin.toLowerCase()
  if (vegaLineJoinOptions.indexOf(lowCase) < 0) {
    throw new Error(
      "Line join must be a string and must be one of " +
        vegaLineJoinOptions.join(", ")
    )
  }
  return lowCase
}

function validateMiterLimit(newMiterLimit, currMiterLimit) {
  if (typeof newMiterLimit !== "number") {
    throw new Error("Miter limit must be a number.")
  } else if (newMiterLimit < 0) {
    throw new Error("Miter limit must be >= 0")
  }
}

export default function rasterLayerPolyMixin(_layer) {
  _layer.crossfilter = createRasterLayerGetterSetter(_layer, null)
  _layer.filtersInverse = createRasterLayerGetterSetter(_layer, false)
  _layer.colorDomain = createRasterLayerGetterSetter(_layer, null)

  createVegaAttrMixin(
    _layer,
    "lineJoin",
    vegaLineJoinOptions[0],
    vegaLineJoinOptions[0],
    false,
    {
      preDefault: validateLineJoin,
      preNull: validateLineJoin
    }
  )

  createVegaAttrMixin(_layer, "miterLimit", 10, 10, false, {
    preDefault: validateMiterLimit,
    preNull: validateMiterLimit
  })

  let state = null
  let _vega = null
  const _cf = null

  const _scaledPopups = {}

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

  function getTransforms({
    filter,
    globalFilter,
    layerFilter,
    filtersInverse
  }) {
    const { encoding: { color } } = state

    const transforms = []

    const groupby = doJoin()
      ? {
          type: "project",
          expr: `${state.data[0].table}.${state.data[0].attr}`,
          as: "key0"
        }
      : {}

    const rowIdTable = doJoin() ? state.data[1].table : state.data[0].table

    if (doJoin()) {
      // Join
      transforms.push({
        type: "filter",
        expr: `${state.data[0].table}.${state.data[0].attr} = ${
          state.data[1].table
        }.${state.data[1].attr}`
      })
    }

    const colorProjection =
      color.type === "quantitative"
        ? parser.parseExpression(color.aggregate)
        : `LAST_SAMPLE(${color.field})`

    if (layerFilter.length) {
      if (doJoin()) {
        transforms.push({
          type: "aggregate",
          fields: [parser.parseExpression({
            type: "case",
            cond: [
              [
                {
                  type: filtersInverse ? "not in" : "in",
                  expr: `${state.data[0].table}.${state.data[0].attr}`,
                  set: layerFilter
                },
                color.type === "solid" ? 1 : colorProjection
              ]
            ],
            else: null
          })],
          ops: [null],
          as: ["color"],
          groupby
        })
      } else {
        const colorField = color.type === "quantitative" ? color.aggregate.field : color.field // we need to refactor these two different object structure
        transforms.push({
          type: "project",
          expr: parser.parseExpression({
            type: "case",
            cond: [
              [
                {
                  type: filtersInverse ? "not in" : "in",
                  expr: "rowid",
                  set: layerFilter
                },
                // Note: When not performing a join, there is no dimension,
                // and color measures do not have aggregates. Just grab the
                // field.
                color.type === "solid" ? 1 : colorField
              ]
            ],
            else: null
          }),
          as: "color"
        })
      }
    } else if (doJoin()) {
        if (color.type !== "solid") {
          transforms.push({
            type: "aggregate",
            fields: [colorProjection],
            ops: [null],
            as: ["color"],
            groupby
          })
        } else {
          transforms.push({
            type: "aggregate",
            fields: [],
            ops: [null],
            as: [],
            groupby
          })
        }
      } else if (color.type !== "solid") {
        transforms.push({
          type: "project",
          expr: color.type === "quantitative" ? color.aggregate.field : color.field,
          as: "color"
        })
      }

    if (doJoin()) {
      transforms.push({
          type: "project",
          expr: `LAST_SAMPLE(${rowIdTable}.rowid)`,
          as: "rowid"
      })
    } else {
      transforms.push({
        type: "project",
        expr: `${rowIdTable}.rowid`,
        as: "rowid"
      })
    }

    if (typeof state.transform.limit === "number") {
      transforms.push({
        type: "limit",
        row: state.transform.limit
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

  function getColorScaleName(layerName) {
    return `${layerName}_fillColor`
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
    filter,
    globalFilter,
    layerFilter = [],
    filtersInverse,
    layerName,
    useProjection
  }) {
    const autocolors = usesAutoColors()
    const getStatsLayerName = () => layerName + "_stats"

    const data = [
      {
        name: layerName,
        format: "polys",
        geocolumn: state.encoding.geocol,
        sql: parser.writeSQL({
          type: "root",
          source: [...new Set(state.data.map(source => source.table))].join(
            ", "
          ),
          transform: getTransforms({
            filter,
            globalFilter,
            layerFilter,
            filtersInverse
          })
        })
      }
    ]

    if (autocolors) {
      data.push({
        name: getStatsLayerName(),
        source: layerName,
        transform: [
          {
            type: "aggregate",
            fields: ["color", "color", "color", "color"],
            ops: ["min", "max", "avg", "stddev"],
            as: ["mincol", "maxcol", "avgcol", "stdcol"]
          },
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
        ]
      })
    }

    const scales = []
    let fillColor = {}

    const useColorScale = !(state.encoding.color.type === "solid")
    if (layerFilter.length && !useColorScale) {
      const colorScaleName = getColorScaleName(layerName)
      scales.push({
        name: colorScaleName,
        type: "ordinal",
        domain: [1],
        range: [
          adjustOpacity(
            state.encoding.color.value,
            state.encoding.color.opacity
          )
        ],
        nullValue: polyNullScaleColor,
        default: polyDefaultScaleColor
      })
      fillColor = {
        scale: colorScaleName,
        field: "color"
      }
    } else if (useColorScale) {
      const colorRange = state.encoding.color.range.map(c =>
        adjustOpacity(c, state.encoding.color.opacity)
      )
      const colorScaleName = getColorScaleName(layerName)
      if (state.encoding.color.type === "quantitative") {
        scales.push({
          name: colorScaleName,
          type: "quantize",
          domain: autocolors
            ? { data: getStatsLayerName(), fields: ["mincolor", "maxcolor"] }
            : state.encoding.color.domain,
          range: colorRange,
          nullValue: polyNullScaleColor,
          default: polyDefaultScaleColor
        })
      } else {
        scales.push({
          name: colorScaleName,
          type: "ordinal",
          domain: state.encoding.color.domain,
          range: colorRange,
          nullValue: polyNullScaleColor,
          default: polyDefaultScaleColor
        })
      }

      fillColor = {
        scale: colorScaleName,
        field: "color"
      }
    } else {
      fillColor = {
        value: adjustOpacity(
          state.encoding.color.value,
          state.encoding.color.opacity
        )
      }
    }

    const marks = [
      {
        type: "polys",
        from: {
          data: layerName
        },
        properties: {
          x: {
            field: "x"
          },
          y: {
            field: "y"
          },
          fillColor,
          strokeColor:
            typeof state.mark === "object" ? state.mark.strokeColor : "white",
          strokeWidth:
            typeof state.mark === "object" ? state.mark.strokeWidth : 0.5,
          lineJoin:
            typeof state.mark === "object" ? state.mark.lineJoin : "miter",
          miterLimit:
            typeof state.mark === "object" ? state.mark.miterLimit : 10
        }
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

  _layer._requiresCap = function() {
    // polys don't require a cap
    return false
  }

  _layer._genVega = function(chart, layerName, group, query) {
    _vega = _layer.__genVega({
      layerName,
      filter: _layer
        .crossfilter()
        .getFilterString(_layer.dimension().getDimensionIndex()),
      globalFilter: _layer.crossfilter().getGlobalFilterString(),
      layerFilter: _layer.filters(),
      filtersInverse: _layer.filtersInverse(),
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

  let _filtersArray = []
  const _isInverseFilter = false
  const polyLayerEvents = ["filtered"]
  const _listeners = d3.dispatch.apply(d3, polyLayerEvents)

  _layer.filter = function(key, isInverseFilter) {
    if (isInverseFilter !== _layer.filtersInverse()) {
      _layer.filterAll()
      _layer.filtersInverse(isInverseFilter)
    }
    if (_filtersArray.includes(key)) {
      _filtersArray = _filtersArray.filter(v => v !== key)
    } else {
      _filtersArray = [..._filtersArray, key]
    }
    _filtersArray.length
      ? _layer
          .dimension()
          .filterMulti(_filtersArray, undefined, isInverseFilter)
      : _layer.dimension().filterAll()
  }

  _layer.filters = function() {
    return _filtersArray
  }

  _layer.filterAll = function() {
    _filtersArray = []
    _layer.dimension().filterAll()
  }

  _layer.on = function(event, listener) {
    _listeners.on(event, listener)
    return _layer
  }

  _layer._displayPopup = function(svgProps) {
    return __displayPopup({ ...svgProps, _vega, _layer, state})
  }

  _layer.onClick = function(chart, data, event) {
    if (!data) {
      return
    }
    const isInverseFilter = Boolean(event && (event.metaKey || event.ctrlKey))

    const filterKey = doJoin() ? "key0" : "rowid"
    chart.hidePopup()
    events.trigger(() => {
      _layer.filter(data[filterKey], isInverseFilter)
      chart.filter(data[filterKey], isInverseFilter)
      _listeners.filtered(_layer, _filtersArray)
      chart.redrawGroup()
    })
  }

  _layer._hidePopup = function(chart, hideCallback) {
    const mapPoly = chart.select(".map-poly")
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
    _layer.on("filtered", null)
    // deleteCanvas(chart)
  }

  return _layer
}
