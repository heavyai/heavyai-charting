const OmniSciServerTestRunner = require("./OmniSciServerTestRunner");
const MochaOptions = require("./MochaOptions");
const MochaCallback = require("./MochaCallback");
const PathUtils = require("../utils/PathUtils");
const PrefixMgr = require("./PrefixMgr");
const path = require("path");

function find_absolute_golden_img_dir_path(golden_img_dir, steps) {
  if (!path.isAbsolute(golden_img_dir)) {
    // getting the base path of the file whose code called this function
    return path.join(PathUtils.getCallerPath(steps + 1), golden_img_dir);
  }
  return golden_img_dir;
}

class OmniSciServerTestGroup {
  constructor(prefix_mgr, config, steps = 1) {
    const {
      test_prefix = `${path.basename(PathUtils.getCallerFile(steps), ".js")}`,
      test_description,
      golden_img_dir,
      before,
      after,
      beforeEach,
      afterEach
    } = config;

    this._prefix_mgr = prefix_mgr;
    this._prefix = test_prefix;

    if (!test_description) {
      throw new Error(
        `${OmniSciServerTestGroup.name} must have a "test_description" property as part of it's configuration`
      );
    }
    this._desc = test_description;

    if (golden_img_dir) {
      this._golden_img_dir_override = find_absolute_golden_img_dir_path(
        golden_img_dir,
        steps
      );
    }

    this._sub_grps = new Map();
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

    const {
      callback: before_cb,
      options: before_opts,
      description: before_desc
    } = MochaCallback.unpackCallbackAndOpts(before || {});
    this._beforeCallback = new MochaCallback(
      async function(test_state) {
        await before_callback_internal(test_state);
        if (before_cb) {
          await before_cb(test_state);
        }
      },
      before_opts,
      before_desc
    );

    const {
      callback: after_cb,
      options: after_opts,
      description: after_desc
    } = MochaCallback.unpackCallbackAndOpts(after || {});
    this._afterCallback = new MochaCallback(
      async function(test_state) {
        // need to be sure to do our internal teardown after the custom teardown
        // teardown needs to be done in the reverse order of initialization
        if (after_cb) {
          await after_cb(test_state);
        }
        await after_callback_internal(test_state);
      },
      after_opts,
      after_desc
    );

    if (beforeEach) {
      this._beforeEachCallback = MochaCallback.buildDefaultMochaCallback(beforeEach);
    }

    if (afterEach) {
      this._afterEachCallback = MochaCallback.buildDefaultMochaCallback(afterEach);
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

  createTestSubGroup(sub_grp_name, sub_grp_config) {
    if (!(sub_grp_name instanceof String) || typeof sub_grp_name !== "string") {
      sub_grp_config = sub_grp_name;
      sub_grp_name =
        this._prefix + `_${String.fromCharCode("a".charCodeAt(0) + this._sub_grps.size)}`;
    } else {
      sub_grp_name = test._prefix_mgr.getPrefix(sub_grp_name);
    }
    if (!sub_grp_config.test_prefix) {
      sub_grp_config.test_prefix = sub_grp_name;
    } else {
      sub_grp_config.test_prefix = this._prefix_mgr.getPrefix(sub_grp_config.test_prefix);
    }
    // using 2 here for the 'steps', as the test group needs to resolve any relative paths and
    // such from 2 levels up the call stack
    const test_group = new OmniSciServerTestGroup(this._prefix_mgr, sub_grp_config, 2);
    this._sub_grps.set(sub_grp_name, test_group);
    return test_group;
  }

  runMochaTests(test_name, test_state) {
    const that = this;
    describe(`${test_name}: ${this._desc}`, function() {
      that._mocha_opts.applyOptions(this);
      before(...that._beforeCallback.buildMochaCallback(test_state));
      after(...that._afterCallback.buildMochaCallback(test_state));

      if (that._beforeEachCallback instanceof MochaCallback) {
        beforeEach(...that._beforeEachCallback.buildMochaCallback(test_state));
      }

      if (that._afterEachCallback instanceof MochaCallback) {
        afterEach(...that._afterEachCallback.buildMochaCallback(test_state));
      }

      let itr = that._sub_grps[Symbol.iterator]();
      for (const [ grp_name, grp ] of itr) {
        grp.runMochaTests(grp_name, test_state);
      }

      itr = that._tests[Symbol.iterator]();
      for (const [ test_name, test ] of itr) {
        test.runMochaTest(test_name, test_state);
      }
    });
  }
}

module.exports = OmniSciServerTestGroup;
