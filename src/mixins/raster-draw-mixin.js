import * as LatLonUtils from "../utils/utils-latlon"
import LassoButtonGroupController from "./ui/lasso-tool-ui"
import * as _ from "lodash"
import * as MapdDraw from "@mapd/mapd-draw/dist/mapd-draw"
import { redrawAllAsync } from "../core/core-async"
import LatLonCircle from "./ui/lasso-shapes/LatLonCircle"
import LatLonPoly from "./ui/lasso-shapes/LatLonPoly"

/** Configure MapD Draw */
MapdDraw.Configure.setMatrixArrayType(Float64Array)

// set a very low epsilon to account for the large precision provided us
// with 64-bit floating pt. If we left this at the default, if you made a lasso
// shape at a tight zoom (i.e. a shape with that was 100 meters^2 in area),
// the shape wouldn't align right because the camera would not be considered dirty
// even tho the map was moving slightly in world space.
MapdDraw.Configure.setEpsilon(0.00000000000001)
/** Done configuring MapdDraw */

function chartUsesLonLat(chart) {
  return typeof chart.useLonLat === "function" && chart.useLonLat()
}

/* istanbul ignore next */
function createUnlikelyStmtFromShape(shape, xAttr, yAttr, useLonLat) {
  const aabox = shape.aabox
  let xmin = aabox[MapdDraw.AABox2d.MINX]
  let xmax = aabox[MapdDraw.AABox2d.MAXX]
  let ymin = aabox[MapdDraw.AABox2d.MINY]
  let ymax = aabox[MapdDraw.AABox2d.MAXY]
  let cast = true
  if (useLonLat) {
    xmin = LatLonUtils.conv900913To4326X(xmin)
    xmax = LatLonUtils.conv900913To4326X(xmax)
    ymin = LatLonUtils.conv900913To4326Y(ymin)
    ymax = LatLonUtils.conv900913To4326Y(ymax)
    cast = false
  }

  if (cast) {
    return `UNLIKELY(CAST(${xAttr} AS FLOAT) >= ${xmin} AND CAST(${xAttr} AS FLOAT) <= ${xmax} AND CAST(${yAttr} AS FLOAT) >= ${ymin} AND CAST(${yAttr} AS FLOAT) <= ${ymax})`
  } else {
    return `UNLIKELY(${xAttr} >= ${xmin} AND ${xAttr} <= ${xmax} AND ${yAttr} >= ${ymin} AND ${yAttr} <= ${ymax})`
  }
}

function createSTContainsStatementFromShape(px, py, shape, srid) {
  const first_point = MapdDraw.Point2d.create()
  const point = MapdDraw.Point2d.create()
  const verts = shape.vertsRef
  const xform = shape.globalXform

  let contains_str = ""
  if (verts.length) {
    let wkt_str = "POLYGON(("
    if (srid === 4326) {
      verts.forEach((vert, curr_idx) => {
        MapdDraw.Point2d.transformMat2d(point, vert, xform)
        LatLonUtils.conv900913To4326(point, point)
        wkt_str += `${point[0]} ${point[1]},`

        if (curr_idx === 0) {
          MapdDraw.Point2d.copy(first_point, point)
        }
      })
    } else {
      verts.forEach((vert, curr_idx) => {
        MapdDraw.Point2d.transformMat2d(point, vert, xform)
        wkt_str += `${point[0]} ${point[1]},`

        if (curr_idx === 0) {
          MapdDraw.Point2d.copy(first_point, point)
        }
      })
    }

    wkt_str += `${first_point[0]} ${first_point[1]}))`

    contains_str = `ST_Contains(ST_GeomFromText('${wkt_str}', ${srid}), ST_SetSRID(ST_Point(${px}, ${py}), ${srid}))`
  }
  return contains_str
}

