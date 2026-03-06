# Contributing

Developer guide for working on Tailwind Stash.

## Prerequisites

- Node.js (LTS)
- VS Code (for running and debugging the extension)

## Setup

```bash
npm install
```

## Architecture

The extension has two separate runtimes that communicate via message passing:

```
┌──────────────────────────────┐     ┌──────────────────────────────┐
│  Extension Host (Node.js)    │     │  Webview (Browser sandbox)   │
│                              │     │                              │
│  src/extension.ts            │◄───►│  src/webview/index.tsx       │
│  src/core/                   │     │  src/webview/views/          │
│    classDetector.ts          │     │  src/webview/components/     │
│    foldingProvider.ts        │     │                              │
│    cssPreviewPanel.ts        │     │  Preact + Tailwind CSS       │
│  src/utils/                  │     │                              │
│    types.ts, utils.ts        │     │                              │
└──────────────────────────────┘     └──────────────────────────────┘
```

### Extension Host (`src/`)

Runs as a standard VS Code extension in Node.js.

- **`extension.ts`** — Entry point. Registers commands and initializes `FoldingManager`.
- **`core/classDetector.ts`** — Regex-based detection of Tailwind class strings in documents. Handles HTML attributes (`class="..."`), JSX (`className="..."`), template literals with interpolations, and utility function calls (`cn()`, `clsx()`, etc.). Returns `ClassRange[]` with the class names, element tag, and document range.
- **`core/foldingProvider.ts`** — `FoldingManager` applies VS Code text decorations to collapse class strings visually. Uses `letterSpacing: -9999px` + `opacity: 0` to hide the original text and renders a placeholder (`before` decoration). Automatically expands the line the cursor is on.
- **`core/cssPreviewPanel.ts`** — `CSSPreviewPanel` manages the webview panel lifecycle. Sends class data to the webview via `postMessage` and handles incoming edits, navigation, and selection sync.
- **`utils/types.ts`** — Shared types (e.g. `ClassEntry`) used by both extension host and webview.
- **`utils/utils.ts`** — Shared utilities: `cn()` class joiner, `debounce()`, `generateNonce()`.

### Webview (`src/webview/`)

Runs in an isolated browser sandbox. Built with **Preact** and **Tailwind CSS v4**.

