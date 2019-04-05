const util = require('util');
const MapdCon = require("@mapd/connector");
const ImageCompareReporter = require('../utils/image-compare-reporter.js');
const chai = require('chai');
const {chaiTRenderResultsPlugin, TRenderResult} = require('../utils/TRenderResult-test-helper');

const image_compare_reporter = new ImageCompareReporter(chai, {golden_img_dir: './golden_images'});
chai.use(chaiTRenderResultsPlugin);

const zipcode_tests = require('./test_configs/zipcode-poly-render-test')(chai);

let conn = null;
function omnisciConnect() {
  conn = new MapdCon()
    .protocol('http')
    .host('localhost')
    .port('1024')
    .dbName('mapd')
    .user('mapd')
    .password('HyperInteractive');

  return conn.connectAsync();
}

function omnisciDisconnect() {
  return new Promise((resolve, reject) => {
    if (conn) {
      conn.disconnect((error, results) => {
        if (error) {
          reject(error);
        }
        resolve(results);
      });
    } else {
      resolve();
    }
  });
}

function embedCallerArgsToResult(result, command, args) {
  result._cmd_and_args = {command, args};
}

function handleRenderVega(test_name, args, expectation) {
  const { widgetId, vega, options } = args;
  return new Promise((resolve, reject) => {
    conn.renderVega(widgetId, JSON.stringify(vega), options, (error, results) => {
      const result = error ? null : new TRenderResult(test_name, "renderVega", args, results);
      resolve(expectation(result));
    });
  });
}

function handleTestConfig(test_config) {
  it(test_config.test_desc, async function() {
    const {command, args, expectation} = test_config.test_endpoint
    if (command === "renderVega") {
      await handleRenderVega(test_config.test_name, args, expectation)
    }
  });
}

describe('BE render vega single-node tests', function() {
  before(async function() {
    await omnisciConnect();
  });

  after(async function() {
    await omnisciDisconnect();
  });

  describe(zipcode_tests.test_desc, function() {
    let test_config = zipcode_tests.getNextTest();
    while(test_config) {
      handleTestConfig(test_config);
      test_config = zipcode_tests.getNextTest();
    }
  });
});

after(function() {
  image_compare_reporter.reportErrors();
});
