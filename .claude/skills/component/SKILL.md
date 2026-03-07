---
name: component
description: Scaffold a new Preact component with test file following project conventions.
argument-hint: <kebab-case-name>
disable-model-invocation: true
---

Scaffold a new Preact component named `$ARGUMENTS`.

## Steps

1. Validate the name is kebab-case (lowercase, hyphens only, no underscores or capitals). If not, convert it and confirm.
2. Create the folder `src/webview/components/$ARGUMENTS/`.
3. Create the main component file `$ARGUMENTS.tsx` with:
   - A props interface named `<PascalName>Props`
   - A named export function `<PascalName>`
   - Minimal boilerplate (just the interface, function, and a root element)
   - Only imports that are needed
4. Create a test file at `test/webview/<camelName>.test.tsx` with:
   - `// @vitest-environment happy-dom` header
   - Imports from `@testing-library/preact` and `vitest`
   - Import of the new component
   - One basic render test as a starting point
   - Use `screen` queries (getByText, getByRole), not data-testid
5. Run `npm run lint` to verify the component structure passes.
6. Print a summary of created files.

## Rules

- Follow existing component patterns in the codebase. Read an existing component if unsure about style.
- Use `Array<T>` not `T[]` (enforced by lint).
- Sort props alphabetically (enforced by perfectionist).
- Keep it minimal. Do not add unnecessary boilerplate.
