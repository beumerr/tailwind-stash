import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { createInterface } from "node:readline"

const pkg = JSON.parse(readFileSync("package.json", "utf8"))
const changelog = readFileSync("CHANGELOG.md", "utf8")
const version: string = pkg.version
const tag = `v${version}`

let failed = false

function step(label: string, fn: () => void) {
  process.stdout.write(`\n→ ${label}\n`)
  try {
    fn()
  } catch (e) {
    process.stderr.write(`  FAILED: ${(e as Error).message}\n`)
    failed = true
  }
}

function run(cmd: string) {
  execSync(cmd, { stdio: "inherit" })
}

function exec(cmd: string): string {
  return execSync(cmd, { encoding: "utf8" }).trim()
}

function extractReleaseNotes(): string {
  const versionHeader = `## [${version}]`
  const start = changelog.indexOf(versionHeader)
  if (start === -1) {
    return ""
  }
  const afterHeader = changelog.indexOf("\n", start) + 1
  const nextSection = changelog.indexOf("\n## ", afterHeader)
  const body =
    nextSection === -1 ? changelog.slice(afterHeader) : changelog.slice(afterHeader, nextSection)
  return body.trim()
}

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(`\n${message} (y/N) `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === "y")
    })
  })
}

// ── Pre-flight checks ──────────────────────────────────────────────

step("Checking clean working tree", () => {
  const status = exec("git status --porcelain")
  if (status) {
    throw new Error("Working tree is not clean. Commit or stash changes first.\n" + status)
  }
})

step("Checking branch is master", () => {
  const branch = exec("git rev-parse --abbrev-ref HEAD")
  if (branch !== "master") {
    throw new Error(`Expected branch "master", got "${branch}"`)
  }
})

step("Checking remote is up to date", () => {
  execSync("git fetch origin master", { stdio: "pipe" })
  const local = exec("git rev-parse HEAD")
  const remote = exec("git rev-parse origin/master")
  if (local !== remote) {
    throw new Error("Local branch is not up to date with origin/master. Pull or push first.")
  }
})

step(`Validating version (${version})`, () => {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Invalid semver: "${version}"`)
  }

  const tags = exec("git tag --list")
  if (tags.split("\n").includes(tag)) {
    throw new Error(`Tag ${tag} already exists. Bump the version in package.json first.`)
  }
})

step("Checking changelog has entry for this version", () => {
  if (!changelog.includes(`## [${version}]`)) {
    throw new Error(`CHANGELOG.md has no entry for [${version}]. Add one before publishing.`)
  }
})

step("Checking changelog has no [Unreleased] section with content", () => {
  const unreleasedMatch = changelog.match(/## \[Unreleased\]\s*\n([\s\S]*?)(?=\n## |\n*$)/)
  if (unreleasedMatch) {
    const content = unreleasedMatch[1].trim()
    if (content) {
      throw new Error(
        "CHANGELOG.md has content under [Unreleased]. Move it to the versioned section.",
      )
    }
  }
})

step("Checking gh CLI is available", () => {
  try {
    execSync("gh --version", { stdio: "pipe" })
  } catch {
    throw new Error("GitHub CLI (gh) is not installed. Install it from https://cli.github.com")
  }
})

if (failed) {
  process.stderr.write("\n✗ Pre-flight checks failed. Fix the issues above before publishing.\n")
  process.exit(1)
}

// ── Quality checks ──────────────────────────────────────────────────

step("Formatting", () => run("npm run format:check"))
step("Linting", () => run("npm run lint"))
step("Type checking", () => run("npm run typecheck"))
step("Compiling", () => run("npm run compile"))
step("Testing", () => run("npm run test:unit"))

if (failed) {
  process.stderr.write("\n✗ Quality checks failed. Fix the issues above before publishing.\n")
  process.exit(1)
}

// ── Release ─────────────────────────────────────────────────────────

const notes = extractReleaseNotes()

process.stdout.write(`\n✓ All checks passed\n`)
process.stdout.write(`\n  Version:  ${version}`)
process.stdout.write(`\n  Tag:      ${tag}`)
process.stdout.write(`\n  Notes:\n`)
process.stdout.write(
  notes
    .split("\n")
    .map((l) => `    ${l}`)
    .join("\n"),
)
process.stdout.write("\n")

const ok = await confirm(
  `Create GitHub Release ${tag}? This will trigger publishing to the Marketplace.`,
)
if (!ok) {
  process.stdout.write("Aborted.\n")
  process.exit(0)
}

step(`Tagging ${tag}`, () => {
  run(`git tag ${tag}`)
  run(`git push origin ${tag}`)
})

step("Creating GitHub Release", () => {
  execSync(`gh release create ${tag} --title "${tag}" --notes-file -`, {
    input: notes,
    stdio: ["pipe", "inherit", "inherit"],
  })
})

process.stdout.write(`\n✓ Release ${tag} created. The publish workflow will handle the rest.\n`)
process.stdout.write("  Track it at: ")
run(`gh run list --workflow=publish.yml --limit=1 --json url --jq ".[0].url"`)
