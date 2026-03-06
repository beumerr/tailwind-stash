import { build, context } from "esbuild"
import { spawn } from "node:child_process"
import { copyFileSync } from "node:fs"

const isWatch = process.argv.includes("--watch")

const jsOptions = {
  bundle: true,
  entryPoints: ["src/webview/index.tsx"],
  format: "iife",
  jsx: "automatic",
  jsxImportSource: "preact",
  minify: !isWatch,
  outfile: "out/webview.js",
  target: "es2020",
}

const tailwindArgs = ["-i", "src/webview/styles.css", "-o", "out/webview.css"]

if (isWatch) {
  spawn("npx", ["@tailwindcss/cli", ...tailwindArgs, "--watch"], {
    shell: true,
    stdio: "inherit",
  })
  const jsCtx = await context(jsOptions)
  await jsCtx.watch()
  // oxlint-disable-next-line no-console
  console.log("Watching webview...")
} else {
  spawn("npx", ["@tailwindcss/cli", ...tailwindArgs, "--minify"], {
    shell: true,
    stdio: "inherit",
  })
  await build(jsOptions)
}

copyFileSync("src/webview/index.html", "out/webview.html")
