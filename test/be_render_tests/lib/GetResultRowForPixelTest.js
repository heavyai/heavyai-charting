const JsonUtils = require('../utils/JsonUtils');
const OmniSciServerTest = require('./OmniSciServerTest');
const TPixelTableRowResult = require('./TestResultWrapper').TPixelTableRowResult;

class GetResultRowForPixelTest extends OmniSciServerTest {
  constructor(opts, expectation) {
    const { widget_id = 1, pixel, table_col_names, pixel_radius = 2 } = opts;
    const args = {
      widget_id,
      pixel: JsonUtils.jsonCopy(pixel),
      table_col_names: JsonUtils.jsonCopy(table_col_names),
      pixel_radius
    };
    super(args, expectation);
  }

  get command() {
    return 'getResultRowForPixel';
  }
  get widget_id() {
    return this.args.widget_id;
  }
  get pixel() {
    return this.args.pixel;
  }
  get table_col_names() {
    return this.args.table_col_names;
  }
  get pixel_radius() {
    return this.args.pixel_radius;
  }

  createResultWrapper(test_name, result) {
    return new TPixelTableRowResult(test_name, this.command, this.args, result);
  }

  executeTest(connection, callback) {
    connection[this.command](
      this.widget_id,
      this.pixel,
      this.table_col_names,
      this.pixel_radius,
      callback
    );
  }
}

module.exports = GetResultRowForPixelTest;
