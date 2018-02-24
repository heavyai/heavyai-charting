require("babel-register", {
  ignore: /node_modules\/(?!(@mapd)\/).*/
})
process.env.NODE_ENV = "test"
process.env.JUNIT_REPORT_PATH = "mocha-report.xml"
process.env.JUNIT_REPORT_STACK = 1
