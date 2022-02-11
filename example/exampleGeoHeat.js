import { createParser } from "mapd-data-layer-2"
import R from "ramda"

const TABLE = "tweets_nov_feb"
const MAP_STYLE = "mapbox://styles/mapbox/light-v8"
const WIDTH = document.documentElement.clientWidth - 30
const HEIGHT = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 200
const UPDATE_INTERVAL = 750

const shapeSize = (bins, size, gap = GAP_SIZE) => size/bins

let HeatLayer

const Connector = new MapdCon()
  .protocol("https")
  .host("metis.omnisci.com")
  .port("443")
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

const colorDomainSetter = domain => state => ({
  ...state,
  encoding: {
    ...state.encoding,
    color: {
      ...state.encoding.color,
      scale: {
        ...state.encoding.color.scale,
        domain
      }
    }
  }
})


function polyfillColorsGetter () {
  let colorScale = null
  this.colors = scale => {
    if (scale) {
      colorScale = scale
      return this
    } else {
      return colorScale
    }
  }

  this.colorDomain = colorDomain => {
    if (colorScale) {
      colorScale.domain(colorDomain)
    }

    this.getLayer("heat").setState(colorDomainSetter(colorDomain))
    return this
  }
  this.colorAccessor = () => a => a
  return this
}

const colorRange = [
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
]

function rasterChart(cf) {
  var xDim = cf.dimension("lon")
  var yDim = cf.dimension("lat")
  const RasterChart = dc.rasterChart(document.getElementById("heatmap"), true)
  HeatLayer = dc.rasterLayer("heat")

  HeatLayer.crossfilter(cf).xDim(xDim).yDim(yDim).setState({
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

  polyfillColorsGetter.apply(RasterChart)
  RasterChart.colors(d3.scale.linear().range(colorRange))
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
