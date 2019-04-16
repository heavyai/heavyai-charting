const OmniSciServerTestStateStack = require('./OmniSciServerTestStateStack');
const OmniSciServerTestGroup = require('./OmniSciServerTestGroup');
const PathUtils = require('../utils/PathUtils');
const PrefixMgr = require('./PrefixMgr');
const path = require('path');

const prefix_mgr = new PrefixMgr();
class OmniSciServerTestCollection {
  constructor(collection_desc, image_compare_reporter, server_config, options) {
    const {
      test_prefix = `${path.basename(PathUtils.getCallerFile(), '.js')}`
    } = options;
    this.test_prefix = prefix_mgr.getPrefix(test_prefix);
    this.desc = collection_desc;

    this.state = new OmniSciServerTestStateStack(
      image_compare_reporter,
      server_config,
      options
    );
    this.test_groups = [];

    const that = this;

    // before callback would be run before any of the tests in this collection are performed
    this.beforeCallback = async function() {
      this.timeout(that.timeout);
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

  get timeout() {
    return this.state.timeout;
  }

  addTestGroup(test_group) {
    if (!(test_group instanceof OmniSciServerTestGroup)) {
      throw new Error(
        `Only ${OmniSciServerTestGroup.name} classes are currently supported test groups. Test group is of type ${typeof test_group}`
      );
    }
    this.test_groups.push(test_group);
  }

  runMochaTests() {
    const that = this;
    describe(`${this.test_prefix}: ${this.desc}`, function() {
      this.timeout(that.timeout);
      before(that.beforeCallback);
      after(that.afterCallback);

      if (that.beforeEachCallback === 'function') {
        beforeEach(that.beforeEachCallback);
      }
      if (that.afterEachCallback === 'function') {
        afterEach(that.afterEachCallback);
      }

      for (let i = 0; i < that.test_groups.length; ++i) {
        that.test_groups[i].runMochaTests(that.state);
      }
    });
  }
}

module.exports = OmniSciServerTestCollection;
