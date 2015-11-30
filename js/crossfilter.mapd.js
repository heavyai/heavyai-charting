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

  var maxCacheSize = 10;
  var cache = {}
  var cacheCounter = 0;
  var dataConnector = null;

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

  function queryAsync(query, eliminateNullRows, renderSpec, selectors, callbacks) {
    var numKeys = Object.keys(cache).length;
    if (query in cache) {
      cache[query].time = cacheCounter++;
      // change selector to null as it should aready be in cache
      asyncCallback(query,undefined,cache[query].data,callbacks);
      //var nonce = cache[query].data.nonce;
      //if (nonce !== undefined)
      //  return nonce; 
      return;
    }
    if (numKeys >= maxCacheSize) { // should never be gt
      evictOldestCacheEntry();
    }
    callbacks.push(asyncCallback.bind(this,query,selectors));
    return dataConnector.queryAsync(query, true, eliminateNullRows, renderSpec, callbacks);
  }

  function asyncCallback(query,selectors,result,callbacks) {
    if (selectors === undefined) {
      cache[query] = {time: cacheCounter++, data: result};
    }
    else {
      var data = result;
      for (var s = 0; s < selectors.length; s++) {
        data = selectors[s](result);
      }
      cache[query] = {time: cacheCounter++, data: data};
    }
    callbacks.pop()(cache[query].data,callbacks);
  }

  function query (query, eliminateNullRows, renderSpec, selectors) {
    var numKeys = Object.keys(cache).length;
    if (query in cache) {
      cache[query].time = cacheCounter++;
      return cache[query].data;
    }
    else {

    }
    if (numKeys >= maxCacheSize) { // should never be gt
      evictOldestCacheEntry();
    }
    if (selectors === undefined) {
      cache[query] = {time: (new Date).getTime(), data: dataConnector.query(query, true, eliminateNullRows, renderSpec)
      };
    }

    else {
      var data = dataConnector.query(query, true, eliminateNullRows, renderSpec);
      for (var s = 0; s < selectors.length; s++) {
        data = selectors[s](data);
      }
      cache[query] = {time: cacheCounter++, data: data};
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
      columnTypeMap[element.name] = {"type": element.type, "is_array": element.is_array, "is_dict": element.is_dict};
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
      return filter;
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
      return filter;
    }

    function filterAll() {
      filters[filterIndex] = "";
      return filter;
    }

    return filter;
  }

  function multiFilter() {
    // Assumes everything "anded" together
    var filter = {
      filter: filter,
      addFilter: addFilter,
      removeFilter: removeFilter,
      filterAll: filterAll,
      getFilter: getFilter,
      toggleTarget: toggleTarget
    }

    var subFilters = [];

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
        subFilters.splice(0,subFilters.length)
        subFilters.push(filterExpr);
        filters[filterIndex] = filterExpr;
      }
      return filter;
    }

    function writeFilter() {
      subFilters.forEach(function(item, index) {
        if (index !== 0)
          filters[filterIndex] += " AND ";
        filter[filterIndex] += item;
      });
    }


    function addFilter(filterExpr) {
      if (filterExpr == undefined || filterExpr ==  null)
        return;
      subFilters.push(filterExpr);
      writeFilter();
      return filter;
    }
    function removeFilter(filterExpr) {
      if (filterExpr == undefined || filterExpr ==  null)
        return;
      var removeIndex = subFilters.indexOf(filterExpr); // note that indexOf is not supported in IE 7,8
      if (removeIndex > -1) {
        subFilters.splice(removeIndex, 1);
        writeFilter();
      }
      return filter;
    }

    function filterAll() {
      subFilters.splice(0,subFilters.length)
      filters[filterIndex] = "";
      return filter;
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
      filterMulti: filterMulti,
      filterLike: filterLike,
      filterILike: filterILike,
      getFilter: getFilter,
      getFilterString: getFilterString,
      projectOn: projectOn,
      getProjectOn: function() {return projectExpressions},
      projectOnAllDimensions: projectOnAllDimensions,
      getResultSet: function() {return resultSet;},
      samplingRatio: samplingRatio,
      top: top,
      topAsync: topAsync,
      bottom: bottom,
      bottomAsync: bottomAsync,
      group: group,
      groupAll: groupAll,
      toggleTarget: toggleTarget,
      removeTarget: removeTarget,
      dispose: dispose,
      remove: dispose,
      value: function () {return dimArray;},
      setDrillDownFilter: function(v) {drillDownFilter = v; return dimension;} // makes filter conjunctive
    };
    var filterVal = null;
    var dimensionIndex = filters.length;
    var dimensionGroups = [];
    filters.push("");
    var projectExpressions = [];
    var projectOnAllDimensionsFlag = false;
    var binBounds = null; // for binning
    var rangeFilters = [];
    var resultSet = null;
    var dimContainsArray = [];
    var drillDownFilter = false; // option for array columns - means observe own filter and use conjunctive instead of disjunctive between sub-filters
    var cache = resultCache(dataConnector);
    var dimArray = [];
    var dimensionExpression = null;
    var samplingRatio = null;

    var multiDim = Array.isArray(expression);

    if (multiDim)
      dimArray = expression;
    else  {
      if (expression !== null)
        dimArray = [expression];
    }

    if (dimArray.length > 0)
      dimensionExpression = "";
    for (var i = 0; i < dimArray.length; i++) {
      if (i != 0)
        dimensionExpression += ", ";
      dimensionExpression += dimArray[i];
      //dimensionExpression += dimArray[i] + " as key" + i.toString();
    }

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
      return filterVal;
    }

    function getFilterString() {
      return filters[dimensionIndex];
    }

    function filter(range, append,resetRange) {
      append = typeof append !== 'undefined' ? append : false;
      return range == null
          ? filterAll() : Array.isArray(range) && !multiDim
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
      var isArray = Array.isArray(value);
      if (!isArray)
        value = [value];
      var subExpression = "";
      for (var e = 0; e < value.length; e++) {
        if (e > 0)
          subExpression += " AND ";
        var typedValue = formatFilterValue(value[e]);
        if (dimContainsArray[e]) {
          subExpression += typedValue + " = ANY " + dimArray[e];
        }
        else {
          subExpression += dimArray[e] + " = " + typedValue;
        }
      }

      append = typeof append !== 'undefined' ? append : false;
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
      var isArray = Array.isArray(range[0]);
      if (!isArray)
        range = [range];
      filterVal = range;
      var subExpression = "";

      for (var e = 0; e < range.length; e++) {
        if (resetRange == true) {
          rangeFilters[e] = range[e];
        }
        if (e > 0)
          subExpression += " AND ";

        var typedRange = [formatFilterValue(range[e][0]),formatFilterValue(range[e][1])];
        subExpression += dimArray[e] + " >= " + typedRange[0] + " AND " + dimArray[e] + " < "+ typedRange[1];
      }

      append = typeof append !== 'undefined' ? append : false;
      if (append) {
        filters[dimensionIndex] += "(" + subExpression + ")";
      }
      else {
        filters[dimensionIndex] = "(" + subExpression + ")";
      }
      return dimension;

    }

    function filterMulti(filterArray,resetRangeIn) { // applying or with multiple filters"
      //filterVal = filterArray;
      var filterWasNull = filters[dimensionIndex] == null || filters[dimensionIndex] == "";
      var resetRange = false;
      if (resetRangeIn !== undefined) {
        resetRange = resetRangeIn;
        if (resetRange == true) {
          $(dimension).trigger("reranged");
        }
      }

      var lastFilterIndex = filterArray.length - 1;
      filters[dimensionIndex] = "(";

      for (var i = 0; i <= lastFilterIndex; i++) {
        var curFilter = filterArray[i];
        filter(curFilter, true,resetRange);
        if (i != lastFilterIndex) {
          if (drillDownFilter) { // a bit weird to have this in filterMulti - but better for top level functions not to know whether this is a drilldownfilter or not
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
        rangeFilters = [];
      }
      filterVal = null;
      filters[dimensionIndex] = "";
      return dimension;
    }

    // Returns the top K selected records based on this dimension's order.
    // Note: observes this dimension's filter, unlike group and groupAll.
    function writeQuery(hasRenderSpec) {
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

      // stops query from happening if variables do not exist in chart
      if(projList === ""){
        return;
      }

      if (hasRenderSpec)
        projList += ",rowid";

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
      if (samplingRatio !== null) {
        if (filterQuery)
          query += " AND ";
        else
          query += " WHERE ";
        var threshold = Math.floor(4294967296  * samplingRatio);
        query += " rowid * 265445761 % 4294967296 < " + threshold;
      }

      return query;
    }

    function samplingRatio(ratio) {
      if (!ratio)
        samplingRatio = null;
      samplingRatio = ratio;
      return dimension;
    }

    function top(k, offset, renderSpec) {
      var query = writeQuery(renderSpec !== undefined);
      if (query == null) {
        return {};
      }

      if (dimensionExpression != null) {
        query += " ORDER BY " + dimensionExpression + " LIMIT " + k;
        return cache.query(query, false);
      }
      else {
        query += " LIMIT " + k;
        resultSet =  cache.query(query, false, renderSpec);
        return resultSet;
      }
    }

    function topAsync(k, offset, renderSpec, callbacks) {
      var query = writeQuery(renderSpec !== undefined);
      if (query == null) {
        return {};
      }
      if (dimensionExpression !== null) {
        query += " ORDER BY " + dimensionExpression + " LIMIT " + k;
        if (offset !== undefined) {
          query += " OFFSET " + offset;
        }
        return cache.queryAsync(query, false, renderSpec, undefined, callbacks);
      }
      else {
        query += " LIMIT " + k;
        if (offset !== undefined) {
          query += " OFFSET " + offset;
        }
        if (renderSpec === undefined)
          callbacks.push(resultSetCallback.bind(this)); // need this?
        return cache.queryAsync(query, false, renderSpec, undefined,callbacks);

      }
    }

    function bottom(k, offset) {
      var query = writeQuery();
      if (query == null) {
        return {};
      }

      if (dimensionExpression != null) {
        query += " ORDER BY " + dimensionExpression + " DESC LIMIT " + k;
        if (offset !== undefined) {
          query += " OFFSET " + offset;
        }
        return cache.query(query, false);
      }
      else {
        query += " LIMIT " + k;
        if (offset !== undefined) {
          query += " OFFSET " + offset;
        }
        resultSet = cache.query(query, false);
        return resultSet;
      }
    }

    function bottomAsync(k, offset, renderSpec, callbacks) {
      var query = writeQuery();
      if (query == null) {
        return {};
      }
      if (dimensionExpression != null) {
        query += " ORDER BY " + dimensionExpression + " DESC LIMIT " + k;
        if (offset !== undefined) {
          query += " OFFSET " + offset;
        }
        return cache.queryAsync(query, false, renderSpec, undefined, callbacks);
      }
      else {
        query += " LIMIT " + k;
        if (offset !== undefined) {
          query += " OFFSET " + offset;
        }
        callbacks.push(resultSetCallback.bind(this)); // need this?
        return cache.queryAsync(query, false, renderSpec,  undefined, callbacks);
      }
    }

    function resultSetCallback(results,callbacks) {
      resultSet = results;
      callbacks.pop()(results,callbacks);
    }

    function group() {
      var group = {
        order: order,
        orderNatural: orderNatural,
        top: top,
        topAsync: topAsync,
        all: all,
        allAsync: allAsync,
        setBinParams: setBinParams,
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
        setEliminateNull: function(v) {eliminateNull = v;},
        setBinByTimeUnit: function(v) {binByTimeUnit = v;},
        writeFilter: writeFilter,
      };
      var reduceExpression = null;  // count will become default
      var reduceSubExpressions = null;
      var reduceVars = null;
      var havingExpression = null;
      var binParams = null;
      /*
      var binCount = null;
      var binBounds = null;
      */
      var boundByFilter = false;
      var dateTruncLevel = null;
      var cache = resultCache(dataConnector);
      var lastTargetFilter = null;
      var targetSlot = 0;
      var timeParams = null;
      var binByTimeUnit = false;
      var eliminateNull = true;
      var _orderExpression = null;

      dimensionGroups.push(group);

      function eliminateNullRow(results) {
        var numRows = results.length;
        results.forEach(function(item, index,object) {
          if (item.key0 == "NULL") { // @todo fix
            object.splice(index,1);
          }
        });
        return results;
      }

      function writeFilter(queryBinParams) {
        var filterQuery = "";
        var nonNullFilterCount = 0;
        // we do not observe this dimensions filter
        for (var i = 0; i < filters.length ; i++) {
          if ((i != dimensionIndex || drillDownFilter == true) && i != targetFilter && filters[i] && filters[i].length > 0) {
            if (nonNullFilterCount > 0 && filterQuery != "") { // filterQuery != "" is hack as notNullFilterCount was being incremented
              filterQuery += " AND ";
            }
            nonNullFilterCount++;
            filterQuery += filters[i];
          }
          else if (i == dimensionIndex && queryBinParams != null) {
            var tempBinFilters = "";
            if (nonNullFilterCount > 0) {
              tempBinFilters += " AND ";
            }
            nonNullFilterCount++;
            var hasBinFilter = false;
            for (var d = 0; d < dimArray.length; d++) {
              if (queryBinParams[d] !== null) {
                var queryBounds = queryBinParams[d].binBounds;
                if (boundByFilter == true && rangeFilters.length > 0) {
                  queryBounds = rangeFilters[d];
                }
                if (d > 0 && hasBinFilter) // @todo fix - allow for interspersed nulls
                  tempBinFilters += " AND ";
                hasBinFilter = true;
                tempBinFilters += "(" + dimArray[d] +  " >= " + formatFilterValue(queryBounds[0]) + " AND " + dimArray[d] + " < " + formatFilterValue(queryBounds[1]) + ")";
              }
            }
            if (hasBinFilter)
              filterQuery += tempBinFilters;
          }
        }
        return filterQuery;
      }

      function getBinnedDimExpression(expression, binBounds, numBins, getTimeBin) {
        var isDate = type(binBounds[0]) == "date";
        if (isDate) {
          var dimExpr = "extract(epoch from " + expression + ")";
          if (getTimeBin !== undefined && getTimeBin == true) {
            timeParams = getTimeBinParams([binBounds[0].getTime(),binBounds[1].getTime()],numBins); // work okay with async?
            var binnedExpression = "cast((" + dimExpr + " - " + timeParams.offset + ") *" + timeParams.scale + " as int)";
            return binnedExpression;
          }
          else {

            var filterRange = (binBounds[1].getTime() - binBounds[0].getTime()) * 0.001; // as javscript epoch is in ms

            var binsPerUnit = (numBins / filterRange).toFixed(9); // truncate to 9 digits to keep precision on backend
            var lowerBoundsUTC = binBounds[0].getTime()/1000;
            var binnedExpression = "cast((" + dimExpr + " - " + lowerBoundsUTC + ") *" + binsPerUnit + " as int)";
            return binnedExpression;
          }
        }
        else {
          var filterRange = binBounds[1] - binBounds[0];
          var binsPerUnit = (numBins / filterRange).toFixed(9); // truncate to 9 digits to keep precision on backend
          var binnedExpression = "cast((" + expression + " - " + binBounds[0] + ") *" + binsPerUnit + " as int)";
          return binnedExpression;
        }
      }

      function getTimeBinParams (timeBounds,maxNumBins) {
        var epochTimeBounds = [timeBounds[0]*0.001,timeBounds[1] * 0.001];
        var timeRange = epochTimeBounds[1] - epochTimeBounds[0]; // in seconds
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

        return timeParams;
      }


      function writeQuery(queryBinParams) {
        var query = null;
        if (reduceSubExpressions && (targetFilter !== null || targetFilter !== lastTargetFilter)) {
          if (targetFilter !== null && filters[targetFilter] !== "" &&  targetFilter !== dimensionIndex) {
            $(group).trigger("targeted", [filters[targetFilter]]);
          }
          else {
            $(group).trigger("untargeted");
          }
          reduceMulti(reduceSubExpressions);
          lastTargetFilter = targetFilter;
        }
        var binnedExpression = null;
        if (queryBinParams !== null) {
          query = "SELECT ";
          for (var d = 0; d < dimArray.length; d++) {

            if (queryBinParams[d] !== null) {
              var binBounds = boundByFilter && rangeFilters.length > 0 ? rangeFilters[d] : queryBinParams[d].binBounds;

              var binnedExpression = getBinnedDimExpression(dimArray[d], binBounds, queryBinParams[d].numBins, binByTimeUnit);
              query += binnedExpression + " as key" + d.toString() + ","
            }
            else {
              query += dimArray[d] + " as key" + d.toString() + ",";
            }
          }

          query += reduceExpression + " FROM " + dataTable ;
        }
        else {
          var tempDimExpr = "";
          for (var d = 0; d < dimArray.length; d++) {
            if (d != 0)
              tempDimExpr += ",";
            if (dimContainsArray[d])
              tempDimExpr += "UNNEST(" + dimArray[d] + ")";
            else
              tempDimExpr += dimArray[d];
            tempDimExpr += " as key" + d.toString();
          }
          query = "SELECT " + tempDimExpr + ", " + reduceExpression + " FROM " + dataTable ;
        }
        var filterQuery = writeFilter(queryBinParams);
        if (filterQuery != "") {
          query += " WHERE " + filterQuery;
        }
        // could use alias "key" here
        query += " GROUP BY ";
        for (var i = 0; i < dimArray.length; i++) {
          if (i != 0)
            query += ", ";
          query += "key" + i.toString();
        }
        if (queryBinParams !== null) {
          if (dataConnector.getPlatform() == "mapd") {
            if (timeParams !== null) {
              query += " HAVING key0 >= 0 AND key0 < " + timeParams.numBins; // @todo fix
            }
            else {
              var havingClause = " HAVING ";
              var hasBinParams = false;
              for (var d = 0; d < queryBinParams.length; d++) {
                if (queryBinParams[d] !== null) {
                  if (d > 0 && hasBinParams)
                    havingClause += " AND ";
                  hasBinParams = true;
                  havingClause += "key" + d.toString() + " >= 0 AND key" + d.toString() + " < " + queryBinParams[d].numBins; //@todo fix
                }
              }
              if (hasBinParams)
                query += havingClause;
            }
          }
          else {
              for (var d = 0; d < queryBinParams.length; d++) {
                if (queryBinParams[d] !== null) {
                  query += " HAVING " + binnedExpression + " >= 0 AND " + binnedExpression + " < " + queryBinParams[d].numBins;
                }
              }
          }
        }
        else {
          if (dataConnector.getPlatform() == "mapd") {
            //query += " HAVING key IS NOT NULL";
          }
          else {
            //query += " HAVING " + dimensionExpression + " IS NOT NULL";
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
      function numBins(numBinsIn) {
        if (!Array.isArray(numBinsIn))
            numBinsIn = [numBinsIn];
        if (numBinsIn.length != binParams.length)
          throw ("Num bins length must be same as bin params length");
        for (var d = 0; d < numBinsIn.length; d++)
          binParams[d].numBins = numBinsIn[d];
        return group;
      }

      function setBinParams(binParamsIn) {

        binParams = binParamsIn;
        if (!Array.isArray(binParams))
          binParams = [binParams];

        return group;
      }

      function truncDate(dateLevel) {
        dateTruncLevel = dateLevel;
        binCount = binCountIn; // only for "variable" date trunc
        return group;
      }

      function unBinResults(queryBinParams, results) {
        var numRows = results.length;
        for (var b = 0; b < queryBinParams.length; b++) {
          if (queryBinParams[b] === null)
            continue;
          var queryBounds = queryBinParams[b].binBounds;
          var numBins = queryBinParams[b].numBins;
          if (boundByFilter && rangeFilters.length > 0 ) { // assuming rangeFilter is always more restrictive than boundByFilter
            queryBounds = rangeFilters[b];
          }
          var keyName = "key" + b.toString();


          var isDate = type(queryBounds[b]) == "date";

          if (isDate) {
            if (timeParams != null) {
              var offset = timeParams.offset*1000.0;
              var unitsPerBin = (queryBounds[1].getTime() - offset) / timeParams.numBins;
              for (var r = 0; r < numRows; ++r) {
                results[r][keyName] = new Date ( results[r][keyName] * unitsPerBin + offset);
              }
            }
            else {
              var unitsPerBin = (queryBounds[1].getTime()-queryBounds[0].getTime())/numBins; // in ms
            var queryBounds0Epoch = queryBounds[0].getTime();
              for (var r = 0; r < numRows; ++r) {
                results[r][keyName] = new Date ( results[r][keyName] * unitsPerBin + queryBounds0Epoch);
              }
            }
          }
          else {
            var unitsPerBin = (queryBounds[1]-queryBounds[0])/numBins;
            for (var r = 0; r < numRows; ++r) {
              results[r][keyName] = (results[r][keyName] * unitsPerBin) + queryBounds[0];
            }
          }
        }
        return results;
      }
      
      /* set ordering to expression */

      function order(orderExpression) {
        _orderExpression = orderExpression;
        return group;
      }

      /* set ordering back to natural order (i.e. by measures)*/

      function orderNatural() {
        _orderExpression = null;
        return group;
      }

      function all() {
        var queryBinParams = $.extend([], binParams); // freeze bin params so they don't change out from under us
        if (!queryBinParams.length)
          queryBinParams = null;
        var query = writeQuery(queryBinParams);
        query += " ORDER BY ";
        for (var d = 0; d < dimArray.length; d++) {
          if (d > 0)
            query += ",";
          query += "key" + d.toString();
        }
        if (queryBinParams != null) {
          return cache.query(query,eliminateNull, undefined, [unBinResults.bind(this, queryBinParams)]);
        }
        else {
          return cache.query(query, eliminateNull, undefined);
        }
      }

      function allAsync(callbacks) {
        var queryBinParams = $.extend([], binParams); // freeze bin params so they don't change out from under us
        if (!queryBinParams.length)
          queryBinParams = null;
        var query = writeQuery(queryBinParams);
        query += " ORDER BY ";
        for (var d = 0; d < dimArray.length; d++) {
          if (d > 0)
            query += ",";
          query += "key" + d.toString();
        }
        if (queryBinParams != null) {
          cache.queryAsync(query,eliminateNull, undefined, [unBinResults.bind(this, queryBinParams)],callbacks);
        }
        else {
          cache.queryAsync(query,eliminateNull, undefined, undefined, callbacks);
        }
      }

      function top(k, offset) {
        var query = writeQuery(null); // null is for queryBinParams
        // could use alias "value" here
        query += " ORDER BY ";
        if (_orderExpression) {
          query += _orderExpression + " DESC";
        }
        else {
          var reduceArray = reduceVars.split(',')
          var reduceSize = reduceArray.length;
          for (var r = 0; r < reduceSize - 1; r++) {
            query += reduceArray[r] +" DESC,";
          }
          query += reduceArray[reduceSize-1] +" DESC";
        }

        if (k != Infinity) {
          query += " LIMIT " + k;
        }
        if (offset !== undefined) {
          query += " OFFSET " + offset;
        }
        return cache.query(query, eliminateNull);
      }

      function topAsync(k, offset, renderSpec, callbacks) {
        var query = writeQuery(null); // null is for queryBinParams
        // could use alias "value" here
        query += " ORDER BY ";
        if (_orderExpression) {
          query += _orderExpression + " DESC";
        }
        else {
          var reduceArray = reduceVars.split(',')
          var reduceSize = reduceArray.length;
          for (var r = 0; r < reduceSize - 1; r++) {
            query += reduceArray[r] +" DESC,";
          }
          query += reduceArray[reduceSize-1] +" DESC";
        }
        if (k != Infinity) {
          query += " LIMIT " + k;
        }
        if (offset !== undefined) {
          query += " OFFSET " + offset;
        }

        cache.queryAsync(query,eliminateNull, undefined, undefined, callbacks);
        //return cache.query(query);
      }


      function bottom(k, offset) {
        var query = writeQuery();
        // could use alias "value" here
        if (_orderExpression) {
          query += _orderExpression;
        }
        else {
          var reduceArray = reduceVars.split(',')
          var reduceSize = reduceArray.length;
          for (var r = 0; r < reduceSize - 1; r++) {
            query += reduceArray[r] +",";
          }
          query += reduceArray[reduceSize-1];
        }
        query += " ORDER BY " + reduceVars;
        if (k != Infinity) {
          query += " LIMIT " + k;
        }
        if (offset !== undefined) {
          query += " OFFSET " + offset;
        }
        return cache.query(query, eliminateNull);
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
        var query = "SELECT ";
        for (var d = 0; d < dimArray.length; d++) {
          if (d > 0)
            query += ",";
          query += "COUNT(DISTINCT " + dimArray[d] + ") AS n";
          if (multiDim)
            query += d.toString();
        }
        query += " FROM " + dataTable;
        if (!ignoreFilters) {
          var queryBinParams = jquery.extend([], binParams); // freeze bin params so they don't change out from under us
          if (!queryBinParams.length)
            queryBinParams = null;
          var filterQuery = writeFilter(queryBinParams);
          if (filterQuery != "") {
            query += " WHERE " + filterQuery;
          }
        }
        if (!multiDim)
          return dataConnector.query(query)[0]['n'];
        else {
          var queryResult = dataConnector.query(query)[0];
          var result = [];
          for (var d = 0; d < dimArray.length; d++) {
            var varName = "n" + d.toString();
            result.push(queryResult[varName]);
          }
          return result;
        }
      }

      return reduceCount();
    }

    function dispose() {
      filters[dimensionIndex] = null;
      dimensions[dimensionIndex] = null;
    }
    var nonAliasedDimExpression = "";

    dimensions.push(dimensionExpression);
    for (var d = 0; d < dimArray.length; d++) {
      if (dimArray[d] in columnTypeMap) {
        dimContainsArray[d] = columnTypeMap[dimArray[d]].is_array;
      }
      else {
        dimContainsArray[d] = false;
      }
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
      valueAsync: valueAsync,
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
      return cache.query(query, false, undefined, [function(d) {return d[0]['value']}]);
    }

    function valueAsync(callbacks) {
      var query = writeQuery();
      cache.queryAsync(query, false, undefined, [function(d) {return d[0]['value'];}],callbacks);
    }

    function values(ignoreFilters) {
      var query = writeQuery(ignoreFilters);
      return cache.query(query, false, undefined, [function(d) {return d[0]}]);
    }

    return reduceCount();
  }


  // Returns the number of records in this crossfilter, irrespective of any filters.
  function size() {
    var query = "SELECT COUNT(*) as n FROM " + dataTable;
    return cache.query(query, false, undefined, [function(d) {return d[0]['n']}]);
  }

  return (arguments.length == 3)
    ? setData(arguments[0],arguments[1], arguments[2]) // dataConnector, dataTable
    : crossfilter;

}
})(typeof exports !== 'undefined' && exports || this);
