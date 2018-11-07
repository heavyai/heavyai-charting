const TABLE = "san_fran_street_lines"
const MAP_STYLE = "mapbox://styles/mapbox/light-v8"
const WIDTH = document.documentElement.clientWidth - 30
const HEIGHT = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 200
const UPDATE_INTERVAL = 750

let LineLayer

const Connector = new MapdCon()
  .protocol("http")
  .host("mahakali.mapd.com")
  .port("9092")
  .dbName("mapd")
  .user("mapd")
  .password("HyperInteractive")


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

function rasterChart(cf) {
debugger
  const RasterChart = dc.rasterChart(document.getElementById("linemap"), true)
  LineLayer = dc.rasterLayer("line")

  LineLayer.crossfilter(cf).xDim(xDim).yDim(yDim).setState({
    mark: "hex",
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
        aggregate: "count(lang)",
        scale: {
          domain: "auto",
          range: colorRange,
          default: "#0d0887",
          nullValue: "#0d0887"
        }
      },
      size: {
        type: "manual",
        value: 10
      }
    }
  })

  RasterChart
    .con(Connector)
    .useLonLat(true)
    .height(HEIGHT)
    .width(WIDTH)
    .mapUpdateInterval(UPDATE_INTERVAL)
    .mapStyle(MAP_STYLE)
    .mapboxToken("pk.eyJ1IjoibWFwZCIsImEiOiJjaWV1a3NqanYwajVsbmdtMDZzc2pneDVpIn0.cJnk8c2AxdNiRNZWtx5A9g") // need a mapbox accessToken for loading the tiles

  // polyfillColorsGetter.apply(RasterChart)
  // RasterChart.colors(d3.scale.linear().range(colorRange))
  // RasterChart.pushLayer("heat", HeatLayer)

  return RasterChart
}

function createCharts(cf) {
  const RasterChart = rasterChart(cf)
  // countWidget(cf)
  return RasterChart.init().then(() => dc.renderAllAsync())
}

document.addEventListener("DOMContentLoaded", function init() {
  return connect()
    .then(createCrossfilter)
    .then(createCharts)
})