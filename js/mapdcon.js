(function(exports){
  mapdcon.version= "1.0";
  exports.mapdcon = mapdcon;

  function mapdcon() {
    var mapdcon = {
      setPlatform: setPlatform,
      setHost: setHost,
      setUser: setUser,
      setPort: setPort,
      setDbName: setDbName,
      connect: connect,
      disconnect: disconnect,
      query: query,
      queryAsync: queryAsync,
      getSessionId: function() {return sessionId;},
      getDatabases: getDatabases,
      getTables: getTables,
      getFields: getFields,
      getPlatform: getPlatform,
      getClient: getClient,
      getFrontendViews: getFrontendViews,
      getFrontendView: getFrontendView,
      createFrontendView: createFrontendView
    }
  
    var host = "192.168.1.8";
    var user = "mapd";
    var password = "HyperInteractive"; // to be changed 
    var port = "9090";
    var dbName = null;
    var transport = null;
    var protocol = null;
    var client = null;
    var sessionId = null;
    var datumEnum = {};

    function setPlatform(newPlatform) {
      //dummy function for now
      return mapdcon;
    }

    function getPlatform() {
      return "mapd";
    }
    function getClient() {
      return client;
    }

    function setHost(newHost) {
      host = newHost;
      return mapdcon;
    }

    function setUser (newUser) {
      user = newUser;
      return mapdcon;
    }

    function setPort (newPort) {
      port = newPort;
      return mapdcon;
    }

    function setDbName (newDb) {
      dbName = newDb;
      return mapdcon;
    }

    function testConnection() {
      if (sessionId == null)  {
        return false;
        //throw "Client not connected";
      }
      return true;
    }

    function connect() {
      transport = new Thrift.Transport("http://" + host + ":" + port);
      protocol = new Thrift.Protocol(transport);
      client = new MapDClient(protocol);
      sessionId = client.connect(user, password, dbName);
      return mapdcon;
    }

    function disconnect() {
      if (sessionId != null) {
        client.disconnect(sessionId);
        sessionId = null;
      }
      client = null;
      protocol = null;
      transport = null;
    }

    function getFrontendViews() {
      var result = null;
      try {
        result = client.get_frontend_views(sessionId);
      }
      catch(err) {
        console.log(err);
        if (err.name == "ThriftException") {
          connect();
          result = client.get_frontend_views(sessionId);
        }
      }
      return result;
    }

    function getFrontendView(viewName) {
      var result = null;
      try {
        result = client.get_frontend_view(sessionId,viewName);
      }
      catch(err) {
        console.log(err);
        if (err.name == "ThriftException") {
          connect();
          result = client.get_frontend_views(sessionId,viewName);
        }
      }
      return result;
    }



    function createFrontendView(viewName, viewState) {
      try {
        client.create_frontend_view(sessionId,viewName,viewState);
      }
      catch(err) {
        console.log(err);
        if (err.name == "ThriftException") {
          connect();
          result = client.get_frontend_views(sessionId,viewName,viewState);
        }
      }
    }


    function queryAsync(query,callbacks) {
      testConnection();
      try {
        client.sql_execute(sessionId,query + ";", processResults.bind(this,callbacks));
      }
      catch(err) {
        console.log(err);
        if (err.name == "ThriftException") {
          connect();
          client.sql_execute(sessionId,query + ";", processResults.bind(this,callbacks));
        }
        else {
          throw (err);
        }
      }
    }

    function query(query) {
      var result = null;
      try {
        result = client.sql_execute(sessionId,query + ";");
      }
      catch(err) {
        console.log(err);
        if (err.name == "ThriftException") {
          connect();
          result = client.sql_execute(sessionId,query + ";");
        }
        else {
          throw (err);
        }
      }
      return processResults(undefined,result);
    }

    /*
    function query(query, callback) {
      testConnection();
      var hasCallback = typeof callback !== 'undefined';
      console.log("has callback: " + hasCallback);
      var result = null;
      try {
        if (hasCallback) {
          client.sql_execute(sessionId,query + ";", processResults);
        }
        else {
          result = client.sql_execute(sessionId,query + ";");
        }

      }
      catch (err) {
        console.log(err);
        if (err.name == "ThriftException") {
          connect();
          // try one more time
          if (hasCallback) {
            client.sql_execute(sessionId,query + ";", processResults);
          }
          else {
            result = client.sql_execute(sessionId,query + ";");
          }
        }
      }
      if (!hasCallback) {
        return processResults(result);
      }
    }
    */

    function processResults(callbacks, result) {
      result = result.row_set;
      var hasCallback = typeof callbacks !== 'undefined';
      var formattedResult = {};
      formattedResult.fields = [];
      try {
      var numCols = result.row_desc.length;
      }
      catch (err) {
      }
      var colNames = [];
      for (var c = 0; c < numCols; c++) {
        var field = result.row_desc[c]; 
        formattedResult.fields.push({"name": field.col_name, "type": datumEnum[field.col_type.type], "is_array":field.col_type.is_array});
      }
      formattedResult.results = [];
      var numRows = result.rows.length;
      for (var r = 0; r < numRows; r++) {
        var row = {};
        for (var c = 0; c < numCols; c++) {
          var fieldName = formattedResult.fields[c].name;
          var fieldType = formattedResult.fields[c].type;
          var fieldIsArray = formattedResult.fields[c].is_array;
          if (fieldIsArray) {
            if (result.rows[r].cols[c].is_null) {
              row[fieldName] = "NULL";
              continue;
            }
            row[fieldName] = [];
            var arrayNumElems = result.rows[r].cols[c].val.arr_val.length;
            for (var e = 0; e < arrayNumElems; e++) {
              var elemDatum = result.rows[r].cols[c].val.arr_val[e];
              if (elemDatum.is_null) {
                row[fieldName].push("NULL");
                continue;
              }
              switch(fieldType) {
                case "BOOL":
                  row[fieldName].push(elemDatum.val.int_val ? true : false);
                  break;
                case "INT":
                  row[fieldName].push(elemDatum.val.int_val);
                  break;
                case "FLOAT":
                case "DOUBLE":
                  row[fieldName].push(elemDatum.val.real_val);
                  break;
                case "STR":
                  row[fieldName].push(elemDatum.val.str_val);
                  break;
                case "TIME":
                case "TIMESTAMP":
                case "DATE":
                  row[fieldName].push(elemDatum.val.int_val * 1000);
                  break;
              }
            }
          }
          else {
            var scalarDatum = result.rows[r].cols[c];
            if (scalarDatum.is_null) {
              row[fieldName] = "NULL";
              continue;
            }
            switch (fieldType) {
              case "BOOL":
                row[fieldName] = scalarDatum.val.int_val ? true : false;
                break;
              case "INT":
                row[fieldName] = scalarDatum.val.int_val;
                break;
              case "FLOAT":
              case "DOUBLE":
                row[fieldName] = scalarDatum.val.real_val;
                break;
              case "STR":
                row[fieldName] = scalarDatum.val.str_val;
                break;
              case "TIME":
              case "TIMESTAMP":
              case "DATE":
                row[fieldName] = new Date(scalarDatum.val.int_val * 1000);
                break;
            }
          }
        }
        formattedResult.results.push(row);
      }
      //console.log(query);
      //console.log(formattedResult.results);
      if (hasCallback) {
        callbacks.pop()(formattedResult.results,callbacks);
      }
      else {
        return formattedResult.results;
      }
    }

    function getDatabases () {
      testConnection();
      var databases = null;
      try {
        databases = client.get_databases();
      }
      catch (err) {
        if (err.name == "ThriftException") {
          connect();
          databases = client.get_databases();
        }
      }
      var dbNames = [];
      $(databases).each(function(){dbNames.push(this.db_name)});
      return dbNames;
    }

    function getTables() {
      testConnection();
      var tabs = null;
      try {
        tabs = client.get_tables(sessionId);
      }
      catch (err) {
        if (err.name == "ThriftException") {
          connect();
          tabs = client.get_tables(sessionId);
        }
      }

      var numTables = tabs.length;
      var tableInfo = [];
      for (var t = 0; t < numTables; t++) {
        tableInfo.push({"name": tabs[t], "label": "obs"});
      }
      return tableInfo; 
    }

    function invertDatumTypes() {
      for (key in TDatumType) {
        datumEnum[TDatumType[key]] = key;
      }
    }

    function getFields(tableName) {
      testConnection();
      var fields = client.get_table_descriptor(sessionId,tableName);
      var fieldsArray = [];
      // silly to change this from map to array 
      // - then later it turns back to map
      for (key in fields) {
        fieldsArray.push({"name": key, "type": datumEnum[fields[key].col_type.type], "is_array":fields[key].col_type.is_array});
      }
      return fieldsArray;
    }
    invertDatumTypes();
    return mapdcon;
  }

})(typeof exports !== 'undefined' && exports || this);
