import {
  adjustOpacity,
  createRasterLayerGetterSetter,
  createVegaAttrMixin
} from "../utils/utils-vega"
import d3 from "d3"
import { events } from "../core/events"
import { parser } from "../utils/utils"

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
  verts: "mapd_geo_coords",
  ring_sizes: "mapd_geo_ring_sizes",
  poly_rings: "mapd_geo_poly_rings",
  // NOTE: legacy columns can be removed once pre-geo rendering is no longer used
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

  _layer.__genVega = function({
    filter,
    globalFilter,
    layerFilter,
    filtersInverse,
    layerName,
    useProjection
  }) {
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

    const scales = [
      {
        name: layerName + "_fillColor",
        type: "quantize",
        domain: state.encoding.color.domain,
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
            scale: layerName + "_fillColor",
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
    popupColsSet.add(polyTableGeomColumns.verts)

    if (chart._useGeoTypes) {
      popupColsSet.add(polyTableGeomColumns.ring_sizes)
      popupColsSet.add(polyTableGeomColumns.poly_rings)
    } else {
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
      (results[polyTableGeomColumns.verts] &&
        results[polyTableGeomColumns.ring_sizes]) ||
      (results[polyTableGeomColumns.verts] &&
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
    const polys = []

    // Only used for geotypes, but needs to be referenced when building the svg polystring
    const is_multi_ring_poly = []

    // bounds: [minX, maxX, minY, maxY]
    const bounds = [Infinity, -Infinity, Infinity, -Infinity]
    if (chart._useGeoTypes) {
      // verts and ring_sizes should be valid as the _resultsAreValidForPopup()
      // method should've been called beforehand
      const verts = data[polyTableGeomColumns.verts]
      const ring_sizes = data[polyTableGeomColumns.ring_sizes]
      let poly_rings = data[polyTableGeomColumns.poly_rings]

      // It is possible that the poly rings column is not populated. If not populated, we have a single polygon with number of rings equal to the number of entries in the ring sizes column
      if (poly_rings === null) {
        poly_rings = [ring_sizes.length]
      }

      // TODO(croot): when the bounds is added as a column to the poly db table, we
      // can just use those bounds rather than build our own
      // But until then, we need to build our own bounds -- we use this to
      // find the reasonable center of the geom and scale from there when
      // necessary

      const processPoly = function(verts) {
        const polypts = []
        for (let idx = 0; idx < verts.length; idx += 2) {
          const projectedCoord = conv4326To900913(verts[idx], verts[idx + 1])

          const screenX = xscale(projectedCoord[0]) + margins.left
          const screenY = height - yscale(projectedCoord[1]) - 1 + margins.top

          if (
            screenX >= 0 &&
            screenX <= width &&
            screenY >= 0 &&
            screenY <= height
          ) {
            if (bounds[0] === Infinity) {
              bounds[0] = screenX
              bounds[1] = screenX
              bounds[2] = screenY
              bounds[3] = screenY
            } else {
              if (screenX < bounds[0]) {
                bounds[0] = screenX
              } else if (screenX > bounds[1]) {
                bounds[1] = screenX
              }

              if (screenY < bounds[2]) {
                bounds[2] = screenY
              } else if (screenY > bounds[3]) {
                bounds[3] = screenY
              }
            }
          }
          polypts.push(screenX)
          polypts.push(screenY)
        }
        return polypts
      }

      // process each ring
      let ring_start = 0
      let poly_count = 0
      let poly_ring_idx = 0
      for (let ring = 0; ring < ring_sizes.length; ring++) {
        const ring_slice = verts.slice(
          ring_start * 2,
          (ring_start + ring_sizes[ring]) * 2
        )

        const polypts = processPoly(ring_slice)

        if (poly_rings[poly_count] === 1) {
          polys.push(polypts)
          poly_count++
          is_multi_ring_poly[poly_count] = false
        } else {
          is_multi_ring_poly[poly_count] = true
          if (poly_ring_idx === 0) {
            polys.push([polypts])
          } else {
            polys[poly_count].push(polypts)
          }
          if (++poly_ring_idx === polys[poly_count]) {
            poly_count++
            poly_ring_idx = 0
          }
        }

        ring_start += ring_sizes[ring]
      }
    } else {
      // verts and drawinfo should be valid as the _resultsAreValidForPopup()
      // method should've been called beforehand
      const verts = data[polyTableGeomColumns.verts]
      const drawinfo = data[polyTableGeomColumns.linedrawinfo_LEGACY]

      const startIdxDiff = drawinfo.length ? drawinfo[2] : 0

      const FLT_MAX = 1e37

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
            polys.push(polypts)
            polypts = []
          } else {
            const screenX = xscale(verts[idx]) + margins.left
            const screenY = height - yscale(verts[idx + 1]) - 1 + margins.top

            if (
              screenX >= 0 &&
              screenX <= width &&
              screenY >= 0 &&
              screenY <= height
            ) {
              if (bounds[0] === Infinity) {
                bounds[0] = screenX
                bounds[1] = screenX
                bounds[2] = screenY
                bounds[3] = screenY
              } else {
                if (screenX < bounds[0]) {
                  bounds[0] = screenX
                } else if (screenX > bounds[1]) {
                  bounds[1] = screenX
                }

                if (screenY < bounds[2]) {
                  bounds[2] = screenY
                } else if (screenY > bounds[3]) {
                  bounds[3] = screenY
                }
              }
            }
            polypts.push(screenX)
            polypts.push(screenY)
          }
        }

        polys.push(polypts)
      }
    }

    if (bounds[0] === Infinity) {
      bounds[0] = 0
    }
    if (bounds[1] === -Infinity) {
      bounds[1] = width
    }
    if (bounds[2] === Infinity) {
      bounds[2] = 0
    }
    if (bounds[3] === -Infinity) {
      bounds[3] = height
    }

    // NOTE: we could hit the case where the bounds is 0
    // if 1 point is visible in screen
    // Handle that here
    if (bounds[0] === bounds[1]) {
      bounds[0] = 0
      bounds[1] = width
    }
    if (bounds[2] === bounds[3]) {
      bounds[2] = 0
      bounds[3] = height
    }

    const rndrProps = {}
    const queryRndrProps = new Set([
      polyTableGeomColumns.verts,
      polyTableGeomColumns.ring_sizes
    ])
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
          queryRndrProps.add(propObj[prop].field)
        }
      })
    }

    const boundsWidth = bounds[1] - bounds[0]
    const boundsHeight = bounds[3] - bounds[2]
    let scale = 1
    const scaleRatio = minPopupArea / (boundsWidth * boundsHeight)
    const isScaled = scaleRatio > 1
    if (isScaled) {
      scale = Math.sqrt(scaleRatio)
    }

    const popupStyle = _layer.popupStyle()
    let fillColor = _layer.getFillColorVal(data[rndrProps.fillColor])
    let strokeColor = _layer.getStrokeColorVal(data[rndrProps.strokeColor])
    let strokeWidth
    if (typeof popupStyle === "object" && !isScaled) {
      fillColor = popupStyle.fillColor || fillColor
      strokeColor = popupStyle.strokeColor || strokeColor
      strokeWidth = popupStyle.strokeWidth
    }

    const svg = parentElem
      .append("svg")
      .attr("width", width)
      .attr("height", height)

    const xform = svg
      .append("g")
      .attr("class", "map-poly-xform")
      .attr(
        "transform",
        "translate(" +
          (scale * bounds[0] - (scale - 1) * (bounds[0] + boundsWidth / 2)) +
          ", " +
          (scale * (bounds[2] + 1) -
            (scale - 1) * (bounds[2] + 1 + boundsHeight / 2)) +
          ")"
      )

    const group = xform
      .append("g")
      .attr("class", "map-poly")
      .attr("transform-origin", boundsWidth / 2, boundsHeight / 2)

    if (typeof strokeWidth === "number") {
      group.style("stroke-width", strokeWidth)
    }

    if (animate) {
      if (isScaled) {
        group.classed("popupPoly", true)
      } else {
        group.classed("fadeInPoly", true)
      }
    }

    if (chart._useGeoTypes) {
      const ptsToSvgPath = function(pts) {
        let pointStr = ""
        for (let i = 0; i < pts.length; i = i + 2) {
          pointStr =
            pointStr +
            (scale * (pts[i] - bounds[0]) +
              " " +
              scale * (pts[i + 1] - bounds[2]) +
              ", ")
        }
        return pointStr
      }

      polys.forEach((pts, idx) => {
        if (!pts) {
          return
        }

        ptsToSvgPath(pts)

        let pointStr = "M "
        if (is_multi_ring_poly[idx]) {
          // poly with multiple rings
          pts.forEach(ring => {
            pointStr += ptsToSvgPath(ring)
            pointStr += " z M "
          })
          pointStr = pointStr.slice(0, pointStr.length - 3)
        } else {
          pointStr += ptsToSvgPath(pts)
        }
        pointStr = pointStr.slice(0, pointStr.length - 2).replace(/NaN/g, "")
        pointStr += "z"

        group
          .append("path")
          .attr("d", pointStr)
          .attr("class", "map-polygon-shape")
          .attr("fill", fillColor)
          .attr("fill-rule", "evenodd")
          .attr("stroke", strokeColor)
          .on("click", () => _layer.onClick(chart, data, d3.event))
      })
    } else {
      polys.forEach(pts => {
        if (!pts) {
          return
        }

        let pointStr = ""
        for (let i = 0; i < pts.length; i = i + 2) {
          pointStr =
            pointStr +
            (scale * (pts[i] - bounds[0]) +
              " " +
              scale * (pts[i + 1] - bounds[2]) +
              ", ")
        }
        pointStr = pointStr.slice(0, pointStr.length - 2).replace(/NaN/g, "")

        group
          .append("polygon")
          .attr("points", pointStr)
          .attr("class", "map-polygon-shape")
          .on("click", () => _layer.onClick(chart, data, d3.event))
      })
    }

    _scaledPopups[chart] = isScaled

    return {
      posX: bounds[0] + boundsWidth / 2,
      posY: bounds[2] + boundsHeight / 2,
      rndrPropSet: queryRndrProps,
      bounds
    }
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
