# Contributing to Tailwind Stash

Thanks for your interest in contributing!

## Development Setup

1. Clone the repo
2. Run `npm install`
3. Run `npm run compile` (or `npm run watch` for dev)
4. Press `F5` in VS Code to launch the Extension Development Host

## Project Structure

```
src/
  extension.ts          - Extension entry point, command registration
  foldingProvider.ts    - Decoration-based class collapsing
  classDetector.ts      - Regex-based Tailwind class detection
  cssPreviewPanel.ts    - Webview panel for class editing
  tailwindCssMap.ts     - (Reserved for future use)
  verticalFoldProvider.ts - (Reserved for future use)
```

## Submitting Changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Test with the Extension Development Host (`F5`)
4. Submit a pull request

## Reporting Issues

Open an issue with:
- VS Code version
- Steps to reproduce
- Expected vs actual behavior
- A code snippet that triggers the issue
