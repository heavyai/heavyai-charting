const util = require('util');
const MapdCon = require('@mapd/connector');
const ImageCompareReporter = require('../utils/ImageCompareReporter');
const chai = require('chai');
const {
  chaiTRenderResultsPlugin,
  TRenderResult
} = require('../utils/TRenderResult-test-helper');
const {
  chaiTPixelTableRowResultPlugin,
  TPixelTableRowResult
} = require('../utils/TPixelTableRowResult-test-helper');
const {
  chaiTMapDExceptionPlugin,
  TMapDException
} = require('../utils/TMapDException-test-helper');

const image_compare_reporter = new ImageCompareReporter(chai, {
  golden_img_dir: './golden_images'
});

chai.use(chaiTRenderResultsPlugin);
chai.use(chaiTPixelTableRowResultPlugin);
chai.use(chaiTMapDExceptionPlugin);

const conn = new MapdCon()
  .protocol('http')
  .host('10.1.0.12')
  .port('1024')
  .dbName('mapd')
  .user('mapd')
  .password('HyperInteractive');

const zipcode_tests = require('./test_configs/zipcode-poly-render-test')(chai, conn);

function omnisciConnect() {
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
  result._cmd_and_args = { command, args };
}

function handleRenderVega(test_name, args, expectation) {
  const { widget_id, vega, options } = args;
  return new Promise((resolve, reject) => {
    if (conn) {
      conn.renderVega(widget_id, JSON.stringify(vega), options, (error, results) => {
        const result = error
          ? new TMapDException(test_name, 'renderVega', args, error)
          : new TRenderResult(test_name, 'renderVega', args, results);
        resolve(expectation(result));
      });
    } else {
      reject(new Error(`Cannot run renderVega. Not connected to server.`));
    }
  });
}

function handleGetResultRowForPixel(test_name, args, expectation) {
  // i64 widget_id, 3: TPixel pixel, 4: map<string, list<string>> table_col_names, 5: bool column_format, 6: i32 pixelRadius

  const { widget_id, pixel, table_col_names, pixel_radius } = args;
  return new Promise((resolve, reject) => {
    if (conn) {
      conn.getResultRowForPixel(
        widget_id,
        pixel,
        table_col_names,
        pixel_radius,
        (error, results) => {
          const result = error
            ? new TMapDException(test_name, 'getResultRowForPixel', args, error)
            : new TPixelTableRowResult(test_name, 'getResultRowForPixel', args, results);
          resolve(expectation(result));
        }
      );
    } else {
      reject(new Error(`Cannot run getResultRowForPixel. Not connected to server.`));
    }
  });
}

function handleTestConfig(test_config) {
  it(test_config.test_desc, async function() {
    let test_endpoints = test_config.test_endpoint;
    if (!Array.isArray(test_endpoints)) {
      test_endpoints = [ test_endpoints ];
    }
    for (let i = 0; i < test_endpoints.length; ++i) {
      if (!(test_endpoints[i] instanceof Object)) {
        throw new Error(
          `Found a "test_endpoint" of type ${typeof test_endpoints[
            i
          ]}. It must be an object.`
        );
      }
      const { command, args, expectation } = test_endpoints[i];
      if (command === 'renderVega') {
        await handleRenderVega(test_config.test_name, args, expectation);
      } else if (command === 'getResultRowForPixel') {
        await handleGetResultRowForPixel(test_config.test_name, args, expectation);
      } else {
        throw new Error(`No handler found for command ${command}`);
      }
    }
  });
}

const server_config = {
  protocol: 'http',
  host: '10.1.0.12',
  dbName: 'mapd',
  user: 'mapd',
  password: 'HyperInteractive'
};

const test_collection = new OmniSciServerTestCollection(
  'BE render vega single-node tests',
  server_config,
  {
    timeout: 5000
  }
);

// describe('BE render vega single-node tests', function() {
//   this.timeout(5000);
//   before(async function() {
//     await conn.connectAsync();
//   });

//   after(async function() {
//     await conn.disconnectAsync();
//   });

//   describe(zipcode_tests.test_desc, function() {
//     if (typeof zipcode_tests.before === 'function') {
//       before(zipcode_tests.before.bind(null, conn));
//     }
//     if (typeof zipcode_tests.after === 'function') {
//       after(zipcode_tests.after.bind(null, conn));
//     }
//     if (typeof zipcode_tests.beforeEach === 'function') {
//       beforeEach(zipcode_tests.beforeEach.bind(null, conn));
//     }
//     if (typeof zipcode_tests.afterEach === 'function') {
//       afterEach(zipcode_tests.afterEach.bind(null, conn));
//     }
//     let test_config = zipcode_tests.getNextTest();
//     while (test_config) {
//       handleTestConfig(test_config);
//       test_config = zipcode_tests.getNextTest();
//     }
//   });
// });

after(function() {
  image_compare_reporter.reportErrors();
});
