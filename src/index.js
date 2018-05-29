require("../mapdc.css")
require("../scss/chart.scss")
require("mapbox-gl/dist/styles.css")
require("legendables/src/styles.css")

if (process.env.BABEL_ENV !== "test") {
  window.mapboxgl = require("mapbox-gl/dist/mapbox-gl.js")
  require("mapbox-gl/dist/mapboxgl-overrides.js")
}

require("./mixins/d3.box.js")
require("./polyfills/inner-svg")

export * as d3 from "d3" // eslint-disable-line
export * from "./core/core"
export * from "./core/core-async"
export * from "./core/events"
export * from "./core/filters"
export * from "./utils/utils"
export * from "./utils/logger"

import {
  BadArgumentException,
  Exception,
  InvalidStateException
} from "./core/errors"

export const errors = {
  Exception,
  InvalidStateException,
  BadArgumentException
}

export { default as bubbleOverlay } from "./charts/bubble-overlay"
export { default as barChart } from "./charts/bar-chart"
export { default as bubbleChart } from "./charts/bubble-chart"
export { default as cloudChart } from "./charts/cloud-chart"
export { default as compositeChart } from "./charts/composite-chart"
export { default as dataCount } from "./charts/data-count"
export { default as dataGrid } from "./charts/data-grid"
export { default as geoChoroplethChart } from "./charts/geo-choropleth-chart"
export { default as heatMap } from "./charts/heatmap"
export { default as pieChart } from "./charts/pie-chart"
export { default as lineChart } from "./charts/line-chart"
export { default as numberChart } from "./charts/number-chart"
export { default as rasterChart } from "./charts/raster-chart"
export { default as rowChart } from "./charts/row-chart"
export { default as scatterPlot } from "./charts/scatter-plot"
export { default as mapdTable } from "./charts/mapd-table"
export { default as boxPlot } from "./charts/box-plot"
export { default as countWidget } from "./charts/count-widget"

export { default as asyncMixin } from "./mixins/async-mixin"
export { default as baseMixin } from "./mixins/base-mixin"
export { default as bubbleMixin } from "./mixins/bubble-mixin"
export { default as capMixin } from "./mixins/cap-mixin"
export { default as colorMixin } from "./mixins/color-mixin"
export { default as coordinateGridMixin } from "./mixins/coordinate-grid-mixin"
export {
  default as coordinateGridRasterMixin
} from "./mixins/coordinate-grid-raster-mixin"
export { default as stackMixin } from "./mixins/stack-mixin"
export { default as marginMixin } from "./mixins/margin-mixin"
export { default as mapMixin } from "./mixins/map-mixin"
export {
  default as rasterLayerHeatmapMixin
} from "./mixins/raster-layer-heatmap-mixin"
export {
  default as rasterLayerPointMixin
} from "./mixins/raster-layer-point-mixin"
export {
  default as rasterLayerPolyMixin
} from "./mixins/raster-layer-poly-mixin"
export { default as rasterLayer } from "./mixins/raster-layer"
export { default as rasterMixin } from "./mixins/raster-mixin"
export { default as scatterMixin } from "./mixins/scatter-mixin"
export { default as spinnerMixin } from "./mixins/spinner-mixin"

export { default as legendContinuous } from "./chart-addons/legend-continuous"
export { default as legend } from "./chart-addons/legend"
export { default as legendCont } from "./chart-addons/dc-legend-cont"
