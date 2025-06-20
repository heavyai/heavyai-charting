const fs = require("fs")
const path = require("path")

// Check if current directory has a package-lock.json (i.e., is a root project)
const lockPath = path.resolve(process.cwd(), "package-lock.json")

if (fs.existsSync(lockPath)) {
  // We're in the project root, safe to run
  const { execSync } = require("child_process")
  console.log("Running npm-force-resolutions...")
  execSync("npx npm-force-resolutions", { stdio: "inherit" })
} else {
  console.log("Skipping npm-force-resolutions (not in project root)")
}
