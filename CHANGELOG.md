# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.3.0](https://github.com/Toniboy1/TonX86/compare/v0.1.9...v0.3.0) (2026-02-10)


### ⚠ BREAKING CHANGES

* Output directory changed from 'out' to 'dist'

* docs: Update packaging documentation for esbuild workflow

* feat: Add automatic version management and sync scripts

- Create sync-version.js to sync root version to extension
- Create get-version.js to get current extension version
- Add npm scripts for version bumping (patch/minor/major)
- Update workflow to auto-sync versions before release
- Add comprehensive VERSION.md documentation
- Sync extension version to 0.1.10 to match root

This enables automatic version management:
- Run 'npm run version:patch' to bump patch version
- Run 'npm run version:minor' to bump minor version
- Run 'npm run version:major' to bump major version
- Versions are automatically synced and tagged
- CI/CD triggers automatically on version changes

* feat: Replace manual versioning with automatic standard-version

- Install standard-version for automatic version bumping
- Create .versionrc.json configuration for monorepo setup
- Update package.json scripts to use 'npm run release'
- Automatically bump versions based on conventional commits
- Auto-generate CHANGELOG.md from commit messages
- Update VERSION.md with comprehensive documentation

Breaking: This replaces the manual version:patch/minor/major commands
with automatic version detection based on conventional commits.

Use 'npm run release' to automatically determine and apply version bumps.

* fix: Update workflow to properly integrate with standard-version

- Change trigger from package.json changes to tag pushes
- Remove manual tag creation (standard-version handles this)
- Extract changelog content for release notes
- Use version from tag instead of package.json
- Add conditional marketplace publishing
- Update VERSION.md with complete workflow documentation
- Add quick reference guide for daily usage

This fixes the workflow to work seamlessly with automatic versioning:
- No duplicate tags
- Changelog included in releases
- Single source of truth for versions

* chore: Remove unused version sync scripts

- Remove sync-version.js (handled by standard-version bumpFiles)
- Remove get-version.js (no longer needed)
- Remove sync-version npm script
- Update VERSION.md to remove manual sync references

standard-version automatically syncs both package.json files via
.versionrc.json bumpFiles configuration, making these scripts redundant.

* chore(release): 0.2.0

### Bug Fixes

* Update release workflow to use npm run package ([d58447a](https://github.com/Toniboy1/TonX86/commit/d58447acd1e153b08c596669fa81eb9616926a1e))


* Feature/bundle with esbuild (#42) ([428c395](https://github.com/Toniboy1/TonX86/commit/428c395785c2998fff68404343d78eb7cd9d350a)), closes [#42](https://github.com/Toniboy1/TonX86/issues/42)


### Documentation

* update VERSION.md to reflect workflow changes ([a839b97](https://github.com/Toniboy1/TonX86/commit/a839b9789db5325b34bfa491c6ee9dea2cdce3ab))

## [0.2.0](https://github.com/Toniboy1/TonX86/compare/v0.1.9...v0.2.0) (2026-02-10)


### ⚠ BREAKING CHANGES

* Output directory changed from 'out' to 'dist'

### Features

* Add automatic version management and sync scripts ([298c792](https://github.com/Toniboy1/TonX86/commit/298c792cdc15e874a5c0557c0cd7cd44083b36ee))
* Implement esbuild bundling for extension ([e065ef2](https://github.com/Toniboy1/TonX86/commit/e065ef285f3a4c25f2a5a0fe0680ad82bf274158))
* Replace manual versioning with automatic standard-version ([3b4d228](https://github.com/Toniboy1/TonX86/commit/3b4d22848fcf61055bc2c13866bd61a79ec8b2d4))


### Bug Fixes

* Update release workflow to use npm run package ([d58447a](https://github.com/Toniboy1/TonX86/commit/d58447acd1e153b08c596669fa81eb9616926a1e))
* Update workflow to properly integrate with standard-version ([9514c40](https://github.com/Toniboy1/TonX86/commit/9514c407a5dbcd9ddf8842d8a2bb5d60743509da))


### Documentation

* Update packaging documentation for esbuild workflow ([b6ff442](https://github.com/Toniboy1/TonX86/commit/b6ff44228a74cefde299435c6f770e3cb61aa0df))
