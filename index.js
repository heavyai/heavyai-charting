// Import DC and dependencies

var d3 = require("d3");
var crossfilter = require("../mapd-crossfilter");

var dc = require("./mapdc");
var asyncCoreMixin = require("./overrides/build/core").default

dc = asyncCoreMixin(dc)
dc.mapdTable = require("./overrides/build/mapd-table").default
dc.countWidget = require("./overrides/build/count-widget").default
dc.asyncMixin = require("./overrides/build/async-mixin").default

dc.multipleKeysLabelMixin = require("./overrides/build/multiple-key-label-mixin").default

var multipleKeysAccessorForStack = require("./overrides/build/multiple-key-accessors").multipleKeysAccessorForStack
var multipleKeysAccessorForCap = require("./overrides/build/multiple-key-accessors").multipleKeysAccessorForCap
var heatMapKeyAccessor = require("./overrides/build/heatmap").heatMapKeyAccessor

dc.override(dc, "baseMixin", function(_chart) {
  var baseChart = dc.multipleKeysLabelMixin(dc.asyncMixin(dc._baseMixin(_chart)))
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
    .valueAccessor(d => d.key1)
    .colorAccessor(d => d.value)
})

dc.override(dc, "barChart", function(parent, chartGroup) {
  return dc._barChart(parent, chartGroup)
    .renderLabel(false)
})


module.exports = dc
