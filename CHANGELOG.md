# Changelog

All notable changes to the Tailwind Stash extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
