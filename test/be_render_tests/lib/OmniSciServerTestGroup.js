const OmniSciServerTestRunner = require("./OmniSciServerTestRunner");
const MochaOptions = require("./MochaOptions");
const PathUtils = require("../utils/PathUtils");
const PrefixMgr = require("./PrefixMgr");
const path = require("path");

function find_absolute_golden_img_dir_path(golden_img_dir) {
  if (!path.isAbsolute(golden_img_dir)) {
    // getting the base path of the file whose code called this function
    return path.join(PathUtils.getCallerPath(2), golden_img_dir);
  }
  return golden_img_dir;
}

class MochaCallback {
  constructor(callback, options) {
    this.callback = callback;
    this.mocha_options = new MochaOptions(options);
  }

  buildMochaCallback(test_state) {
    const that = this;
    return function() {
      that.mocha_options.applyOptions(this);
      return that.callback(test_state);
    };
  }
}

function unpack_callback_and_options(callback_opts) {
  let opts = callback_opts;
  if (typeof opts === "function") {
    opts = { callback: opts };
  }
  if (typeof opts !== "object") {
    throw new Error(
      `Callback is invalid. It either needs to be a function taking a single test_state argument or an object with the following schema: ${JSON.stringify(
        { callback: "function", options: { timeout: "number" } }
      )}. The supplied object is of type ${callback_opts.constructor
        ? callback_opts.constructor.name
        : typeof callback_opts}.`
    );
  }
  return opts;
}

const prefix_mgr = new PrefixMgr();
class OmniSciServerTestGroup {
  constructor(config) {
    const {
      test_prefix = `${path.basename(PathUtils.getCallerFile(), ".js")}`,
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
    this._mocha_opts = new MochaOptions(config);

    const that = this;

    const before_callback_internal = function(test_state) {
      let image_compare_reporter_config;
      if (that._golden_img_dir_override) {
        image_compare_reporter_config = {
          golden_img_dir: that._golden_img_dir_override
        };
        test_state.pushState({
          image_compare_reporter_config
        });
      }
    };

    const after_callback_internal = function(test_state) {
      if (that._golden_img_dir_override) {
        test_state.popState();
      }
    };

    const { callback: before_cb, options: before_opts } = unpack_callback_and_options(
      before || {}
    );
    this._beforeCallback = new MochaCallback(async function(test_state) {
      await before_callback_internal(test_state);
      if (before_cb) {
        await before_cb(test_state);
      }
    }, before_opts);

    const { callback: after_cb, options: after_opts } = unpack_callback_and_options(
      after || {}
    );
    this._afterCallback = new MochaCallback(async function(test_state) {
      // need to be sure to do our internal teardown after the custom teardown
      // teardown needs to be done in the reverse order of initialization
      if (after_cb) {
        await after_cb(test_state);
      }
      await after_callback_internal(test_state);
    }, after_opts);

    if (beforeEach) {
      let {
        callback: beforeEach_cb,
        options: beforeEach_opts
      } = unpack_callback_and_options(beforeEach);
      this._beforeEachCallback = new MochaCallback(async function(test_state) {
        await beforeEach_cb(test_state);
      }, beforeEach_opts);
    }

    if (afterEach) {
      let {
        callback: afterEach_cb,
        options: afterEach_opts
      } = unpack_callback_and_options(afterEach);
      this._afterEachCallback = new MochaCallback(async function(test_state) {
        await afterEach_cb(test_state);
      }, afterEach_opts);
    }
  }

  get description() {
    return this._desc;
  }

  set golden_img_dir(golden_img_dir) {
    this._golden_img_dir_override = find_absolute_golden_img_dir_path(golden_img_dir);
  }

  addTest(test_desc, endpoints_to_test, options) {
    const test_name = this._prefix + `_${this._tests.size}`;
    this._tests.set(
      test_name,
      new OmniSciServerTestRunner(test_desc, endpoints_to_test, options)
    );
    return test_name;
  }

  runMochaTests(test_name, test_state) {
    const that = this;
    describe(`${test_name}: ${this._desc}`, function() {
      that._mocha_opts.applyOptions(this);
      before(that._beforeCallback.buildMochaCallback(test_state));
      after(that._afterCallback.buildMochaCallback(test_state));

      if (that._beforeEachCallback instanceof MochaCallback) {
        beforeEach(that._beforeEachCallback.buildMochaCallback(test_state));
      }

      if (that._afterEachCallback instanceof MochaCallback) {
        afterEach(that._afterEachCallback.buildMochaCallback(test_state));
      }

      const itr = that._tests[Symbol.iterator]();
      for (const [ test_name, test ] of itr) {
        test.runMochaTest(test_name, test_state);
      }
    });
  }
}

module.exports = OmniSciServerTestGroup;
