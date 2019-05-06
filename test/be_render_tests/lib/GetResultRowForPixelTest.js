const JsonUtils = require("../utils/JsonUtils");
const OmniSciServerTest = require("./OmniSciServerTest");
const TPixelTableRowResult = require("./TestResultWrapper").TPixelTableRowResult;
const ObjUtils = require("../utils/ObjUtils");

function validate_pixel(pixel) {
  if (!(pixel instanceof Object) || pixel.constructor !== Object) {
    throw new Error(
      `The pixel argument is not a valid pixel. Expecting an object with an x/y properties, but got a ${ObjUtils.toString(
        pixel
      )}`
    );
  }

  const check_dimension = (prop) => {
    if (typeof pixel[prop] !== "number") {
      throw new Error(
        `The pixel argument ${JSON.stringify(pixel)} must have a '${prop}' property and it must be a number.`
      );
    }
  };

  check_dimension("x");
  check_dimension("y");
}

function validate_table_col_names(table_col_names) {
  if (!(table_col_names instanceof Object) || table_col_names.constructor !== Object) {
    throw new Error(
      `The table_col_names argument is not a valid table_col_names. Expecting an object, but got a ${ObjUtils.toString(
        table_col_names
      )}`
    );
  }
}

class GetResultRowForPixelTest extends OmniSciServerTest {
  constructor(opts, expectation) {
    const { widget_id = 1, pixel, table_col_names, pixel_radius = 2 } = opts;
    validate_pixel(pixel);
    validate_table_col_names(table_col_names);
    const args = {
      widget_id,
      pixel: JsonUtils.jsonCopy(pixel),
      table_col_names: JsonUtils.jsonCopy(table_col_names),
      pixel_radius
    };
    super(args, expectation);
  }

  get command() {
    return "getResultRowForPixel";
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
    connection[this.command](this.widget_id, this.pixel, this.table_col_names, this.pixel_radius, callback);
  }
}

module.exports = GetResultRowForPixelTest;
