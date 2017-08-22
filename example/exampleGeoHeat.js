import { createParser } from "mapd-data-layer"
import R from "ramda"

const TABLE = "tweets_nov_feb"
const MAP_STYLE = "mapbox://styles/mapbox/light-v8"
const WIDTH = document.documentElement.clientWidth - 30
const HEIGHT = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 200
const UPDATE_INTERVAL = 750

const shapeSize = (bins, size, gap = GAP_SIZE) => size/bins

let HeatLayer

const Connector = new MapdCon()
  .protocol("http")
  .host("mahakali.mapd.com")
  .port("9092")
  .dbName("mapd")
  .user("mapd")
  .password("HyperInteractive")

Connector.logging(true)

function connect() {
  return new Promise((resolve, reject) => {
    Connector.connect(function(error, connector) {
      if (error) {
        reject(error)
      } else {
        resolve(connector)
      }
    })
  })
}

function createCrossfilter(connector) {
  return crossfilter.crossfilter(connector, TABLE)
}

function countWidget(cf) {
  return dc.countWidget(".data-count").dimension(cf).group(cf.groupAll())
}

function rasterChart(cf) {
  var xDim = cf.dimension("lon")
  var yDim = cf.dimension("lat")
  const RasterChart = dc.rasterChart(document.getElementById("heatmap"), true)
  HeatLayer = dc.rasterLayer("heat")
  HeatLayer.crossfilter(cf).xDim(xDim).yDim(yDim).setState({
    mark: "square",
    encoding: {
      x: {
        type: "quantitative",
        field: "lon",
        size: WIDTH
      },
      y: {
        type: "quantitative",
        field: "lat",
        size: HEIGHT
      },
      color: {
        type: "quantize",
        aggregate: "count",
        field: "lang",
        scale: {
          domain: [0, 25],
          range: [
            "#0d0887",
            "#2a0593",
            "#41049d",
            "#5601a4",
            "#6a00a8",
            "#7e03a8",
            "#8f0da4",
            "#a11b9b",
            "#b12a90",
            "#bf3984",
            "#cb4679",
            "#d6556d",
            "#e16462",
            "#ea7457",
            "#f2844b",
            "#f89540",
            "#fca636",
            "#feba2c",
            "#fcce25",
            "#f7e425",
            "#f0f921"
          ],
          default: "#0d0887",
          nullValue: "#0d0887"
        }
      },
      size: "auto"
    }
  })

  RasterChart
    .con(Connector)
    .useLonLat(true)
    .height(HEIGHT)
    .width(WIDTH)
    .mapUpdateInterval(UPDATE_INTERVAL)
    .mapStyle(MAP_STYLE)

  RasterChart.pushLayer("heat", HeatLayer)

  return RasterChart
}

function createCharts(cf) {
  const RasterChart = rasterChart(cf)
  countWidget(cf)
  return RasterChart.init().then(() => dc.renderAllAsync())
}

document.addEventListener("DOMContentLoaded", function init() {
  return connect()
    .then(createCrossfilter)
    .then(createCharts)
})
