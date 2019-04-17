const chai = require('chai');
const chaiOmniSciServerTestPlugins = require('../chai_plugins/ChaiOmniSciServerTestPlugins');
chaiOmniSciServerTestPlugins.addChaiPlugins(chai);
const OmniSciServerTestCollection = require('../lib/OmniSciServerTestCollection');
const ImageCompareReporter = require('../utils/ImageCompareReporter');
const PathUtils = require('../utils/PathUtils');
const path = require('path');

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
    timeout: 8000
  }
);

require('./poly_render_tests/zipcode_test')(test_collection, chai.expect);
require('./poly_render_tests/nyc_buildings_test')(test_collection, chai.expect);
require('./poly_render_tests/various_poly_tests')(test_collection, chai.expect);

require('./symbol_tests/symbol_update_fill_stroke_test')(test_collection, chai.expect);
require('./symbol_tests/symbol_update_data_test')(test_collection, chai.expect);

require('./query_update_tests/flights_query_test')(test_collection, chai.expect);

require('./hittest_tests/poly_hittest_test')(test_collection, chai.expect);

// passing 0 as the argument to getCallerFile() to get the filename of this file
// whereas getCallerFile is intended to be used to get the filename of the caller of
// this function.
test_collection.runMochaTests(path.basename(PathUtils.getCallerFile(0), '.js'));

after(function() {
  image_compare_reporter.reportErrors();
});
