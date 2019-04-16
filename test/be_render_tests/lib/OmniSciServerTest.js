class OmniSciServerTest {
  constructor(expectation_callback) {
    this.expectation = expectation_callback;
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
