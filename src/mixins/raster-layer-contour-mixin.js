import {
  adjustOpacity,
  createRasterLayerGetterSetter
} from "../utils/utils-vega"
import { parser } from "../utils/utils"

const MIN_AREA_IN_METERS = 30
const EARTH_DIAMETER = 40075000

function getPixelSize(neLat, width, zoom) {
  return Math.max(
    MIN_AREA_IN_METERS /
      ((EARTH_DIAMETER * Math.cos((neLat * Math.PI) / 180)) /
        (width * Math.pow(2, zoom))),
    1.0
  )
}

export default function rasterLayerContourMixin(_layer) {
  let state = {}

  _layer.type = "contour"
  
  _layer.crossfilter = createRasterLayerGetterSetter(_layer, null)
  _layer.xDim = createRasterLayerGetterSetter(_layer, null)
  _layer.yDim = createRasterLayerGetterSetter(_layer, null)
  _layer.value = createRasterLayerGetterSetter(_layer, null)
  _layer.colorDomain = createRasterLayerGetterSetter(_layer, null)

  _layer._mandatoryAttributes([])

  _layer.setState = function(setterOrState) {
    if (typeof setterOrState === "function") {
      state = setterOrState(state)
    } else {
      state = setterOrState
    }
    console.log("State", state)
    return _layer
  }

  _layer.getState = function() {
    return JSON.parse(JSON.stringify(state))
  }

  _layer.genSQL = function({
    table,
    width,
    height,
    min,
    max,
    filter,
    globalFilter,
    neLat,
    zoom
  }) {
    const transforms = []
    transforms.push({
      type: "project",
      expr: state.encoding.xDim,
      as: "x"
    })
    transforms.push({
      type: "project",
      expr: state.encoding.yDim,
      as: "y"
    })
    if (typeof filter === "string" && filter.length) {
      transforms.push({
        type: "filter",
        expr: filter
      })
    }

    if (typeof globalFilter === "string" && globalFilter.length) {
      transforms.push({
        type: "filter",
        expr: globalFilter
      })
    }

    return parser.writeSQL({
      type: "root",
      source: table,
      transform: [
        ...transforms,
        {
          type: "line",
          width,
          height,
          x: {
            field: state.encoding.yDim,
            domain: [min[0], max[0]]
          },
          y: {
            field: state.encoding.yDim,
            domain: [min[1], max[1]]
          }
        }
      ]
    })
  }

  _layer._genVega = function(chart, layerName) {

    const {
      table,
      width,
      height,
      min,
      max,
      filter,
      globalFilter,
      neLat,
      zoom,
    } = {
      table: _layer.crossfilter().getTable()[0],
      width: Math.round(chart.width() * chart._getPixelRatio()),
      height: Math.round(chart.height() * chart._getPixelRatio()),
      min: chart.conv4326To900913(chart._minCoord),
      max: chart.conv4326To900913(chart._maxCoord),
      filter: _layer.crossfilter().getFilterString(layerName),
      globalFilter: _layer.crossfilter().getGlobalFilterString(),
      neLat: chart._maxCoord[1],
      zoom: chart.zoom()
    }
    const datalayerName = `contourmap_query${layerName}`

    const vega = {
      width,
      height
    }

    vega.data = [
      {
        name: datalayerName,
        format: "lines",
        enableHitTesting: state.enableHitTesting,
        sql: _layer.genSQL({
          table,
          width,
          height,
          min,
          max,
          filter,
          globalFilter,
          neLat,
          zoom
        })
      }
    ]

    vega.marks = [
      {
        type: state.mark.type,
        from: {
          data: datalayerName
        },
        properties: {
          x: {
            field: state.encoding.xDim
          },
          y: {
            field: state.encoding.yDim
          },
          strokeColor: state.mark.strokeColor,
          strokeWidth: state.mark.strokeWidth || 1,
          lineJoin: state.mark.lineJoin
        }
      }
    ]

    return vega
  }

  _layer._destroyLayer = function() {
    const xDim = _layer.xDim()
    if (xDim) {
      xDim.dispose()
    }

    const yDim = _layer.yDim()
    if (yDim) {
      yDim.dispose()
    }
  }

  return _layer
}
