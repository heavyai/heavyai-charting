const fs = require('fs');
const extend = require('extend');
const gm = require('gm');

/**
 * Returns a chai plugin that adds the '.matchesGoldenImage' assertion
 */
module.exports = function makeChaiImageCompare(in_config) {
  const config = {
    report: './report',
    base_golden_img_dir: './',
    highlight: 'red',
    threshold: 0.001
  };

  extend(config, in_config || {});
  
  return function chaiImageAssert(chai, utils) {
    chai.Assertion.addMethod('matchesGoldenImage', matchGoldenImage);

    function matchGoldenImage(golden_image_name) {
      const image = this._obj;

      g

      this.assert(false, `expected ${golden_image_name}`, `did not expect ${golden_image_name}`);
    }
  }
}