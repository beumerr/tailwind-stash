import { build, context } from "esbuild"
import { sassPlugin } from "esbuild-sass-plugin"
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
  plugins: [sassPlugin({ type: "css-text" })],
  target: "es2020",
}

const cssOptions = {
  bundle: true,
  entryPoints: ["src/webview/styles.scss"],
  minify: !isWatch,
  outfile: "out/webview.css",
  plugins: [sassPlugin()],
}

if (isWatch) {
  const [jsCtx, cssCtx] = await Promise.all([context(jsOptions), context(cssOptions)])
  await Promise.all([jsCtx.watch(), cssCtx.watch()])
  // oxlint-disable-next-line no-console
  console.log("Watching webview...")
} else {
  await Promise.all([build(jsOptions), build(cssOptions)])
}

copyFileSync("src/webview/index.html", "out/webview.html")
