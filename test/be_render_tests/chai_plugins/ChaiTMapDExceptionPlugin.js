const TMapDException = require("../lib/TestResultWrapper").TMapDException;

module.exports = function(chai, utils) {
  chai.Assertion.addProperty("TMapDException", function(arg) {
    this.assert(
      this._obj instanceof TMapDException,
      "Expected #{this} to be a TMapDException",
      "Expected #{this} to not be a TMapDException"
    );
  });

  chai.Assertion.addChainableMethod("TMapDException", function(err_regex) {
    const obj = this._obj;
    new chai.Assertion(obj).is.a.TMapDException;
    const err_msg = obj.error_msg;
    const parse_re = err_regex instanceof RegExp ? err_regex : new RegExp(err_regex);
    const match = parse_re.exec(err_msg);
    this.assert(
      match,
      `expected TMapDException("${err_msg}") to match regular expression ${parse_re.toString()}."`,
      `expected TMapDException("${err_msg}") to not match regular expression ${parse_re.toString()}.`
    );
  });

  chai.Assertion.addChainableMethod("vegaParseError", function(json_loc) {
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
  });
};
