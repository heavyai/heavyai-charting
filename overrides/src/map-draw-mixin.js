import dc from "../../mapdc"

const DRAW_OPTIONS = {
  drawing: true,
  boxSelect: true,
  controls: {
    point: false,
    line_string: false,
    polygon: true,
    trash: true,
    circle: true,
    combine_features: false,
    uncombine_features: false
  },
  styles: [
    // ACTIVE (being drawn)
    // line stroke
    {
      id: "gl-draw-line",
      type: "line",
      filter: ["all", ["==", "$type", "LineString"], ["==", "active", "true"]],
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#ffa500",
        "line-dasharray": [0.2, 2],
        "line-width": 2
      }
    },
    // polygon fill
    {
      id: "gl-draw-polygon-fill",
      type: "fill",
      filter: ["all", ["==", "$type", "Polygon"], ["==", "active", "true"]],
      paint: {
        "fill-color": "#ffa500",
        "fill-outline-color": "#ffa500",
        "fill-opacity": 0.1
      }
    },
    // polygon outline stroke
    // This doesn't style the first edge of the polygon, which uses the line stroke styling instead
    {
      id: "gl-draw-polygon-stroke-active",
      type: "line",
      filter: ["all", ["==", "$type", "Polygon"], ["==", "active", "true"]],
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#ffa500",
        "line-dasharray": [0.2, 2],
        "line-width": 2
      }
    },
    // vertex point halos
    {
      id: "gl-draw-polygon-and-line-vertex-halo-active",
      type: "circle",
      filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["==", "active", "true"]],
      paint: {
        "circle-radius": 0,
        "circle-color": "#FFF"
      }
    },
    // vertex points
    {
      id: "gl-draw-polygon-and-line-vertex-active",
      type: "circle",
      filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["==", "active", "true"]],
      paint: {
        "circle-radius": 0,
        "circle-color": "#D20C0C"
      }
    },

    // INACTIVE (static, already drawn)
    // line stroke
    {
      id: "gl-draw-line-static",
      type: "line",
      filter: ["all", ["==", "$type", "LineString"], ["==", "active", "false"]],
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#22a7f0",
        "line-width": 3
      }
    },
    // polygon fill
    {
      id: "gl-draw-polygon-fill-static",
      type: "fill",
      filter: ["all", ["==", "$type", "Polygon"], ["==", "active", "false"]],
      paint: {
        "fill-color": "#22a7f0",
        "fill-outline-color": "#22a7f0",
        "fill-opacity": 0.1
      }
    },
    // polygon outline
    {
      id: "gl-draw-polygon-stroke-static",
      type: "line",
      filter: ["all", ["==", "$type", "Polygon"], ["==", "active", "false"]],
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#22a7f0",
        "line-width": 3
      }
    }
  ]
}

export function mapDrawMixin (chart, _mapboxgl = mapboxgl) {
  let drawControlAdded = false
  let coordFilter = null
  let Draw = null
  let drawMode = false

  function drawEventHandler () {
    const {features} = Draw.getAll()
    if (features.length) {
      const px = chart.xDim().value()[0]
      const py = chart.yDim().value()[0]
      const sql = dc.utils.convertGeojsonToSql(features, px, py)
      coordFilter.filter(sql)
    } else {
      coordFilter.filter()
    }

    dc.redrawAllAsync()
  }

  function changeDrawMode () {
    const mode = Draw.getMode()
    const {features} = Draw.getSelected()
    if (features.length || mode === "draw_polygon" || mode === "draw_circle") {
      chart.drawMode(true)
    } else {
      chart.drawMode(false)
    }
  }

  chart.drawMode = (mode) => {
    if (typeof mode === "boolean") {
      drawMode = mode
      return chart
    } else {
      return drawMode
    }
  }

  chart.addDrawControl = () => {
    if (drawControlAdded) {
      return chart
    }
    Draw = _mapboxgl.Draw(DRAW_OPTIONS)
    drawControlAdded = true
    chart.map().addControl(Draw)
    chart.map().on("draw.create", drawEventHandler)
    chart.map().on("draw.update", drawEventHandler)
    chart.map().on("draw.delete", () => {
      changeDrawMode()
      drawEventHandler()
    })
    chart.map().on("draw.modechange", changeDrawMode)
    chart.map().on("draw.selectionchange", changeDrawMode)

    return chart
  }

  chart.coordFilter = (filter) => {
    if (!filter) {
      return coordFilter
    }

    if (coordFilter) {
      coordFilter.filter()
    }

    coordFilter = filter
    return chart
  }

  return chart
}

export default function applyMapDrawMixin (dcInstance) {
  dcInstance.override(dcInstance, "mapMixin", (chart, chartDivId, _mapboxgl) => (
    mapDrawMixin(dcInstance._mapMixin(chart, chartDivId, _mapboxgl), _mapboxgl)
  ))

  return dcInstance
}
