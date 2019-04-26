class MochaOptions {
  constructor(opts) {
    if (opts) {
      const { timeout } = opts;
      this._opts = { timeout };
    } else {
      this._opts = {};
    }
  }

  get options() {
    return this._opts;
  }

  applyOptions(mocha) {
    if (this._opts.timeout !== undefined) {
      mocha.timeout(this._opts.timeout);
    }
  }
}

module.exports = MochaOptions;
