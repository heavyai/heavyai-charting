const JsonUtils = require('../utils/JsonUtils');
const OmniSciServerTest = require('./OmniSciServerTest');
const TRenderResult = require('./TestResultWrapper').TRenderResult;

class RenderVegaTest extends OmniSciServerTest {
  constructor(opts, expectation) {
    super(expectation);
    if (opts instanceof String || typeof opts === 'string') {
      // a vega was passed
      opts = { vega: JSON.parse(opts) };
    } else if (opts instanceof Object && opts.vega === undefined) {
      opts = { vega: opts };
    }

    const { widget_id = 1, vega, compression_level = 3, query_id = null } = opts;
    this._args = {
      widget_id,
      vega: JsonUtils.jsonCopy(vega),
      options: { compression_level, query_id }
    };
  }

  createResultWrapper(test_name, result) {
    return new TRenderResult(test_name, 'renderVega', this._args, result);
  }

  executeTest(connection, callback) {
    connection.renderVega(
      this._args.widget_id,
      JSON.stringify(this._args.vega),
      this._args.options,
      callback
    );
  }
}

module.exports = RenderVegaTest;
