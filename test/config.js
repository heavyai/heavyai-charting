require("babel-register", {
  ignore: /node_modules\/(?!(@heavyai)\/).*/
})
process.env.NODE_ENV = "test"
process.env.JUNIT_REPORT_PATH = "mocha-report.xml"
process.env.JUNIT_REPORT_STACK = 1
