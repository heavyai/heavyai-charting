const sh = require("shelljs")
const DEFAULT_REPORTER = "nyan"

const outputOption = sh.env.OUTPUT ? `--reporter-options output=${sh.env.OUTPUT}` : ""

const options = `\
  --opts ./test/mocha.unit.opts \
  ${sh.env.COLORS ? "--no-colors" : "--colors"} \
  --reporter ${sh.env.REPORTER || DEFAULT_REPORTER} \
  ${sh.env.WATCH ? "--watch" : ""} \
  ${outputOption}
`

if (sh.env.SUITE) {
  sh.exec(
    `NODE_PATH=./src ../../node_modules/.bin/mocha src/${sh.env.SUITE} \
    ${options}`
  )
} else if (sh.env.COVER) {
  sh.exec(
    `find ./src -name '*.spec.js' | NODE_PATH=./src xargs \
    ../../node_modules/.bin/istanbul cover -x *.spec.js ../../node_modules/mocha/bin/_mocha  -- \
    ${options}`
  )
  if (sh.env.OPEN) {
    sh.exec(
      "open ./coverage/lcov-report/index.html"
    )
  }
} else {
  sh.exit(sh.exec(
    `find ./src -name '*.spec.js' | NODE_PATH=./src xargs ../../node_modules/.bin/mocha \
    ${options}`
  ).code)
}
