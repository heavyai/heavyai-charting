import {
  adjustOpacity,
  createRasterLayerGetterSetter,
  createVegaAttrMixin
} from "../utils/utils-vega"
import d3 from "d3"
import { events } from "../core/events"
import { parser } from "../utils/utils"
import wellknown from "wellknown"
import {AABox2d, Point2d} from "@mapd/mapd-draw/dist/mapd-draw"

// NOTE: Reqd until ST_Transform supported on projection columns
function conv4326To900913(x, y) {
  const transCoord = [0.0, 0.0]
  transCoord[0] = x * 111319.49077777777778
  transCoord[1] =
    Math.log(Math.tan((90.0 + y) * 0.00872664625997)) * 6378136.99911215736947
  return transCoord
}

const vegaLineJoinOptions = ["miter", "round", "bevel"]
const polyTableGeomColumns = {
  // NOTE: the verts are interleaved x,y, so verts[0] = vert0.x, verts[1] = vert0.y, verts[2] = vert1.x, verts[3] = vert1.y, etc.
  geo: "mapd_geo", // TODO(croot): need to handle tables with either more than 1 geo column or columns with custom names
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

  function getTransforms({
    filter,
    globalFilter,
    layerFilter = [],
    filtersInverse
  }) {
    const selfJoin = state.data[0].table === state.data[1].table

    const groupby = {
      type: "project",
      expr: `${state.data[0].table}.${state.data[0].attr}`,
      as: "key0"
    }

    const transforms = [
      {
        type: "rowid",
        table: state.data[1].table
      },
      !selfJoin && {
        type: "filter",
        expr: `${state.data[0].table}.${state.data[0].attr} = ${
          state.data[1].table
        }.${state.data[1].attr}`
      },
      {
        type: "aggregate",
        fields: [
          layerFilter.length
            ? parser.parseExpression({
                type: "case",
                cond: [
                  [
                    {
                      type: filtersInverse ? "not in" : "in",
                      expr: `${state.data[0].table}.${state.data[0].attr}`,
                      set: layerFilter
                    },
                    parser.parseExpression(state.encoding.color.aggregrate)
                  ]
                ],
                else: null
              })
            : parser.parseExpression(state.encoding.color.aggregrate)
        ],
        ops: [null],
        as: ["color"],
        groupby
      }
    ]

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
    layerFilter,
    filtersInverse,
    layerName,
    useProjection
  }) {
    const autocolors = usesAutoColors()
    const getStatsLayerName = () => layerName + "_stats"

    const colorRange = state.encoding.color.range.map(c =>
      adjustOpacity(c, state.encoding.color.opacity)
    )

    const data = [
      {
        name: layerName,
        format: "polys",
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
            type:   "aggregate",
            fields: ["color"],
            ops:    [{type: "quantile", numQuantiles: colorRange.length}],
            as:     ["quant_color"]
          }
        ]
      })
    }

    const colorScaleName = getColorScaleName(layerName)
    const scales = [
      {
        name: colorScaleName,
        type: (autocolors ? "threshold" : "quantize"),
        domain: 
          autocolors 
            ? {data: getStatsLayerName(), fields: ["quant_color"]}
            : state.encoding.color.domain,
        range: colorRange,
        nullValue: "rgba(214, 215, 214, 0.65)",
        default: "rgba(214, 215, 214, 0.65)"
      }
    ]

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
          fillColor: {
            scale: colorScaleName,
            field: "color"
          },
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

  const renderAttributes = [
    "x",
    "y",
    "fillColor",
    "strokeColor",
    "strokeWidth",
    "lineJoin",
    "miterLimit"
  ]

  _layer._addRenderAttrsToPopupColumnSet = function(chart, popupColsSet) {
    // add the poly geometry to the query

    if (chart._useGeoTypes) {
      popupColsSet.add(polyTableGeomColumns.geo)
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
      results[polyTableGeomColumns.geo] ||
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
  }

  _layer.on = function(event, listener) {
    _listeners.on(event, listener)
    return _layer
  }

  class PolySvgFormatter {
    /**
     * Builds the bounds from the incoming poly data
     * @param {AABox2d} out AABox2d to return
     * @param {object} data Object with return data from getResultRowForPixel()
     * @param {Number} width Width of the visualization div
     * @param {Number} height Height of the visualization div
     * @param {object} margin Margins of the visualization div
     * @param {Function} xscale d3 scale in x dimension from world space to pixel space (i.e. mercatorx-to-pixel)
     * @param {Function} yscale d3 scale in y dimension from world space to pixel space (i.e. mercatory-to-pixel)
     */
    getBounds(data, width, height, margins, xscale, yscale) {
      throw new Error("This must be overridden")
    }

    /**
     * Builds the svg path string to use with the d svg attr: 
     * https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
     * This function should be called after the getBounds().
     * The t/s arguments are the transformations to properly place the points underneath
     * a parent SVG group node. That node is what ultimately handles animations and such
     * so we need to transform all the points into local space. t is the translation
     * and s is the scale to transform the points from pixel space to model/object space.
     * @param {string} out Returns the svg path string
     * @param {Point2d} t Translation from world to object space.
     * @param {Number} s Scale from world to object space.
     */
    getSvgPath(t, s) {
      throw new Error("This must be overridden")
    }
  }

  class LegacySvgFormatter extends PolySvgFormatter {
    constructor() {
      super()
      this._polys = []
    }

    getBounds(data, width, height, margins, xscale, yscale) {
      // NOTE: this is handling legacy poly storage for backwards compatibility.
      // Once we've put everything post 4.0 behind us, this can be fully deprecated.
      //
      // verts and drawinfo should be valid as the _resultsAreValidForPopup()
      // method should've been called beforehand
      const verts = data[polyTableGeomColumns.verts_LEGACY]
      const drawinfo = data[polyTableGeomColumns.linedrawinfo_LEGACY]

      const startIdxDiff = drawinfo.length ? drawinfo[2] : 0
      const FLT_MAX = 1e37

      const bounds = AABox2d.create()
      const screenPt = Point2d.create()
      for (let i = 0; i < drawinfo.length; i = i + 4) {
        // Draw info struct:
        //     0: count,         // number of verts in loop -- might include 3 duplicate verts at end for closure
        //     1: instanceCount, // should always be 1
        //     2: firstIndex,    // the start index (includes x & y) where the verts for the loop start
        //     3: baseInstance   // irrelevant for our purposes -- should always be 0
        let polypts = []
        const count = (drawinfo[i] - 3) * 2 // include x&y, and drop 3 duplicated pts at the end
        const startIdx = (drawinfo[i + 2] - startIdxDiff) * 2 // include x&y
        const endIdx = startIdx + count // remove the 3 duplicate pts at the end
        for (let idx = startIdx; idx < endIdx; idx = idx + 2) {
          if (verts[idx] <= -FLT_MAX) {
            // -FLT_MAX is a separator for multi-polygons (like Hawaii,
            // where there would be a polygon per island), so when we hit a separator,
            // remove the 3 duplicate points that would end the polygon prior to the separator
            // and start a new polygon
            polypts.pop()
            polypts.pop()
            polypts.pop()
            this._polys.push(polypts)
            polypts = []
          } else {
            Point2d.set(screenPt, xscale(verts[idx]) + margins.left,
                        height - yscale(verts[idx + 1]) - 1 + margins.top)

            if (
              screenPt[0] >= 0 &&
              screenPt[0] <= width &&
              screenPt[1] >= 0 &&
              screenPt[1] <= height
            ) {
              AABox2d.encapsulatePt(bounds, bounds, screenPt)
            }
            polypts.push(screenPt[0])
            polypts.push(screenPt[1])
          }
        }

        this._polys.push(polypts)
      }

      return bounds
    }

    getSvgPath(t, s) {
      let rtnPointStr = ""
      this._polys.forEach(pts => {
        if (!pts) {
          return
        }

        let pointStr = ""
        for (let i = 0; i < pts.length; i = i + 2) {
          if (!isNaN(pts[i]) && !isNaN(pts[i+1])) {
            pointStr +=
              (pointStr.length ? "L" : "M") +
              (s * (pts[i] - t[0])) + "," +
              (s * (pts[i + 1] - t[1]))
          }
        }
        if (pointStr.length) {
          pointStr += "Z"
        }
        rtnPointStr += pointStr
      })
      return rtnPointStr
    }
  }

  function buildGeoProjection(width, height, margins, xscale, yscale, clamp = true, t = [0, 0], s = 1) {
    let _translation = t, _scale = s, _clamp = clamp

    const project = d3.geo.transform({
      point(lon, lat) {
        const projectedCoord = conv4326To900913(lon, lat)
        const pt = [_scale * (xscale(projectedCoord[0]) + margins.left - _translation[0]),
                    _scale * (height - yscale(projectedCoord[1]) - 1 + margins.top - _translation[1])]
        if (_clamp) {
          if (pt[0] >= 0 && pt[0] < width && pt[1] >= 0 && pt[1] < height) {
            return this.stream.point(pt[0], pt[1])
          }
        } else {
          return this.stream.point(pt[0], pt[1])
        }
      }
    })

    project.setTransforms = (t, s) => {
      _translation = t
      _scale = s
    }

    project.setClamp = (clamp) => {
      _clamp = Boolean(clamp)
    }

    return project
  }

  class GeoSvgFormatter extends PolySvgFormatter {
    constructor() {
      super()
      this._geojson = null
      this._projector = null
      this._d3projector = null
    }

    getBounds(data, width, height, margins, xscale, yscale) {
      const wkt = data[polyTableGeomColumns.geo]
      if (typeof wkt !== 'string') {
        throw new Error(`Cannot create SVG from geo polygon column "${polyTableGeomColumns.geo}". The data returned is not a WKT string. It is of type: ${typeof wkt}`)
      }
      this._geojson = wellknown.parse(wkt)
      this._projector = buildGeoProjection(width, height, margins, xscale, yscale, true)

      // NOTE: d3.geo.path() streaming requires polygons to duplicate the first vertex in the last slot
      // to complete a full loop. If the first vertex is not duplicated, the last vertex can be dropped.
      // This is currently a requirement for the incoming WKT string, but is not error checked by d3.
      this._d3projector = d3.geo.path().projection(this._projector)
      const d3bounds = this._d3projector.bounds(this._geojson)
      return AABox2d.create(d3bounds[0][0], d3bounds[0][1], d3bounds[1][0], d3bounds[1][1])
    }

    getSvgPath(t, s) {
      this._projector.setTransforms(t, s)
      this._projector.setClamp(false)
      return this._d3projector(this._geojson)
    }
  }

  _layer._displayPopup = function(
    chart,
    parentElem,
    data,
    width,
    height,
    margins,
    xscale,
    yscale,
    minPopupArea,
    animate
  ) {
    let geoPathFormatter = null
    if (chart._useGeoTypes) {
      geoPathFormatter = new GeoSvgFormatter()
    } else {
      geoPathFormatter = new LegacySvgFormatter()
    }

    const bounds = geoPathFormatter.getBounds(data, width, height, margins, xscale, yscale)

    // Check for 2 special cases:
    // 1) zoomed in so far in that the poly encompasses the entire view, so all points are
    //    outside the view
    // 2) the poly only has 1 point in view.
    // Both cases can be handled by checking whether the bounds is empty (infinite) in
    // either x/y or the bounds size is 0 in x/y.
    const boundsSz = AABox2d.getSize(Point2d.create(), bounds)
    if (!isFinite(boundsSz[0]) || boundsSz[0] === 0) {
      bounds[AABox2d.MINX] = 0
      bounds[AABox2d.MAXX] = width
      boundsSz[0] = width
    }
    if (!isFinite(boundsSz[1]) || boundsSz[1] === 0) {
      bounds[AABox2d.MINY] = 0
      bounds[AABox2d.MAXY] = height
      boundsSz[1] = height
    }

    // Get the data from the hit-test object used to drive render properties
    // These will be used to properly style the svg popup object
    const rndrProps = {}
    if (
      _vega &&
      Array.isArray(_vega.marks) &&
      _vega.marks.length > 0 &&
      _vega.marks[0].properties
    ) {
      const propObj = _vega.marks[0].properties
      renderAttributes.forEach(prop => {
        if (
          typeof propObj[prop] === "object" &&
          propObj[prop].field &&
          typeof propObj[prop].field === "string"
        ) {
          rndrProps[prop] = propObj[prop].field
        }
      })
    }

    // If the poly we hit-test is small, we'll scale it so that it
    // can be seen. The minPopupArea is the minimum area of the popup
    // poly, so if the poly's bounds is < minPopupArea, we'll scale it
    // up to that size.
    let scale = 1
    const scaleRatio = minPopupArea / AABox2d.area(bounds)
    const isScaled = scaleRatio > 1
    if (isScaled) {
      scale = Math.sqrt(scaleRatio)
    }

    // Now grab the style properties for the svg calculated from the vega
    const popupStyle = _layer.popupStyle()
    let fillColor = _layer.getFillColorVal(data[rndrProps.fillColor])
    let strokeColor = _layer.getStrokeColorVal(data[rndrProps.strokeColor])
    let strokeWidth
    if (typeof popupStyle === "object" && !isScaled) {
      fillColor = popupStyle.fillColor || fillColor
      strokeColor = popupStyle.strokeColor || strokeColor
      strokeWidth = popupStyle.strokeWidth
    }

    // build out the svg
    const svg = parentElem
      .append("svg")
      .attr("width", width)
      .attr("height", height)

    // transform svg node. This node will position the svg appropriately. Need
    // to offset according to the scale above (scale >= 1)
    const boundsCtr = AABox2d.getCenter(Point2d.create(), bounds)
    const xform = svg
      .append("g")
      .attr("class", "map-poly-xform")
      .attr(
        "transform",
        "translate(" +
          (scale * bounds[AABox2d.MINX] - (scale - 1) * boundsCtr[0]) +
          ", " +
          (scale * (bounds[AABox2d.MINY] + 1) -
            (scale - 1) * (boundsCtr[1] + 1)) +
          ")"
      )

    // now add a transform node that will be used to apply animated scales to
    // We want the animation to happen from the center of the bounds, so we
    // place the transform origin there.
    const group = xform
      .append("g")
      .attr("class", "map-poly")
      .attr("transform-origin", `${boundsSz[0] / 2} ${boundsSz[1] / 2}`)

    // inherited animation classes from css
    if (animate) {
      if (isScaled) {
        group.classed("popupPoly", true)
      } else {
        group.classed("fadeInPoly", true)
      }
    }

    // now apply the styles
    if (typeof strokeWidth === "number") {
      group.style("stroke-width", strokeWidth)
    }

    group
      .append("path")
      .attr("d", geoPathFormatter.getSvgPath(Point2d.create(bounds[AABox2d.MINX], bounds[AABox2d.MINY]), scale))
      .attr("class", "map-polygon-shape")
      .attr("fill", fillColor)
      .attr("fill-rule", "evenodd")
      .attr("stroke", strokeColor)
      .on("click", () => _layer.onClick(chart, data, d3.event))

    _scaledPopups[chart] = isScaled

    return bounds
  }

  _layer.onClick = function(chart, data, event) {
    if (!data) {
      return
    }
    const isInverseFilter = Boolean(event && (event.metaKey || event.ctrlKey))

    chart.hidePopup()
    events.trigger(() => {
      _layer.filter(data.key0, isInverseFilter)
      chart.filter(data.key0, isInverseFilter)
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
