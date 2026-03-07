---
name: pr
description: Create a pull request for the current branch. Validates branch naming, runs all checks, ensures version bump and changelog are present, and creates the PR via gh CLI.
disable-model-invocation: true
---

Create a pull request for the current branch.

## Steps

1. Check that the current branch is NOT `master`. If it is, stop and ask to create a feature branch first.
2. Validate the branch name matches the pattern `(feat|fix|refactor|docs|chore|test)/<kebab-case-description>`. If it does not, warn and suggest a valid name.
3. Run all quality checks in order. If any fail, stop and fix the issues first.
   - `npm run format:check`
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
4. Check that `package.json` version has been bumped compared to `master` by running `git diff master -- package.json` and looking for a version change. If not, ask what version bump to apply (patch/minor/major), apply it, and format.
5. Check that `CHANGELOG.md` has an entry for the new version. If not, generate one from the commits on this branch and add it. Format after.
6. If changes were made in steps 4-5, stage and commit them with message `chore: bump version and update changelog`.
7. Push the branch to origin.
8. Create the PR using `gh pr create`:
   - Derive the title from the branch name (e.g. `feat/class-sorting` becomes "Add class sorting").
   - Generate the PR body following the template in `.github/pull_request_template.md`. Fill in the summary, changes list, and check the appropriate type and checklist boxes.
   - Target `master`.
9. Print the PR URL.

## Rules

- Never force push.
- Never push to master.
- Always run all checks before creating the PR.
- Ask to confirm the PR title and summary before creating it.
