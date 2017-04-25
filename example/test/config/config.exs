use Mix.Config

config :hound,
  browser: "chrome",
  driver: "selenium",
  port: 4444,
  retry_time: 1500

config :test,
  url: "http://127.0.0.1:8081/example"
