# Version Management

This document explains how to manage versions for the TonX86 VS Code extension.

## Version Structure

The project has two `package.json` files with versions:

1. **Root `package.json`** - Project version (currently used for Git tags and releases)
2. **Extension `packages/extension/package.json`** - VS Code extension version (published to marketplace)

These versions are kept in sync automatically using `standard-version`.

## Automatic Version Bumping

The project uses **[standard-version](https://github.com/conventional-changelog/standard-version)** to automatically determine version bumps based on your commit messages.

### Conventional Commits

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `fix:` - Bug fixes → **PATCH** version bump (0.0.X)
- `feat:` - New features → **MINOR** version bump (0.X.0)
- `BREAKING CHANGE:` or `!` - Breaking changes → **MAJOR** version bump (X.0.0)

**Examples:**

```bash
git commit -m "fix: resolve debug adapter crash on startup"
git commit -m "feat: add keyboard input support for simulator"
git commit -m "feat!: change extension API (BREAKING CHANGE)"
```

### Creating a Release

After committing your changes with conventional commit messages:

```bash
# Automatic version bump based on commits since last tag
npm run release
```

This will automatically:
1. ✅ Analyze commits since the last release
2. ✅ Determine the appropriate version bump (patch/minor/major)
3. ✅ Update version in both root and extension package.json
4. ✅ Generate/update CHANGELOG.md
5. ✅ Create a Git commit and tag
6. ✅ You just need to push: `git push --follow-tags`

### Manual Version Control

If you need to force a specific version bump:

```bash
# Force a patch release (0.1.10 → 0.1.11)
npm run release:patch

# Force a minor release (0.1.10 → 0.2.0)
npm run release:minor

# Force a major release (0.1.10 → 1.0.0)
npm run release:major

# First release (creates v0.1.0 without bumping)
npm run release:first
```

## Complete Workflow Example

```bash
# 1. Create a feature branch
git checkout -b feature/new-lcd-display

# 2. Make your changes
# ... edit files ...

# 3. Commit with conventional commit format
git add .
git commit -m "feat: add color LCD display support"
git commit -m "fix: resolve LCD refresh rate issue"

# 4. Push and create PR
git push -u origin feature/new-lcd-display

# 5. After PR is merged to main, create a release
git checkout main
git pull
npm run release

# 6. Push the release
git push --follow-tags
```

The GitHub Actions workflow will automatically:
- Build the extension
- Create a GitHub release with the VSIX
- Publish to VS Code Marketplace

## Version Bump Rules

`standard-version` follows these rules:

| Commit Type | Example | Version Bump |
|-------------|---------|--------------|
| `fix:` | `fix: button not working` | Patch (0.0.1) |
| `feat:` | `feat: add new command` | Minor (0.1.0) |
| `BREAKING CHANGE:` or `!` | `feat!: change API` | Major (1.0.0) |
| `chore:`, `docs:`, etc. | `docs: update README` | No bump |

Multiple commits are combined:
- `fix:` + `fix:` = Patch bump
- `fix:` + `feat:` = Minor bump
- Any `BREAKING CHANGE` = Major bump

## Changelog

`standard-version` automatically generates a `CHANGELOG.md` file with:
- Grouped changes by type (Features, Bug Fixes, etc.)
- Links to commits and PRs
- Contributor information

The changelog is updated with each release.

## Automatic CI/CD Flow

The updated workflow now works seamlessly with `standard-version`:

### Complete Flow

```
1. Developer commits with conventional format
   ↓
2. Run: npm run release
   ├─ Analyzes commits
   ├─ Bumps version in both package.json files
   ├─ Updates CHANGELOG.md
   ├─ Creates git commit
   └─ Creates git tag (v0.2.0)
   ↓
3. Push: git push --follow-tags
   ↓
4. GitHub Actions detects tag push
   ├─ Extracts version from tag
   ├─ Extracts changelog for this version
   ├─ Builds and packages extension
   ├─ Creates GitHub Release with VSIX
   │  └─ Uses CHANGELOG content as release notes
   └─ Publishes to VS Code Marketplace
```

### Workflow Trigger

The workflow now triggers on **tag pushes** (not package.json changes):

```yaml
on:
  push:
    tags:
      - 'v*'
```

This means:
- ✅ Tag is created by `standard-version` (single source of truth)
- ✅ No duplicate tags or conflicts
- ✅ CHANGELOG is included in the release
- ✅ Version is consistent across all files

### What Changed

**Before:**
- Workflow triggered on package.json changes
- Manually created tags in the workflow
- Generated release notes automatically
- Could create duplicate tags

**After:**
- Workflow triggers on tag push (created by standard-version)
- Uses existing tag from standard-version
- Uses CHANGELOG content for release notes
- Single source of truth for versions and tags

## Commit Message Guidelines

Follow these guidelines for your commits:

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation only changes
- `style:` - Code style changes (formatting, missing semi colons, etc)
- `refactor:` - Code refactoring (neither fixes a bug nor adds a feature)
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `build:` - Changes to build system or dependencies
- `ci:` - Changes to CI configuration files and scripts
- `chore:` - Other changes that don't modify src or test files

### Examples

```bash
# New feature (minor version bump)
git commit -m "feat: add LCD color support"

# Bug fix (patch version bump)
git commit -m "fix: resolve memory leak in simulator"

# Breaking change (major version bump)
git commit -m "feat!: redesign extension API

BREAKING CHANGE: The old API methods have been removed."

# No version bump
git commit -m "docs: update installation guide"
git commit -m "chore: update dependencies"
```

## Troubleshooting

### Versions Out of Sync

If the root and extension versions somehow get out of sync, you can manually edit and commit:

```bash
# Manually edit packages/extension/package.json to match root
git add packages/extension/package.json
git commit -m "chore: sync extension version"
```

Or run `standard-version` which will sync them on the next release.

### No Commits to Bump

If you run `npm run release` and get "No commits to bump version":

This means there are no commits with `feat:` or `fix:` since the last release. Either:
1. Add commits with conventional prefixes
2. Force a specific version: `npm run release:patch`

### Wrong Version Bump

If standard-version chose the wrong version:

```bash
# Undo the release commit (keep your changes)
git reset --soft HEAD~1

# Force the correct version
npm run release:major  # or :minor or :patch
```

### Tag Already Exists

If you need to re-create a release:

```bash
# Delete local tag
git tag -d v0.1.10

# Delete remote tag (if pushed)
git push origin :refs/tags/v0.1.10

# Create new release
npm run release
```

### Skipping CI/CD

If you want to release without triggering CI:

```bash
npm run release
git push --follow-tags --no-verify
```

### Dry Run

To see what would happen without making changes:

```bash
npx standard-version --dry-run
```

## Configuration

Version management is configured in `.versionrc.json`:

- Tracks both root and extension package.json
- Configures changelog sections
- Sets commit message format
- Defines GitHub URLs for links

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run release` | Automatic version bump based on commits |
| `npm run release:patch` | Force patch version (0.0.X) |
| `npm run release:minor` | Force minor version (0.X.0) |

**Note:** Version syncing between root and extension package.json is handled automatically by `standard-version` via `.versionrc.json` configuration.
| `npm run sync-version` | Sync version from root to extension |
| `node scripts/get-version.js` | Get current extension version |

## Benefits of Automatic Versioning

✅ **Consistency** - Version bumps follow Semantic Versioning automatically
✅ **Changelog** - Automatically generated from commit messages
✅ **No Manual Decisions** - The version bump is determined by your commits
✅ **Synchronized** - Both package.json files are updated together
✅ **Traceable** - Clear connection between commits and releases
✅ **Less Errors** - No manual version editing required

## Quick Reference

### Daily Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit (use conventional commits!)
git add .
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"

# 3. Push and create PR
git push -u origin feature/my-feature
# Create PR on GitHub, get it reviewed and merged
```

### Creating a Release (on main branch)

```bash
# 1. Make sure you're on main and up to date
git checkout main
git pull

# 2. Run automatic release (analyzes commits and bumps version)
npm run release

# 3. Push the release (includes tag)
git push --follow-tags

# 4. GitHub Actions automatically:
#    ✓ Builds extension
#    ✓ Creates GitHub Release
#    ✓ Uploads VSIX file
#    ✓ Publishes to marketplace
```

### Common Commands

```bash
# Automatic version (recommended)
npm run release

# Force specific version
npm run release:patch   # 0.1.10 → 0.1.11
npm run release:minor   # 0.1.10 → 0.2.0
npm run release:major   # 0.1.10 → 1.0.0

# Preview what would happen
npx standard-version --dry-run

# First release (no bump)
npm run release:first
```

### Commit Message Templates

```bash
# Features (minor bump)
git commit -m "feat: add keyboard input support"
git commit -m "feat(lcd): add color display mode"

# Bug fixes (patch bump)
git commit -m "fix: resolve crash on startup"
git commit -m "fix(debugger): handle null pointer exception"

# Breaking changes (major bump)
git commit -m "feat!: redesign extension API"
git commit -m "feat: change config format

BREAKING CHANGE: Config file format has changed."

# No version bump
git commit -m "docs: update README"
git commit -m "chore: update dependencies"
git commit -m "style: format code"
```
