const sh = require('shelljs')
const fs = require('fs')

const shouldBumpCoverage = process.argv.indexOf("--bump") !== -1

if (process.env.NODE_ENV === "jenkins") {
  process.env.REPORTER = "xunit"
  process.env.OUTPUT = "v2-test-report.xml"
}

function parse (input) {
  return input.match(/(Statements|Branches|Functions|Lines)\s{1,10}:\s(\d{1,2}.\d{1,2}|\d{1,2})%/g)
}

function toPercent (str) {
  return parseFloat(str.split(": ")[1])
}

function errorMessage (entry, current, threshold) {
  return `Failed: ${entry} coverage (${current}%) falls below the minimum threshold of (${threshold}%)`
}

sh.exec("npm run test:cover", function(code, out) {
  if (code !== 0) {
    sh.exit(code)
    return
  }

  const [statements, branches, functions, lines] = parse(out).map(toPercent)
  const config = JSON.parse(fs.readFileSync('./coverage.json', 'utf8'))

  if (config.statements > statements) {
    console.log(errorMessage("Statements", statements, config.statements))
    sh.exit(1)
  } else if (config.branches > branches) {
    console.log(errorMessage("Branches", branches, config.branches))
    sh.exit(1)
  } else if (config.functions > functions) {
    console.log(errorMessage("Functions", functions, config.functions))
    sh.exit(1)
  } else if (config.lines > lines) {
    console.log(errorMessage("Lines", lines, config.lines))
    sh.exit(1)
  } else {
    if (shouldBumpCoverage) {
      fs.writeFileSync('./coverage.json', JSON.stringify({
        statements,
        branches,
        functions,
        lines
      }, null, 2))
    }

    sh.exit(0)
  }
})
