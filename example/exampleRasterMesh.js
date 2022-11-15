import * as HeavyCharting from "../src/index.js"
import * as HeavyConnect from "@heavyai/connector"
import * as HeavyCrossfilter from "@heavyai/crossfilter"
import mapboxgl from "mapbox-gl"
import _ from "lodash"

const lang_origin_colors = [
  "#27aeef",
  "#ea5545",
  "#87bc45",
  "#b33dc6",
  "#f46a9b",
  "#ede15b",
  "#bdcf32",
  "#ef9b20",
  "#4db6ac",
  "#edbf33",
  "#7c4dff"
]

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

  let lang_domain = ["en", "pt"]

  const lang_colors = []

  crossfilter
    .dimension(null)
    .projectOn(["longitude", "latitude", "Air_Temperature"])

  crossfilter.dimension("model_ts").filter("2022-09-25 18:00:00")
  crossfilter.dimension("forecast_hour").filter(0)
  crossfilter.dimension("isobaric_level").filter(1000)

  // const x_dimension = crossfilter.dimension("longitude")
  // const y_dimension = crossfilter.dimension("latitude")
  const parent_div = document.getElementById("rastermesh-example")

  const mapbox_token =
    "pk.eyJ1IjoibWFwZCIsImEiOiJjaWV1a3NqanYwajVsbmdtMDZzc2pneDVpIn0.cJnk8c2AxdNiRNZWtx5A9g"

  const pointmap_chart = HeavyCharting.rasterChart(
    parent_div,
    true,
    null,
    mapboxgl
  )
    .con(connection)
    .width(width)
    .height(height)
    .mapUpdateInterval(750)
    .mapStyle("json/dark-v8.json")
    .mapboxToken(mapbox_token) // need a mapbox accessToken for loading the tiles
    .popupSearchRadius(2)
    .group(all_group)
    .useGeoTypes(true)

  const raster_mesh2d_layer = HeavyCharting.rasterLayer("mesh2d")
    .crossfilter(crossfilter)
    .setState({
      // transform: [{ sample: 5000, tableSize: 1038240 }, { limit: 10000000 }],
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

  pointmap_chart
    .pushLayer("raster_mesh", raster_mesh2d_layer)
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
      Math.max(document.documentElement.clientHeight, window.innerHeight || 0) -
      200

    pointmap_chart.map().resize()
    pointmap_chart.isNodeAnimate = false
    pointmap_chart
      .width(width)
      .height(height)
      .render()

    HeavyCharting.redrawAllAsync()
  }

  function map_lang_to_color(n) {
    lang_domain = lang_domain.slice(0, n)
    for (let i = 0; i < lang_domain.length; i++) {
      lang_colors.push(lang_origin_colors[i % lang_origin_colors.length])
    }
  }
}

function init() {
  const hostname = "10.2.1.12"
  const dbName = "heavyai"
  const user = "admin"
  const password = "HyperInteractive"
  const con = new HeavyConnect.DbCon()
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
