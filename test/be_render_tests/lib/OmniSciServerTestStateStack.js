const OmniSciConn = require('@mapd/connector');
const JsonUtils = require('../utils/JsonUtils');

class OmniSciServerTestState {
  constructor(image_compare_reporter, server_config, options) {
    if (!(server_config instanceof OmniSciConn)) {
      const {
        protocol = 'http',
        host = 'localhost',
        port = '6274',
        dbName = 'mapd',
        user = 'mapd',
        password = 'HyperInteractive'
      } = server_config;

      this._conn = new OmniSciConn()
        .protocol(protocol)
        .host(host)
        .port(port)
        .dbName(dbName)
        .user(user)
        .password(password);
    } else {
      this._conn = server_config;
    }

    this._img_comp_reporter = image_compare_reporter;
    this._server_config = {
      protocol: this._conn.protocol()[0],
      host: this._conn.host()[0],
      port: this._conn.port()[0],
      dbName: this._conn.dbName()[0],
      user: this._conn.user()[0],
      password: this._conn.password()[0]
    };

    this._image_compare_reporer_config = JsonUtils.jsonCopy(
      image_compare_reporter.config
    );
  }

  get server_config() {
    return this._server_config;
  }

  get server_connection() {
    return this._conn;
  }

  get image_compare_reporter() {
    return this._img_comp_reporter;
  }
}

class OmniSciServerTestStateStack {
  constructor(image_compare_reporter, server_config, options) {
    this._state_stack = [
      new OmniSciServerTestState(image_compare_reporter, server_config, options)
    ];
  }

  get server_config() {
    return this._state_stack[this._state_stack.length - 1].server_config;
  }

  get server_connection() {
    return this._state_stack[this._state_stack.length - 1].server_connection;
  }

  get image_compare_reporter() {
    return this._state_stack[this._state_stack.length - 1].image_compare_reporter;
  }

  get length() {
    return this._state_stack.length;
  }

  pushState(options) {
    const {
      server_config = this.server_connection,
      image_compare_reporter_config = this.image_compare_reporter.config
    } = options;

    this._state_stack.push(
      new OmniSciServerTestState(this.image_compare_reporter, server_config, options)
    );
    // need to set the image reporter config after pushing the new state
    // as the prev config is stored in the state so it can be restored.
    this.image_compare_reporter.config = image_compare_reporter_config;
    return this._state_stack[this._state_stack.length - 1];
  }

  popState() {
    const popped_state = this._state_stack.pop();
    this.image_compare_reporter.config = popped_state._image_compare_reporer_config;
    return popped_state;
  }
}

module.exports = OmniSciServerTestStateStack;
