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
  const data_count = HeavyCharting.countWidget(".data-count")
    .dimension(crossfilter)
    .group(all_group)

  /*
   * BACKEND RENDERED WINDBARB EXAMPLE
   */

  let lang_domain = ["en", "pt"]

  const lang_colors = []

  crossfilter
    .dimension(null)
    .projectOn([
      "conv_4326_900913_x(longitude) as x",
      "conv_4326_900913_y(latitude) as y",
      "_80m_Wind_Speed as speed",
      "_80m_Wind_Direction as dir"
    ])

  const x_dimension = crossfilter.dimension("longitude")
  const y_dimension = crossfilter.dimension("latitude")
  const parent_div = document.getElementById("windbarb-example")

  const point_size_scale = HeavyCharting.d3.scale
    .linear()
    .domain([0, 5000])
    .range([1, 5])

  map_lang_to_color(2)

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

  const raster_windbarb_layer = HeavyCharting.rasterLayer("windbarbs")
    .crossfilter(crossfilter)
    .setState({
      //   transform: {
      //     sample: true,
      //     limit: 500000
      //   },
      mark: {
        type: "windbarbs",
        quantizeDirection: false,
        anchorScale: 0,
        size: 55
        // color: "red",
      },
      encoding: {
        x: {
          type: "quantitative",
          field: "conv_4326_900913_x(longitude)"
        },
        y: {
          type: "quantitative",
          field: "conv_4326_900913_y(latitude)"
        },
        speed: {
          field: "_80m_Wind_Speed",
          type: "quantitative",
          scale: null
        },
        direction: {
          field: "_80m_Wind_Direction",
          type: "quantitative",
          scale: null
        },
        // size: { value: 55 },
        //     size: {
        //       type: "quantitative",
        //       field: "followers",
        //       domain: [0, 5000],
        //       range: [1, 5]
        //     },
        color: {
          field: "_80m_Wind_Speed",
          type: "quantitative",
          scale: { range: ["blue", "red"] }
        }, // or fill/stroke, to split up the colors
        opacity: 1.0,
        fillOpacity: 1.0,
        strokeOpacity: 1.0,
        strokeWidth: 1.0

        //     color: {
        //       type: "ordinal",
        //       field: "lang",
        //       domain: lang_domain,
        //       range: lang_colors
        //     }
        //   },
        //   config: {
        //     point: {
        //       shape: "circle"
        //     }
      }
    })
    .xDim(x_dimension)
    .yDim(y_dimension)
  // .popupColumns([
  //   "tweet_text",
  //   "sender_name",
  //   "tweet_time",
  //   "lang",
  //   "origin",
  //   "followers"
  // ]);

  pointmap_chart
    .pushLayer("windbarbs", raster_windbarb_layer)
    .init()
    .then(() => {
      HeavyCharting.renderAllAsync()
    })
  // .then(chart => {
  //   /*--------------------------LASSO TOOL DRAW CONTROL------------------------------*/
  //   /* Here enable the lasso tool draw control and pass in a coordinate filter */
  //   pointMapChart.addDrawControl().coordFilter(crossFilter.filter());

  //   dc.renderAllAsync();
  // });

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
    pointmap_chart.width(width).height(height).render()

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
  const con = new HeavyConnect.DbCon()
    .protocol("http")
    .host("10.2.1.12")
    .port("6278")
    .dbName("heavyai")
    .user("admin")
    .password("HyperInteractive")
    .connect((error, con) => {
      if (error) {
        throw error
      }
      const table_name = "noaa_gfs_v"
      HeavyCrossfilter.crossfilter(con, table_name).then((cf) => {
        create_charts(cf, con)
      })
    })
}

document.addEventListener("DOMContentLoaded", init, false)
