---
name: release
description: Prepare and publish a release for Tailwind Stash. Bumps the version, generates changelog entries, runs all checks, and publishes via GitHub Release.
disable-model-invocation: true
---

Prepare and publish a release for Tailwind Stash.

## Steps

1. Verify the working tree is clean and on the `master` branch.
2. Read the current version from `package.json` and the latest entry in `CHANGELOG.md`.
3. Ask what type of release this is: patch, minor, or major.
4. Calculate the new version number based on the current version and release type.
5. Update `package.json` with the new version.
6. Update `CHANGELOG.md`:
   - Add a new `## [x.y.z] - YYYY-MM-DD` section with today's date.
   - Look at the git log since the last tag to generate the changelog entries, grouped by Added/Changed/Fixed/Removed as appropriate.
   - If there is an `[Unreleased]` section, move its content into the new version section and leave `[Unreleased]` empty.
7. Run `npm run format` to format the changed files.
8. Run `npm run lint`, `npm run typecheck`, and `npm test` to verify everything passes.
9. Show a summary of the changes and ask for confirmation before committing.
10. After confirmation, create a commit with message `release: vX.Y.Z`.
11. Run `npm run release` to tag, push, and create the GitHub Release.

## Rules

- Must be on `master` branch with a clean working tree before starting.
- Never skip quality checks.
- Always show the changelog diff before committing.
- Stop and ask if any check fails.
