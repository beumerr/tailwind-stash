# Tailwind Stash

A VS Code extension that collapses long Tailwind CSS class strings to keep your templates clean and readable. Includes a CSS preview panel that shows the actual CSS behind your utility classes.

## Features

### Horizontal Collapse

Collapses class strings into a compact placeholder. Hover over the collapsed text to see all classes in a tooltip. The placeholder style is configurable:

- **count** (default): `class="6"`
- **count-long**: `class="6 classes"`
- **empty**: `class="…"`

```html
<!-- Before collapsing -->
<div class="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">

<!-- After collapsing (count style) -->
<div class="6">
```

### Class Editor Panel

Opens an editable side panel showing all Tailwind classes in your file, organized by element hierarchy. Each element's classes are shown in a textarea — edit them directly and changes sync back to the source. Click an element header to jump to it in the editor.

## Usage

| Shortcut | Command | Description |
|---|---|---|
| `Alt+Shift+T` | Toggle Collapse | Toggle collapsing on/off |
| `Alt+Shift+C` | Collapse All | Collapse all class strings |
| `Alt+Shift+E` | Expand All | Expand all class strings |

The **Class Editor Panel** is available via the Command Palette (`Ctrl+Shift+P`) → "Tailwind Stash: Show Class Editor Panel".

All keybindings are configurable in VS Code's keyboard shortcuts settings (`Ctrl+K Ctrl+S`).

## Supported Languages

HTML, JavaScript, JSX, TypeScript, TSX, Vue, Svelte, Astro, PHP

## Supported Utility Functions

Class strings inside these functions are detected and collapsible. The defaults are:

`cn()`, `clsx()`, `cva()`, `cx()`, `twMerge()`, `twJoin()`, `classNames()`, `classnames()`

This list is fully configurable via the `tailwindStash.supportedFunctions` setting. You can add plain function names or regex patterns wrapped in `/` delimiters:

```jsonc
"tailwindStash.supportedFunctions": [
  "cn",
  "clsx",
  "myCustomHelper",
  "/^get.*Classes$/"  // matches getButtonClasses, getCardClasses, etc.
]
```

## Settings

| Setting | Default | Description |
|---|---|---|
| `tailwindStash.foldByDefault` | `true` | Collapse classes automatically when a file is opened |
| `tailwindStash.foldedTextColor` | `""` | Color of the placeholder (e.g. `"#888"`). Empty = theme default. |
| `tailwindStash.placeholderStyle` | `"count"` | Placeholder: `count` (`3`), `count-long` (`3 classes`), or `empty` (`…`) |
| `tailwindStash.minClassCount` | `4` | Minimum number of classes before collapsing kicks in |
| `tailwindStash.extraLanguages` | `[]` | (Experimental) Additional language IDs to enable collapsing for. Requires reload. |
| `tailwindStash.supportedFunctions` | `["cn", "clsx", ...]` | Function names (or `/regex/` patterns) that wrap Tailwind classes |

## Development

```bash
npm install
npm run compile
npm test
npm run watch     # auto-recompile on changes
```

Press `F5` in VS Code to launch the Extension Development Host for manual testing.
