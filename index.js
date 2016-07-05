// Import DC and dependencies

var d3 = require("d3");
var crossfilter = require("../mapd-crossfilter");
var dc = require("./mapdc");

dc.asyncMixin = require("./overrides/async-mixin")
dc.redrawAllAsync = require("./overrides/core").redrawAllAsync
dc.renderAllAsync = require("./overrides/core").renderAllAsync

dc.override(dc, "baseMixin", function(_chart) {
  return dc.asyncMixin(dc._baseMixin(_chart))
})

module.exports = dc
