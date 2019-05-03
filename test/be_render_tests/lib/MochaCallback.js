const MochaOptions = require("./MochaOptions");

class MochaCallback {
  constructor(callback, options, description) {
    this.callback = callback;
    this.mocha_options = new MochaOptions(options);
    if (description) {
      if (!(description instanceof String) && typeof description !== "string") {
        throw new Error(`Mocha callback description must be a string.`);
      }
    }
    this._description = description;
  }

  buildMochaCallback(test_state) {
    const args = [];
    if (this._description) {
      args.push(this._description);
    }
    const that = this;
    args.push(function() {
      that.mocha_options.applyOptions(this);
      return that.callback(test_state);
    });
    return args;
  }

  static unpackCallbackAndOpts(callback_opts) {
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

  static buildDefaultMochaCallback(callback_config) {
    const { callback, options, description } = MochaCallback.unpackCallbackAndOpts(
      callback_config
    );
    return new MochaCallback(
      async function(test_state) {
        await before_cb(test_state);
      },
      options,
      description
    );
  }
}

module.exports = MochaCallback;
