# Version Management

This document explains how to manage versions for the TonX86 VS Code extension.

## Version Structure

The project has two `package.json` files with versions:

1. **Root `package.json`** - Project version (currently used for Git tags and releases)
2. **Extension `packages/extension/package.json`** - VS Code extension version (published to marketplace)

These versions are kept in sync automatically.

## Bumping Versions

Use the provided npm scripts to bump versions correctly:

### Patch Version (0.0.X)

For bug fixes and minor changes:

```bash
npm run version:patch
```

This will:
- Bump version from `0.1.10` → `0.1.11`
- Sync the version to extension package.json
- Create a Git commit and tag
- Push changes (you'll need to push manually)

### Minor Version (0.X.0)

For new features:

```bash
npm run version:minor
```

This will:
- Bump version from `0.1.10` → `0.2.0`
- Sync the version to extension package.json
- Create a Git commit and tag

### Major Version (X.0.0)

For breaking changes:

```bash
npm run version:major
```

This will:
- Bump version from `0.1.10` → `1.0.0`
- Sync the version to extension package.json
- Create a Git commit and tag

## After Bumping Version

After running any version bump command:

```bash
# Push the commit and tags
git push && git push --tags
```

This will trigger the GitHub Actions workflow to:
1. Build the extension
2. Create a GitHub release
3. Publish to VS Code Marketplace (if configured)

## Manual Version Sync

If you need to manually sync the extension version to match the root version:

```bash
npm run sync-version
```

This reads the version from root `package.json` and updates `packages/extension/package.json`.

## Automatic CI/CD Flow

The GitHub Actions workflow (`release-on-version-change.yml`) automatically:

1. Detects when `package.json` version changes
2. Syncs version to extension package.json
3. Checks if the version tag already exists
4. If new, creates a release with the VSIX file
5. Publishes to VS Code Marketplace

## Version Conventions

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version: Incompatible API changes
- **MINOR** version: Backwards-compatible new features  
- **PATCH** version: Backwards-compatible bug fixes

### Example Workflow

```bash
# 1. Make your changes
git add .
git commit -m "feat: Add new feature"

# 2. Bump version appropriately
npm run version:minor

# 3. Push to trigger release
git push && git push --tags

# 4. GitHub Actions will automatically:
#    - Build and package the extension
#    - Create a GitHub release
#    - Publish to marketplace
```

## Troubleshooting

### Versions Out of Sync

If the root and extension versions get out of sync:

```bash
npm run sync-version
git add packages/extension/package.json
git commit -m "chore: Sync extension version"
```

### Tag Already Exists

If you need to re-tag a version:

```bash
# Delete local tag
git tag -d v0.1.10

# Delete remote tag
git push origin :refs/tags/v0.1.10

# Create new tag
npm run version:patch
git push --tags
```

### Failed Release

If a GitHub Actions release fails:

1. Check the Actions tab for error details
2. Fix any issues
3. Delete the failed tag (see above)
4. Bump version again or re-tag manually

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run sync-version` | Sync version from root to extension |
| `npm run version:patch` | Bump patch version (0.0.X) |
| `npm run version:minor` | Bump minor version (0.X.0) |
| `npm run version:major` | Bump major version (X.0.0) |
| `node scripts/get-version.js` | Get current extension version |
