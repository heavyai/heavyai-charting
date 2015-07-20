function createDateAsUTC(date) {
      return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
          }

(function(exports){
crossfilter.version = "1.3.11";


exports.resultCache=resultCache;
exports.crossfilter=crossfilter;

function resultCache(con) {
  var resultCache = {
    query: query,
    queryAsync: queryAsync,
    emptyCache: emptyCache,
    setMaxCacheSize: function(size) {
      maxCacheSize = size;
    },
    setDataConnector: function(con) {
      dataConnector = con;
    }
  }

  var maxCacheSize = 5;
  var cache = {}
  var dataConnector = null

  function evictOldestCacheEntry () {
    var oldestQuery = null;
    var oldestTime = 9007199254740992; // 2^53 - max int in javascript
    for (key in cache) {
      if (cache[key].time < oldestTime) {
        oldestQuery = key;
        oldestTime = cache[key].time;
      }
    }
    delete cache[oldestQuery];
  }

  function emptyCache() {
    cache = {};
    return resultCache;
  }

  function queryAsync(query, selector, callbacks) {
    var numKeys = Object.keys(cache).length;
    if (query in cache) {
      cache[query].time = (new Date).getTime();
      asyncCallback(query,selector,cache[query].data,callbacks);
      return;
    }
    if (numKeys >= maxCacheSize) { // should never be gt
      evictOldestCacheEntry();
    }
    callbacks.push(asyncCallback.bind(this,query,selector));
    dataConnector.queryAsync(query, callbacks);
  }

  function asyncCallback(query,selector,result,callbacks) {
    if (selector == undefined) {
      cache[query] = {time: (new Date).getTime(), data: result};
    }
    else {
      cache[query] = {time: (new Date).getTime(), data: selector(result)};
    }
    callbacks.pop()(cache[query].data,callbacks);
  }

  function query (query, selector) {
    var numKeys = Object.keys(cache).length;
    if (query in cache) {
      cache[query].time = (new Date).getTime();
      return cache[query].data;
    }

    if (numKeys >= maxCacheSize) { // should never be gt
      evictOldestCacheEntry();
    }
    if (selector == undefined) {
      cache[query] = {time: (new Date).getTime(), data: dataConnector.query(query)};

    }
    else {
      cache[query] = {time: (new Date).getTime(), data: selector(dataConnector.query(query))};
    }
    return cache[query].data;
  }

  dataConnector = con;
  return resultCache;
}
function crossfilter() {

  var crossfilter = {
    type: 'crossfilter',
    setData: setData, 
    filter: filter,
    getColumns:getColumns,
    dimension: dimension,
    groupAll: groupAll,
    size: size,
    getFilter: function() {return filters;},
    getFilterString: getFilterString,
    getDimensions: function() {return dimensions;},
    getTable: function() {return dataTable;},
    getTableLabel: function() {return tableLabel;}
  };

  var dataTable = null;
  var filters = [];
  var targetFilter = null;
  var columnTypeMap = null;
  var tableLabel = null;
  var dataConnector = null;
  var dimensions = [];
  var globalFilters = [];
  var cache = null; 

  var TYPES = {
      'undefined'        : 'undefined',
      'number'           : 'number',
      'boolean'          : 'boolean',
      'string'           : 'string',
      '[object Function]': 'function',
      '[object RegExp]'  : 'regexp',
      '[object Array]'   : 'array',
      '[object Date]'    : 'date',
      '[object Error]'   : 'error'
  },
  TOSTRING = Object.prototype.toString;

  function type(o) {
        return TYPES[typeof o] || TYPES[TOSTRING.call(o)] || (o ? 'object' : 'null');
  };
  
  function setData(newDataConnector, newDataTable, newTableLabel) {
    dataConnector = newDataConnector;
    cache = resultCache(dataConnector);
    dataTable = newDataTable;
    tableLabel = newTableLabel;
    var columnsArray = dataConnector.getFields(dataTable);
    columnTypeMap = {};

    columnsArray.forEach(function (element) {
      columnTypeMap[element.name] = {"type": element.type, "is_array": element.is_array};
    });
    return crossfilter;
  }

  function getColumns() {
    return columnTypeMap;
  }

  function getFilterString() {
    var filterString = "";
    var firstElem = true;
    $(filters).each(function(i,value) {
      if (value != null && value != "") {
        if (!firstElem) { 
          filterString += " AND ";
        }
        firstElem = false;
        filterString += value;
      }
    });
    return filterString;
  }

  function filter() {
    var filter = {
      filter: filter,
      filterAll: filterAll,
      getFilter: getFilter,
      toggleTarget: toggleTarget
    }

    var filterIndex = filters.length;
    filters.push("");

    function toggleTarget() {
      if (targetFilter == filterIndex) {
        targetFilter = null;
      }
      else {
        targetFilter = filterIndex;
      }
    }

    function getFilter() {
      return filters[filterIndex];
    }

    function filter(filterExpr) {
      if (filterExpr == undefined || filterExpr ==  null) {
        filterAll();
      }
      else {
        filters[filterIndex] = filterExpr;
      }
    }

    function filterAll() {
      filters[filterIndex] = "";
    }

    return filter;
  }


  function dimension(expression) {
    var dimension = {
      type: 'dimension',
      filter: filter,
      filterExact: filterExact,
      filterRange: filterRange,
      filterAll: filterAll,
      filterDisjunct: filterDisjunct,
      filterLike: filterLike,
      filterILike: filterILike,
      getFilter: getFilter,
      projectOn: projectOn,
      getProjectOn: function() {return projectExpressions},
      projectOnAllDimensions: projectOnAllDimensions,
      getResultSet: function() {return resultSet;},
      top: top,
      topAsync: topAsync,
      bottom: bottom,
      group: group,
      groupAll: groupAll,
      toggleTarget: toggleTarget,
      removeTarget: removeTarget,
      dispose: dispose,
      remove: dispose,
      setDrillDownFilter: function(v) {drillDownFilter = v;}
    };
    var dimensionIndex = filters.length;  
    var dimensionGroups = [];
    filters.push("");
    var dimensionExpression = expression;
    var projectExpressions = [];
    var projectOnAllDimensionsFlag = false;
    var binBounds = null; // for binning
    var rangeFilter = null;
    var resultSet = null;
    var isDimArray = false;
    var drillDownFilter = false; // option for array columns - means observe own filter and use conjunctive instead of disjunctive between sub-filters
    var cache = resultCache(dataConnector);

    function toggleTarget() {
      if (targetFilter == dimensionIndex) {
        targetFilter = null;
      }
      else {
        targetFilter = dimensionIndex;  
      }
    }

    function removeTarget() {
      if (targetFilter == dimensionIndex) {
        targetFilter = null;
      }
    }


    function projectOn(expressions) {
      projectExpressions = expressions;
      return dimension;
    }

    function projectOnAllDimensions(flag) {
      projectOnAllDimensionsFlag = flag;
      return dimension;
    }

    function getFilter() {
      return filters[dimensionIndex];
    }

    function filter(range, append,resetRange) {
      append = typeof append !== 'undefined' ? append : false;
      return range == null
          ? filterAll() : Array.isArray(range)
          ? filterRange(range, append,resetRange) : typeof range === "function"
          ? filterFunction(range, append)
          : filterExact(range, append);

    }


    function formatFilterValue(value) {
      var valueType = type(value);
      if (valueType == "string") {
        return "'" + value + "'";
      }
      else if (valueType == "date") {
        return "TIMESTAMP(0) '" + value.toISOString().slice(0,19).replace('T',' ') + "'"
      }
      else {
        return value;
      }
    }

    function filterExact(value,append) {
      append = typeof append !== 'undefined' ? append : false;
      var typedValue = formatFilterValue(value);
      var subExpression = "";
      if (isDimArray) {
        subExpression = typedValue + " = ANY " + dimensionExpression;  
      }
      else {
        subExpression = dimensionExpression + " = " + typedValue;
      }
      if (append) {
        filters[dimensionIndex] += subExpression; 
      }
      else {
        filters[dimensionIndex] = subExpression; 
      }
      return dimension;
    }

    function filterLike(value,append) {
      append = typeof append !== 'undefined' ? append : false;
      if (append) {
          filters[dimensionIndex] += dimensionExpression + " like '%" + value + "%'"; 
      }
      else {
          filters[dimensionIndex] = dimensionExpression + " like '%" + value + "%'"; 
      }
    }

    function filterILike(value) {
      append = typeof append !== 'undefined' ? append : false;
      if (append) {
          filters[dimensionIndex] += dimensionExpression + " ilike '%" + value + "%'"; 
      }
      else {
          filters[dimensionIndex] = dimensionExpression + " ilike '%" + value + "%'"; 
      }
    }

    function filterRange(range, append,resetRange) {
      append = typeof append !== 'undefined' ? append : false;
      if (resetRange == true) {
        rangeFilter = range;
      }

      var typedRange = [formatFilterValue(range[0]),formatFilterValue(range[1])];
      if (append) {
        filters[dimensionIndex] += "(" + dimensionExpression + " >= " + typedRange[0] + " AND " + dimensionExpression + " < " + typedRange[1] + ")"; 
      }
      else {
        filters[dimensionIndex] = "(" + dimensionExpression + " >= " + typedRange[0] + " AND " + dimensionExpression + " < " + typedRange[1] + ")"; 
      }
      return dimension;

    }

    function filterDisjunct(disjunctFilters,resetRangeIn) { // applying or with multiple filters"
      var filterWasNull = filters[dimensionIndex] == null || filters[dimensionIndex] == "";
      var resetRange = false;
      if (resetRangeIn != undefined) {
        resetRange = resetRangeIn; 
        if (resetRange == true) {
          $(dimension).trigger("reranged");
        }
      }

      var lastFilterIndex = disjunctFilters.length - 1;
      filters[dimensionIndex] = "(";
      
      for (var i = 0; i <= lastFilterIndex; i++) {
        var curFilter = disjunctFilters[i]; 
        filter(curFilter, true,resetRange);
        if (i != lastFilterIndex) {
          if (drillDownFilter) { // a bit weird to have this in filterDisjunct - but better for top level functions not to know whether this is a drilldownfilter or not
            filters[dimensionIndex] += " AND ";
          }
          else {
            filters[dimensionIndex] += " OR ";
          }
        }
      }
      filters[dimensionIndex] += ")";
      var filterNowNull = filters[dimensionIndex] == null || filters[dimensionIndex] == "";
      if (filterWasNull && !filterNowNull) {
        $(this).trigger("filter-on");
      }
      else if (!filterWasNull && filterNowNull) {
        $(this).trigger("filter-clear");
      }
      return dimension;
    }

    function filterAll(softFilterClear) {
      if (softFilterClear == undefined || softFilterClear == false) {
        $(this).trigger("filter-clear");
        rangeFilter = null;
      }
      filters[dimensionIndex] = "";
      return dimension;
    }

    // Returns the top K selected records based on this dimension's order.
    // Note: observes this dimension's filter, unlike group and groupAll.
    function writeQuery() {
      var projList = "";
      if (projectOnAllDimensionsFlag) {
        var dimensions = crossfilter.getDimensions();
        var nonNullDimensions = [];
        for (var d = 0; d < dimensions.length; d++) {
          if (dimensions[d] != null /*&& dimensions[d] in columnTypeMap && !columnTypeMap[dimensions[d]].is_array*/) {
            nonNullDimensions.push(dimensions[d]);
          }
        }
        nonNullDimensions = nonNullDimensions.concat(projectExpressions);
        var dimSet = {};
        // now make set of unique non null dimensions
        for (var d = 0; d < nonNullDimensions.length; d++) {
          if (!(nonNullDimensions[d] in dimSet)) {
            dimSet[nonNullDimensions[d]] = null; 
          }
        }
        nonNullDimensions = [];
        for (key in dimSet) {
          nonNullDimensions.push(key);
        }
        projList = nonNullDimensions.join(",")
      }
      else {
        projList = projectExpressions.join(",");
      }

      var query = "SELECT " + projList + " FROM " + dataTable;
      var filterQuery = "";
      var nonNullFilterCount = 0;
      // we observe this dimensions filter
      for (var i = 0; i < filters.length ; i++) {
        if (filters[i] && filters[i] != "") {
          if (nonNullFilterCount > 0) {
            filterQuery += " AND ";
          }
          nonNullFilterCount++;
          filterQuery += filters[i];
        }
      }
      if (filterQuery != "") {
        query += " WHERE " + filterQuery;
      }
      return query;
    }

    function top(k) {
      var query = writeQuery();
      if (query == null) {
        return {};
      }

      if (dimensionExpression != null) {
        query += " ORDER BY " + dimensionExpression + " LIMIT " + k; 
        return cache.query(query);
      }
      else {
        query += " LIMIT " + k; 
        resultSet =  cache.query(query); 
        return resultSet;
      }
    }

    function topAsync(k, callbacks) {
      var query = writeQuery();
      if (query == null) {
        return {};
      }
      if (dimensionExpression != null) {
        query += " ORDER BY " + dimensionExpression + " LIMIT " + k; 
        cache.queryAsync(query,undefined,callbacks);
      }
      else {
        query += " LIMIT " + k; 
        callbacks.push(resultSetCallback.bind(this)); // need this?
        cache.queryAsync(query,undefined,callbacks);

      }
    }

    function bottom(k) {
      var query = writeQuery();
      if (query == null) {
        return {};
      }

      if (dimensionExpression != null) {
        query += " ORDER BY " + dimensionExpression + " DESC LIMIT " + k; 
        return cache.query(query);
      }
      else { 
        query += " LIMIT " + k; 
        resultSet = cache.query(query); 
        return resultSet;
      }
    }

    function bottomAsync(k, callbacks) {
      var query = writeQuery();
      if (query == null) {
        return {};
      }
      if (dimensionExpression != null) {
        query += " ORDER BY " + dimensionExpression + " DESC LIMIT " + k; 
        cache.queryAsync(query,undefined,callbacks);
      }
      else {
        query += " LIMIT " + k; 
        callbacks.push(resultSetCallback.bind(this)); // need this?
        cache.queryAsync(query,undefined,callbacks);

        resultSet =  cache.query(query); 
        return resultSet;
      }
    }

    function resultSetCallback(results,callbacks) {
      resultSet = results;
      callbacks.pop()(results,callbacks);
    }

    function group() {
      var group = {
        top: top,
        topAsync: topAsync,
        all: all,
        binParams: binParams,
        numBins: numBins,
        truncDate: truncDate,
        reduceCount: reduceCount,
        reduceSum: reduceSum,
        reduceAvg: reduceAvg,
        reduceMin: reduceMin,
        reduceMax: reduceMax,
        reduceMulti: reduceMulti,
        setBoundByFilter: setBoundByFilter,
        setTargetSlot: function(s) {targetSlot = s;},
        getTargetSlot: function() {return targetSlot},
        having: having,
        size: size,
        setBinByTimeUnit: function(v) {binByTimeUnit = v;}
      };
      var reduceExpression = null;  // count will become default
      var reduceSubExpressions = null;
      var reduceVars = null;
      var havingExpression = null;
      var binCount = null;
      var boundByFilter = false;
      var dateTruncLevel = null;
      var cache = resultCache(dataConnector);
      var lastTargetFilter = null;
      var targetSlot = 0;
      var timeParams = null;
      var binByTimeUnit = false;

      dimensionGroups.push(group);

      function writeFilter() {
        var filterQuery = "";
        var nonNullFilterCount = 0;
        // we do not observe this dimensions filter
        for (var i = 0; i < filters.length ; i++) {
          if ((i != dimensionIndex || drillDownFilter == true) && i != targetFilter && filters[i] && filters[i] != "") {
            if (nonNullFilterCount > 0) {
              filterQuery += " AND ";
            }
            nonNullFilterCount++;
            filterQuery += filters[i];
          }
          else if (i == dimensionIndex && binCount != null) {
            if (nonNullFilterCount > 0) {
              filterQuery += " AND ";
            }
            nonNullFilterCount++;
            var queryBounds = binBounds;
            if (boundByFilter == true && rangeFilter != null) {
              queryBounds = rangeFilter;
            }

            filterQuery += "(" + dimensionExpression +  " >= " + formatFilterValue(queryBounds[0]) + " AND " + dimensionExpression + " < " + formatFilterValue(queryBounds[1]) + ")";
          }
        }
        return filterQuery;
      }

      function getBinnedDimExpression(getTimeBin) {
        var queryBounds = binBounds;
        if (boundByFilter && rangeFilter != null) {
          queryBounds = rangeFilter;
        }
        var isDate = type(queryBounds[0]) == "date";
        if (isDate) {
          var dimExpr = "extract(epoch from " + dimensionExpression + ")";
          if (getTimeBin != undefined && getTimeBin == true) {
            timeParams = getTimeBinParams([queryBounds[0].getTime(),queryBounds[1].getTime()],binCount); // work okay with async?
            console.log(timeParams);
            var binnedExpression = "cast((" + dimExpr + " - " + timeParams.offset + ") *" + timeParams.scale + " as int)";
            return binnedExpression;
          }
          else {

            var filterRange = (queryBounds[1].getTime() - queryBounds[0].getTime()) * 0.001; // as javscript epoch is in ms

            var binsPerUnit = binCount/filterRange; // is this a float in js?
            var lowerBoundsUTC = queryBounds[0].getTime()/1000;
            var binnedExpression = "cast((" + dimExpr + " - " + lowerBoundsUTC + ") *" + binsPerUnit + " as int)";
            return binnedExpression;
          }
        }
        else {
          var filterRange = queryBounds[1] - queryBounds[0];
          var binsPerUnit = binCount/filterRange; // is this a float in js?
          var binnedExpression = "cast((" + dimensionExpression + " - " + queryBounds[0] + ") *" + binsPerUnit + " as int)";
          return binnedExpression;
        }
      }

      function getTimeBinParams (timeBounds,maxNumBins) {
        var epochTimeBounds = [timeBounds[0]*0.001,timeBounds[1] * 0.001];
        var timeRange = epochTimeBounds[1]-epochTimeBounds[0]; // in seoncds
        var timeParams = {unit: null, scale: null, offset: null, addBin: false, numBins: null};
        var timeScale = null;
        if (timeRange < maxNumBins) {
          timeParams.unit = 'second';
          timeScale = 1;
        }
        else if (timeRange / 60 < maxNumBins) {
          timeParams.unit = 'minute';
          timeScale = 60;
        }
        else if (timeRange / 3600 < maxNumBins) {
          timeParams.unit = 'hour';
          timeScale = 3600;
        }
        else if (timeRange / 86400 < maxNumBins) {
          timeParams.unit = 'day';
          timeScale = 86400;
        }
        else if (timeRange / 604800 < maxNumBins) {
          timeParams.unit = 'week';
          timeScale = 604800;
        }
        else if (timeRange / 2592000 < maxNumBins) {
          timeParams.unit = 'month';
          timeScale =  2592000;
        }
        else {
          timeParams.unit = 'year';
          timeScale = 31536000 ;
        }
        timeParams.scale = 1.0/timeScale;
        if (epochTimeBounds[0] % timeScale != 0) {
          timeParams.addBin = true;
          timeParams.offset = Math.floor(epochTimeBounds[0] / timeScale) * timeScale;
          timeParams.numBins = Math.ceil((epochTimeBounds[1]-timeParams.offset) / timeScale);
        }
        else {
          timeParams.offset = epochTimeBounds[0];
          timeParams.numBins = Math.ceil((epochTimeBounds[1]-epochTimeBounds[0]) / timeScale);
        }
        console.log(timeParams.unit);

        return timeParams;
      }


      function writeQuery() {
        var query = null;
        if (reduceSubExpressions && (targetFilter != null || targetFilter != lastTargetFilter)) {
          if (targetFilter != null && filters[targetFilter] != "" &&  targetFilter != dimensionIndex) { 
            $(group).trigger("targeted", [filters[targetFilter]]);
          }
          else {
            $(group).trigger("untargeted");
          }
          reduceMulti(reduceSubExpressions);
          lastTargetFilter = targetFilter;
        }
        var binnedExpression = null;
        if (binCount != null) {
          binnedExpression = getBinnedDimExpression(binByTimeUnit);
          query = "SELECT " + binnedExpression + " as key," + reduceExpression + " FROM " + dataTable ;
        }
        else {
          var tempDimExpr = dimensionExpression;
          if (isDimArray) {
            tempDimExpr = "UNNEST(" + dimensionExpression + ")";
          }

          query = "SELECT " + tempDimExpr + " as key," + reduceExpression + " FROM " + dataTable ;
        }
        var filterQuery = writeFilter(); 
        if (filterQuery != "") {
          query += " WHERE " + filterQuery;
        }
        // could use alias "key" here
        query += " GROUP BY key";
        if (binCount != null) {
          if (dataConnector.getPlatform() == "mapd") {
            if (timeParams != null) {
              console.log(timeParams.unit);
              query += " HAVING key >= 0 AND key < " + timeParams.numBins;
            }
            else {
              query += " HAVING key >= 0 AND key < " + binCount;
            }
          }
          else {
              query += " HAVING " + binnedExpression + " >= 0 AND " + binnedExpression + " < " + binCount;
          }
        }
        else {
          if (dataConnector.getPlatform() == "mapd") {
            query += " HAVING key IS NOT NULL";
          }
          else {
            query += " HAVING " + dimensionExpression + " IS NOT NULL";
          }
        }
        return query;
      }

      function setBoundByFilter(boundByFilterIn) {
        boundByFilter = boundByFilterIn;
        return group;
      }

      function setAnimFilter() {

        return group;
      }

      function numBins(binCountIn) {
        binCount = binCountIn;
        return group;
      }

      function binParams(binCountIn,initialBounds, boundByFilterIn) {
        binCount = binCountIn;
        binBounds = initialBounds;
        if (boundByFilterIn != undefined) {
          boundByFilter = boundByFilterIn;
        }
        return group;
      }

      function truncDate(dateLevel) {
        dateTruncLevel = dateLevel;
        binCount = binCountIn; // only for "variable" date trunc
        return group;
      }

      function unBinResults(results) {
        var numRows = results.length;
        var queryBounds = binBounds;
        if (boundByFilter && rangeFilter != null) {
          queryBounds = rangeFilter;
        }
        var isDate = type(queryBounds[0]) == "date";


        if (isDate) {
          if (timeParams != null) {
            var offset = timeParams.offset*1000.0;
            var unitsPerBin = (queryBounds[1].getTime() - offset) / timeParams.numBins;
            for (var r = 0; r < numRows; ++r) { 
              results[r]["key"] = new Date ( results[r]["key"] * unitsPerBin + offset);
            }
          }
          else {
            var unitsPerBin = (queryBounds[1].getTime()-queryBounds[0].getTime())/binCount; // in ms
          var queryBounds0Epoch = queryBounds[0].getTime();
            for (var r = 0; r < numRows; ++r) { 
              results[r]["key"] = new Date ( results[r]["key"] * unitsPerBin + queryBounds0Epoch);
            }
          }
        }
        else {
          var unitsPerBin = (queryBounds[1]-queryBounds[0])/binCount;
          for (var r = 0; r < numRows; ++r) { 
            results[r]["key"] = (results[r]["key"] * unitsPerBin) + queryBounds[0];
          }
        }
        return results;
      }

      function all() {
        var query = writeQuery();
        query += " ORDER BY key";
        if (binCount != null) {
          return cache.query(query,unBinResults);
        }
        else {
          return cache.query(query);
        }
      }
      

      function top(k) {
        var query = writeQuery();
        // could use alias "value" here
        query += " ORDER BY ";
        var reduceArray = reduceVars.split(',')
        var reduceSize = reduceArray.length;
        for (var r = 0; r < reduceSize - 1; r++) {
          query += reduceArray[r] +" DESC,";
        }
          query += reduceArray[reduceSize-1] +" DESC";
        if (k != Infinity) {
          query += " LIMIT " + k;
        }
        return cache.query(query);
      }

      function topAsync(k,callbacks) {
        var query = writeQuery();
        // could use alias "value" here
        query += " ORDER BY ";
        var reduceArray = reduceVars.split(',')
        var reduceSize = reduceArray.length;
        for (var r = 0; r < reduceSize - 1; r++) {
          query += reduceArray[r] +" DESC,";
        }
          query += reduceArray[reduceSize-1] +" DESC";
        if (k != Infinity) {
          query += " LIMIT " + k;
        }
        cache.queryAsync(query,undefined,callbacks);
        //return cache.query(query);
      }


      function bottom(k) {
        var query = writeQuery();
        // could use alias "value" here
        query += " ORDER BY " + reduceVars;
        return cache.query(query);
      }

      function reduceCount() {
        reduceExpression = "COUNT(*) AS value";  
        reduceVars = "value";
        return group;
      }

      function reduceSum(sumExpression) {
        reduceExpression = "SUM(" + sumExpression + ") AS value";
        reduceVars = "value";
        return group;
      }

      function reduceAvg(avgExpression) {
        reduceExpression = "AVG(" + avgExpression +") AS value";  
        reduceVars = "value";
        return group;
      }

      function reduceMin(minExpression) {
        reduceExpression = "MIN(" + minExpression +") AS value";  
        reduceVars = "value";
        return group;
      }

      function reduceMax(maxExpression) {
        reduceExpression = "MAX(" + maxExpression +") AS value";  
        reduceVars = "value";
        return group;
      }

      function reduceMulti(expressions) {
        //expressions should be an array of {expression, agg_mode (sql_aggregate), name} 
        reduceSubExpressions = expressions;
        reduceExpression = "";
        reduceVars = "";
        var numExpressions = expressions.length;
        for (var e = 0; e < numExpressions; e++) {
          if (e > 0) {
            reduceExpression += ",";
            reduceVars += ",";
          }
          if (e == targetSlot && targetFilter != null && targetFilter != dimensionIndex && filters[targetFilter] != "") {
            reduceExpression += "AVG(CAST(" + filters[targetFilter] + " AS INT))"
          }
          else {
            var agg_mode = expressions[e].agg_mode.toUpperCase();
            if (agg_mode == "COUNT") {
              reduceExpression += "COUNT(*)";
            }
            else { // should check for either sum, avg, min, max
              reduceExpression += agg_mode + "(" + expressions[e].expression + ")";
            }
          }
          reduceExpression += " AS " + expressions[e].name;
          reduceVars += expressions[e].name;
        }
        return group;
      }

      function having(expression) {
        havingExpression=expression;
        return group;
      }
        

      function size(ignoreFilters) {
        var query = "SELECT COUNT(DISTINCT " + dimensionExpression + ") AS n FROM " + dataTable;
        if (!ignoreFilters) {
          var filterQuery = writeFilter(); 
          if (filterQuery != "") {
            query += " WHERE " + filterQuery;
          }
        }
        return dataConnector.query(query)[0]['n'];
      }

      return reduceCount();
    }

    function dispose() {
      filters[dimensionIndex] = null;
      dimensions[dimensionIndex] = null;
    }
    
    dimensions.push(dimensionExpression);
    if (dimensionExpression in columnTypeMap) {
      isDimArray = columnTypeMap[dimensionExpression].is_array;
    }

    return dimension;
  }
  function groupAll() {
    var group = {
      reduceCount: reduceCount,
      reduceSum: reduceSum,
      reduceAvg: reduceAvg,
      reduceMin: reduceMin,
      reduceMax: reduceMax,
      reduceMulti: reduceMulti,
      value: value,
      values: values
    };
    var reduceExpression = null; 
    var maxCacheSize = 5;
    var cache = resultCache(dataConnector);
    
    function writeFilter() {
      var filterQuery = "";
      var validFilterCount = 0;
      // we observe all filters
      for (var i = 0; i < filters.length ; i++) {
        if (filters[i] && filters[i] != "") {
          if (validFilterCount > 0) {
            filterQuery += " AND ";
          }
          validFilterCount++;
          filterQuery += filters[i];
        }
      }
      return filterQuery;
    }

    function writeQuery(ignoreFilters) {
      var query = "SELECT " + reduceExpression + " FROM " + dataTable ;
      if (!ignoreFilters) {
        var filterQuery = writeFilter(); 
        if (filterQuery != "") {
          query += " WHERE " + filterQuery;
        }
      }
      // could use alias "key" here
      return query;
    }

    function reduceCount() {
      reduceExpression = "COUNT(*) as value";  
      return group;
    }

    function reduceSum(sumExpression) {
      reduceExpression = "SUM(" + sumExpression + ") as value";
      return group;
    }

    function reduceAvg(avgExpression) {
      reduceExpression = "AVG(" + avgExpression +") as value";  
      return group;
    }

    function reduceMin(minExpression) {
      reduceExpression = "MIN(" + minExpression +") as value";  
      return group;
    }

    function reduceMax(maxExpression) {
      reduceExpression = "MAX(" + maxExpression +") as value";  
      return group;
    }

    function reduceMulti(expressions) {
      console.log("reduce multi");
      console.log(expressions);
      //expressions should be an array of {expression, agg_mode (sql_aggregate), name} 
        reduceExpression = "";
        var numExpressions = expressions.length;
        for (var e = 0; e < numExpressions; e++) {
          if (e > 0) {
            reduceExpression += ",";
          }
          var agg_mode = expressions[e].agg_mode.toUpperCase();
          if (agg_mode == "COUNT") {
            reduceExpression += "COUNT(*)";
          }
          else { // should check for either sum, avg, min, max
            reduceExpression += agg_mode + "(" + expressions[e].expression + ")";
            console.log(expressions[e].expression);
          }
          reduceExpression += " AS " + expressions[e].name;
        }
        return group;
      }
      //
      //
      //

    function value(ignoreFilters) {
      var query = writeQuery(ignoreFilters);
      return cache.query(query,function(d) {return d[0]['value']});
    }

    function values(ignoreFilters) {
      var query = writeQuery(ignoreFilters);
      return cache.query(query,function(d) {return d[0]});
    }

    return reduceCount();
  }


  // Returns the number of records in this crossfilter, irrespective of any filters.
  function size() {
    var query = "SELECT COUNT(*) as n FROM " + dataTable;
    return cache.query(query, function(d) {return d[0]['n']});
  }

  return (arguments.length == 3)
    ? setData(arguments[0],arguments[1], arguments[2]) // dataConnector, dataTable
    : crossfilter;

}
})(typeof exports !== 'undefined' && exports || this);
