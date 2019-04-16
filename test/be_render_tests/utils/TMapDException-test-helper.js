class TMapDException {
  constructor(test_name, cmd, args, exception) {
    this.test_name = test_name;
    this.cmd = cmd;
    this.args = args;
    this.exception = exception;
  }

  get error_msg() {
    return this.exception.error_msg;
  }
}

function chaiTMapDExceptionPlugin(chai, utils) {
  chai.Assertion.addProperty('TMapDException', function() {
    this.assert(
      this._obj instanceof TMapDException,
      'Expected #{this} to be a TMapDException',
      'Expected #{this} to not be a TMapDException'
    );
  });

  chai.Assertion.addChainableMethod('vegaParseError', function(json_loc) {
    const obj = this._obj;
    new chai.Assertion(obj).is.a.TMapDException;
    const err_msg = obj.error_msg;
    const parse_re = /JSON parse error \(([\w\/]+)\): (.+)/;
    const match = parse_re.exec(err_msg);
    this.assert(
      match,
      `expected exception to be a vega parse error, but the error message thrown was "${err_msg}"`,
      `expected error message "${err_msg}" to not be a vega parse error`
    );
    if (json_loc) {
      this.assert(
        match[1] === json_loc,
        `expected vega parse error "${err_msg}" to occur at JSON location "${json_loc}", but it occurred at location "${match[1]}".`,
        `expected vega parse error "${err_msg}" to not occur at JSON location "${json_loc}".`
      );
    }
    // if (obj instanceof TPixelTableRowResult) {
    // 	utils.flag(this, 'TPixelTableRowResult', this._obj);
    // 	this._obj = obj.num_rows;
    // } else {
    // 	this.assert(false, `expected #{this} to have a numrows property.`);
    // }
  });
}

module.exports = {
  chaiTMapDExceptionPlugin,
  TMapDException
};
