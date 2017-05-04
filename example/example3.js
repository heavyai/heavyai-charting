document.addEventListener("DOMContentLoaded", function init() {

  var config = {
    table: "contributions_donotmodify",
    valueColumn: "contributions_donotmodify.amount",
    joinColumn: "contributions_donotmodify.contributor_zipcode",
    polyTable: "zipcodes",
    polyJoinColumn: "ZCTA5CE10",
    timeColumn: "contrib_date",
    timeLabel: "Number of Contributions",
    domainBoundMin: 0,
    domainBoundMax: 2600,
    numTimeBins: 423
  }

  new MapdCon()
    .protocol("https")
    .host("metis.mapd.com")
    .port("443")
    .dbName("mapd")
    .user("mapd")
    .password("HyperInteractive")
    .connect(function(error, con) {
      crossfilter.crossfilter(con, ["contributions_donotmodify", "zipcodes"], [{
        table1: "contributions_donotmodify",
        attr1: "contributor_zipcode",
        table2: "zipcodes",
        attr2: "ZCTA5CE10"
      }]).then(function(cf) {
        crossfilter.crossfilter(con, "contributions_donotmodify").then(cf2 => {
          createPolyMap(cf, con, dc, config, cf2)
          createTimeChart(cf, dc, config, cf2)
        })
      })
    })

  function createPolyMap(crossFilter, con, dc, config, cf2) {
    var parent = document.getElementById("polymap")
    // The values in the table and column specified in crossFilter.dimension
    // must correspond to values in the table and keysColumn specified in polyRasterChart.polyJoin.
    var dim = crossFilter.dimension("zipcodes.rowid") // Values to join on.
    var grp = dim.group().reduceAvg("contributions_donotmodify.amount", "avgContrib") // Values to color on.
    // var dim = crossFilter.dimension("tweets_nov_feb.state_abbr") // Values to join on.
    // var grp = dim.group().reduceAvg("tweets_nov_feb.tweet_count") // Values to color on.

    // Can use getDomainBounds to dynamically find min and max of values that will be colored,
    // or the domain [min, max] can be set directly
    // (in which case nesting chart creation inside this callback is unnecessary).
    getDomainBounds(config.valueColumn, cf2.groupAll(), function(domainBounds){
      // Can set colorDomain directly or use domainFromBoundsAndRange to generate a .
      var colorRange = ["#115f9a","#1984c5","#22a7f0","#48b5c4","#76c68f","#a6d75b","#c9e52f","#d0ee11","#d0f400"]
      var colorDomain = domainFromBoundsAndRange(config.domainBoundMin, config.domainBoundMax, colorRange)
      // var colorDomain = domainFromBoundsAndRange(domainBounds.minimum, domainBounds.maximum, colorRange)

      var polyMap = dc
      .rasterChart(parent, true)
      .con(con)
      .height(height()/1.5)
      .width(width())
      .mapUpdateInterval(750) // ms
      .mapStyle("mapbox://styles/mapbox/light-v8")

      var polyLayer = dc
      .rasterLayer("polys")
      .dimension(dim)
      .group(grp)
      .fillColorAttr('avgContrib')
      .defaultFillColor("green")
      .fillColorScale(d3.scale.linear().domain(colorDomain).range(colorRange))

      polyMap.pushLayer("polys", polyLayer).init().then(() => {
        // polyMap.borderWidth(zoomToBorderWidth(polyMap.map().getZoom()))
        // Keeps the border widths reasonable regardless of zoom level.
        polyMap.map().on("zoom", function() {
          // polyMap.borderWidth(zoomToBorderWidth(polyMap.map().getZoom()))
        })

        dc.renderAllAsync()

        window.addEventListener("resize", _.debounce(function(){ resizeChart(polyMap, 1.5) }, 500))
      })
    })
  }

  function getDomainBounds (column, groupAll, callback) {
    groupAll.reduce([
      {expression: column, agg_mode: "min", name: "minimum"},
      {expression: column, agg_mode: "max", name: "maximum"}
    ]).valuesAsync(true).then(callback)
  }

  function domainFromBoundsAndRange (min, max, range) {
    return _.range(0, range.length).map((_, i) => min + Math.round(i * max / (range.length - 1)))
  }

  function zoomToBorderWidth (zoomLevel) {
    var MIN_ZOOM = 0.8626373575587937
    var ZOOM_BORDER_DIVISOR = 20
    return zoomLevel / ZOOM_BORDER_DIVISOR - MIN_ZOOM / ZOOM_BORDER_DIVISOR
  }

  function createTimeChart(crossFilter, dc, config, cf2) {
    getDomainBounds(config.timeColumn, cf2.groupAll(), function(timeChartBounds){
      var timeChartDimension = crossFilter.dimension(config.timeColumn)
      var timeChartGroup = timeChartDimension
      .group()
      .reduceCount("*")

      var timeChart = dc.lineChart("#timechart")
      .width(width())
      .height(height()/2.5)
      .elasticY(true)
      .renderHorizontalGridLines(true)
      .brushOn(true)
      .xAxisLabel("Time")
      .yAxisLabel(config.timeLabel)
      .dimension(timeChartDimension)
      .group(timeChartGroup)
      .binParams({
        numBins: config.numTimeBins,
        binBounds: [timeChartBounds.minimum, timeChartBounds.maximum]
      })

      timeChart.x(d3.time.scale.utc().domain([timeChartBounds.minimum, timeChartBounds.maximum]))
      timeChart.yAxis().ticks(5)
      timeChart
        .xAxis()
        .scale(timeChart.x())
        .tickFormat(dc.utils.customTimeFormat)
        .orient('bottom');

      dc.renderAllAsync()

      window.addEventListener("resize", _.debounce(function () { resizeChart(timeChart, 2.5) }, 500))
    })
  }

  function width () {
    return document.documentElement.clientWidth - 30
  }

  function height () {
    return (Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 200)
  }

  function resizeChart (chart, heightDivisor) {
    if(typeof chart.map === "function"){
      chart.map().resize()
      chart.isNodeAnimate = false
    }
    chart
    .width(width())
    .height(height()/heightDivisor)
    .renderAsync()
    dc.redrawAllAsync()
  }

  function noop () {}
})
