document.addEventListener('DOMContentLoaded', init);

function init() {
  var tableName = 'contributions';
  // var tableName = 'tweets_nov_feb';

  var con = new MapdCon().protocol("http").host("kali.mapd.com").port("9092").dbName("mapd").user("mapd").password("HyperInteractive").connect();
  var crossFilter = crossfilter.crossfilter(con, tableName);
  createPolyMap(crossFilter, con, tableName, dc);
}

function createPolyMap(crossFilter, con, tableName, dc) {
  var parent = document.getElementById("polymap");
  // The values in the table and column specified in crossFilter.dimension
  // must correspond to values in the table and keysColumn specified in polyRasterChart.polyJoin.
  var dim = crossFilter.dimension("contributions.contributor_zipcode") // Values to join on.
  var grp = dim.group().reduceAvg('contributions.amount') // Values to color on.
  // var dim = crossFilter.dimension("tweets_nov_feb.state_abbr") // Values to join on.
  // var grp = dim.group().reduceAvg('tweets_nov_feb.tweet_count') // Values to color on.

  // Can use getDomainBounds to dynamically find min and max of values that will be colored,
  // or the domain [min, max] can be set directly
  // (in which case nesting chart creation inside this callback is unnecessary).
  getDomainBounds(grp, function(domainBounds){
    // Can set colorDomain directly or use domainFromBoundsAndRange to generate a .
    var colorRange = ["#115f9a","#1984c5","#22a7f0","#48b5c4","#76c68f","#a6d75b","#c9e52f","#d0ee11","#d0f400"]
    var colorDomain = domainFromBoundsAndRange(0, 2600, colorRange)
    // var colorDomain = domainFromBoundsAndRange(domainBounds.min, domainBounds.max, colorRange)

    var polyMap = dc
    .polyRasterChart(parent, true)
    .con(con)
    .height(height())
    .width(width())
    .dimension(dim)
    .group(grp)
    .tableName(tableName)
    .mapUpdateInterval(750) // ms
    .othersGrouper(false)
    .opacity(0.90)
    .mapStyle('mapbox://styles/mapbox/light-v8')

    .polyJoin({table: "zipcodes", keysColumn: "ZCTA5CE10"})
    // .polyJoin({table: "states", keysColumn: "STATE_ABBR"})
    .colors(d3.scale.linear().domain(colorDomain).range(colorRange))
    .borderColor("white")
    polyMap.borderWidth(zoomToBorderWidth(polyMap.map().getZoom()))

    // Keeps the border widths reasonable regardless of zoom level.
    polyMap.map().on('zoom', function() {
      polyMap.borderWidth(zoomToBorderWidth(polyMap.map().getZoom()))
    })

    dc.renderAll()

    window.addEventListener("resize", _.debounce(function(){ reSizeAll(polyMap, dc) }, 500));
  })
}

function getDomainBounds (group, callback) {
  callback({min: extractResult(group.bottom(1)), max: extractResult(group.top(1))})
}

function extractResult (result) {
  return result[0].val
}

function domainFromBoundsAndRange (min, max, range) {
  return _.range(0, range.length).map((_, i) => min + Math.round(i * max / (range.length - 1)))
}

function zoomToBorderWidth (zoomLevel) {
  var MIN_ZOOM = 0.8626373575587937
  var ZOOM_BORDER_DIVISOR = 20
  return zoomLevel / ZOOM_BORDER_DIVISOR - MIN_ZOOM / ZOOM_BORDER_DIVISOR
}

function width () {
  return document.documentElement.clientWidth - 30
}

function height () {
  return (Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 200)/1.5;
}

function reSizeAll(chart, dc){
  chart.map().resize();
  chart.isNodeAnimate = false;
  chart
  .width(width())
  .height(height())
  .render();
  dc.renderAll();
}
