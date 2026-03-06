/**
 * Downloads a real VS Code instance and runs the extension's E2E smoke tests.
 *
 * Usage:
 *   npm run test:vscode                   # uses minimum supported version from engines.vscode
 *   npm run test:vscode -- --version 1.85.0   # tests a specific version
 *   npm run test:vscode -- --version stable   # tests latest stable
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { runTests } from "@vscode/test-electron"

const projectRoot = path.resolve(import.meta.dirname, "..")

// Parse --version flag from argv
function getVersion(): string {
  const idx = process.argv.indexOf("--version")
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1]
  }
  // Default: use minimum version from engines.vscode
  const pkg = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8"))
  const engine: string = pkg.engines?.vscode ?? "^1.75.0"
  // Strip ^ or ~ prefix to get the base version
  return engine.replace(/^[^~]/, "").replace(/^[~^]/, "")
}

async function main() {
  const version = getVersion()
  console.log(`\n  Running VS Code E2E tests with version: ${version}\n`)

  await runTests({
    extensionDevelopmentPath: projectRoot,
    extensionTestsPath: path.join(projectRoot, "out", "test", "vscode-e2e", "index.js"),
    launchArgs: [
      "--disable-extensions",
      "--disable-gpu",
    ],
    version,
  })
}

main().catch((err) => {
  console.error("Failed to run VS Code tests:", err)
  process.exit(1)
})
