const OmniSciServerTestRunner = require('./OmniSciServerTestRunner');
const PathUtils = require('../utils/PathUtils');
const PrefixMgr = require('./PrefixMgr');
const path = require('path');

function find_absolute_golden_img_dir_path(golden_img_dir) {
  if (!path.isAbsolute(golden_img_dir)) {
    // getting the base path of the file whose code called this function
    return path.join(PathUtils.getCallerPath(2), golden_img_dir);
  }
  return golden_img_dir;
}

const prefix_mgr = new PrefixMgr();
class OmniSciServerTestGroup {
  constructor(config) {
    const {
      test_prefix = `${path.basename(PathUtils.getCallerFile(), '.js')}`,
      test_description,
      golden_img_dir,
      before,
      after,
      beforeEach,
      afterEach
    } = config;

    this._prefix = prefix_mgr.getPrefix(test_prefix);

    if (!test_description) {
      throw new Error(
        `${OmniSciServerTestGroup.name} must have a "test_description" property as part of it's configuration`
      );
    }
    this._desc = test_description;

    this._golden_img_dir_override = find_absolute_golden_img_dir_path(golden_img_dir);

    this._tests = new Map();

    const that = this;

    const before_callback_internal = function(mocha_state, test_state) {
      let image_compare_reporter_config;
      if (that._golden_img_dir_override) {
        image_compare_reporter_config = {
          golden_img_dir: that._golden_img_dir_override
        };
      }
      test_state.pushState(mocha_state, {
        server_config: test_state.server_config,
        image_compare_reporter_config
      });
      return test_state.server_connection.connectAsync();
    };

    const after_callback_internal = function(mocha_state, test_state) {
      const popped_state = test_state.popState(mocha_state);
      return popped_state.server_connection.disconnectAsync();
    };

    this._beforeCallback = async function(test_state) {
      await before_callback_internal(this, test_state);
      if (typeof before === 'function') {
        await before(test_state);
      }
    };

    this._afterCallback = async function(test_state) {
      await after_callback_internal(this, test_state);
      if (typeof after === 'function') {
        await after(test_state);
      }
    };

    if (typeof beforeEach === 'function') {
      this._beforeEachCallback = async function(test_state) {
        await beforeEach(test_state);
      };
    }

    if (typeof afterEach === 'function') {
      this._afterEachCallback = async function(test_state) {
        await afterEach(test_state);
      };
    }
  }

  get description() {
    return this._desc;
  }

  set golden_img_dir(golden_img_dir) {
    this._golden_img_dir_override = find_absolute_golden_img_dir_path(golden_img_dir);
  }

  addTest(test_desc, endpoints_to_test) {
    const test_name = this._prefix + `_${this._tests.size}`;
    this._tests.set(test_name, new OmniSciServerTestRunner(test_desc, endpoints_to_test));
    return test_name;
  }

  runMochaTests(test_name, test_state) {
    const that = this;
    describe(`${test_name}: ${this._desc}`, function() {
      before(that._beforeCallback.bind(this, test_state));
      after(that._afterCallback.bind(this, test_state));

      if (that._beforeEachCallback === 'function') {
        beforeEach(that.beforeEachCallback);
      }

      if (that._afterEachCallback === 'function') {
        afterEach(that.afterEachCallback);
      }

      const itr = that._tests[Symbol.iterator]();
      for (const [ test_name, test ] of itr) {
        test.runMochaTest(test_name, test_state);
      }
    });
  }
}

module.exports = OmniSciServerTestGroup;
