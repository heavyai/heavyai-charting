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
import { lastFilteredSize, setLastFilteredSize } from "../core/core-async"
import parseFactsFromCustomSQL from "../utils/custom-sql-parser"

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
  const withAlias = "colors" // aliasing WITH clause for geo joined Choropleth

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

  _layer.getProjections = function() {
    return getTransforms({
      bboxFilter: "",
      filter: "",
      globalFilter: "",
      layerFilter: _layer.filters(),
      filtersInverse: _layer.filtersInverse(),
      lastFilteredSize: _layer.filters().length
        ? _layer.getState().bboxCount
        : lastFilteredSize(_layer.crossfilter().getId())
    })
      .filter(
        transform =>
          transform.type === "project" &&
          transform.hasOwnProperty("as") &&
          transform.as !== "key0" &&
          transform.as !== "color"
      )
      .map(projection => parser.parseTransform({ select: [] }, projection))
      .map(sql => sql.select[0])
  }

  function doJoin() {
    return state.data.length > 1
  }

  // eslint-disable-next-line complexity
  function getTransforms({
    bboxFilter,
    filter,
    globalFilter,
    layerFilter,
    filtersInverse,
    lastFilteredSize
  }) {
    const {
      encoding: { color, geocol, geoTable }
    } = state

    const transforms = []

    transforms.push({
      type: "project",
      expr: `${geoTable}.${geocol}`,
      as: geocol
    })

    if (doJoin()) {
      let colorProjection = [
        color.type === "quantitative"
          ? parser.parseExpression(color.aggregate)
          : `SAMPLE(${color.field})`
      ]
      let colorProjectionAs = ["color"]
      let colorField = `${withAlias}.color`
      if (typeof color.aggregate === "string") {
        // Custom SQL may include references to both the base table and the
        // geo-join table. The custom SQL is parsed to move references to the
        // base table into the WITH clause, and everything else outside in the
        // parent SELECT.
        // eslint-disable-next-line no-extra-semi
        ;({
          factProjections: colorProjection,
          factAliases: colorProjectionAs,
          expression: colorField
        } = parseFactsFromCustomSQL(
          state.data[0].table,
          withAlias,
          color.aggregate
        ))
      }

      const withClauseTransforms = []

      const groupby = {
        type: "project",
        expr: `${state.data[0].table}.${state.data[0].attr}`,
        as: "key0"
      }

      transforms.push(
        {
          type: "filter",
          expr: `${state.data[1].table}.${state.data[1].attr} = ${withAlias}.key0`
        },
        { type: "project", expr: `${withAlias}.key0`, as: "key0" }
      )
      if (typeof bboxFilter === "string" && bboxFilter.length) {
        transforms.push({
          type: "filter",
          expr: bboxFilter
        })
      }

      if (color.type !== "solid") {
        withClauseTransforms.push({
          type: "aggregate",
          fields: colorProjection,
          ops: [null],
          as: colorProjectionAs,
          groupby
        })

        if (!layerFilter.length) {
          transforms.push({
            type: "project",
            expr: colorField,
            as: "color"
          })
        }
      } else {
        withClauseTransforms.push({
          type: "aggregate",
          fields: [],
          ops: [null],
          as: [],
          groupby
        })
      }

      if (layerFilter.length) {
        transforms.push({
          type: "aggregate",
          fields: [
            parser.parseExpression({
              type: "case",
              cond: [
                [
                  {
                    type: filtersInverse ? "not in" : "in",
                    expr: `${withAlias}.key0`,
                    set: layerFilter
                  },
                  color.type === "solid" ? 1 : colorField
                ]
              ],
              else: null
            })
          ],
          ops: [null],
          as: ["color"],
          groupby: {}
        })
      }
      if (typeof filter === "string" && filter.length) {
        withClauseTransforms.push({
          type: "filter",
          expr: filter
        })
      }
      if (typeof globalFilter === "string" && globalFilter.length) {
        withClauseTransforms.push({
          type: "filter",
          expr: globalFilter
        })
      }
      transforms.push({
        type: "with",
        expr: `${withAlias}`,
        fields: {
          source: `${state.data[0].table}`,
          type: "root",
          transform: withClauseTransforms
        }
      })
    } else {
      const colorField =
        color.type === "quantitative"
          ? typeof color.aggregate === "string"
            ? color.aggregate
            : color.aggregate.field
          : color.field

      if (color.type !== "solid" && !layerFilter.length) {
        transforms.push({
          type: "project",
          expr: colorField,
          as: "color"
        })
      }
      if (layerFilter.length) {
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
      if (typeof filter === "string") {
        transforms.push({
          type: "filter",
          expr: filter !== "" ? `${bboxFilter} AND ${filter}` : bboxFilter
        })
      }

      if (typeof globalFilter === "string" && globalFilter.length) {
        transforms.push({
          type: "filter",
          expr: globalFilter
        })
      }
    }

    if (typeof state.transform.limit === "number") {
      const doSample = state.transform.sample
      const doRowid = layerFilter.length

      if (doSample && doRowid) {
        transforms.push({
          type: "sample",
          method: "multiplicativeRowid",
          expr: layerFilter,
          field: doJoin()
            ? `${withAlias}.key0`
            : `${state.data[0].table}.${state.data[0].attr}`,
          size: lastFilteredSize || state.transform.tableSize,
          limit: state.transform.limit,
          sampleTable: geoTable
        })
      } else if (doSample) {
        transforms.push({
          type: "sample",
          method: "multiplicative",
          expr: layerFilter,
          size: lastFilteredSize || state.transform.tableSize,
          limit: state.transform.limit,
          sampleTable: geoTable
        })
      }
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
    bboxFilter,
    filter,
    globalFilter,
    layerFilter = [],
    lastFilteredSize,
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
        sql: parser.writeSQL({
          type: "root",
          source: doJoin()
            ? `${state.data[1].table}, ${withAlias}`
            : `${state.data[0].table}`,
          transform: getTransforms({
            bboxFilter,
            filter,
            globalFilter,
            layerFilter,
            filtersInverse,
            lastFilteredSize
          })
        }),
        enableHitTesting: state.enableHitTesting
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
          default: state.encoding.color.default || polyDefaultScaleColor
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

  _layer.viewBoxDim = createRasterLayerGetterSetter(_layer, null)

  _layer._genVega = function(chart, layerName, group) {
    const mapBounds = chart.map().getBounds()

    const columnExpr = `${_layer.getState().encoding.geoTable}.${
      _layer.getState().encoding.geocol
    }`

    const bboxFilter = `ST_XMax(${columnExpr}) >= ${mapBounds._sw.lng} AND ST_XMin(${columnExpr}) <= ${mapBounds._ne.lng} AND ST_YMax(${columnExpr}) >= ${mapBounds._sw.lat} AND ST_YMin(${columnExpr}) <= ${mapBounds._ne.lat}`

    const allFilters = _layer.crossfilter().getFilter()
    const otherChartFilters = allFilters.filter(
      (f, i) =>
        i !== _layer.dimension().getDimensionIndex() && f !== "" && f != null
    )

    let polyFilterString = ""
    let firstElem = true

    otherChartFilters.forEach(value => {
      if (!firstElem) {
        polyFilterString += " AND "
      }
      firstElem = false
      polyFilterString += value
    })

    _vega = _layer.__genVega({
      layerName,
      bboxFilter,
      filter: polyFilterString,
      globalFilter: _layer.crossfilter().getGlobalFilterString(),
      layerFilter: _layer.filters(),
      lastFilteredSize: _layer.getState().bboxCount,
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

  _layer.filter = function(key, isInverseFilter, filterCol, chart) {
    if (isInverseFilter !== _layer.filtersInverse()) {
      _layer.filterAll(chart)
      _layer.filtersInverse(isInverseFilter)
    }
    if (_filtersArray.includes(key)) {
      _filtersArray = _filtersArray.filter(v => v !== key)
    } else {
      _filtersArray = [..._filtersArray, key]
    }

    if (filterCol === "key0" && _layer.getState().data.length > 1) {
      // groupby col is always fact table column
      filterCol = `${_layer.getState().data[0].table}.${
        _layer.getState().data[0].attr
      }`
    }

    if (_filtersArray.length === 1 && filterCol) {
      _layer.dimension().set(() => [filterCol])
      _layer.viewBoxDim(null)
    }

    _filtersArray.length && filterCol
      ? _layer
          .dimension()
          .filterMulti(_filtersArray, undefined, isInverseFilter)
      : _layer.filterAll(chart)
  }

  _layer.filters = function() {
    return _filtersArray
  }

  _layer.filterAll = function(chart) {
    _filtersArray = []
    _layer.dimension().filterAll()
    const geoCol = `${_layer.getState().encoding.geoTable}.${
      _layer.getState().encoding.geocol
    }`

    // when poly selection filter cleared, we reapply the bbox filter for the NON geo joined poly
    // For geo joined poly, we don't run crossfilter
    if (_layer && _layer.getState().data && _layer.getState().data.length < 2) {
      const viewboxdim = _layer.dimension().set(() => [geoCol])
      const mapBounds = chart.map().getBounds()
      _layer.viewBoxDim(viewboxdim)
      _layer.viewBoxDim().filterST_Min_ST_Max({
        lonMin: mapBounds._sw.lng,
        lonMax: mapBounds._ne.lng,
        latMin: mapBounds._sw.lat,
        latMax: mapBounds._ne.lat
      })
    }

    _listeners.filtered(_layer, _filtersArray)
  }

  _layer.on = function(event, listener) {
    _listeners.on(event, listener)
    return _layer
  }

  _layer._displayPopup = function(svgProps) {
    return __displayPopup({ ...svgProps, _vega, _layer, state })
  }

  // We disabled polygon selection filter from Master layer if the chart has more than one poly layer in 4.7 release, FE-8685.
  // Since we run rowid filter on poly selection filter, it is not correct to run same rowid filter for all overlapping poly layers.
  // We need better UI/UX design for this
  function chartHasMoreThanOnePolyLayers(chart) {
    const polyLayers =
      chart && chart.getAllLayers().length
        ? chart.getAllLayers().filter(layer => layer.layerType() === "polys")
        : []
    return polyLayers.length > 1
  }

  _layer.onClick = function(chart, data, event) {
    if (!data) {
      return
    } else if (
      _layer.getState().currentLayer === "master" &&
      chartHasMoreThanOnePolyLayers(chart)
    ) {
      // don't filter from Master, FE-8685
      return
    }
    const isInverseFilter = Boolean(event && (event.metaKey || event.ctrlKey))

    const filterKey = Object.keys(data).find(k => k === "rowid" || k === "key0")

    chart.hidePopup()
    events.trigger(() => {
      _layer.filter(data[filterKey], isInverseFilter, filterKey, chart)
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
    const viewBoxDim = _layer.viewBoxDim()
    const dim = _layer.dimension()
    if (viewBoxDim) {
      viewBoxDim.dispose()
    }
    if (dim) {
      dim.dispose()
    }
    // deleteCanvas(chart)
  }

  return _layer
}
