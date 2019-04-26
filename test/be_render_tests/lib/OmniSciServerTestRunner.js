const OmniSciServerTest = require('./OmniSciServerTest');
const MochaOptions = require('./MochaOptions');

class OmniSciServerTestRunner {
  constructor(test_description, endpoints_to_test, options) {
    this.desc = test_description;
    if (!Array.isArray(endpoints_to_test)) {
      endpoints_to_test = [ endpoints_to_test ];
    }

    this.endpoints = [];
    this._mocha_opts = new MochaOptions(options);

    const that = this;
    endpoints_to_test.forEach((endpoint_to_test, idx) => {
      if (!(endpoint_to_test instanceof OmniSciServerTest)) {
        throw new Error(
          `OmniSci server endpoint test at index ${idx} is not a supported test type. It is of type ${typeof endpoint_to_test}`
        );
      }
      that.endpoints.push(endpoint_to_test);
    });

    this._execute_endpoints = async function(test_name, test_state) {
      const test_endpoints = that.endpoints;
      for (let i = 0; i < test_endpoints.length; ++i) {
        await test_endpoints[i].runMochaTest(test_name, test_state);
      }
    };
  }

  get description() {
    return this.desc;
  }

  runMochaTest(test_name, test_state) {
    const that = this;
    it(`${test_name}: ${this.desc}`, function() {
      that._mocha_opts.applyOptions(this);
      return that._execute_endpoints(test_name, test_state);
    });
  }
}

module.exports = OmniSciServerTestRunner;
