# Version Management

Automated version management using [standard-version](https://github.com/conventional-changelog/standard-version) and [Conventional Commits](https://www.conventionalcommits.org/).

## Overview

Versions are automatically determined from commit messages and kept in sync across both `package.json` files (root and extension).

## Quick Start

### Creating a Release

```bash
# 1. Ensure you're on main and up-to-date
git checkout main && git pull

# 2. Run release (auto-determines version from commits)
npm run release

# 3. Push with tags
git push --follow-tags
```

GitHub Actions automatically builds, packages, and publishes the extension.

### Common Commands

| Command | Description |
|---------|-------------|
| `npm run release` | Auto-detect version bump from commits |
| `npm run release:patch` | Force patch version (0.0.X) |
| `npm run release:minor` | Force minor version (0.X.0) |
| `npm run release:major` | Force major version (X.0.0) |
| `npm run release:first` | First release (no bump) |
| `npx standard-version --dry-run` | Preview changes |

## Conventional Commits

### Commit Format

```
<type>[scope]: <description>

[optional body]

[optional footer]
```

### Version Bump Rules

| Commit Type | Example | Version Bump |
|-------------|---------|--------------|
| `fix:` | `fix: crash on startup` | Patch (0.0.X) |
| `feat:` | `feat: add keyboard support` | Minor (0.X.0) |
| `feat!:` or `BREAKING CHANGE:` | `feat!: redesign API` | Major (X.0.0) |
| `docs:`, `chore:`, `style:`, etc. | `docs: update README` | No bump |

### Commit Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code formatting
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `test:` - Test updates
- `build:` - Build system changes
- `ci:` - CI configuration changes
- `chore:` - Other changes

### Examples

```bash
# Minor bump
git commit -m "feat: add LCD color support"

# Patch bump
git commit -m "fix: resolve memory leak"

# Major bump (breaking change)
git commit -m "feat!: redesign extension API"

# Major bump (alternative syntax)
git commit -m "feat: change config format

BREAKING CHANGE: Config file format has changed."

# No bump
git commit -m "docs: update installation guide"
```

## CI/CD Flow

```
1. Commit with conventional format
   ↓
2. npm run release
   ├─ Analyzes commits
   ├─ Determines version bump
   ├─ Updates package.json files
   ├─ Updates CHANGELOG.md
   └─ Creates git tag
   ↓
3. git push --follow-tags
   ↓
4. GitHub Actions
   ├─ Builds extension
   ├─ Creates GitHub Release
   ├─ Uploads VSIX
   └─ Publishes to marketplace
```

## Troubleshooting

### No commits to bump
**Cause:** No `feat:` or `fix:` commits since last release  
**Solution:** Use `npm run release:patch` to force a version bump

### Wrong version bump
**Cause:** Incorrect automated detection  
**Solution:**
```bash
git reset --soft HEAD~1  # Undo release commit
npm run release:major    # Force correct version
```

### Tag already exists
**Cause:** Re-creating an existing release  
**Solution:**
```bash
git tag -d v0.1.10                    # Delete local tag
git push origin :refs/tags/v0.1.10   # Delete remote tag
npm run release                       # Create new release
```

### Preview changes
**Cause:** Want to see what will happen  
**Solution:** `npx standard-version --dry-run`

## Configuration

Version management is configured in `.versionrc.json`:
- Tracks both root and extension `package.json`
- Configures changelog sections
- Sets commit message format
- Defines GitHub URLs
