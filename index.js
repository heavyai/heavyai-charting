// Import DC and dependencies

var d3 = require("d3");
var crossfilter = require("../mapd-crossfilter");

var dc = require("./mapdc");
var asyncCoreMixin = require("./overrides/build/core").default

dc = asyncCoreMixin(dc)
dc.mapdTable = require("./overrides/build/mapd-table").default
dc.countWidget = require("./overrides/build/count-widget").default
dc.asyncMixin = require("./overrides/build/async-mixin").default

dc.override(dc, "baseMixin", function(_chart) {
  return dc.asyncMixin(dc._baseMixin(_chart))
})

module.exports = dc
