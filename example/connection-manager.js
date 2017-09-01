export default function ConnectionManager () {

  let connector
  function init (config) {
    connector = new MapdCon()
      .protocol(config.protocol)
      .host(config.host)
      .port(config.port)
      .dbName(config.dbName)
      .user(config.user)
      .password(config.password)

    connector.logging(true)
    return this
  }

  function connect() {
    return new Promise((resolve, reject) => {
      connector.connect(function(error, connection) {
        if (error) {
          reject(error)
        } else {
          resolve(connection)
        }
      })
    })
  }

  return {
    init,
    connect
  }
}