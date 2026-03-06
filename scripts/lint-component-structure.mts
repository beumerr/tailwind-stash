import { readdirSync, statSync } from "node:fs"
import { basename, join, relative } from "node:path"

const COMPONENTS_DIR = "src/webview/components"

let errors = 0

function check(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)

    if (stat.isFile() && entry.endsWith(".tsx")) {
      const rel = relative(COMPONENTS_DIR, full)
      process.stderr.write(`error: Component file "${rel}" must be inside its own folder\n`)
      process.stderr.write(`  Move it to: ${basename(entry, ".tsx")}/${entry}\n`)
      errors++
    }

    if (stat.isDirectory()) {
      const folderName = entry
      const files = readdirSync(full).filter((f) => f.endsWith(".tsx"))

      if (files.length === 0) {
        continue
      }

      const mainFile = `${folderName}.tsx`
      if (!files.includes(mainFile)) {
        const rel = relative(COMPONENTS_DIR, full)
        process.stderr.write(
          `error: Folder "${rel}" must contain a main component file named "${mainFile}"\n`,
        )
        errors++
      }

      for (const file of files) {
        if (file === mainFile) {
          continue
        }
        if (!file.startsWith(`${folderName}-`)) {
          const rel = relative(COMPONENTS_DIR, join(full, file))
          process.stderr.write(
            `error: "${rel}" must be a compound component prefixed with "${folderName}-" or moved to its own folder\n`,
          )
          errors++
        }
      }
    }
  }
}

try {
  statSync(COMPONENTS_DIR)
} catch {
  process.exit(0)
}

check(COMPONENTS_DIR)

if (errors > 0) {
  process.stderr.write(`\n${errors} component structure error(s) found\n`)
  process.exit(1)
} else {
  process.stdout.write("Component structure: ok\n")
}
