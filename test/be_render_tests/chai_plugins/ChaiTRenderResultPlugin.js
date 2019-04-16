const TRenderResult = require('../lib/TestResultWrapper').TRenderResult;

module.exports = function(chai, utils) {
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
    utils.flag(this, 'TRenderResult', this._obj);
    this._obj = image;
  });

  chai.Assertion.addChainableMethod('vega_metadata', null, function() {
    new chai.Assertion(this._obj).to.be.instanceof(TRenderResult);
    let vega_metadata = this._obj.vega_metadata;
    new chai.Assertion(vega_metadata).to.be.a('string');
    new chai.Assertion(() => {
      vega_metadata = JSON.parse(vega_metadata);
    }).to.not.throw();
    utils.flag(this, 'TRenderResult', this._obj);
    this._obj = vega_metadata;
  });

  function assertVegaMetaDataMember(prop, name) {
    const vega = this._obj;
    const vega_assert = new chai.Assertion(vega);
    vega_assert.assert(
      vega instanceof Object,
      'expected vega #{this} to be a JSON object',
      'expected #{this} to not be a vega JSON object'
    );
    const prop_assert = new chai.Assertion(vega);
    prop_assert.assert(
      vega[prop] !== undefined,
      `expected vega json to have a "${prop}" property:\n${JSON.stringify(
        vega,
        null,
        2
      )}`,
      `expected vega json to not have a "${prop}" property:\n${JSON.stringify(
        vega,
        null,
        2
      )}`
    );
    const member_array = vega[prop];
    const member_arr_assert = new chai.Assertion(member_array);
    member_arr_assert.assert(
      Array.isArray(member_array),
      `expected property "${prop}" in vega json to be an array. It is a ${typeof member_array}. Vega: \n${JSON.stringify(
        vega,
        null,
        2
      )}`,
      `expected property "${prop}" in vega json to not be an array. Vega: \n${JSON.stringify(
        vega,
        null,
        2
      )}`
    );
    let named_prop = null;
    for (let i = 0; i < member_array.length; ++i) {
      if (member_array[i].name === name) {
        named_prop = member_array[i];
        break;
      }
    }
    const member_assert = new chai.Assertion(named_prop);
    member_assert.assert(
      named_prop !== null,
      `expected the property array "${prop}" in the vega to contain an object named "${name}". Vega:\n${JSON.stringify(
        vega,
        null,
        2
      )}`,
      `expected the property array "${prop}" in the vega to not contain an object named "${name}". Vega:\n${JSON.stringify(
        vega,
        null,
        2
      )}`
    );
    utils.flag(this, 'vega', vega);
    this._obj = named_prop;
  }

  chai.Assertion.addChainableMethod('scale', function(name) {
    assertVegaMetaDataMember.call(this, 'scales', name);
  });

  chai.Assertion.overwriteMethod('closeTo', function(_super) {
    return function approx(val, tolerance) {
      const obj = this._obj;
      if (obj) {
        if (Array.isArray(obj)) {
          new chai.Assertion(val).is.an('array');
          new chai.Assertion(obj.length).equals(val.length);
          for (let i = 0; i < obj.length; ++i) {
            new chai.Assertion(
              obj[i],
              `expected [${obj}] to be close to [${val}]`
            ).closeTo(val[i], tolerance);
          }
        } else {
          _super.call(this, val, tolerance);
        }
      } else {
        _super.call(this, val, tolerance);
      }
    };
  });
};
