---
description: "Publish a new version of dvirus-js packages to npm and GitHub. Use when: release, publish, version bump, npm publish, new version"
agent: "agent"
tools: [terminal, search, file]
---

# Release Workflow — dvirus-js

You are a release manager for this Nx monorepo. Follow these steps to safely publish a new version.

## Packages

- `@dvirus-js/utils` (packages/utils)
- `@dvirus-js/angular` (packages/angular/angular-utils)
- `@dvirus-js/angular-signals` (packages/angular/signals)

## Pre-flight Checks

1. **Clean working tree**: Run `git status` — abort if there are uncommitted changes.
2. **On main branch**: Run `git branch --show-current` — warn if not on `main`.
3. **Pull latest**: Run `git pull --rebase` to ensure we're up to date.
4. **Check npm auth**: Run `npm whoami` — if not authenticated, ask the user to run `npm login`.
5. **Check current versions**: Run `npm view @dvirus-js/utils version`, `npm view @dvirus-js/angular version`, `npm view @dvirus-js/angular-signals version` to show what's currently on npm.
6. **Check latest git tag**: Run `git tag --sort=-v:refname | head -5` to show recent tags.

Show the user a summary of current state before proceeding.

## Versioning Strategy

This repo uses **Nx Release** with:
- `currentVersionResolver: "git-tag"` — version calculated from latest git tag
- `specifierSource: "conventional-commits"` — bump type (patch/minor/major) from commit messages
- All three packages are versioned together (unified versioning)

Conventional commit prefixes:
- `fix:` → patch bump (1.0.3 → 1.0.4)
- `feat:` → minor bump (1.0.3 → 1.1.0)
- `feat!:` or `BREAKING CHANGE:` → major bump (1.0.3 → 2.0.0)

## Release Steps

> **Important**: The `main` branch is protected. You cannot push directly to it.
> All changes go through a feature/release branch → Pull Request → merge.

### Step 1: Create a release branch
```
git checkout main
git pull origin main
git checkout -b release/next
```

### Step 2: Dry Run
Run a dry run to preview the version bump and changelog:
```
npx nx release --dry-run
```
Show the user what version will be generated and what packages will be affected. Ask for confirmation before proceeding.

### Step 3: Version & Changelog (local commit)
After user confirms:
```
npx nx release --skip-publish --yes
```
This command will:
- Build all packages
- Calculate the next version from conventional commits
- Update package.json files
- Generate/update CHANGELOG.md files
- Create a git commit and tag (locally)

### Step 4: Push branch and create Pull Request
```
git push origin release/next
```

Then create a PR. If `gh` CLI is authenticated:
```
gh pr create --title "chore(release): v<VERSION>" --body "Automated release" --base main
```
Otherwise, tell the user to create the PR manually on GitHub.

### Step 5: Merge and auto-publish
Once the PR is merged to `main`, the CI workflow (`.github/workflows/release.yml`) will automatically:
1. Detect the new commits
2. Run `nx release --skip-publish --yes` to tag the version
3. Push the tag back to the repo
4. Run `npx nx release publish` to publish all packages to npm

### Step 6: Verify
After CI completes:
- Run `npm view @dvirus-js/utils version` to confirm the new version is live
- Check https://github.com/Dvirus97/dvirus-js/releases for the GitHub release

### Alternative: Skip CI, publish locally
If the user wants to publish without waiting for CI (e.g., urgent fix), after the PR is merged:
```
git checkout main && git pull origin main
npx nx release publish
```

## Error Handling

### "Cannot publish over previously published version"
The version already exists on npm. This means:
1. The git tag is out of sync with npm — check `git tag` vs `npm view <pkg> versions --json`
2. Fix: Delete the stale local tag (`git tag -d <tag>`), then re-run the release
3. If the version was partially published, bump manually: `npx nx release version --specifier=patch`

### "npm ERR! 403 Forbidden"
Not authenticated or not authorized. Run `npm login` and ensure the user has publish access to the `@dvirus-js` scope.

### Build failures
Fix the build error first. The `preVersionCommand` in nx.json runs `npx nx run-many -t build` before versioning.

## Important Notes
- The `main` branch is **protected** — never push directly to it. Always use a branch + PR.
- The CI workflow (`.github/workflows/release.yml`) runs `nx release` when a PR is merged to main. It skips release commits (filtered by `chore(release)` prefix) to avoid loops.
- The CI needs a `GH_PAT` secret (Personal Access Token with `contents: write`) to push version commits/tags back to protected `main`.
- The CI also needs an `NPM_TOKEN` secret for npm publishing.
- Never manually edit version numbers in package.json — let Nx Release handle it.
