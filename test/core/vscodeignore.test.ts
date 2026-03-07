/**
 * Verifies that .vscodeignore does not exclude files required at runtime.
 * This catches packaging bugs where the VSIX ships without critical modules.
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "../..")
const ignoreFile = readFileSync(path.join(root, ".vscodeignore"), "utf8")
const ignoreLines = ignoreFile
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))

/** Files that MUST be included in the packaged VSIX. */
const requiredInPackage = [
  "out/extension.js",
  "out/core/classDetector.js",
  "out/core/cssPreviewPanel.js",
  "out/core/foldingProvider.js",
  "out/utils/utils.js",
  "out/utils/types.js",
  "out/webview.html",
  "out/webview.js",
  "out/webview.css",
]

/**
 * Naive check: a file is excluded if any ignore pattern would match it.
 * Handles exact matches, directory globs (dir/**), and extension globs (**\/*.ext).
 */
function isExcluded(filePath: string): string | undefined {
  for (const pattern of ignoreLines) {
    if (pattern === filePath) {
      return pattern
    }
    if (pattern.endsWith("/**") && filePath.startsWith(pattern.slice(0, -2))) {
      return pattern
    }
    if (pattern.startsWith("**/") && filePath.endsWith(pattern.slice(3))) {
      return pattern
    }
  }
  return undefined
}

describe(".vscodeignore packaging safety", () => {
  for (const file of requiredInPackage) {
    it(`does not exclude runtime file: ${file}`, () => {
      const matchedPattern = isExcluded(file)
      expect(matchedPattern, `"${file}" is excluded by pattern "${matchedPattern}"`).toBeUndefined()
    })
  }
})
