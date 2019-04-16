const OmniSciServerTest = require('./OmniSciServerTest');

class OmniSciServerTestRunner {
  constructor(test_description, endpoints_to_test) {
    this.desc = test_description;
    if (!Array.isArray(endpoints_to_test)) {
      endpoints_to_test = [ endpoints_to_test ];
    }

    this.endpoints = [];

    const that = this;
    endpoints_to_test.forEach((endpoint_to_test, idx) => {
      if (!(endpoint_to_test instanceof OmniSciServerTest)) {
        throw new Error(
          `OmniSci server endpoint test at index ${idx} is not a supported test type. It is of type ${typeof endpoint_to_test}`
        );
      }
      that.endpoints.push(endpoint_to_test);
    });
  }

  get description() {
    return this.desc;
  }

  runMochaTest(test_name, test_state) {
    const that = this;
    it(`${test_name}: ${this.desc}`, async function() {
      const test_endpoints = that.endpoints;
      for (let i = 0; i < test_endpoints.length; ++i) {
        await test_endpoints[i].runMochaTest(test_name, test_state);
      }
    });
  }
}

module.exports = OmniSciServerTestRunner;
