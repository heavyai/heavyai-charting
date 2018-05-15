import * as core from "./core/core"
import * as coreAsync from "./core/core-async"
import * as events from "./core/events"
import * as filters from "./core/filters"
import * as utils from "./utils/utils"
import * as logger from "./utils/logger"

import {
  BadArgumentException,
  Exception,
  InvalidStateException
} from "./core/errors"

const errors = {
  Exception,
  InvalidStateException,
  BadArgumentException
}

import { default as bubbleOverlay } from "./charts/bubble-overlay"
import { default as barChart } from "./charts/bar-chart"
import { default as bubbleChart } from "./charts/bubble-chart"
import { default as cloudChart } from "./charts/cloud-chart"
import { default as compositeChart } from "./charts/composite-chart"
import { default as dataCount } from "./charts/data-count"
import { default as dataGrid } from "./charts/data-grid"
import { default as geoChoroplethChart } from "./charts/geo-choropleth-chart"
import { default as heatMap } from "./charts/heatmap"
import { default as pieChart } from "./charts/pie-chart"
import { default as lineChart } from "./charts/line-chart"
import { default as numberChart } from "./charts/number-chart"
import { default as rasterChart } from "./charts/raster-chart"
import { default as rowChart } from "./charts/row-chart"
import { default as scatterPlot } from "./charts/scatter-plot"
import { default as mapdTable } from "./charts/mapd-table"
import { default as boxPlot } from "./charts/box-plot"
import { default as countWidget } from "./charts/count-widget"

import { default as asyncMixin } from "./mixins/async-mixin"
import { default as baseMixin } from "./mixins/base-mixin"
import { default as bubbleMixin } from "./mixins/bubble-mixin"
import { default as capMixin } from "./mixins/cap-mixin"
import { default as colorMixin } from "./mixins/color-mixin"
import { default as coordinateGridMixin } from "./mixins/coordinate-grid-mixin"
import {
  default as coordinateGridRasterMixin
} from "./mixins/coordinate-grid-raster-mixin"
import { default as stackMixin } from "./mixins/stack-mixin"
import { default as marginMixin } from "./mixins/margin-mixin"
import { default as mapMixin } from "./mixins/map-mixin"
import {
  default as rasterLayerHeatmapMixin
} from "./mixins/raster-layer-heatmap-mixin"
import {
  default as rasterLayerPointMixin
} from "./mixins/raster-layer-point-mixin"
import {
  default as rasterLayerPolyMixin
} from "./mixins/raster-layer-poly-mixin"
import { default as rasterLayer } from "./mixins/raster-layer"
import { default as rasterMixin } from "./mixins/raster-mixin"
import { default as scatterMixin } from "./mixins/scatter-mixin"
import { default as spinnerMixin } from "./mixins/spinner-mixin"

import { default as legendContinuous } from "./chart-addons/legend-continuous"
import { default as legend } from "./chart-addons/legend"
import { default as legendCont } from "./chart-addons/dc-legend-cont"

export const dc = {
  BadArgumentException,
  Exception,
  InvalidStateException,
  core,
  coreAsync,
  events,
  filters,
  utils,
  logger,
  errors,
  bubbleOverlay,
  barChart,
  bubbleChart,
  cloudChart,
  compositeChart,
  dataCount,
  dataGrid,
  geoChoroplethChart,
  heatMap,
  pieChart,
  lineChart,
  numberChart,
  rasterChart,
  rowChart,
  scatterPlot,
  mapdTable,
  boxPlot,
  countWidget,
  asyncMixin,
  baseMixin,
  bubbleMixin,
  capMixin,
  colorMixin,
  coordinateGridMixin,
  coordinateGridRasterMixin,
  stackMixin,
  marginMixin,
  mapMixin,
  rasterLayerHeatmapMixin,
  rasterLayerPointMixin,
  rasterLayerPolyMixin,
  rasterLayer,
  rasterMixin,
  scatterMixin,
  spinnerMixin,
  legendContinuous,
  legend,
  legendCont
}
