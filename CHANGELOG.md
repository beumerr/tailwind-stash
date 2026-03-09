# Changelog

All notable changes to the Tailwind Stash extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - 2026-03-09

### Added

- Configurable placeholder labels: map short names to class strings via `placeholders` setting
- Smart fold display: matched placeholders shown as labels (e.g. `btn flex-center +2`) with multi-match support
- Configurable placeholder format via `placeholderFormat` setting (default: `{keys} +{rest}`)
- Expand Placeholder command (`Alt+Shift+X`): replaces a placeholder key with its full class string inside class attributes
- Autocomplete suggestions for placeholder keys inside class attributes and supported function calls
- Shared `classContext` module to deduplicate class attribute detection logic
- 30 new tests (327 total unit tests)
- E2E smoke tests for new command and configuration defaults
- E2E tests in publish workflow (min version + stable)

### Changed

- Branch protection enabled on master with required status checks (build, E2E)
- Disable installed extension in debug launch config to prevent conflicts

### Fixed

- Remove `settings.local.json` from git tracking (user-specific file)

## [0.1.5] - 2026-03-07

### Fixed

- Fix stale ranges corrupting document text (eating `">`) when editing classes in the panel
- Fix panel showing "No Tailwind classes detected" on open (webview ready race condition)
- Fix 150ms click delay when expanding collapsed class strings
- Fix duplicate/multiplied classes caused by `activeTextEditor` being undefined while webview is focused
- Fix cursor jumping and content reverting when typing or deleting in the panel textarea
- Fix empty-line cursor jump caused by no-op edit cycles between panel and editor

### Added

- 23 regression tests covering all fixed bugs (290 total tests)

## [0.1.4] - 2026-03-07

### Fixed

- Publish to Open VSX (namespace registration + workflow fix)

## [0.1.3] - 2026-03-07

### Fixed

- Fix `ovsx publish` command in publish workflow (unsupported `--no-update-package-json` flag)

## [0.1.2] - 2026-03-07

### Fixed

- Fix extension failing to activate when installed from Marketplace due to `.vscodeignore` excluding runtime modules (`out/core/`, `out/utils/`)

### Added

- Packaging safety test that verifies `.vscodeignore` does not exclude required runtime files

## [0.1.1] - 2026-03-06

### Changed

- Unified test scripts: `npm test` now runs both unit and E2E tests
- Bumped GitHub Actions to checkout@v6 and setup-node@v6
- Bumped `@types/node` and `glob` dependencies
- Fixed child process deprecation warning in build script
- Added extension icon and Marketplace badges
- Added demo gif to README
- Improved Marketplace discoverability with better keywords and gallery banner

## [0.1.0] - 2026-03-06

### Added

- Demo gif in README
- Horizontal collapse of Tailwind CSS class strings with configurable placeholder styles (`count`, `count-long`, `empty`)
- Automatic collapse on file open (`foldByDefault` setting)
- Configurable minimum class count threshold before collapsing
- Cursor-line auto-expand: the line with the cursor always shows full classes
- Hover tooltips showing all classes on collapsed strings
- Class Editor Panel: editable side panel showing all Tailwind classes organized by element
- Bi-directional sync between the editor and the panel
- Click element header in panel to jump to source location
- Active element highlighting as cursor moves
- Panel auto-scrolls to active card (`scrollPanelOnEditorSelect` setting)
- Editor scrolls to element when selecting a panel textarea (`scrollEditorOnPanelSelect` setting)
- 6 commands: Toggle Collapse, Collapse All, Expand All, Show/Hide/Toggle Class Editor Panel
- 5 default keyboard shortcuts (`Alt+Shift+T/C/E/P/L`)
- All keyboard shortcuts configurable via settings
- Support for utility functions: `cn()`, `clsx()`, `cva()`, `cx()`, `twMerge()`, `twJoin()`, `classNames()`, `classnames()`
- Custom function support with regex patterns (`supportedFunctions` setting)
- Support for HTML, JavaScript, JSX, TypeScript, TSX, Vue, Svelte, Astro, PHP
- Experimental extra language support via `extraLanguages` setting
- Appearance customization: folded text color, element text color, active card border color, textarea focus background
- CI pipeline with Node 20/22 matrix, VS Code 1.66.0 + stable E2E tests, branch name validation
- Dependabot for npm and GitHub Actions dependency updates
