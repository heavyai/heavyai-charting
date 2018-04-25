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
      (EARTH_DIAMETER *
        Math.cos(neLat * Math.PI / 180) /
        (width * Math.pow(2, zoom))),
    1.0
  )
}

function getMarkHeight(type, width) {
  switch (type) {
    case "hex":
      return 2 * width / Math.sqrt(3.0)
    default:
      return width
  }
}

function getMarkType(type) {
  switch (type) {
    case "hex":
      return "hexagon-horiz"
    default:
      return type
  }
}

export default function rasterLayerHeatmapMixin(_layer) {
  let state = {}

  _layer.type = "heatmap"
  _layer.crossfilter = createRasterLayerGetterSetter(_layer, null)
  _layer.xDim = createRasterLayerGetterSetter(_layer, null)
  _layer.yDim = createRasterLayerGetterSetter(_layer, null)
  _layer.dynamicSize = createRasterLayerGetterSetter(_layer, null)
  _layer.dynamicBinning = createRasterLayerGetterSetter(_layer, null)
  _layer.colorDomain = createRasterLayerGetterSetter(_layer, null)
  _layer._mandatoryAttributes([])

  _layer.setState = function(setterOrState) {
    if (typeof setterOrState === "function") {
      state = setterOrState(state)
    } else {
      state = setterOrState
    }
  }

  _layer.getState = function() {
    return JSON.parse(JSON.stringify(state))
  }

  function getMarkSize({ width, neLat, zoom }) {
    const pixelSize =
      state.encoding.size.type === "manual"
        ? state.encoding.size.value
        : getPixelSize(neLat, width, zoom)
    const numBinsX = Math.round(width / pixelSize)
    const markWidth = width / numBinsX
    const markHeight = getMarkHeight(state.mark, markWidth)
    return {
      markWidth,
      markHeight
    }
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
    const { markWidth, markHeight } = getMarkSize({
      width,
      neLat,
      zoom
    })

    const transforms = []

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

  function getColorScaleName(layerName) {
    return `heat_color${layerName}`
  }

  function usesAutoColors() {
    return state.encoding.color.scale.domain === "auto"
  }

  _layer._updateFromMetadata = (metadata, layerName = "") => {
    if (usesAutoColors() && Array.isArray(metadata.scales)) {
      const colorScaleName = getColorScaleName(layerName)
      for (const scale of metadata.scales) {
        if (scale.name === colorScaleName) {
          _layer.colorDomain(scale.domain)
        }
      }
    }
  }

  _layer._genVega = function({
    table,
    width,
    height,
    min,
    max,
    filter,
    globalFilter,
    neLat,
    zoom,
    layerName = ""
  }) {
    const { markWidth, markHeight } = getMarkSize({
      width,
      neLat,
      zoom
    })

    const datalayerName = `heatmap_query${layerName}`

    const autocolors = usesAutoColors()
    const getStatsLayerName = () => datalayerName + "_stats"

    const vega = {
      width,
      height
    }

    vega.data = [{
      name: datalayerName,
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
    }]

    if (autocolors) {
      vega.data.push({
        name: getStatsLayerName(),
        source: datalayerName,
        transform: [
          {
            type:   "aggregate",
            fields: ["color", "color", "color", "color"],
            ops:    ["min", "max", "avg", "stddev"],
            as:     ["minimum", "maximum", "mean", "deviation"]
          },
          {
            type: "formula",
            expr: "max(minimum, mean-2*deviation)",
            as: "mincolor"
          },
          {
            type: "formula",
            expr: "min(maximum, mean+2*deviation)",
            as: "maxcolor"
          }
        ]
      })
    }

    const colorScaleName = getColorScaleName(layerName)
    vega.scales = [
      {
        name: colorScaleName,
        type: state.encoding.color.type,
        domain:
          autocolors 
            ? {data: getStatsLayerName(), fields: ["mincolor", "maxcolor"]}
            : state.encoding.color.scale.domain,
        range: state.encoding.color.scale.range.map(c =>
          adjustOpacity(c, state.encoding.color.scale.opacity)
        ),
        default: adjustOpacity(
          state.encoding.color.scale.default,
          state.encoding.color.scale.opacity
        ),
        nullValue: adjustOpacity(
          state.encoding.color.scale.nullValue,
          state.encoding.color.scale.opacity
        )
      }
    ]

    vega.marks = [
      {
        type: "symbol",
        from: {
          data: datalayerName
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
            scale: colorScaleName,
            field: "color"
          }
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
