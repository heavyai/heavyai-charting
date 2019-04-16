const OmniSciServerTest = require('./OmniSciServerTest');
const TQueryResult = require('./TestResultWrapper').TQueryResult;

class SqlExecuteTest extends OmniSciServerTest {
  constructor(opts, expectation) {
    super(expectation);
    if (opts instanceof String || typeof opts === 'string') {
      // a query was passed
      opts = { query: opts };
    }

    const { query, query_id = null } = opts;
    this._args = {
      query: (' ' + query).slice(1), // forces a copy of the string
      options: { query_id }
    };
  }

  createResultWrapper(test_name, result) {
    return new TQueryResult(test_name, 'query', this._args, result);
  }

  executeTest(connection, callback) {
    connection.query(this._args.query, this._args.options, callback);
  }
}

module.exports = SqlExecuteTest;
