const JsonUtils = require('../utils/JsonUtils');
const OmniSciServerTest = require('./OmniSciServerTest');
const TRenderResult = require('./TestResultWrapper').TRenderResult;

class RenderVegaTest extends OmniSciServerTest {
  constructor(opts, expectation) {
    if (opts instanceof String || typeof opts === 'string') {
      // a vega was passed
      opts = { vega: JSON.parse(opts) };
    } else if (opts instanceof Object && opts.vega === undefined) {
      opts = { vega: opts };
    }

    const { widget_id = 1, vega, compression_level = 3, query_id = null } = opts;
    const args = {
      widget_id,
      vega: JsonUtils.jsonCopy(vega),
      options: { compression_level, query_id }
    };
    super(args, expectation);
  }

  get command() {
    return 'renderVega';
  }
  get widget_id() {
    return this.args.widget_id;
  }
  get vega() {
    return this.args.vega;
  }
  get options() {
    return this.args.options;
  }

  createResultWrapper(test_name, result) {
    return new TRenderResult(test_name, this.command, this.args, result);
  }

  executeTest(connection, callback) {
    connection[this.command](
      this.widget_id,
      JSON.stringify(this.vega),
      this.options,
      callback
    );
  }
}

module.exports = RenderVegaTest;