- **`index.tsx`** — Mounts the root Preact app, acquires the VS Code API.
- **`views/panel/panel.tsx`** — Main panel view. Listens for messages from the extension host and renders entry cards.
- **`components/`** — Preact components (see [Component conventions](#component-conventions)).
- **`styles.css`** — Tailwind CSS entry point with `@theme` tokens that map to VS Code CSS variables.
- **`global.d.ts`** — Ambient type declarations for the webview (e.g. VS Code API global).

The webview has its own `tsconfig.json` with `jsxImportSource: "preact"` and `moduleResolution: "bundler"`.

### Message protocol

The extension host and webview communicate through `postMessage`. Messages flow in both directions:

**Extension → Webview:**

| Type | Payload | Description |
|---|---|---|
| `update` | `{ entries, activeIndex }` | Full list of class entries for the current file |
| `setActive` | `{ index }` | Highlight a specific entry card |
| `config` | `{ activeBorderColor, elementTextColor, ... }` | Push appearance settings |

**Webview → Extension:**

| Type | Payload | Description |
|---|---|---|
| `ready` | `{}` | Webview mounted and ready to receive data |
| `updateClasses` | `{ index, classes }` | User edited classes in the textarea |
| `goToRange` | `{ index }` | User clicked a card header — navigate editor |
| `selectEntry` | `{ index }` | User focused a textarea — sync selection |

## Build system

The extension has two independent compile steps:

| Command | What it does |
|---|---|
| `tsc -p ./` | Compiles the extension host (`src/` minus `src/webview/`) to `out/extension.js` |
| `tsx esbuild.webview.mts` | Bundles the webview with esbuild + Tailwind CLI to `out/webview.{js,css,html}` |

`npm run compile` runs both. `npm run watch` runs both in watch mode.

The webview HTML template (`src/webview/index.html`) uses `{{CSS}}`, `{{JS}}`, and `{{NONCE}}` placeholders that get inlined at build time by `cssPreviewPanel.ts`.

## Scripts

```bash
npm run compile          # full build (extension + webview)
npm run compile:webview  # webview only
npm run watch            # watch mode for both
npm run lint             # oxlint + component structure check
npm run format           # format with oxfmt
npm run format:check     # check formatting without writing
npm run typecheck        # type-check without emitting
npm test                 # run unit + integration tests with vitest
npm run test:vscode      # run E2E smoke tests in a real VS Code instance
```

## Testing

The project has three layers of tests, each catching different kinds of problems:

| Layer | Runner | What it tests | Command |
|---|---|---|---|
| Unit tests | Vitest + happy-dom | Individual modules in isolation | `npm test` |
| Integration tests | Vitest | Cross-module interactions (e.g. commands → decorations → panel) | `npm test` |
| VS Code E2E (smoke) | Mocha + @vscode/test-electron | Extension inside a real VS Code instance | `npm run test:vscode` |

### Unit & integration tests (Vitest)

```
test/
  core/                    # Extension host unit tests
    classDetector.test.ts
    foldingProvider.test.ts
    cssPreviewPanel.test.ts
    extension.test.ts
    projectStructure.test.ts
  webview/                 # Preact component unit tests
    classEditor.test.tsx
    entryCard.test.tsx
    panel.test.tsx
    setup.ts
  integration/             # Cross-module integration tests
    activation.test.ts
  __mocks__/
    vscode.ts              # Mock for the vscode module
```

- Webview tests use `@testing-library/preact` with `screen` queries (`getByText`, `getByRole`, etc.) — no `data-testid` attributes.
- The `vscode` module is aliased to a mock in `vitest.config.ts`.
- **Integration tests** (`test/integration/`) verify that modules work together correctly — e.g. that commands produce real decorations via the detector, that the panel receives entries from the folding manager, and that editor events update both systems.
- **Project structure test** (`test/core/projectStructure.test.ts`) — verifies that all critical files (LICENSE, README, source files, CI config, etc.) exist. If you add or rename a file, update the `requiredFiles` array in this test.
- Coverage thresholds are enforced at 90% for statements, branches, functions, and lines.
- Run a single test file: `npx vitest run test/webview/panel.test.tsx`

### VS Code E2E smoke tests

These run the extension inside a real VS Code instance downloaded by `@vscode/test-electron`. They verify the extension activates, registers all commands, and basic operations work against the real VS Code API (not mocks).

```
test/vscode-e2e/
  index.ts              # Mocha test runner entry point
  smoke.test.ts         # Smoke tests (activation, commands, config)
  tsconfig.json         # Separate tsconfig → compiles to out/test/vscode-e2e/
scripts/
  run-vscode-tests.mts  # Downloads VS Code and runs the tests
```

```bash
npm run test:vscode                        # test against minimum supported version (1.66.0)
npm run test:vscode -- --version 1.85.0    # test a specific version
npm run test:vscode -- --version stable    # test latest stable
```

The `pretest:vscode` script compiles the E2E tests automatically before running.

CI runs E2E tests against both **1.66.0** (minimum) and **stable** (latest) to catch regressions on either end.

> **Note:** E2E tests require a display. CI uses `xvfb-run`. Locally on macOS/Windows they run natively. On headless Linux, prefix with `xvfb-run -a`.

## Component conventions

Components live in `src/webview/components/`. The structure is enforced by a lint script (`scripts/lint-component-structure.mts`) that runs as part of `npm run lint`.

Rules:

1. **Every component gets its own folder** named in kebab-case, containing a main file with the same name:
   ```
   components/
     empty-state/
       empty-state.tsx      ← main component
     entry-card/
       entry-card.tsx        ← main component
       entry-card-header.tsx ← compound component
   ```

2. **No loose `.tsx` files** directly in `components/`.

3. **Compound components** (tightly coupled sub-components) can share a folder if prefixed with the folder name (e.g. `entry-card-header.tsx` inside `entry-card/`).

## Linting

The project uses **oxlint** with the config in `oxlint.config.mjs`. Key plugins:

- `perfectionist` — enforces sorted imports, props, objects, interfaces
- `unused-imports` — removes unused imports
- `better-tailwindcss` — catches unknown/conflicting Tailwind classes
- `no-only-tests` — prevents `.only` from being committed

Since the webview uses Preact (lowercase DOM attributes), `react/no-unknown-property` is disabled for `src/webview/**`.

## VS Code version compatibility

The extension supports VS Code **1.66.0+**. This is enforced at two levels:

1. **Compile-time** — `@types/vscode` is pinned to `~1.66.0` (tilde = patch updates only). TypeScript will error if you use an API introduced after 1.66. **Never change `@types/vscode` to `^` — it would silently allow newer APIs.**
2. **Run-time** — CI runs E2E smoke tests against VS Code 1.66.0 and latest stable.

**`engines.vscode` and `@types/vscode` must always match.** If you change the minimum version, update both.

To test against a specific version locally:
```bash
npm run test:vscode -- --version 1.80.0
```

## Debugging

1. Open the repo in VS Code
2. Press **F5** to launch the Extension Development Host
3. Open a file with Tailwind classes in the dev host
4. Use `Alt+Shift+T` to toggle collapse, `Alt+Shift+P` to open the panel

The extension activates on `onStartupFinished`, so it's always available once VS Code loads.

## Adding a new component

1. Create a folder: `src/webview/components/my-component/`
2. Create the main file: `my-component.tsx`
3. Export the component and import it where needed
4. Run `npm run lint` to verify the structure passes

## Adding a new setting

1. Add the property to `contributes.configuration` in `package.json`
2. Read it in the relevant module with `vscode.workspace.getConfiguration("tailwindStash").get(...)`
3. If it affects the webview, send it via the `config` message in `cssPreviewPanel.ts` and handle it in `panel.tsx`

## Security

The webview runs in an isolated browser sandbox. All webview HTML **must** follow these rules:

1. **Content Security Policy (CSP)** — Every webview HTML file must include a strict CSP meta tag with nonce-based `script-src` and `style-src`. Never use `'unsafe-inline'` or `'unsafe-eval'`.
   ```html
   <meta http-equiv="Content-Security-Policy"
     content="default-src 'none'; style-src 'nonce-{{NONCE}}'; script-src 'nonce-{{NONCE}}';" />
   ```
2. **Nonces on all inline scripts/styles** — Every `<script>` and `<style>` tag must have a `nonce="{{NONCE}}"` attribute. The `{{NONCE}}` placeholder is replaced at runtime with a cryptographic random value generated by `randomBytes()` in `cssPreviewPanel.ts`.
3. **`localResourceRoots`** — Webview panels must set `localResourceRoots` to the minimum set of directories needed (typically `[]` when content is inlined, or just the `out/` directory).
4. **No external resources** — Do not load scripts, styles, fonts, or images from CDNs or external URLs. Everything must be bundled and inlined.
5. **No `dangerouslySetInnerHTML`** — Never inject raw HTML in Preact components.

When adding a new webview panel or view, copy the CSP pattern from the existing `index.html` and generate nonces the same way `cssPreviewPanel.ts` does.

## Quality guidelines

### Accessibility
- Use semantic HTML elements (`<button>`, `<section>`, `<ul>`) instead of `<div>` with click handlers.
- All interactive elements must be keyboard-accessible (focusable, respond to Enter/Space).
- Form controls (textarea, input) must have an `aria-label` or associated `<label>`.
- Use `aria-label` for elements whose purpose isn't clear from their text content alone.

### React/Preact patterns
- **Controlled components**: If a component uses `value=` on an input/textarea, state must update synchronously on input. Debounce only the side effect (e.g., `postMessage`), not the state update — otherwise the input fights the user.
- **Cleanup effects**: Always clean up timeouts, intervals, event listeners, and DOM mutations in `useEffect` return functions.
- **Dependency arrays**: Include all referenced values in `useEffect`/`useCallback` dependency arrays. The linter enforces this.

### Extension host patterns
- **Config caching**: Read `vscode.workspace.getConfiguration()` once and cache the values. Invalidate the cache in `onDidChangeConfiguration` handlers. Do not read config on every keystroke or decoration update.
- **Debounce event handlers**: Document change and selection change events fire at high frequency. Always debounce handlers that trigger expensive work (regex scans, decoration updates).
- **Dispose everything**: Track all timeouts, intervals, and disposables. Clear them in `dispose()`. Use `context.subscriptions` for auto-disposal.
- **Regex from user input**: When constructing `RegExp` from user-provided strings (e.g., `supportedFunctions` settings), wrap in `try/catch` to handle invalid patterns gracefully.

### General
- Pluralize correctly: `1 class` not `1 classes`.
- Remove unused code (CSS variables, dead imports, unreferenced fields). Don't leave dead code for hypothetical future use.
- All build-time-only dependencies (`tailwindcss`, `preact`, etc.) go in `devDependencies`, not `dependencies`. Only packages loaded at runtime by the extension host belong in `dependencies`.

## Branching strategy

`master` is the stable, release-ready branch. All work happens on short-lived feature branches that get merged via pull request.

### Branch naming

Branch names are validated by CI. Use one of these prefixes followed by a `/` and a lowercase kebab-case description:

| Prefix | Use for | Example |
|---|---|---|
| `feature/` | New features | `feature/class-sorting` |
| `fix/` | Bug fixes | `fix/collapse-multiline` |
| `refactor/` | Code restructuring (no behavior change) | `refactor/split-detector` |
| `docs/` | Documentation only | `docs/add-api-guide` |
| `chore/` | Maintenance, deps, CI | `chore/update-esbuild` |
| `test/` | Adding or updating tests | `test/panel-edge-cases` |

### Rules

- **No direct pushes to `master`** — all changes go through a PR
- **One concern per branch** — don't mix a feature with an unrelated refactor
- **Keep branches short-lived** — merge or close within days, not weeks
- **Delete branches after merge** — GitHub does this automatically if enabled

### Every PR must

1. Bump the version in `package.json` (patch for fixes, minor for features, major for breaking changes)
2. Add an entry to `CHANGELOG.md` under the new version section

### For contributors

1. Fork the repo
2. Create a branch from `master` (e.g. `feature/my-feature`)
3. Make your changes
4. Bump the version in `package.json` and update `CHANGELOG.md`
5. Run `npm run format`, `npm run lint`, `npm run typecheck`, and `npm test`
6. Test with the Extension Development Host (`F5`)
7. Open a PR targeting `master`

### Publishing (admin only)

After merging a PR, the admin pulls `master` and runs:

```bash
npm run release
```

This validates everything, tags the version, creates a GitHub Release, and the `publish.yml` workflow publishes to the Marketplace automatically.

## Branch protection (admin setup)

These rules must be configured in GitHub → Settings → Branches → `master`:

- **Require a pull request before merging**
- **Require status checks to pass** (select the `build` and `branch-name` checks)
- **Require branches to be up to date before merging**
- **Automatically delete head branches** (Settings → General)

This ensures nobody (including admins) can push directly to `master` without passing CI.

## Reporting issues

Open an issue with:
- VS Code version
- Steps to reproduce
- Expected vs actual behavior
- A code snippet that triggers the issue
