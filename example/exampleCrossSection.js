import * as HeavyCharting from "../src/index.js"
import * as HeavyConnect from "@heavyai/connector"
import * as HeavyCrossfilter from "@heavyai/crossfilter"
import _ from "lodash"

function create_charts(crossfilter, connection) {
  const width = document.documentElement.clientWidth - 30
  const height =
    Math.max(document.documentElement.clientHeight, window.innerHeight || 0) -
    100
  const all_group = crossfilter.groupAll()
  HeavyCharting.countWidget(".data-count")
    .dimension(crossfilter)
    .group(all_group)

  /*
   * BACKEND RENDERED WINDBARB EXAMPLE
   */

  crossfilter
    .dimension(null)
    .projectOn(["longitude", "latitude", "isobaric_level", "Air_Temperature"])

  crossfilter.dimension("model_ts").filter("2022-09-25 18:00:00")
  crossfilter.dimension("forecast_hour").filter(0)

  // const x_dimension = crossfilter.dimension("longitude")
  // const y_dimension = crossfilter.dimension("latitude")
  const parent_div = document.getElementById("crosssection-example")

  const cross_section_layer = HeavyCharting.rasterLayer("mesh2d")
    .crossfilter(crossfilter)
    .setState({
      // transform: [{ sample: 5000, tableSize: 1038240 }, { limit: 10000000 }],
      transform: [
        {
          crossSection2d: {
            x: "longitude",
            y: "latitude",
            z: "isobaric_level",
            crossSectionLine: [
              [-123.875, 33],
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

  /*
   * We need the min/max of the z dimension of the raster volume to
   * initialize a proper view. We calculate the extents first and then
   * build the cross section view.
   */
  const extentMeasures = [
    {
      expression: "isobaric_level",
      agg_mode: "min",
      name: "xmin"
    },
    {
      expression: "isobaric_level",
      agg_mode: "max",
      name: "xmax"
    }
  ]

  const z_dimension = crossfilter.dimension("isobaric_level")

  crossfilter
    .groupAll()
    .reduce(extentMeasures)
    .valuesAsync(true)
    .then(extents => {
      z_dimension.filter([extents.xmin, extents.xmax])

      const cross_section_chart = HeavyCharting.rasterChart(parent_div, false)
        .con(connection)
        .width(width)
        .height(height)

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
        const width = document.documentElement.clientWidth - 30
        const height =
          Math.max(
            document.documentElement.clientHeight,
            window.innerHeight || 0
          ) - 200

        cross_section_chart.map().resize()
        cross_section_chart.isNodeAnimate = false
        cross_section_chart
          .width(width)
          .height(height)
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
      HeavyCrossfilter.crossfilter(con, table_name).then(cf => {
        create_charts(cf, con)
      })
    })
}

document.addEventListener("DOMContentLoaded", init, false)
