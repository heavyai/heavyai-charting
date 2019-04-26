const OmniSciServerTestStateStack = require('./OmniSciServerTestStateStack');
const OmniSciServerTestGroup = require('./OmniSciServerTestGroup');
const MochaOptions = require('./MochaOptions');
const PathUtils = require('../utils/PathUtils');
const PrefixMgr = require('./PrefixMgr');
const path = require('path');

const prefix_mgr = new PrefixMgr();
class OmniSciServerTestCollection {
  constructor(collection_desc, image_compare_reporter, server_config, options) {
    this.desc = collection_desc;

    this.state = new OmniSciServerTestStateStack(
      image_compare_reporter,
      server_config,
      options
    );
    this.test_groups = new Map();
    this._mocha_opts = new MochaOptions(options);

    const that = this;

    // before callback would be run before any of the tests in this collection are performed
    this.beforeCallback = async function() {
      await that.state.server_connection.connectAsync();
    };

    // after callback would be run after all tests in this collection have completed
    this.afterCallback = async function() {
      await that.state.server_connection.disconnectAsync();
    };
  }

  get description() {
    return this.desc;
  }

  get server_connection() {
    return this.state.server_connection;
  }

  addTestGroup(test_name, test_group) {
    if (!(test_name instanceof String) || typeof test_name !== 'string') {
      test_group = test_name;
      test_name = path.basename(PathUtils.getCallerFile(), '.js');
    }
    if (!(test_group instanceof OmniSciServerTestGroup)) {
      throw new Error(
        `Only ${OmniSciServerTestGroup.name} classes are currently supported test groups. Test group is of type ${typeof test_group}`
      );
    }
    this.test_groups.set(prefix_mgr.getPrefix(test_name), test_group);
  }

  runMochaTests(test_name) {
    const that = this;
    describe(`${test_name ? test_name + ': ' : ''}${this.desc}`, function() {
      that._mocha_opts.applyOptions(this);

      before(that.beforeCallback);
      after(that.afterCallback);

      if (that.beforeEachCallback === 'function') {
        beforeEach(that.beforeEachCallback);
      }
      if (that.afterEachCallback === 'function') {
        afterEach(that.afterEachCallback);
      }

      const itr = that.test_groups[Symbol.iterator]();
      for (const [ test_name, test_group ] of itr) {
        test_group.runMochaTests(test_name, that.state);
      }
    });
  }
}

module.exports = OmniSciServerTestCollection;
