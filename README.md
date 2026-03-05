# Tailwind Stash

A VS Code extension that collapses long Tailwind CSS class strings to keep your templates clean and readable. Includes an editable side panel for managing classes across your file.

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

The line the cursor is on is always expanded, so you can read and edit classes normally.

### Class Editor Panel

Opens an editable side panel showing all Tailwind classes in your file, organized by element. Each element's classes are shown in a textarea — edit them directly and changes sync back to the source. Click an element header to jump to it in the editor.

The panel highlights the active element as you move your cursor, and selecting a textarea in the panel scrolls the editor to that element (both behaviors are configurable).

## Usage

### Commands

All commands are available via the Command Palette (`Ctrl+Shift+P`):

| Command | Description |
|---|---|
| Tailwind Stash: Toggle Collapse Classnames | Toggle collapsing on/off |
| Tailwind Stash: Collapse All Classnames | Collapse all class strings |
| Tailwind Stash: Expand All Classnames | Expand all class strings |
| Tailwind Stash: Show Class Editor Panel | Open the class editor panel |
| Tailwind Stash: Hide Class Editor Panel | Close the class editor panel |
| Tailwind Stash: Toggle Class Editor Panel | Toggle the class editor panel |

### Default Keyboard Shortcuts

| Shortcut | Command |
|---|---|
| `Alt+Shift+T` | Toggle Collapse Classnames |
| `Alt+Shift+C` | Collapse All Classnames |
| `Alt+Shift+E` | Expand All Classnames |
| `Alt+Shift+P` | Show Class Editor Panel |
| `Alt+Shift+L` | Toggle Class Editor Panel |

All shortcuts are configurable — either through VS Code's keyboard shortcuts settings (`Ctrl+K Ctrl+S`) or via the extension settings below.

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

### Folding

| Setting | Default | Description |
|---|---|---|
| `tailwindStash.foldByDefault` | `true` | Collapse classes automatically when a file is opened |
| `tailwindStash.placeholderStyle` | `"count"` | Placeholder style: `count` (`3`), `count-long` (`3 classes`), or `empty` (`…`) |
| `tailwindStash.minClassCount` | `4` | Minimum number of classes before collapsing kicks in |
| `tailwindStash.extraLanguages` | `[]` | (Experimental) Additional language IDs to enable collapsing for. Requires reload. |
| `tailwindStash.supportedFunctions` | `["cn", "clsx", ...]` | Function names (or `/regex/` patterns) that wrap Tailwind classes |

### Panel

| Setting | Default | Description |
|---|---|---|
| `tailwindStash.scrollEditorOnPanelSelect` | `true` | Scroll the editor to the class range when clicking a textarea in the panel |
| `tailwindStash.scrollPanelOnEditorSelect` | `true` | Scroll the panel to the active card when focusing a class in the editor |

### Appearance

| Setting | Default | Description |
|---|---|---|
| `tailwindStash.foldedTextColor` | `""` | Color of the placeholder text (e.g. `"#888"`). Empty = theme default. |
| `tailwindStash.elementTextColor` | `""` | Color of the element name in the card header (e.g. `"#ee9d28"`). Empty = default. |
| `tailwindStash.activeBorderColor` | `""` | Border color of the active card (e.g. `"#007fd4"`). Empty = VS Code focus border. |
| `tailwindStash.textareaFocusBackground` | `""` | Background color of the textarea when focused (e.g. `"rgba(0,100,200,0.1)"`). Empty = default. |

### Keyboard Shortcuts

These settings let you change keybindings without opening VS Code's keyboard shortcuts editor. All require a reload after changing.

| Setting | Default | Description |
|---|---|---|
| `tailwindStash.shortcutToggleCollapse` | `"alt+shift+t"` | Keyboard shortcut for Toggle Collapse |
| `tailwindStash.shortcutCollapseAll` | `"alt+shift+c"` | Keyboard shortcut for Collapse All |
| `tailwindStash.shortcutExpandAll` | `"alt+shift+e"` | Keyboard shortcut for Expand All |
| `tailwindStash.shortcutShowPanel` | `"alt+shift+p"` | Keyboard shortcut for Show Class Editor Panel |
| `tailwindStash.shortcutHidePanel` | `""` | Keyboard shortcut for Hide Class Editor Panel |
| `tailwindStash.shortcutTogglePanel` | `"alt+shift+l"` | Keyboard shortcut for Toggle Class Editor Panel |

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, architecture overview, and development guidelines.

## Support

If you find this extension useful, consider [sponsoring the project](https://github.com/sponsors/beumerr).
