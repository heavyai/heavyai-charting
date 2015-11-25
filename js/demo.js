/*
 * This is MapD boilerplate showing examples on how to make 2 charts.
 */

function CreateCharts(crossFilter) { 

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


    var dimensionChart1 = crossFilter.dimension("dest_state");
   
    // This will return a key and value pair -- and your job is to visualize 
    // the data on the screen
    var groupChart1 = dimensionChart1.group().reduceCount();


    // Chart1-example
    var dcChart1 =  dc.rowChart('.chart1-example')
                      .width(500)
                      .height(500)
                      .elasticX(true)
                      .cap(12)
                      .othersGrouper(false)
                      .dimension(dimensionChart1)
                      .group(groupChart1)


/*--------------------------CHART 2 EXAMPLE------------------------------*/

    var dimensionChart2 = crossFilter.dimension("dest_city");


    // AGG_MODE should be either "sum", "avg", "min", "max"
      
    var boundsChart2 = crossFilter.groupAll().reduceMulti([
      {"expression": "arrdelay", agg_mode:"avg", name: "x"},
      {"expression": "depdelay", agg_mode:"avg", name: "y"},
      {"expression": "depdelay", agg_mode:"avg", name: "size"}])

    var groupChart2 = dimensionChart2
                      .group()
                      .reduceMulti([{"expression": "arrdelay", agg_mode:"avg", name: "x"},
                                    {"expression": "depdelay", agg_mode:"avg", name: "y"},
                                    {"expression": "count", agg_mode:"count", name: "size"}])



    // var groupChart2 = dimensionChart2.group().reduceCount();


    // timeGroup = timeDim.group().reduceCount().setBinParams({numBins: 400, binBounds: [timeBounds.min,timeBounds.max]}).setBoundByFilter(true);
    
    // timeChart = dc.tweetLineChart(timeDiv.get(0))
    //   .width(timeWidth)
    //   .height(timeHeight)
    //   .elasticY(true)
    //   .renderHorizontalGridLines(false)
    //   .brushOn(true)
    //   .dimension(timeDim)
    //   .group(timeGroup);

    // timeChart
    //   .x(d3.time.scale.utc().domain([timeBounds.min,timeBounds.max]))
    //   .yAxis().ticks(5);
    // timeChart
    //   .xAxis().orient('top');

    var dcChart2 =  dc.bubbleChart('.chart2-example')
                      .width(500)
                      .height(500)
                      .renderHorizontalGridLines(true)
                      .renderVerticalGridLines(true)
                      .cap(50)
                      .dimension(dimensionChart2)
                      .group(groupChart2)
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
                      .elasticX(true)
                      .elasticY(true)
                      .xAxisPadding('15%')
                      .yAxisPadding('15%');

                      var setScales = function(chart, type){
                        chart.on(type, function(chart) {
                          chart.x(d3.scale.linear().domain(d3.extent(chart.data(), chart.keyAccessor())));
                          chart.y(d3.scale.linear().domain(d3.extent(chart.data(), chart.valueAccessor())));
                          chart.r(d3.scale.linear().domain(d3.extent(chart.data(), chart.radiusValueAccessor())));
                        });
                      }

                      setScales(dcChart2, "preRender");
                      setScales(dcChart2, "preRedraw");

/*--------------------------CHART 3 EXAMPLE------------------------------*/



    var timeWidth = 500;
    var timeHeight = 80;

    timeBounds = crossFilter
                .groupAll()
                .reduceMulti([{"expression": "arrdelay", agg_mode:"avg", name: "avg"}])
                              .values(true);
    
    timeDim = crossFilter.dimension("dep_timestamp");
    debugger;
    timeGroup = timeDim.group()
                .reduceCount()
                .setBinParams({numBins: 400, binBounds: [timeBounds.avg]})
                .setBoundByFilter(true);
    
    var dcChart3 = dc.lineChart('.chart3-example')
      .width(timeWidth)
      .height(timeHeight)
      .elasticY(true)
      .renderHorizontalGridLines(false)
      .brushOn(true)
      .dimension(timeDim)
      .group(timeGroup);


    dcChart3
      .x(d3.time.scale.utc().domain([timeBounds.avg]))
      .yAxis().ticks(5);

    dc.renderAll()

}


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

$(document).ready(init);
