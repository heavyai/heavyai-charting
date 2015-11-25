(function(exports){
  mapdcon.version= "1.0";
  exports.mapdcon = mapdcon;

  function mapdcon() {
    var mapdcon = {
      setPlatform: setPlatform,
      setHost: setHost,
      setUserAndPassword: setUserAndPassword,
      setPort: setPort,
      setDbName: setDbName,
      connect: connect,
      disconnect: disconnect,
      query: query,
      queryAsync: queryAsync,
      getSessionId: function() {return sessionId;},
      getHost: function() {return host},
      getPort: function() {return port},
      getUser: function() {return user},
      getDb: function() {return dbName},
      getUploadServer: function() {return ""}, // empty string: same as frontend server
      getDatabases: getDatabases,
      getTables: getTables,
      getFields: getFields,
      getPlatform: getPlatform,
      getClient: getClient,
      getFrontendViews: getFrontendViews,
      getFrontendView: getFrontendView,
      getServerStatus: getServerStatus,
      createFrontendView: createFrontendView,
      detectColumnTypes: detectColumnTypes,
      createTable: createTable,
      importTable: importTable,
      importTableStatus: importTableStatus,
      createLink: createLink,
      getLinkView: getLinkView,
    }

    var host = null;
    var user = null;
    var password = null; // to be changed
    var port = null;
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

    function setUserAndPassword (newUser,newPassword) {
      user = newUser;
      password = newPassword;
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

    function getServerStatus() {
      var result = null;
      try {
        result = client.get_server_status();
      }
      catch(err) {
        console.log(err);
        if (err.name == "ThriftException") {
          connect();
          result = client.get_server_status();
        }
      }
      return result;
    }


    function createFrontendView(viewName, viewState, imageHash) {
      try {
        client.create_frontend_view(sessionId, viewName, viewState, imageHash);
      }
      catch(err) {
        console.log(err);
        if (err.name == "ThriftException") {
          connect();
          result = client.get_frontend_views(sessionId, viewName, viewState, imageHash);
        }
      }
    }

    function createLink(viewState) {
      try {
        result = client.create_link(sessionId, viewState);
      }
      catch(err) {
        console.log(err);
        if (err.name == "ThriftException") {
          connect();
          result = client.create_link(sessionId, viewState);
        }
      }
      return result;
    }

    function getLinkView(link) {
      try {
        result = client.get_link_view(sessionId, link);
      }
      catch(err) {
        console.log(err);
        if (err.name == "ThriftException") {
          connect();
          result = client.get_link_view(sessionId, link);
        }
      }
      return result;
    }

    function detectColumnTypes(fileName, copyParams, callback) {
      copyParams.delimiter = copyParams.delimiter || "";
      try {
        result = client.detect_column_types(sessionId, fileName, copyParams, callback);
      }
      catch(err) {
        console.log(err);
        if (err.name == "ThriftException") {
          connect();
          result = client.detect_column_types(sessionId, fileName, copyParams, callback);
        }
      }
      return result;
    }


    function queryAsync(query, columnarResults, eliminateNullRows, callbacks) {
      columnarResults = columnarResults === undefined ? true : columnarResults; // make columnar results default if not specified
      try {
        client.sql_execute(sessionId,query + ";", columnarResults, processResults.bind(this,eliminateNullRows,callbacks));
      }
      catch(err) {
        console.log(err);
        if (err.name == "ThriftException") {
          connect();
          client.sql_execute(sessionId,query + ";", columnarResults, processResults.bind(this,callbacks));
        }
        else if (err.name == "TMapDException") {
          swal({title: "Error!",
            text: err.error_msg,
            type: "error",
            confirmButtonText: "Okay"
          });

          // google analytics send error
          ga('send', 'event', 'error', 'async query error', err.error_msg, {
           nonInteraction: true
          });

        }
        else {
          throw(err);
        }
      }
    }

    function query(query,columnarResults,eliminateNullRows) {
      columnarResults = columnarResults === undefined ? true : columnarResults; // make columnar results default if not specified
      var result = null;
      try {
        result = client.sql_execute(sessionId,query + ";",columnarResults);
      }
      catch(err) {
        console.log(err);
        if (err.name == "ThriftException") {
          connect();
          result = client.sql_execute(sessionId,query + ";",columnarResults);
        }
        else if (err.name == "TMapDException") {
          swal({title: "Error!",
            text: err.error_msg,
            type: "error",
            confirmButtonText: "Okay"
          });

          // google analytics send error
          ga('send', 'event', 'error', 'query error', err.error_msg, {
           nonInteraction: true
          })
        }
        else {
          throw(err);
        }
      }
      return processResults(eliminateNullRows, undefined, result); // undefined is callbacks slot
    }

    function processColumnarResults(data,eliminateNullRows) {
      var formattedResult = {fields: [], results: []};
      var numCols = data.row_desc.length;
      var numRows = 0;
      for (var c = 0; c < numCols; c++) {
        var field = data.row_desc[c];
        formattedResult.fields.push({"name": field.col_name, "type": datumEnum[field.col_type.type], "is_array":field.col_type.is_array});
      }
      if (numCols > 0)
        numRows = data.columns[0] !== undefined ? data.columns[0].nulls.length : 0;
      for (var r = 0; r < numRows; r++) {
        if (eliminateNullRows) {
          var rowHasNull = false;
          for (var c = 0; c < numCols; c++) {
            if (data.columns[c].nulls[r]) {
              rowHasNull = true;
              break;
            }
          }
          if (rowHasNull)
            continue;
        }
        var row = {};
        for (var c = 0; c < numCols; c++) {
          var fieldName = formattedResult.fields[c].name;
          var fieldType = formattedResult.fields[c].type;
          var fieldIsArray = formattedResult.fields[c].is_array;
          var isNull = data.columns[c].nulls[r];
          if (isNull) {
            row[fieldName] = "NULL";
            continue;
          }
          if (fieldIsArray) {
            row[fieldName] = [];
            var arrayNumElems = data.columns[c].data.arr_col[r].nulls.length;
            for (var e = 0; e < arrayNumElems; e++) {
              if (data.columns[c].data.arr_col[r].nulls[e]) {
                row[fieldName].push("NULL");
                continue;
              }
              switch(fieldType) {
                case "BOOL":
                  row[fieldName].push(data.columns[c].data.arr_col[r].data.int_col[e] ? true : false);
                  break;
                case "SMALLINT":
                case "INT":
                case "BIGINT":
                  row[fieldName].push(data.columns[c].data.arr_col[r].data.int_col[e]);
                  break;
                case "FLOAT":
                case "DOUBLE":
                case "DECIMAL":
                  row[fieldName].push(data.columns[c].data.arr_col[r].data.real_col[e]);
                  break;
                case "STR":
                  row[fieldName].push(data.columns[c].data.arr_col[r].data.str_col[e]);
                  break;
                case "TIME":
                case "TIMESTAMP":
                case "DATE":
                  row[fieldName].push(data.columns[c].data.arr_col[r].data.int_col[e] * 1000);
                  break;
              }
            }
          }
          else {
            switch (fieldType) {
              case "BOOL":
                row[fieldName] = data.columns[c].data.int_col[r] ? true : false;
                break;
              case "SMALLINT":
              case "INT":
              case "BIGINT":
                row[fieldName] = data.columns[c].data.int_col[r];
                break;
              case "FLOAT":
              case "DOUBLE":
              case "DECIMAL":
                row[fieldName] = data.columns[c].data.real_col[r];
                break;
              case "STR":
                row[fieldName] = data.columns[c].data.str_col[r];
                break;
              case "TIME":
              case "TIMESTAMP":
              case "DATE":
                row[fieldName] = new Date(data.columns[c].data.int_col[r] * 1000);
                break;
            }
          }
        }
        formattedResult.results.push(row);
      }
      return formattedResult;
    }


    function processRowResults(data, eliminateNullRows) {
      var numCols = data.row_desc.length;
      var colNames = [];
      var formattedResult = {fields: [], results: []};
      for (var c = 0; c < numCols; c++) {
        var field = data.row_desc[c];
        formattedResult.fields.push({"name": field.col_name, "type": datumEnum[field.col_type.type], "is_array":field.col_type.is_array});
      }
      formattedResult.results = [];
      var numRows = 0;
      if (data.rows !== undefined && data.rows !== null)
        numRows = data.rows.length; // so won't throw if data.rows is missing
      for (var r = 0; r < numRows; r++) {
        if (eliminateNullRows) {
          var rowHasNull = false;
          for (var c = 0; c < numCols; c++) {
            if (data.rows[r].columns[c].is_null) {
              rowHasNull = true;
              break;
            }
          }
          if (rowHasNull)
            continue;
        }

        var row = {};
        for (var c = 0; c < numCols; c++) {
          var fieldName = formattedResult.fields[c].name;
          var fieldType = formattedResult.fields[c].type;
          var fieldIsArray = formattedResult.fields[c].is_array;
          if (fieldIsArray) {
            if (data.rows[r].cols[c].is_null) {
              row[fieldName] = "NULL";
              continue;
            }
            row[fieldName] = [];
            var arrayNumElems = data.rows[r].cols[c].val.arr_val.length;
            for (var e = 0; e < arrayNumElems; e++) {
              var elemDatum = data.rows[r].cols[c].val.arr_val[e];
              if (elemDatum.is_null) {
                row[fieldName].push("NULL");
                continue;
              }
              switch(fieldType) {
                case "BOOL":
                  row[fieldName].push(elemDatum.val.int_val ? true : false);
                  break;
                case "SMALLINT":
                case "INT":
                case "BIGINT":
                  row[fieldName].push(elemDatum.val.int_val);
                  break;
                case "FLOAT":
                case "DOUBLE":
                case "DECIMAL":
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
            var scalarDatum = data.rows[r].cols[c];
            if (scalarDatum.is_null) {
              row[fieldName] = "NULL";
              continue;
            }
            switch (fieldType) {
              case "BOOL":
                row[fieldName] = scalarDatum.val.int_val ? true : false;
                break;
              case "SMALLINT":
              case "INT":
              case "BIGINT":
                row[fieldName] = scalarDatum.val.int_val;
                break;
              case "FLOAT":
              case "DOUBLE":
              case "DECIMAL":
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
      return formattedResult;
    }

    function processResults(eliminateNullRows,callbacks, result) {
      var hasCallback = typeof callbacks !== 'undefined';
      result = result.row_set;
      var formattedResult = null;
      if (result.is_columnar) {
        formattedResult = processColumnarResults(result,eliminateNullRows);
      }
      else {
        formattedResult = processRowResults(result,eliminateNullRows);
      }
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
      for (var key in TDatumType) {
        datumEnum[TDatumType[key]] = key;
      }
    }

    function getFields(tableName) {
      testConnection();
      var fields = client.get_table_descriptor(sessionId,tableName);
      var fieldsArray = [];
      // silly to change this from map to array
      // - then later it turns back to map
      for (var key in fields) {
        fieldsArray.push({"name": key, "type": datumEnum[fields[key].col_type.type], "is_array":fields[key].col_type.is_array, "is_dict": fields[key].col_type.encoding == TEncodingType["DICT"]});
      }
      return fieldsArray;
    }

    function createTable(tableName, rowDesc, callback) {
      try {
        result = client.send_create_table(sessionId, tableName, rowDesc, callback);
      }
      catch(err) {
        console.log(err);
        if (err.name == "ThriftException") {
          connect();
          result = client.send_create_table(sessionId, tableName, rowDesc, callback);
        }
      }
      return result;
    }

    function importTable(tableName, fileName, copyParams, callback) {
      copyParams.delimiter = copyParams.delimiter || "";
      try {
        result = client.send_import_table(sessionId, tableName, fileName, copyParams, callback);
      }
      catch(err) {
        console.log(err);
        if (err.name == "ThriftException") {
          connect();
          result = client.send_import_table(sessionId, tableName, fileName, copyParams, callback);
        }
      }
      return result;
    }

    function importTableStatus(importId, callback) {
      testConnection();
      callback = callback || null;
      var import_status = null;
      try {
        import_status = client.import_table_status(sessionId, importId, callback);
      }
      catch(err) {
        console.log(err);
        if (err.name == "ThriftException") {
          connect();
          import_status = client.import_table_status(sessionId, importId, callback);
        }
      }
      return import_status;
    }

    invertDatumTypes();
    return mapdcon;
  }

})(typeof exports !== 'undefined' && exports || this);
