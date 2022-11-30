import * as HeavyCharting from "../src/index.js"
import * as HeavyConnect from "@heavyai/connector"
import * as HeavyCrossfilter from "@heavyai/crossfilter"
import mapboxgl from "mapbox-gl"
import _ from "lodash"
import LatLonPolyLine from "../src/mixins/ui/lasso-shapes/LatLonPolyLine.js"
import * as LatLonUtils from "../src/utils/utils-latlon"
import {
  LassoShapeEventConstants,
  LassoGlobalEventConstants
} from "../src/mixins/ui/lasso-event-constants"
import { Point2d, Mat2d } from "@heavyai/draw/dist/draw"
import assert from "assert"

function create_charts(
  linemap_crossfilter,
  crosssection_crossfilter,
  connection
) {
  const countGroup = linemap_crossfilter.groupAll()
  HeavyCharting.countWidget(".data-count")
    .dimension(linemap_crossfilter)
    .group(countGroup)

  /* ----------------BACKEND RENDERED POINT MAP WITH LASSO TOOL EXAMPLE----------------------- */

  linemap_crossfilter
    .dimension(null)
    .projectOn(["longitude", "latitude", "Wind_Speed"])

  linemap_crossfilter.dimension("model_ts").filter("2022-09-25 18:00:00")
  linemap_crossfilter.dimension("forecast_hour").filter(0)
  linemap_crossfilter.dimension("isobaric_level").filter(1000)

  const map_parent = document.getElementById("crosssection-map")

  const map_width = map_parent.clientWidth - 30
  const map_height =
    Math.max(map_parent.clientHeight, window.innerHeight || 0) - 100

  const mapboxToken =
    "pk.eyJ1IjoibWFwZCIsImEiOiJjaWV1a3NqanYwajVsbmdtMDZzc2pneDVpIn0.cJnk8c2AxdNiRNZWtx5A9g"

  let cross_section_layer = null
  const cross_section_layer_state = {
    transform: [
      {
        crossSection2d: {
          x: "longitude",
          y: "latitude",
          z: "isobaric_level",
          crossSectionLine: [
            [-122.875, 33],
            [-113.125, 33]
          ],
          crossSectionDimensionName: "distance"
        }
      }
    ],
    mark: { type: "mesh2d" },
    encoding: {
      x: {
        field: "distance",
        label: "distance"
      },
      y: {
        field: "isobaric_level",
        label: "isobaric_level"
      },
      color: {
        field: "Wind_Speed",
        type: "quantitative",
        scale: {
          range: ["blue", "red"]
        }
      }
    }
  }

  const pointMapChart = HeavyCharting.rasterChart(
    map_parent,
    true,
    null,
    mapboxgl
  )
    .con(connection)
    .width(map_width)
    .height(map_height)
    .mapUpdateInterval(750)
    .mapStyle("json/dark-v8.json")
    .mapboxToken(mapboxToken) // need a mapbox accessToken for loading the tiles
    .popupSearchRadius(2)
    .useGeoTypes(true)

  const raster_mesh2d_layer = HeavyCharting.rasterLayer("mesh2d")
    .crossfilter(linemap_crossfilter)
    .setState({
      transform: [
        {
          rasterMesh2d: {}
        }
      ],
      mark: { type: "mesh2d" },
      encoding: {
        longitude: {
          field: "longitude",
          label: "longitude"
        },
        latitude: {
          field: "latitude",
          label: "latitude"
        },
        color: {
          field: "Air_Temperature",
          type: "quantitative",
          scale: {
            range: ["blue", "red"]
          }
        }
      }
    })
  // .xDim(x_dimension)
  // .yDim(y_dimension)

  pointMapChart
    .pushLayer("raster_mesh", raster_mesh2d_layer)
    .init()
    .then(() => {
      /* --------------------------LASSO TOOL DRAW CONTROL------------------------------ */
      /* Here enable the lasso tool draw control and pass in a coordinate filter */
      pointMapChart.addDrawControl()

      function setCrossSectionLineStateFromShape(shape) {
        if (shape instanceof LatLonPolyLine) {
          const verts = shape.vertsRef
          assert(verts.length === 2)
          assert(cross_section_layer_state)
          assert(Array.isArray(cross_section_layer_state.transform))
          assert(cross_section_layer_state.transform.length === 1)
          assert(cross_section_layer_state.transform[0].crossSection2d)
          assert(
            Array.isArray(
              cross_section_layer_state.transform[0].crossSection2d
                .crossSectionLine
            )
          )
          assert(
            cross_section_layer_state.transform[0].crossSection2d
              .crossSectionLine.length === 2
          )
          // eslint-disable-next-line max-nested-callbacks
          verts.forEach((vert, i) => {
            const vert_copy =
              cross_section_layer_state.transform[0].crossSection2d
                .crossSectionLine[i]
            Point2d.copy(vert_copy, vert)
            Point2d.transformMat2d(vert_copy, vert_copy, shape.globalXform)
            LatLonUtils.conv900913To4326(vert_copy, vert_copy)
          })
          return true
        }
        return false
      }

      const shape_edit_end_callback = event_obj => {
        assert(event_obj.target instanceof LatLonPolyLine)
        console.log(`CROOT - SHAPE EDIT END`)
        if (setCrossSectionLineStateFromShape(event_obj.target)) {
          HeavyCharting.renderAllAsync()
        }
      }

      const draw_engine = pointMapChart.getDrawEngine()
      draw_engine.on(
        LassoGlobalEventConstants.LASSO_SHAPE_CREATE,
        event_obj => {
          if (cross_section_layer) {
            const { shape } = event_obj
            if (shape instanceof LatLonPolyLine) {
              shape.on(
                LassoShapeEventConstants.LASSO_SHAPE_EDIT_END,
                shape_edit_end_callback
              )
            }
            if (setCrossSectionLineStateFromShape(shape)) {
              HeavyCharting.renderAllAsync()
            }
          }
        }
      )
      draw_engine.on(
        LassoGlobalEventConstants.LASSO_SHAPE_DESTROY,
        event_obj => {
          const { shape } = event_obj
          if (shape instanceof LatLonPolyLine) {
            shape.off(
              LassoShapeEventConstants.LASSO_SHAPE_EDIT_END,
              shape_edit_end_callback
            )
          }
        }
      )

      // draw_engine.on("draw:drag:end", event_obj => {
      //   if (cross_section_layer) {
      //     event_obj.shapes.forEach(shape => {
      //       if (setCrossSectionLineStateFromShape(shape)) {
      //         HeavyCharting.redrawAllAsync()
      //       }
      //     })
      //   }
      // })

      HeavyCharting.renderAllAsync()
    })

  crosssection_crossfilter
    .dimension(null)
    .projectOn(["longitude", "latitude", "isobaric_level", "Wind_Speed"])

  crosssection_crossfilter.dimension("model_ts").filter("2022-09-25 18:00:00")
  crosssection_crossfilter.dimension("forecast_hour").filter(0)

  const crosssection_parent = document.getElementById("crosssection-chart")
  const crosssection_width = crosssection_parent.clientWidth - 30
  const crosssection_height =
    Math.max(crosssection_parent.clientHeight, window.innerHeight || 0) - 100

  /*
   * We need the min/max of the z dimension of the raster volume to
   * initialize a proper view. We calculate the extents first and then
   * build the cross section view.
   */
  const extentMeasures = [
    {
      expression: "isobaric_level",
      agg_mode: "min",
      name: "ymin"
    },
    {
      expression: "isobaric_level",
      agg_mode: "max",
      name: "ymax"
    }
  ]

  crosssection_crossfilter
    .groupAll()
    .reduce(extentMeasures)
    .valuesAsync(true)
    .then(extents => {
      cross_section_layer = HeavyCharting.rasterLayer("mesh2d")
        .crossfilter(crosssection_crossfilter)
        .setState(cross_section_layer_state)
        // by default, the dimension along the length of the line is a
        // normalized distance where 0 is the start of the line and 1
        // is the end of the line
        .xDim([0, 1])

        // the isobaric_level column has a range of 0-1000
        // where 0 is the upper-most level of the atmosphere
        // and 1000 is at the surface. As such, reverse the
        // min/max here so the chart reads from surface to
        // high-atmosphere when going up in Y
        .yDim([extents.ymax, extents.ymin])

      const cross_section_chart = HeavyCharting.rasterChart(
        crosssection_parent,
        false
      )
        .con(connection)
        .width(crosssection_width)
        .height(crosssection_height)

        // render the grid lines
        .renderHorizontalGridLines(true)
        .renderVerticalGridLines(true)

        // set the axis labels
        .xAxisLabel("X Axis")
        .yAxisLabel("Y Axis")

        .enableInteractions(true)

      cross_section_chart
        .pushLayer("cross_section", cross_section_layer)
        .init()
        .then(() => {
          HeavyCharting.renderAllAsync()
        })

      /**
       * Setup resize event
       */

      /* Here we listen to any resizes of the main window.  On resize we resize the corresponding widgets and call dc.renderAll() to refresh everything */
      window.addEventListener("resize", _.debounce(resize_all, 500))

      function resize_all() {
        const map_width = map_parent.clientWidth - 30
        const map_height =
          Math.max(map_parent.clientHeight, window.innerHeight || 0) - 200

        const crosssection_width = crosssection_parent.clientWidth - 30
        const crosssection_height =
          Math.max(crosssection_parent.clientHeight, window.innerHeight || 0) -
          100

        pointMapChart.map().resize()
        pointMapChart.isNodeAnimate = false
        pointMapChart
          .width(map_width)
          .height(map_height)
          .render()

        cross_section_chart.map().resize()
        cross_section_chart.isNodeAnimate = false
        cross_section_chart
          .width(crosssection_width)
          .height(crosssection_height)
          .render()

        HeavyCharting.redrawAllAsync()
      }
    })
}

function init() {
  const hostname = "10.2.1.12"
  const dbName = "heavyai"
  const user = "admin"
  const password = "HyperInteractive"
  new HeavyConnect.DbCon()
    .protocol("http")
    .host(hostname)
    .port("6278")
    .dbName(dbName)
    .user(user)
    .password(password)
    .connect((error, con) => {
      if (error) {
        throw error
      }
      const table_name = "noaa_gfs_isobaric_canvaz"
      HeavyCrossfilter.crossfilter(con, table_name).then(
        linemap_crossfilter => {
          HeavyCrossfilter.crossfilter(con, table_name).then(
            crosssection_crossfilter => {
              create_charts(linemap_crossfilter, crosssection_crossfilter, con)
            }
          )
        }
      )
    })
}

document.addEventListener("DOMContentLoaded", init, false)
