// Import DC and dependencies
import {customTimeFormat, extractTickFormat,deepEquals} from "./overrides/src/utils"
import binningMixin from "./overrides/src/binning-mixin"
import createSamplingMixin from "./overrides/src/sampling-mixin"
import filterMixin from "./overrides/src/filter-mixin"
import colorMixin from "./overrides/src/color-mixin"
import groupAllMixin from "./overrides/src/dc-group-all-mixin"
import heatMapMixin from "./overrides/src/heatmap"
import legendCont from "./overrides/src/dc-legend-cont"
import chartLegendMixin from "./overrides/src/legend-mixin"
import mapdTable from "./overrides/src/mapd-table"
import {normalizeFiltersArray} from "./overrides/src/formatting-helpers"
import resetDCStateMixin from "./overrides/src/reset-dc-state-mixin"
import legendMixin from "./overrides/src/dc-legend-mixin"
import coordinateGridMixin from "./overrides/src/coordinate-grid-mixin"
import multiSeriesMixin from "./overrides/src/multi-series-mixin"

var d3 = require("d3");
var crossfilter = require("../mapd-crossfilter");

var dc = require("./mapdc");
var asyncCoreMixin = require("./overrides/src/dc-async-mixin").default
var utilsMixin = require("./overrides/src/dc-utils-mixin").default

dc = resetDCStateMixin(groupAllMixin(utilsMixin(asyncCoreMixin(dc))))
dc.countWidget = require("./overrides/src/count-widget").default
dc.asyncMixin = require("./overrides/src/async-mixin").default
dc.labelMixin = require("./overrides/src/label-mixin").default

dc.multipleKeysLabelMixin = require("./overrides/src/multiple-key-label-mixin").default

var multipleKeysAccessorForStack = require("./overrides/src/multiple-key-accessors").multipleKeysAccessorForStack
var multipleKeysAccessorForCap = require("./overrides/src/multiple-key-accessors").multipleKeysAccessorForCap

const samplingMixin = createSamplingMixin(dc)

dc.mapdTable = function(_chart) {
  return samplingMixin(mapdTable(_chart))
}

dc.override(dc, "baseMixin", function(_chart) {
  var baseChart = chartLegendMixin(filterMixin(dc.labelMixin(dc.multipleKeysLabelMixin(dc.asyncMixin(dc._baseMixin(_chart))))))
  baseChart.keyAccessor(multipleKeysAccessorForCap)
  baseChart.ordering = () => {}
  return baseChart
})

dc.override(dc, "stackMixin", function(_chart) {
  var stackChart = dc._stackMixin(_chart)
  stackChart.keyAccessor(multipleKeysAccessorForStack)
  return stackChart
})

dc.override(dc, "coordinateGridMixin", function(_chart) {
  return coordinateGridMixin(binningMixin(dc._coordinateGridMixin(_chart)))
})

dc.override(dc, "colorMixin", function(_chart) {
  return colorMixin(dc._colorMixin(_chart))
})

dc.override(dc, "heatMap", function(parent, chartGroup) {
  return heatMapMixin(dc._heatMap(parent, chartGroup))
})

dc.override(dc, "barChart", function(parent, chartGroup) {
  return dc._barChart(parent, chartGroup)
    .renderLabel(false)
})

dc.override(dc, "pieChart", function(parent, chartGroup) {
  return dc.multipleKeysLabelMixin(dc._pieChart(parent, chartGroup))
})

dc.override(dc, "lineChart", function(parent, chartGroup) {
  return multiSeriesMixin(dc._lineChart(parent, chartGroup))
})

dc.override(dc.filters, "TwoDimensionalFilter", function(filter) {
  filter = filter || [] // filter can be null
  return dc.filters._TwoDimensionalFilter(normalizeFiltersArray(filter))
})

dc.override(dc, "legend", function() {
  return legendMixin(dc._legend())
})

dc.legendCont = legendCont

dc.utils.deepEquals = deepEquals
dc.utils.customTimeFormat = customTimeFormat
dc.utils.extractTickFormat = extractTickFormat

dc.refreshCharts = () => {
  dc.chartRegistry.list()
    .filter(chart => chart.isMulti && chart.isMulti())
    .forEach(chart => chart.series().selected(null))
}

module.exports = dc
