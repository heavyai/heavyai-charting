import {parser} from "../src/utils/utils"

export default function simpleGeo () {

  let config = {
    crossfilter: null,
    connector: null,
    xDimension: null,
    yDimension: null,
    cap: 1000,
    pixelRatio: 1,
    width: null,
    height: null
  }
  let state = {}

  const MIN_AREA_IN_METERS = 30
  const EARTH_DIAMETER = 40075000

  const xScaleName = "x"
  const yScaleName = "y"
  const xScaleType = "linear"
  const yScaleType = "linear"
  const xScaleDomain = [-14695477.307978824, 14695477.307978759]
  const yScaleDomain = [-7493598.288940868, 14500697.975036839]
  const minCoord = xScaleDomain
  const maxCoord = yScaleDomain

  function getPixelSize (neLat, width, zoom) {
    return Math.max(
      MIN_AREA_IN_METERS / (EARTH_DIAMETER * Math.cos(neLat * Math.PI / 180) / (width * Math.pow(2, zoom))),
      1.0
    )
  }

  function getMarkHeight (type, width) {
    switch (type) {
    case "hex":
      return 2 * config.width / Math.sqrt(3.0)
    default:
      return config.width
    }
  }

  function getMarkSize ({width, neLat, zoom, domain}) {
    const pixelSize = state.encoding.size.type === "manual" ? state.encoding.size.value : getPixelSize(neLat, width, zoom)
    const numBinsX = Math.round(width / pixelSize)
    const markWidth = width / numBinsX
    const markHeight = getMarkHeight(state.mark, markWidth)
    return {
      markWidth,
      markHeight
    }
  }

  function getMarkType (type) {
    switch (type) {
    case "hex":
      return "hexagon-horiz"
    default:
      return type
    }
  }

  const hardcodedQuery1 = {"width":751,"height":562,"data":[{"name":"heatmap_query","sql":"SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-14695477.307978824,14695477.307978759,conv_4326_900913_y(lat),-7493598.288940868,14500697.975036839,10.013333333333334,11.562401390970907,0,0,751,562) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-14695477.307978824,14695477.307978759,conv_4326_900913_y(lat),-7493598.288940868,14500697.975036839,10.013333333333334,11.562401390970907,0,0,751,562) as y, count(lang) as color FROM tweets_nov_feb WHERE ((lon >= -132.01171875000242 AND lon <= 132.01171875000182) AND (lat >= -55.67302825501289 AND lat <= 78.24408242825211)) GROUP BY x, y"}],"scales":[{"name":"x","type":"linear","domain":[-14695477.307978824,14695477.307978759],"range":"width"},{"name":"y","type":"linear","domain":[-7493598.288940868,14500697.975036839],"range":"height"},{"name":"heat_color","type":"quantize","domain":[1,3526.103445196304],"range":["#0d0887","#2a0593","#41049d","#5601a4","#6a00a8","#7e03a8","#8f0da4","#a11b9b","#b12a90","#bf3984","#cb4679","#d6556d","#e16462","#ea7457","#f2844b","#f89540","#fca636","#feba2c","#fcce25","#f7e425","#f0f921"],"default":"#0d0887","nullValue":"#0d0887"}],"marks":[{"type":"symbol","from":{"data":"heatmap_query"},"properties":{"shape":"hexagon-horiz","xc":{"field":"x"},"yc":{"field":"y"},"width":10.013333333333334,"height":11.562401390970907,"fillColor":{"scale":"heat_color","field":"color"}}}]}
  const hardcodedQuery2 = {"width":338,"height":562,"data":[{"name":"heatmap_query","sql":"SELECT * FROM tweets_nov_feb WHERE ((lon >= -14695477.307978824 AND lon <= -7493598.288940868) AND (lat >= 14695477.307978759 AND lat <= 14500697.975036839))"}],"scales":[{"name":"x","type":"linear","domain":[-14695477.307978824,14695477.307978759],"range":"width"},{"name":"y","type":"linear","domain":[-7493598.288940868,14500697.975036839],"range":"height"},{"name":"heat_color","type":"quantize","domain":[1,3526.103445196304],"range":["#0d0887","#2a0593","#41049d","#5601a4","#6a00a8","#7e03a8","#8f0da4","#a11b9b","#b12a90","#bf3984","#cb4679","#d6556d","#e16462","#ea7457","#f2844b","#f89540","#fca636","#feba2c","#fcce25","#f7e425","#f0f921"],"default":"#0d0887","nullValue":"#0d0887"}],"marks":[{"type":"symbol","from":{"data":"heatmap_query"},"properties":{"shape":"hexagon-horiz","xc":{"field":"x"},"yc":{"field":"y"},"width":9.941176470588236,"height":390.28878197218705,"fillColor":{"scale":"heat_color","field":"color"}}}]}
  console.log("test spec", hardcodedQuery2)

  function genSQL ({table, width, height, min, max, filter, neLat, zoom, domain}) {
    const {markWidth, markHeight} = getMarkSize({width, neLat, zoom, domain})
    return parser.writeSQL({
      type: "root",
      source: table,
      transform: [
        {
          type: "filter",
          expr: filter
        },
        {
          type: "pixel_bin",
          width,
          height,
          mark: {
            shape: state.mark,
            width: markWidth,
            height: markHeight
          },
          x: {
            field: `conv_4326_900913_x(${state.encoding.x.field})`,
            domain: [min[0], max[0]]
          },
          y: {
            field: `conv_4326_900913_y(${state.encoding.y.field})`,
            domain: [min[1], max[1]]
          },
          aggregate: state.encoding.color.aggregate
        }
      ]
    })
  }

  function _genVega ({table, width, height, min, max, filter, neLat, zoom, domain}) {
    const {markWidth, markHeight} = getMarkSize({width, neLat, zoom, domain})
    return {
      width,
      height,
      data:
      {
        name: "heatmap_query",
        sql: genSQL({table, width, height, min, max, filter, neLat, zoom, domain})
      },
      scales: [
        {
          name: "heat_color",
          type: state.encoding.color.type,
          domain: state.encoding.color.scale.domain === "auto" ? domain : state.encoding.color.scale.domain,
          range: state.encoding.color.scale.range,
          default: state.encoding.color.scale.default,
          nullValue: state.encoding.color.scale.nullValue
        }
      ],
      mark:
      {
        type: "symbol",
        from: {
          data: "heatmap_query"
        },
        properties: {
          shape: getMarkType(state.mark),
          xc: {
            field: "x"
          },
          yc: {
            field: "y"
          },
          width: markWidth,
          height: markHeight,
          fillColor: {
            scale: "heat_color",
            field: "color"
          }
        }
      }
    }
  }

  function genHeatConfigFromChart () {
    return {
      "table": "tweets_nov_feb",
      "width": 338,
      "height": 562,
      "min": [-6613943.182552361, -7493598.288940868],
      "max": [6613943.182552386, 14500697.975036839],
      "filter": "(lon >= -14695477.307978824 AND lon <= -7493598.288940868) AND (lat >= 14695477.307978759 AND lat <= 14500697.975036839) AND (lon >= -59.41406250000085 AND lon <= 59.41406250000108) AND (lat >= -55.67302825501289 AND lat <= 78.24408242825211)",
      "neLat": 78.24408242825211,
      "zoom": 1,
      "domain": [0, 0]
      // table: config.crossfilter.getTable()[0],
      // width: Math.round(config.width * config.pixelRatio),
      // height: Math.round(config.height * config.pixelRatio),
      // min: conv4326To900913(minCoord),
      // max: conv4326To900913(maxCoord),
      // filter: config.crossfilter.getFilterString(),
      // neLat: maxCoord[1],
      // zoom: 1,
      // domain: [1, 3526.103445196304]
    }
  }

  function genVega () {
    let query = ""
    const group = config.crossfilter.groupAll()
    if (group.type === "dimension") {
      query = group.writeTopQuery(config.cap, undefined, true)
    } else if (group.type === "group") {
      query = group.writeTopQuery(config.cap, undefined, false, true)
    }

    const vega = _genVega(genHeatConfigFromChart())
    console.log("genVega", vega)
    const sql = genSQL(genHeatConfigFromChart())
    console.log("sql", sql)
    return vega
  }

  function genLayeredVega () {
    const width = config.width * config.pixelRatio
    const height = config.height * config.pixelRatio

    const data = []

    let scales = [
          {name: xScaleName, type: xScaleType, domain: xScaleDomain, range: "width"},
          {name: yScaleName, type: yScaleType, domain: yScaleDomain, range: "height"}
    ]
    const marks = []

    const layerVega = genVega()
    data.push(layerVega.data)
    scales = scales.concat(layerVega.scales)
    marks.push(layerVega.mark)

    const vegaSpec = {
      width: Math.round(width),
      height: Math.round(height),
      data,
      scales,
      marks
    }

    return vegaSpec
  }

  function conv900913To4326X (x) {
    return x / 111319.490778
  }

  function conv900913To4326Y (y) {
    return 57.295779513 * (2 * Math.atan(Math.exp(y / 6378136.99911)) - 1.570796327)
  }

  function conv900913To4326 (coord) {
    return [conv900913To4326X(coord[0]), conv900913To4326Y(coord[1])]
  }

  function conv4326To900913X (x) {
    return x * 111319.490778
  }

  function conv4326To900913Y (y) {
    return 6378136.99911 * Math.log(Math.tan(0.00872664626 * y + 0.785398163397))
  }

  function conv4326To900913 (coord) {
    return [conv4326To900913X(coord[0]), conv4326To900913Y(coord[1])]
  }

  function setFilterBounds (bounds) {
    //   minCoord = [bounds._sw.lng, bounds._sw.lat]
    //   maxCoord = [bounds._ne.lng, bounds._ne.lat]

    config.xDimension.filter([minCoord[0], maxCoord[0]])
    config.yDimension.filter([minCoord[1], maxCoord[1]])
  }

  function setConfig (_config) {
    config = Object.assign({}, config, _config)
    return this
  }

  function setState (_state) {
    state = _state
    return this
  }

  function getData (callback) {
    setFilterBounds()
    const vegaSpec = genLayeredVega()
    console.log("vegaSpec", vegaSpec)
    const nonce = config.connector.renderVega(0, JSON.stringify(vegaSpec), {}, (error, result) => {
      if (error) {
        callback(error)
      } else {
        console.log(result)
        callback(error, result.image)
      }
    })
  }

  return {
    getData,
    setState,
    setConfig
  }
}
