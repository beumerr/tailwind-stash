import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  esbuild: {
    jsxFactory: "h",
    jsxFragment: "Fragment",
    jsxInject: `import { h, Fragment } from 'preact'`,
  },
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
      vscode: path.resolve(__dirname, "test/__mocks__/vscode.ts"),
    },
  },
  test: {
    coverage: {
      exclude: ["test/**", "out/**", "scripts/**", "*.config.*", "*.mjs"],
      provider: "v8",
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
    // .vscode-test holds the VS Code builds the E2E suite downloads, and those
    // ship their own *.test.mts files. Without this, any vitest run that happens
    // after an E2E run collects them and fails on "No test suite found".
    exclude: ["test/vscode-e2e/**", "out/**", "node_modules/**", ".vscode-test/**"],
    globals: true,
  },
})