/* istanbul ignore next */
export function rasterDrawMixin(chart) {
  let drawEngine = null
  let buttonController = null
  let currXRange = null
  let currYRange = null
  const coordFilters = new Map()
  let origFilterFunc = null
  let origFilterAll = null
  const useLonLat = chartUsesLonLat(chart)

  const defaultStyle = {
    fillColor: "#22a7f0",
    fillOpacity: 0.1,
    strokeColor: "#22a7f0",
    strokeWidth: 1.5,
    dashPattern: []
  }

  const defaultSelectStyle = {
    fillColor: "#ef9b20",
    fillOpacity: 0.1,
    strokeColor: "#ef9b20",
    strokeWidth: 2,
    dashPattern: [8, 2]
  }

  // given a layer of this chart, and a bonkers boolean flag, will return the
  // associated crossfilter object

  function getCrossfilter(layer) {
    const layerTypeIsPointsOrHeatOrUndefined = isLayerTypePointsOrHeatOrUndefined(
      layer
    )

    const group = layer.group()

    if (group) {
      return group.getCrossfilter()
    } else {
      const dim = layerTypeIsPointsOrHeatOrUndefined
        ? layer.dimension()
        : layer.viewBoxDim()
      if (dim) {
        return layerTypeIsPointsOrHeatOrUndefined ? dim.getCrossfilter() : dim
      } else {
        return layer.crossfilter()
      }
    }
  }

  // crossfilters and associated filter objects are stored in different places
  // depending upon the type of chart. So we have this very stupidly named
  // function that checks the magic conditions for one path vs the other.
  function isLayerTypePointsOrHeatOrUndefined(layer) {
    return (
      !layer.layerType ||
      typeof layer.layerType !== "function" ||
      layer.layerType() === "points" ||
      layer.layerType() === "heat"
    )
  }

  // given a layer, returns the associated filter object for it. If no filterObj
  // exists yet, it'll create one.
  function getRasterFilterObj(layer) {
    const layerTypeIsPointsOrHeatOrUndefined = isLayerTypePointsOrHeatOrUndefined(
      layer
    )

    const crossFilter = getCrossfilter(layer)

    if (crossFilter === undefined) {
      return undefined
    }

    let filterObj = coordFilters.get(crossFilter)

    if (filterObj) {
      return filterObj
    } else if (layerTypeIsPointsOrHeatOrUndefined) {
      filterObj = {
        coordFilter: crossFilter.filter(),
        px: [],
        py: []
      }
      coordFilters.set(crossFilter, filterObj)
      filterObj.shapeFilters = []
    } else {
      filterObj = {
        coordFilter: crossFilter
      }
      coordFilters.set(crossFilter, filterObj)
      filterObj.shapeFilters = []
    }

    return filterObj
  }

  chart.getRasterFilterObj = getRasterFilterObj

  function applyFilter() {
    const shapes = drawEngine.sortedShapes

    const layers =
      chart.getLayers && typeof chart.getLayers === "function"
        ? chart.getLayers()
        : [chart]
    layers.forEach(layer => {
      if (
        !layer.layerType ||
        typeof layer.layerType !== "function" ||
        layer.layerType() === "points" ||
        layer.layerType() === "heat"
      ) {
        let crossFilter = null
        let filterObj = null
        const group = layer.group()

        if (group) {
          crossFilter = group.getCrossfilter()
        } else {
          const dim = layer.dimension()
          if (dim) {
            crossFilter = dim.getCrossfilter()
          } else {
            crossFilter = layer.crossfilter()
          }
        }
        if (crossFilter) {
          filterObj = coordFilters.get(crossFilter)
          if (!filterObj) {
            filterObj = {
              coordFilter: crossFilter.filter(),
              px: [],
              py: []
            }
            coordFilters.set(crossFilter, filterObj)
            filterObj.shapeFilters = []
          }
          const xdim = layer.xDim()
          const ydim = layer.yDim()
          if (xdim && ydim) {
            const px = xdim.value()[0]
            const py = ydim.value()[0]
            filterObj.px.push(px)
            filterObj.py.push(py)
            shapes.forEach(shape => {
              if (shape instanceof LatLonCircle) {
                const pos = shape.getWorldPosition()
                // convert from mercator to lat-lon
                LatLonUtils.conv900913To4326(pos, pos)
                const meters = shape.radius * 1000
                filterObj.shapeFilters.push(
                  `DISTANCE_IN_METERS(${pos[0]}, ${pos[1]}, ${px}, ${py}) < ${meters}`
                )
              } else if (shape instanceof MapdDraw.Circle) {
                const radsqr = Math.pow(shape.radius, 2)
                const mat = MapdDraw.Mat2d.clone(shape.globalXform)
                MapdDraw.Mat2d.invert(mat, mat)
                filterObj.shapeFilters.push(
                  `${createUnlikelyStmtFromShape(
                    shape,
                    px,
                    py,
                    useLonLat
                  )} AND (POWER(${mat[0]} * CAST(${px} AS FLOAT) + ${
                    mat[2]
                  } * CAST(${py} AS FLOAT) + ${mat[4]}, 2.0) + POWER(${
                    mat[1]
                  } * CAST(${px} AS FLOAT) + ${
                    mat[3]
                  } * CAST(${py} AS FLOAT) + ${
                    mat[5]
                  }, 2.0)) / ${radsqr} <= 1.0`
                )
              } else if (
                shape instanceof LatLonPoly ||
                shape instanceof MapdDraw.Poly
              ) {
                let srid = 0
                if (shape instanceof LatLonPoly) {
                  console.assert(useLonLat)
                  srid = 4326
                } else {
                  console.assert(!useLonLat)
                }
                const contains_str = createSTContainsStatementFromShape(
                  px,
                  py,
                  shape,
                  srid
                )
                if (contains_str.length) {
                  filterObj.shapeFilters.push(
                    `${createUnlikelyStmtFromShape(
                      shape,
                      px,
                      py,
                      useLonLat
                    )} AND (${contains_str})`
                  )
                }
              }
            })
          }
        }
      } else if (
        !layer.layerType ||
        typeof layer.layerType !== "function" ||
        layer.layerType() === "lines"
      ) {
        if (layer.getState().data.length < 2) {
          let crossFilter = null
          let filterObj = null
          const group = layer.group()

          if (group) {
            crossFilter = group.getCrossfilter()
          } else {
            const dim = layer.viewBoxDim()
            if (dim) {
              crossFilter = dim
            } else {
              crossFilter = layer.crossfilter()
            }
          }
          if (crossFilter) {
            filterObj = coordFilters.get(crossFilter)
            if (!filterObj) {
              filterObj = {
                coordFilter: crossFilter
              }
              coordFilters.set(crossFilter, filterObj)
              filterObj.shapeFilters = []
            }

            shapes.forEach(shape => {
              if (shape instanceof LatLonCircle) {
                const pos = shape.getWorldPosition()
                // convert from mercator to lat-lon
                LatLonUtils.conv900913To4326(pos, pos)
                const radiusInKm = shape.radius
                const shapeFilter = {
                  spatialRelAndMeas: "filterST_Distance",
                  filters: { point: [pos[0], pos[1]], distanceInKm: radiusInKm }
                }

                if (!_.find(filterObj.shapeFilters, shapeFilter)) {
                  filterObj.shapeFilters.push(shapeFilter)
                }
              } else if (
                shape instanceof LatLonPoly ||
                shape instanceof MapdDraw.Poly
              ) {
                const p0 = MapdDraw.Point2d.create()
                const convertedVerts = []

                const verts = shape.vertsRef
                const xform = shape.globalXform
                verts.forEach(vert => {
                  MapdDraw.Point2d.transformMat2d(p0, vert, xform)
                  if (useLonLat) {
                    LatLonUtils.conv900913To4326(p0, p0)
                  }
                  convertedVerts.push([p0[0], p0[1]])
                })
                const shapeFilter = {
                  spatialRelAndMeas: "filterST_Contains",
                  filters: convertedVerts
                }

                if (!_.find(filterObj.shapeFilters, shapeFilter)) {
                  filterObj.shapeFilters.push(shapeFilter)
                }
              }
            })
          }
        }
      }
    })

    coordFilters.forEach(filterObj => {
      if (
        filterObj.px &&
        filterObj.py &&
        filterObj.px.length &&
        filterObj.py.length &&
        filterObj.shapeFilters.length
      ) {
        const shapeFilterStmt = filterObj.shapeFilters.join(" OR ")
        const filterStmt = filterObj.px
          .map((e, i) => ({ px: e, py: filterObj.py[i] }))
          .reduce(
            (acc, e) =>
              acc.some(e1 => e1.px === e.px && e1.py === e.py)
                ? acc
                : [...acc, e],
            []
          )
          .map(
            (e, i) =>
              `(${e.px} IS NOT NULL AND ${e.py} IS NOT NULL AND (${shapeFilterStmt}))`
          )
          .join(" AND ")
        filterObj.coordFilter.filter([filterStmt])
        filterObj.px = []
        filterObj.py = []
        filterObj.shapeFilters = []
      } else if (
        filterObj.coordFilter &&
        filterObj.shapeFilters &&
        filterObj.shapeFilters.length &&
        filterObj.shapeFilters[0].spatialRelAndMeas
      ) {
        filterObj.coordFilter.filterSpatial()
        filterObj.shapeFilters.forEach(sf => {
          filterObj.coordFilter.filterSpatial(sf.spatialRelAndMeas, sf.filters)
        })
        filterObj.shapeFilters = []
      } else {
        filterObj.coordFilter.filter()
      }
    })

    return chart._invokeFilteredListener(chart.filters(), false)
  }

  function drawEventHandler() {
    applyFilter()
    setTimeout(() => redrawAllAsync(chart.chartGroup()))
  }

  const debounceRedraw = chart.debounce(() => {
    drawEventHandler()
  }, 50)

  function updateDrawFromGeom() {
    debounceRedraw()
  }

  chart.addFilterShape = shape => {
    shape.on(
      ["changed:geom", "changed:xform", "changed:visibility"],
      updateDrawFromGeom
    )
    updateDrawFromGeom()
  }

  chart.deleteFilterShape = shape => {
    shape.off(["changed"], updateDrawFromGeom)
    updateDrawFromGeom()
  }

  function filters() {
    const shapes = drawEngine.getShapesAsJSON()
    if (shapes[0]) {
      return chart.nonDrawFilters().concat(Array.from(shapes))
    }
    return chart.nonDrawFilters()
  }

  function filter(filterArg) {
    if (!arguments.length) {
      return drawEngine.getShapesAsJSON()
    }

    if (filterArg === null) {
      drawEngine.deleteAllShapes()
      applyFilter()
    } else if (typeof filterArg.type !== "undefined") {
      let newShape = null
      if (filterArg.type === "Feature") {
        console.log(
          "WARNING - trying to load an incompatible lasso dashboard. All filters will be cleared."
        )
        return
      }
      const selectOpts = {}
      if (filterArg.type === "LatLonCircle") {
        newShape = new LatLonCircle(filterArg)
        selectOpts.uniformScaleOnly = true
        selectOpts.centerScaleOnly = true
        selectOpts.rotatable = false
      } else if (filterArg.type === "LatLonPoly" || filterArg.type === "Poly") {
        const args = []
        let PolyClass = null
        if (useLonLat) {
          PolyClass = LatLonPoly
          args.push(drawEngine)
        } else {
          PolyClass = MapdDraw.Poly
        }
        args.push(filterArg)
        newShape = new PolyClass(...args)
      } else if (typeof MapdDraw[filterArg.type] !== "undefined") {
        newShape = new MapdDraw[filterArg.type](filterArg)
      } else {
        origFilterFunc(filterArg)
      }

      if (newShape) {
        drawEngine.addShape(newShape, selectOpts)
        chart.addFilterShape(newShape)
        applyFilter()
      }
    } else {
      origFilterFunc(filterArg)
    }

    if (!buttonController || !buttonController.isActive()) {
      drawEngine.enableInteractions()
    }
  }

  chart.addDrawControl = () => {
    if (drawEngine) {
      return chart
    }

    const parent = chart.root().node()

    let xscale = chart.x()
    let yscale = chart.y()
    if (!xscale || !yscale) {
      chart._updateXAndYScales(chart.getDataRenderBounds())
      xscale = chart.x()
      yscale = chart.y()
    }
    currXRange = xscale.domain()
    currYRange = yscale.domain()

    const projDims = [
      Math.abs(currXRange[1] - currXRange[0]),
      Math.abs(currYRange[1] - currYRange[0])
    ]

    const engineOpts = {
      enableInteractions: true,
      projectionDimensions: projDims,
      cameraPosition: [
        currXRange[0] + 0.5 * projDims[0],
        Math.min(currYRange[0], currYRange[1]) + 0.5 * projDims[1]
      ],
      flipY: true,
      selectStyle: defaultSelectStyle,
      xformStyle: {
        fillColor: "white",
        strokeColor: "#555555",
        strokeWidth: 1
      }
    }

    let margins = null
    if (typeof chart.margins === "function") {
      margins = chart.margins()
      engineOpts.margins = margins
    }

    drawEngine = new MapdDraw.ShapeBuilder(parent, engineOpts)
    buttonController = new LassoButtonGroupController(
      parent,
      chart,
      drawEngine,
      defaultStyle,
      defaultSelectStyle
    )

    function updateDraw() {
      const bounds = chart.getDataRenderBounds()
      currXRange = [bounds[0][0], bounds[1][0]]
      currYRange = [bounds[0][1], bounds[2][1]]
      if (chartUsesLonLat(chart)) {
        currXRange[0] = LatLonUtils.conv4326To900913X(currXRange[0])
        currXRange[1] = LatLonUtils.conv4326To900913X(currXRange[1])
        currYRange[0] = LatLonUtils.conv4326To900913Y(currYRange[0])
        currYRange[1] = LatLonUtils.conv4326To900913Y(currYRange[1])
      }

      const newProjDims = [
        Math.abs(currXRange[1] - currXRange[0]),
        Math.abs(currYRange[1] - currYRange[0])
      ]
      drawEngine.projectionDimensions = newProjDims
      drawEngine.cameraPosition = [
        currXRange[0] + 0.5 * newProjDims[0],
        Math.min(currYRange[0], currYRange[1]) + 0.5 * newProjDims[1]
      ]

      // debounceRedraw()
    }

    function updateDrawResize(eventObj) {
      // make sure all buttons and events are deactivated when resizing
      // so shape creation/modification events aren't unintentionally
      // triggered
      buttonController.deactivateButtons()

      // NOTE: in the scatterplot case, there's no guarantee that the parent div will have been properly
      // resized by the time we reach here. Getting the effectiveWidth of the chart is a safer
      // bet. That method should be defined on a scatterplot chart.
      // Do we need to be concerned with margins/padding on the div? I don't believe we
      // do since we're only setting the viewport here, which should cover the entire
      // width/height of the canvas.
      const widthToUse =
        typeof chart.effectiveWidth === "function"
          ? chart.effectiveWidth()
          : parent.offsetWidth
      const heightToUse =
        typeof chart.effectiveHeight === "function"
          ? chart.effectiveHeight()
          : parent.offsetHeight
      drawEngine.viewport = [0, 0, widthToUse, heightToUse]
      updateDraw()
    }

    chart.map().on("render", updateDraw)

    chart.map().on("resize", updateDrawResize)

    origFilterFunc = chart.filter
    origFilterAll = chart.filterAll
    chart.filter = filter
    chart.nonDrawFilters = chart.filters
    chart.filters = filters

    chart.filterAll = () => {
      origFilterAll()
      chart.getLayerNames().forEach(layerName => {
        const layer = chart.getLayer(layerName)
        if (layer.hasOwnProperty("filterAll")) {
          layer.filterAll(chart)
        }
      })
      if (coordFilters) {
        coordFilters.forEach(filterObj => {
          if (
            filterObj.coordFilter &&
            "spatialRelAndMeas" in filterObj.shapeFilters
          ) {
            filterObj.coordFilter.filterSpatial()
            const bounds = chart.map().getBounds()
            filterObj.coordFilter.filterST_Min_ST_Max({
              lonMin: bounds._sw.lng,
              lonMax: bounds._ne.lng,
              latMin: bounds._sw.lat,
              latMax: bounds._ne.lat
            })
          } else {
            filterObj.coordFilter.filter()
          }
          filterObj.shapeFilters = []
        })
      }
      const shapes = drawEngine.sortedShapes
      drawEngine.deleteAllShapes()

      origFilterFunc(Symbol.for("clear"))

      shapes.forEach(shape => {
        chart.deleteFilterShape(shape)
      })

      if (typeof chart.useLonLat === "function") {
        // pointmap should preserve the zoom filter
        chart.setFilterBounds(chart.map().getBounds())
      }
      return chart
    }

    return chart
  }

  chart.coordFilter = filter => {
    // noop - for backwards compatibility
  }

  return chart
}
