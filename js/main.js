
function Chart(crossFilter) { 
  var _crossFilter = crossFilter;
  var _dimension = null;
  var _group = null;

  function init() {
    _dimension = _crossFilter.dimension("carrier_name"); 
    _group = _dimension.group().reduceCount();

    debugger;
    
  }
  init();
}


function init() {
  var con = mapdcon().setHost("127.0.0.1").setPort("9090").setDbName("mapd").connect();
  var crossFilter = crossfilter(con,"flights","flights");
  var chart = new Chart(crossFilter);
}


$(document).ready(init);
