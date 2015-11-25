/*
 * This is MapD boilerplate showing examples on how to make 3 charts.
 */

function CreateCharts(crossFilter) { 

  var colorScheme = ["#22A7F0", "#3ad6cd", "#d4e666"]

  var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0) - 50
  var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 200

/*
 * crossFilter is an object with a number of methods on it.
 * One of those methods is .getColumns
 */

    var allColumns = crossFilter.getColumns();
 
/*
 *  This will grab all columns from the table    
 *  Once you have the column name you want to pass into crossfilter
 *  create a new dimension variable like this:
 */

/*------------------------CHART 1 EXAMPLE------------------------------*/


/* 
 * use crossFilter Methods here:
 * https://github.com/square/crossfilter/wiki/API-Reference#dimension
 * https://github.com/square/crossfilter/wiki/API-Reference#group-map-reduce
 * https://github.com/square/crossfilter/wiki/API-Reference#group_reduceCount
 */

    var rowChartDimension = crossFilter.dimension("dest_state");   
    var rowChartGroup = rowChartDimension.group().reduceCount();

/*
 *  Simple Bar Chart Example:
 *  use DC api here:
 *  https://github.com/dc-js/dc.js/blob/master/web/docs/api-latest.md
 */

    var dcBarChart =  dc.rowChart('.chart1-example')
                      .height(h/1.5)
                      .width(w/2)
                      .elasticX(true)
                      .cap(20)
                      .othersGrouper(false)
                      .dimension(rowChartDimension)
                      .group(rowChartGroup)
                      .ordinalColors(colorScheme);


/*--------------------------CHART 2 EXAMPLE------------------------------*/

/*
 *  Bubble Chart Example:
 *
 *  MapD created a reduceMulti in order to handle multiple measures. 
 *  it takes 3 arguments:
 *  'expression' which is the measure
 *  'agg_mode' which is the calculation to perform.
 *  'name' is how to reference the data
 */

    var reduceMultiExpression1 = [{
      expression: "arrdelay", 
      agg_mode:"avg", 
      name: "x"
    },
    {
      expression: "depdelay", 
      agg_mode:"avg", 
      name: "y"
    },
    {
      expression: "count", 
      agg_mode:"count", 
      name: "size"
    }]

    var scatterPlotDimension = crossFilter.dimension("carrier_name");

    var scatterPlotGroup = scatterPlotDimension
                        .group()
                        .reduceMulti(reduceMultiExpression1)

     dcScatterPlot =  dc.bubbleChart('.chart2-example')
                      .height(h/1.5)
                      .width(w/2)
                      .renderHorizontalGridLines(true)
                      .renderVerticalGridLines(true)
                      .cap(30)
                      .dimension(scatterPlotDimension)
                      .group(scatterPlotGroup)
                      .keyAccessor(function (d) {
                          return d.x;
                      })
                      .valueAccessor(function (d) {
                          return d.y;
                      })
                      .radiusValueAccessor(function (d) {
                          return d.size;
                      })
                      .maxBubbleRelativeSize(0.05)
                      .transitionDuration(500)
                      .xAxisLabel('Arrival Delay')
                      .yAxisLabel('Departure Delay')
                      .ordinalColors(colorScheme)
                      

                      var setScales = function(chart, type){
                        chart.on(type, function(chart) {
                          chart.x(d3.scale.linear().domain(d3.extent(chart.data(), chart.keyAccessor())));
                          chart.y(d3.scale.linear().domain(d3.extent(chart.data(), chart.valueAccessor())));
                          chart.r(d3.scale.linear().domain(d3.extent(chart.data(), chart.radiusValueAccessor())));
                        });
                      }

                      setScales(dcScatterPlot, "preRender");
                      setScales(dcScatterPlot, "preRedraw");

/*--------------------------CHART 3 EXAMPLE------------------------------*/

  /*
   *  Time Chart Example:
   */

    var reduceMultiExpression2 = 
    [{
      expression: "arr_timestamp", 
      agg_mode:"min", 
      name: "min"
    },
    {
      expression: "arr_timestamp", 
      agg_mode:"max", 
      name: "max"}
    ]

    var timeChartBounds = crossFilter
                          .groupAll()
                          .reduceMulti(reduceMultiExpression2)
                          .values(true);
                            
    var timeChartDimension = crossFilter.dimension("arr_timestamp");
    
    var timeChartGroup = timeChartDimension.group() 
                .reduceCount()
                .setBinParams({
                   numBins: 400, 
                   binBounds: [timeChartBounds.min,timeChartBounds.max]
                  }).setBoundByFilter(true);

    var dcTimeChart = dc.lineChart('.chart3-example')
      .width(w)
      .height(h/2.5)
      .elasticY(true)
      .renderHorizontalGridLines(false)
      .brushOn(true)
      .dimension(timeChartDimension)
      .group(timeChartGroup);

    dcTimeChart
      .x(d3.time.scale.utc().domain([timeChartBounds.min,timeChartBounds.max]))
      .yAxis().ticks(5);

    dcTimeChart
      .xAxis().orient('top');

    dc.renderAll()
    
/*--------------------------RESIZE EVENT------------------------------*/
  
    window.addEventListener("resize", debounce(reSizeAll, 100));

    function reSizeAll(){
      var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0) - 50
      var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 200

      dcBarChart
        .height(h/1.5)
        .width(w/2)

      dcScatterPlot
        .height(h/1.5)
        .width(w/2)

      dcTimeChart
        .width(w)
        .height(h/2.5)

      dc.renderAll();
    }

}



function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};


function init() {

/*
 * mapdcon is a monad.
 * 
 * It provides a MapD specific API to Thrift.
 */

  var con = mapdcon()
    .setUserAndPassword('mapd', 'HyperInteractive')
    .setHost("demo.mapd.com") 
    .setPort("9090")
    .setDbName("mapd")
    .connect();
  
/*
 *  This instaniates a new crossfilter.
 *  Pass in mapdcon as the first argument to crossfilter, and then the
 *  table name twice.
 *
 *  to see all availables --  con.getTables()
 */  
  var crossFilter = crossfilter(con,"flights","flights");
  
/*
 *  Pass instance of crossfilter into our CreateCharts.
 */  

  var chart = new CreateCharts(crossFilter);
}

document.addEventListener('DOMContentLoaded', init, false);

