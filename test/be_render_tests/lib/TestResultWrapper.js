class TestResultWrapper {
  constructor(test_name, cmd, args, result) {
    this.test_name = test_name;
    this.cmd = cmd;
    this.args = args;
    this.result = result;
  }

  toString() {
    return this.constructor.name;
  }
}

class TRenderResult extends TestResultWrapper {
  constructor(test_name, cmd, args, result) {
    super(test_name, cmd, args, result);
  }

  get image() {
    return this.result.image;
  }

  get vega_metadata() {
    return this.result.vega_metadata;
  }
}

class TPixelTableRowResult extends TestResultWrapper {
  constructor(test_name, cmd, args, result) {
    super(test_name, cmd, args, result);

    if (!Array.isArray) {
      throw new Error(
        `The ${TPixelTableRowResult.name} from cmd "${cmd}" is expected to be an array of length 1. It is not an array. It's type is ${typeof result}`
      );
    }
    if (result.length !== 1) {
      throw new Error(
        `The ${TPixelTableRowResult.name} from cmd "${cmd}" is expected to be an array of length 1. It has a length of ${result.length}`
      );
    }
    this.result = result[0];

    if (this.result.row_set.length > 1) {
      throw new Error(
        `A ${TPixelTableRowResult.name} with more than one row is not supported. Number of result rows: ${this.result
          .row_set.length}`
      );
    }
  }

  get pixel() {
    return this.result.pixel;
  }

  get vega_table_name() {
    return this.result.vega_table_name;
  }

  get table_ids() {
    return this.result.table_id;
  }

  get row_ids() {
    return this.result.row_id;
  }

  hasTableId(table_id) {
    return this.result.table_id.find((my_table_id) => {
      return my_table_id === table_id;
    });
  }

  get num_rows() {
    return this.result.row_set.length;
  }

  hasTableIdRowId(table_id, row_id) {
    for (let i = 0; i < this.result.table_id.length; ++i) {
      if (this.result.table_id[i] === table_id && this.result.row_id[i] === row_id) {
        return true;
      }
    }
    return false;
  }

  getColumn(column_name) {
    if (this.num_rows === 0) {
      throw new Error(`Cannot get column "${column_name}" from ${TPixelTableRowResult.name}. It has 0 rows.`);
    }
    const row_data = this.result.row_set[0];
    const col_data = row_data[column_name];
    if (col_data === undefined) {
      throw new Error(
        `Column "${column_name}" does not exist in ${TPixelTableRowResult.name}. Existing columns: [${Object.keys(
          row_data
        ).join(", ")}]`
      );
    }
    return col_data;
  }
}

class TQueryResult extends TestResultWrapper {
  constructor(test_name, cmd, args, result) {
    super(test_name, cmd, args, result);
  }
}

class TMapDException extends TestResultWrapper {
  constructor(test_name, cmd, args, exception) {
    super(test_name, cmd, args, exception);
  }

  get error_msg() {
    return this.result.error_msg;
  }

  toString() {
    return `${this.constructor.name}("${this.error_msg}")`;
  }
}

module.exports = { TRenderResult, TPixelTableRowResult, TQueryResult, TMapDException };
