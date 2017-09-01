import {parser} from "../src/utils/utils"

export default function QueryBuilder () {

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
    // TODO: map this from config
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
    const sql = genSQL(genHeatConfigFromChart())
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

  function getQuery () {
    return genLayeredVega()
  }

  return {
    setConfig,
    setState,
    setFilterBounds,
    getQuery
  }
}
