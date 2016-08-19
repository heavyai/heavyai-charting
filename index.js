// Import DC and dependencies

import filterMixin from "./overrides/build/filter-mixin"
import {heatMapKeyAccessor, heatMapLabel, heatMapValueAccesor} from "./overrides/build/heatmap"
import {normalizeFiltersArray} from "./overrides/build/formatting-helpers"

var d3 = require("d3");
var crossfilter = require("../mapd-crossfilter");

var dc = require("./mapdc");
var asyncCoreMixin = require("./overrides/build/dc-async-mixin").default
var utilsMixin = require("./overrides/build/dc-utils-mixin").default

dc = utilsMixin(asyncCoreMixin(dc))
dc.mapdTable = require("./overrides/build/mapd-table").default
dc.countWidget = require("./overrides/build/count-widget").default
dc.asyncMixin = require("./overrides/build/async-mixin").default
dc.labelMixin = require("./overrides/build/label-mixin").default

dc.multipleKeysLabelMixin = require("./overrides/build/multiple-key-label-mixin").default

var multipleKeysAccessorForStack = require("./overrides/build/multiple-key-accessors").multipleKeysAccessorForStack
var multipleKeysAccessorForCap = require("./overrides/build/multiple-key-accessors").multipleKeysAccessorForCap

dc.override(dc, "baseMixin", function(_chart) {
  var baseChart = filterMixin(dc.labelMixin(dc.multipleKeysLabelMixin(dc.asyncMixin(dc._baseMixin(_chart)))))
  baseChart.keyAccessor(multipleKeysAccessorForCap)
  return baseChart
})

dc.override(dc, "stackMixin", function(_chart) {
  var stackChart = dc._stackMixin(_chart)
  stackChart.keyAccessor(multipleKeysAccessorForStack)
  return stackChart
})

dc.override(dc, "heatMap", function(parent, chartGroup) {
  return dc._heatMap(parent, chartGroup)
    .keyAccessor(heatMapKeyAccessor)
    .valueAccessor(heatMapValueAccesor)
    .colorAccessor(d => d.value)
    .rowsLabel(heatMapLabel)
    .colsLabel(heatMapLabel)
})

dc.override(dc, "barChart", function(parent, chartGroup) {
  return dc._barChart(parent, chartGroup)
    .renderLabel(false)
})

dc.override(dc, "pieChart", function(parent, chartGroup) {
  return dc.multipleKeysLabelMixin(dc._pieChart(parent, chartGroup))
})

dc.override(dc, "lineChart", function(parent, chartGroup) {
  return dc._lineChart(parent, chartGroup)
})

dc.override(dc.filters, "TwoDimensionalFilter", function(filter) {
  filter = filter || [] // filter can be null
  return dc.filters._TwoDimensionalFilter(normalizeFiltersArray(filter))
})

module.exports = dc
