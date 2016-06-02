var tableName = 'contributions';
// var tableName = 'tweets_nov_feb';

document.addEventListener('DOMContentLoaded', init);

function init() {
  var con = new MapdCon().protocol("http").host("kali.mapd.com").port("9092").dbName("mapd").user("mapd").password("HyperInteractive").connect();
  var crossFilter = crossfilter(con, tableName);
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
    var domainMinMax = [Math.round(domainBounds.min), Math.round(domainBounds.max)]
    console.log('domainMinMax', domainMinMax)

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
    .mapStyle('json/dark-v8.json')

    .polyJoin({table: "zipcodes", keysColumn: "ZCTA5CE10"})
    // .polyJoin({table: "states", keysColumn: "STATE_ABBR"})

    // optional range must be pair of hex colors.
    // .colors(d3.scale.linear().domain(domainMinMax).range(["#000000", "#FFFFFF"])) // using dynamic domain bounds
    .colors(d3.scale.linear().domain([1, 2600]).range(["#000000", "#FFFFFF"])) // using specific domain bounds
    // .colors(d3.scale.linear().domain([12196, 32586]).range(["#000000", "#55acee"])) // tweets by state, colored Twitter blue.

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
