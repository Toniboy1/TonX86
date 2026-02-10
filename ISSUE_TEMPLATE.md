# Feature: Add Local VSIX Packaging Support

## Description
Enable developers to generate VSIX packages locally for testing and distribution without publishing to the marketplace.

## Current Situation
Currently, there's no easy way to package the TonX86 extension for local testing/installation. Developers need to manually set up the packaging tooling and configuration.

## Proposed Solution
Add support for local VSIX generation with:
- `npm run package` command at the root level
- Automated build and bundling of all required components
- Proper configuration to exclude source files and include only distribution files
- Documentation on how to package and install the extension locally

## Implementation
The solution includes:
1. Installing `@vscode/vsce` as a development dependency
2. Adding a `package` script that builds all packages and creates the VSIX
3. Configuring `.vscodeignore` to properly include/exclude files
4. Bundling the debug adapter within the extension
5. Adding comprehensive documentation in `PACKAGING.md`

## Benefits
- Easier testing of extension changes before publishing
- Simplified distribution for internal/beta testing
- Developer-friendly workflow for local extension development

## Technical Details
- VSIX file size: ~16KB (includes extension, debug adapter, syntax highlighting)
- Uses `--no-dependencies` to prevent workspace dependency issues
- Pre-package script copies debug adapter into extension directory
- Compatible with VS Code ^1.84.0

## Testing Steps
1. Run `npm run package` from project root
2. Verify VSIX is created at `packages/extension/tonx86-0.0.1.vsix`
3. Install using `code --install-extension packages/extension/tonx86-0.0.1.vsix`
4. Test extension functionality in VS Code

## Related PR
See PR #[number] for implementation details.
