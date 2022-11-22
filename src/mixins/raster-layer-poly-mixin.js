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
import { lastFilteredSize } from "../core/core-async"
import parseFactsFromCustomSQL from "../utils/custom-sql-parser"
import { buildContourSQL, isContourType } from "../utils/utils-contour"

const polyDefaultScaleColor = "#d6d7d6"
const polyNullScaleColor = "#d6d7d6"
const polyDefaultScaleOpacity = 0.65

const vegaLineJoinOptions = ["miter", "round", "bevel"]
const polyTableGeomColumns = {
  // NOTE: the verts are interleaved x,y, so verts[0] = vert0.x, verts[1] = vert0.y, verts[2] = vert1.x, verts[3] = vert1.y, etc.
  // NOTE: legacy columns can be removed once pre-geo rendering is no longer used
  verts_LEGACY: "heavyai_geo_coords",
  indices_LEGACY: "heavyai_geo_indices",
  linedrawinfo_LEGACY: "heavyai_geo_linedrawinfo",
  polydrawinfo_LEGACY: "heavyai_geo_polydrawinfo"
}

function validateLineJoin(newLineJoin) {
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

const getStatsLayerName = layerName => layerName + "_stats"
function validateMiterLimit(newMiterLimit) {
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

  const _scaledPopups = {}

  let _customFetchColorAggregate = aggregate => aggregate

  _layer.setCustomFetchColorAggregate = function(func) {
    _customFetchColorAggregate = func
  }

  let _customColorProjectionPostProcessor = (aggregate, projections) =>
    projections

  _layer.setCustomColorProjectionPostProcessor = function(func) {
    _customColorProjectionPostProcessor = func
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

  _layer.getProjections = function() {
    return _layer
      .getTransforms({
        bboxFilter: "",
        filter: "",
        globalFilter: "",
        layerFilter: _layer.filters(),
        filtersInverse: _layer.filtersInverse(),
        state,
        lastFilteredSize: _layer.filters().length
          ? _layer.getState().bboxCount
          : lastFilteredSize(_layer.crossfilter().getId())
      })
      .filter(
        transform =>
          transform.type === "project" &&
          transform.hasOwnProperty("as") &&
          transform.as !== "key0"
      )
      .map(projection => parser.parseTransform({ select: [] }, projection))
      .map(sql => sql.select[0])
  }

  function doJoin() {
    return state.data.length > 1
  }

  _layer.getTransforms = function({
    bboxFilter,
    filter,
    globalFilter,
    layerFilter,
    filtersInverse,
    state,
    lastFilteredSize,
    isDataExport
  }) {
    /* eslint complexity: ["error", 50] */ // this function is too complex. Sorry.
    const {
      encoding: { color, geocol, geoTable }
    } = state

    const transforms = []

    // Adds *+ cpu_mode */ in data export query since we are limiting to some number of rows.
    transforms.push({
      type: "project",
      expr: `${
        isDataExport && !doJoin() ? "/*+ cpu_mode */ " : ""
      }${geoTable}.${geocol}`,
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
          _customFetchColorAggregate(color.aggregate)
        ))
      }

      // eslint-disable-next-line no-extra-semi
      ;({
        colorProjection,
        colorProjectionAs,
        colorField
      } = _customColorProjectionPostProcessor(color.aggregate, {
        colorProjection,
        colorProjectionAs,
        colorField
      }))

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

      if (layerFilter.length && !isDataExport) {
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
      } else if (layerFilter.length && isDataExport) {
        transforms.push({
          type: "filter",
          expr: parser.parseExpression({
            type: filtersInverse ? "not in" : "in",
            expr: `${withAlias}.key0`,
            set: layerFilter
          })
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
        color.type === "quantitative" && typeof color.aggregate === "string"
          ? color.aggregate
          : color.field

      if (color.type !== "solid" && !layerFilter.length) {
        transforms.push({
          type: "project",
          expr: colorField,
          as: "color"
        })
      }
      if (layerFilter.length && !isDataExport) {
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
      } else if (layerFilter.length && isDataExport) {
        // For Choropleth Data Export, if we have poly selection filter, we don't need to gray out unfiltered polygons
        // Thus, no CASE statement necessary, and we need to include the selected rowid in WHERE clause
        transforms.push({
          type: "filter",
          expr: parser.parseExpression({
            type: filtersInverse ? "not in" : "in",
            expr: "rowid",
            set: layerFilter
          })
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
    return state.encoding.color && state.encoding.color.domain === "auto"
  }

  function getPolygonScale({ state, layerFilter, layerName, autocolors }) {
    const useColorScale = !(state.encoding.color.type === "solid")
    let scale
    let fillColor
    if (layerFilter.length && !useColorScale) {
      const colorScaleName = getColorScaleName(layerName)
      const hasShowOther =
        state.encoding.color.hasOwnProperty("showOther") &&
        state.encoding.color.showOther === false
      scale = {
        name: colorScaleName,
        type: "ordinal",
        domain: [1],
        range: [
          adjustOpacity(
            state.encoding.color.value,
            state.encoding.color.opacity
          )
        ],
        nullValue: adjustOpacity(
          polyNullScaleColor,
          state.encoding.color.opacity || polyDefaultScaleOpacity
        ),
        default: adjustOpacity(
          polyDefaultScaleColor,
          hasShowOther
            ? 0
            : state.encoding.color.opacity || polyDefaultScaleOpacity
        )
      }
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
        scale = {
          name: colorScaleName,
          type: "quantize",
          domain: autocolors
            ? {
                data: getStatsLayerName(layerName),
                fields: ["mincolor", "maxcolor"]
              }
            : state.encoding.color.domain,
          range: colorRange,
          nullValue: adjustOpacity(
            polyNullScaleColor,
            state.encoding.color.opacity || polyDefaultScaleOpacity
          ),
          default: adjustOpacity(
            polyDefaultScaleColor,
            state.encoding.color.opacity || polyDefaultScaleOpacity
          )
        }
      } else {
        const hasShowOther =
          state.encoding.color.hasOwnProperty("showOther") &&
          state.encoding.color.showOther === false
        scale = {
          name: colorScaleName,
          type: "ordinal",
          domain: state.encoding.color.domain,
          range: colorRange,
          nullValue: adjustOpacity(
            polyNullScaleColor,
            state.encoding.color.opacity || polyDefaultScaleOpacity
          ),
          default: adjustOpacity(
            state.encoding.color.defaultOtherRange ||
              state.encoding.color.default,

            hasShowOther
              ? 0 // When Other is toggled OFF, we make the Other category transparent
              : state.encoding.color.opacity || polyDefaultScaleOpacity
          )
        }
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

    return {
      scale,
      fillColor
    }
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
    const state = _layer.getState()

    let data
    if (isContourType(state)) {
      const filterTransforms = _layer
        .getTransforms({
          bboxFilter,
          filter,
          globalFilter,
          layerFilter,
          filtersInverse,
          state,
          lastFilteredSize
        })
        .filter(f => f.type === "filter")
      const sql = buildContourSQL({
        state,
        filterTransforms,
        isPolygons: true
      })
      data = [
        {
          name: layerName,
          format: "polys",
          sql,
          enableHitTesting: false
        }
      ]
    } else {
      data = [
        {
          name: layerName,
          format: "polys",
          sql: parser.writeSQL({
            type: "root",
            source: doJoin()
              ? `${state.data[1].table}, ${withAlias}`
              : `${state.data[0].table}`,
            transform: _layer.getTransforms({
              bboxFilter,
              filter,
              globalFilter,
              layerFilter,
              filtersInverse,
              state,
              lastFilteredSize
            })
          }),
          enableHitTesting: true // poly enableHitTesting will be always true to support 1. Hittesting 2. poly selection filter
        }
      ]
    }

    if (autocolors) {
      data.push({
        name: getStatsLayerName(layerName),
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
    let fillColor = "#AAAAAA"
    if (isContourType(state)) {
      scales.push({
        name: "contour_fill",
        type: state.encoding.color.type,
        domain: state.encoding.color.domain,
        range: state.encoding.color.range.map(c =>
          adjustOpacity(c, state.encoding.color.opacity)
        )
      })
    } else {
      const { scale, fillColor: polyFillColor } = getPolygonScale({
        state,
        layerFilter,
        layerName,
        autocolors
      })
      if (scale) {
        scales.push(scale)
      }
      fillColor = polyFillColor
    }

    const marks = []
    if (isContourType(state)) {
      marks.push({
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
          fillColor: {
            field: "contour_values",
            scale: "contour_fill"
          },
          strokeColor: "white",
          strokeWidth: 0,
          lineJoin: "bevel"
        },
        transform: {
          projection: "mercator_map_projection"
        }
      })
    } else {
      const defaultMarkOptions = {
        strokeColor: "white",
        lineJoin: "miter",
        miterLimit: 10,
        strokeWidth: 0
      }
      const mark =
        typeof state.mark === "object" ? state.mark : defaultMarkOptions

      marks.push({
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
          /*
            "fillColor" is a special keyword to set strokeColor the same as fillColor
            otherwise it will be strokeColor or white
          */
          strokeColor:
            mark.strokeColor === "fillColor" ? fillColor : mark.strokeColor,
          strokeWidth: mark.strokeWidth,
          lineJoin: mark.lineJoin,
          miterLimit: mark.miterLimit
        }
      })
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

  _layer._requiresCap = function() {
    // polys don't require a cap
    return false
  }

  _layer.viewBoxDim = createRasterLayerGetterSetter(_layer, null)

  _layer._genVega = function(chart, layerName) {
    let polyFilterString = ""
    let bboxFilter = ""
    if (!isContourType(_layer.getState())) {
      const mapBounds = chart.map().getBounds()

      const state = _layer.getState()
      const columnExpr = `${state.encoding.geoTable}.${state.encoding.geocol}`

      bboxFilter = `ST_XMax(${columnExpr}) >= ${mapBounds._sw.lng} AND ST_XMin(${columnExpr}) <= ${mapBounds._ne.lng} AND ST_YMax(${columnExpr}) >= ${mapBounds._sw.lat} AND ST_YMin(${columnExpr}) <= ${mapBounds._ne.lat}`

      const allFilters = _layer.crossfilter().getFilter(layerName)
      const otherChartFilters = allFilters.filter(
        (f, i) =>
          i !== _layer.dimension().getDimensionIndex() && f !== "" && f !== null
      )

      let firstElem = true

      otherChartFilters.forEach(value => {
        if (!firstElem) {
          polyFilterString += " AND "
        }
        firstElem = false
        polyFilterString += value
      })
    }

    _vega = _layer.__genVega({
      chart,
      layerName,
      bboxFilter,
      filter: polyFilterString,
      globalFilter: _layer.crossfilter().getGlobalFilterString(),
      layerFilter: _layer.filters(),
      lastFilteredSize: _layer.getState().bboxCount,
      filtersInverse: _layer.filtersInverse(),
      useProjection: chart.useGeoTypes()
    })
    return _vega
  }

  _layer._addRenderAttrsToPopupColumnSet = function(chart, popupColsSet) {
    // add the poly geometry to the query

    if (chart.useGeoTypes()) {
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

    if (_filtersArray.length && filterCol) {
      _layer.dimension().filterMulti(_filtersArray, undefined, isInverseFilter)
    } else {
      _layer.filterAll(chart)
    }
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

    const filterKey = "key0" in data ? "key0" : "rowid"

    chart.hidePopup()
    events.trigger(() => {
      new Promise(resolve => {
        _layer.filter(data[filterKey], isInverseFilter, filterKey, chart)
        _listeners.filtered(_layer, _filtersArray)
        chart.filter(data[filterKey], isInverseFilter)
        resolve("filtered")
      }).then(() => {
        chart.redrawGroup()
      })
    })
  }

  _layer._hidePopup = function(chart, hideCallback) {
    const mapPoly = chart.select(".map-poly")
    if (mapPoly) {
      if (_scaledPopups[chart]) {
        mapPoly.classed("removePoly", true)
      } else {
        mapPoly.classed("fadeOutPoly", true)
      }

      if (hideCallback) {
        mapPoly.on("animationend", () => {
          hideCallback(chart)
        })
      }

      delete _scaledPopups[chart]
    }
  }

  _layer._destroyLayer = function() {
    _layer.on("filtered", null)
    const viewBoxDim = _layer.viewBoxDim()
    const dim = _layer.dimension()
    if (viewBoxDim) {
      viewBoxDim.dispose()
    }
    if (dim) {
      dim.dispose()
    }
  }

  return _layer
}
