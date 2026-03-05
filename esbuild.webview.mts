import { build, context, type BuildOptions } from "esbuild"
import { spawn } from "node:child_process"
import { copyFileSync } from "node:fs"

const isWatch = process.argv.includes("--watch")

const jsOptions: BuildOptions = {
  bundle: true,
  entryPoints: ["src/webview/index.tsx"],
  external: ["node:*"],
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
  const cssBuild = new Promise<void>((resolve, reject) => {
    const proc = spawn("npx", ["@tailwindcss/cli", ...tailwindArgs, "--minify"], {
      shell: true,
      stdio: "inherit",
    })
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Tailwind CSS build failed with exit code ${code}`))
      } else {
        resolve()
      }
    })
    proc.on("error", reject)
  })
  await Promise.all([cssBuild, build(jsOptions)])
}

copyFileSync("src/webview/index.html", "out/webview.html")
