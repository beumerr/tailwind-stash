---
name: audit
description: Run a full project health check on Tailwind Stash. Checks formatting, linting, types, tests, coverage, dependencies, bundle size, git status, and changelog.
disable-model-invocation: true
---

Run a full project health check. Execute all checks and collect results. Do not stop on failure — run everything and report at the end.

## Checks

1. **Format** — `npm run format:check`
2. **Lint** — `npm run lint`
3. **Types** — `npm run typecheck`
4. **Tests** — `npm test` (note: includes coverage)
5. **Outdated deps** — `npm outdated`
6. **Bundle size** — measure `out/webview.js` and `out/webview.css` file sizes (run `npm run compile` first if `out/` does not exist)
7. **Git status** — check for uncommitted changes and unpushed commits
8. **Changelog** — verify `CHANGELOG.md` has an entry matching the version in `package.json`

## Output

Print a summary table at the end:

```
Audit Results
─────────────────────────────────
  Format        ✓ pass
  Lint          ✓ pass
  Types         ✓ pass
  Tests         ✓ pass (95% coverage)
  Deps          ⚠ 2 outdated
  Bundle        ✓ 17 KB JS + 14 KB CSS
  Git           ✓ clean
  Changelog     ✓ v0.1.0
─────────────────────────────────
```

Use ✓ for pass, ✗ for fail, ⚠ for warnings. After the table, list details for any failures or warnings.
