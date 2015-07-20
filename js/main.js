function Chart(crossFilter) { 
  var _crossFilter = crossFilter;
  var _dimension = null;
  var _group = null;

  function createChart() {
    // Returns all columns names in some form of dropdown table.
    var allColumns = _crossFilter.getColumns();
    // Only put "Type === STR" into the dropdown table.

    // Pass in the column name into the _crossFilter.dimension parenthesis. "actualelapsedtime"
    var _dimension = _crossFilter.dimension("actualelapsedtime");  
    
    // This is the returned group info.  You will use the method .top to return the top 10 results
    // some kind of chart.
  
    // This will return a key and value pair -- and your job is to visualize 
    // the data on the screen
    var _group = _dimension.group().reduceCount();


    // Bonus points if you can remove the chart.
  }

  createChart();

}


function init() {
  var con = mapdcon().setHost("127.0.0.1").setPort("9090").setDbName("mapd").connect();
  var crossFilter = crossfilter(con,"flights","flights");
  var chart = new Chart(crossFilter);
}

$(document).ready(init);
