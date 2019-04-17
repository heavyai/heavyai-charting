const JsonUtils = require('../utils/JsonUtils');

class OmniSciServerTest {
  constructor(args, expectation_callback) {
    this._args = JsonUtils.jsonCopy(args);
    this.expectation = expectation_callback;
  }

  get command() {
    throw new Error(`${this.command.name} must be overridden by derived class ${this.constructor.name}`)
  }

  get args() {
    return this._args;
  }

  runMochaTest(test_name, test_state) {
    const that = this;
    return new Promise((resolve, reject) => {
      that.executeTest(test_state.server_connection, (error, result) => {
        if (error) {
          resolve(that.expectation(new TMapDException(test_name)));
        } else {
          resolve(that.expectation(that.createResultWrapper(test_name, result)));
        }
      });
    });
  }

  createResultWrapper(test_name, result) {
    throw new Error(
      `${this.createResultWrapper.name} must be overridden by derived class ` +
        `${this.constructor.name}`
    );
  }

  executeTest(connection, callback) {
    throw new Error(
      `${this.executeTest.name} must be overridden by derived class ` +
        `${this.constructor.name}`
    );
  }
}

module.exports = OmniSciServerTest;
