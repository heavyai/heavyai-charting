class TRenderResult {
  constructor(test_name, cmd, args, result) {
    this.test_name = test_name;
    this.cmd = cmd;
    this.args = args;
    this.result = result;
  }

  get image() { return this.result.image; }
  get vega_metadata() { return this.result.vega_metadata; }
}

function chaiTRenderResultsPlugin(chai, utils) {
  chai.Assertion.addProperty('TRenderResult', function() {
    this.assert(
      this._obj instanceof TRenderResult,
      'Expected #{this} to be a TRenderResult',
      'Expected #{this} to not be a TRenderResult'
    );
  });

  // function assertTRenderResultImage() {
  //   new chai.Assertion(this._obj).to.be.instanceof(TRenderResult);

  //   const image = this._obj.get('image');
  //   new Assertion(image).to.be.instanceof(Uint8Array);
  // }

  chai.Assertion.addChainableMethod('image', null, function() {
    new chai.Assertion(this._obj).to.be.instanceof(TRenderResult);
    const image = this._obj.image;
    new chai.Assertion(image).to.be.instanceof(Uint8Array);
    utils.flag(this, "TRenderResult", this._obj);
    this._obj = image;
  });
}

module.exports = {
  chaiTRenderResultsPlugin,
  TRenderResult
}