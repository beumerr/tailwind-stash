# CLAUDE.md

Project conventions and rules for AI-assisted development on Tailwind Stash.

## Project overview

VS Code extension that collapses Tailwind CSS class strings and provides a webview panel for editing them. Two runtimes: Node.js extension host (`src/core/`) and browser-sandboxed Preact webview (`src/webview/`).

## Commands

- `npm run compile` — full build (extension + webview)
- `npm run lint` — oxlint + component structure check
- `npm run format` — format with oxfmt
- `npm test` — run all tests with vitest
- `npm run typecheck` — type-check without emitting

Always run `npm test`, `npm run lint`, and `npm run typecheck` after making changes.

## Key rules

### Security (non-negotiable)

- Every webview HTML file MUST have a Content-Security-Policy meta tag with nonce-based script-src and style-src. Never use 'unsafe-inline' or 'unsafe-eval'.
- Every inline `<script>` and `<style>` tag MUST have a `nonce="{{NONCE}}"` attribute. The nonce is generated with `randomBytes()` in the panel class.
- Webview panels MUST set `localResourceRoots` to the minimum needed directories.
- Never use `dangerouslySetInnerHTML` in Preact components.
- Never load external resources (CDNs, remote URLs) in webviews.
- When constructing RegExp from user config, always wrap in try/catch.

### Dependencies

- Build-time-only packages (tailwindcss, preact, esbuild, etc.) go in `devDependencies`.
- Only packages loaded at runtime by the extension host go in `dependencies` (currently none).

### Webview / Preact

- Use semantic HTML: `<button>` not clickable `<div>`, `<section>` for landmark regions.
- All interactive elements must be keyboard-accessible.
- Form controls must have `aria-label` or `<label>`.
- Controlled inputs: update local state synchronously on input, debounce only the side effect (postMessage). Never debounce the state setter — it causes input fighting.
- Always clean up timeouts, intervals, event listeners, and DOM mutations in useEffect return functions.
- Include all dependencies in useEffect/useCallback arrays.

### Extension host

- Cache config values from `workspace.getConfiguration()`. Invalidate in `onDidChangeConfiguration`. Never read config on every keystroke.
- Debounce `onDidChangeTextDocument` and `onDidChangeTextEditorSelection` handlers.
- Track and clear all timeouts/intervals in `dispose()`.
- Push all disposables to `context.subscriptions` or clean up manually.

### Code style

- Pluralize correctly ("1 class" not "1 classes").
- No dead code (unused CSS vars, unreferenced fields, etc.).
- Components live in `src/webview/components/<kebab-name>/<kebab-name>.tsx`. Enforced by lint.
- Sorted imports, props, objects, interfaces (enforced by perfectionist plugin).

### Testing

- Tests use Vitest + happy-dom for webview, VS Code mock for extension host.
- Mock is at `test/__mocks__/vscode.ts`, aliased in `vitest.config.ts`.
- Use strong assertions (exact values), not weak ones (`toBeGreaterThanOrEqual(1)`).
- Test actual behavior, not just "does not throw".
- Coverage thresholds enforced at 90% for statements, branches, functions, and lines.
- **Project structure test** (`test/core/projectStructure.test.ts`) guards against accidental file deletion (LICENSE, source files, CI config, etc.). When adding, removing, or renaming a file, update the `requiredFiles` array in this test.

### Message protocol

Extension <-> Webview communication uses postMessage. When adding new message types:
1. Add the type to `PanelMessage` union in `panel.tsx`
2. Handle it in the `useEffect` message handler
3. Document it in the message protocol table in CONTRIBUTING.md
