/**
 * Entry point for VS Code E2E tests.
 * This file is loaded by @vscode/test-electron inside a real VS Code instance.
 *
 * It uses the built-in Mocha runner that VS Code provides.
 */
import { glob } from "glob"
import Mocha from "mocha"
import path from "node:path"

export async function run(): Promise<void> {
  const mocha = new Mocha({ color: true, timeout: 10_000, ui: "bdd" })
  const testsRoot = path.resolve(__dirname)

  const files = await glob("**/*.test.js", { cwd: testsRoot })
  for (const f of files) {
    mocha.addFile(path.resolve(testsRoot, f))
  }

  return new Promise<void>((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} test(s) failed`))
      } else {
        resolve()
      }
    })
  })
}
