const OmniSciServerTest = require('./OmniSciServerTest');
const TQueryResult = require('./TestResultWrapper').TQueryResult;

class SqlExecuteTest extends OmniSciServerTest {
  constructor(opts, expectation) {
    if (opts instanceof String || typeof opts === 'string') {
      // a query was passed
      opts = { query: opts };
    }

    const { query, query_id = null } = opts;
    const args = {
      query: (' ' + query).slice(1), // forces a copy of the string
      options: { query_id }
    };

    super(args, expectation);
  }

  get command() { return 'query'; }
  get query() { return this.args.query; }
  get sql() { return this.sql; }
  get options() { return this.args.options; }

  createResultWrapper(test_name, result) {
    return new TQueryResult(test_name, this.command, this._args, result);
  }

  executeTest(connection, callback) {
    connection[this.command](this._args.query, this._args.options, callback);
  }
}

module.exports = SqlExecuteTest;
