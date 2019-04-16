const chai = require('chai');
const chaiOmniSciServerTestPlugins = require('../chai_plugins/ChaiOmniSciServerTestPlugins');
chaiOmniSciServerTestPlugins.addChaiPlugins(chai);
const OmniSciServerTestCollection = require('../lib/OmniSciServerTestCollection');
const ImageCompareReporter = require('../utils/ImageCompareReporter');

const image_compare_reporter = new ImageCompareReporter(chai, {
  golden_img_dir: './golden_images'
});

const server_config = {
  protocol: 'http',
  host: '10.1.0.12',
  port: 1024,
  dbName: 'mapd',
  user: 'mapd',
  password: 'HyperInteractive'
};

const test_collection = new OmniSciServerTestCollection(
  'BE render vega single-node tests',
  image_compare_reporter,
  server_config,
  {
    timeout: 5000
  }
);

require('./poly_render_tests/zipcode_test')(test_collection, chai.expect);
require('./poly_render_tests/nyc_buildings_test')(test_collection, chai.expect);
require('./poly_render_tests/various_poly_tests')(test_collection, chai.expect);

test_collection.runMochaTests();

after(function() {
  image_compare_reporter.reportErrors();
});
