const OmniSciServerTest = require("./OmniSciServerTest");
const MochaOptions = require("./MochaOptions");
const MochaCallback = require("./MochaCallback");

function unpackMochaCallback(callback_obj, test_state) {
  let [ description, callback ] = callback_obj.buildMochaCallback(test_state);
  if (typeof desc === "function") {
    callback = desc;
    description = null;
  }
  return { callback, description };
}

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
      if (that._beforeCallback instanceof MochaCallback) {
        // TODO(croot): handle the description if it is supplied
        await unpackMochaCallback(that._beforeCallback, test_state).callback();
      }
      try {
        for (let i = 0; i < test_endpoints.length; ++i) {
          await test_endpoints[i]
            .runMochaTest(test_name, test_state)
            .catch(function(error) {
              throw error;
            });
        }
      } catch (err) {
        throw err;
      } finally {
        if (that._afterCallback instanceof MochaCallback) {
          // TODO(croot): handle the description if it is supplied
          await unpackMochaCallback(that._afterCallback, test_state).callback();
        }
      }
    };

    if (options) {
      const { before = null, after = null, pending = false } = options;
      if (before) {
        this._beforeCallback = MochaCallback.buildDefaultMochaCallback(before);
      }

      if (after) {
        this._afterCallback = MochaCallback.buildDefaultMochaCallback(before);
      }

      if (pending) {
        if (
          !(pending instanceof Boolean) &&
          typeof pending !== "boolean" &&
          !(pending instanceof String) &&
          typeof pending !== "string"
        ) {
          throw new Error(
            `Pending option must be a boolean or string for test "${this.desc}".`
          );
        }
        this.pending = pending;
      }
    }
  }

  get description() {
    return this.desc;
  }

  runMochaTest(test_name, test_state) {
    const that = this;
    if (that.pending) {
      it(
        `[PENDING] ${test_name}: ${this.desc}${that.pending instanceof String ||
        typeof that.pending === "string"
          ? " " + that.pending
          : ""}`
      );
    } else {
      it(`${test_name}: ${this.desc}`, function() {
        that._mocha_opts.applyOptions(this);
        return that._execute_endpoints(test_name, test_state);
      });
    }
  }
}

module.exports = OmniSciServerTestRunner;
