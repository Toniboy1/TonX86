# Packaging TonX86 Extension

Guide for packaging the TonX86 VS Code extension as a VSIX file.

## Overview

The extension uses [esbuild](https://esbuild.github.io/) to bundle TypeScript code into optimized JavaScript:

- ✅ Reduces extension size by bundling dependencies
- ✅ Improves load time with fewer files
- ✅ Enables web compatibility (github.dev, vscode.dev)
- ✅ Follows VS Code best practices

### Build Output

- Extension: `packages/extension/dist/extension.js`
- Debug Adapter: `packages/debug-adapter/dist/debugAdapter.js`
- Language Server: `packages/language-server/dist/server.js`

## Quick Start

### Create VSIX Package

```bash
npm run package
```

This command:

1. Builds all workspace packages (simcore, debug-adapter, language-server, extension)
2. Runs type checks with TypeScript
3. Bundles code with esbuild (production mode, minified)
4. Copies debug adapter into extension dist folder
5. Creates VSIX at `packages/extension/tonx86-<version>.vsix`

### Install VSIX Locally

**Option 1: VS Code UI**

1. Open Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
2. Click `...` menu → "Install from VSIX..."
3. Select `packages/extension/tonx86-<version>.vsix`

**Option 2: Command Line**

```bash
code --install-extension packages/extension/tonx86-<version>.vsix
```

## Development Workflow

### Building

```bash
# Development build (with source maps)
npm run compile

# Production build (minified)
npm run build

# Watch mode (recommended for development)
npm run watch
```

Watch mode runs parallel processes:

- Type checking: `tsc --noEmit`
- Bundling: `esbuild --watch`

## Package Contents

**Included (~22KB compressed):**

- Bundled extension code (`dist/extension.js`) - ~13KB
- Bundled debug adapter (`dist/debugAdapter.js`) - ~47KB
- Syntax highlighting (`syntaxes/tonx86.tmLanguage.json`)
- Language configuration (`language-configuration.json`)
- LICENSE and package.json

**Excluded (via `.vscodeignore`):**

- TypeScript source files (`src/**`)
- Build scripts (`*.js` build configs)
- Configuration files (`tsconfig.json`, `.eslintrc.json`)
- Node modules (bundled into dist)
- Source maps (production only)

## Troubleshooting

### Type Errors

```bash
npm run check-types  # Show type errors without building
```

### Extension Not Loading

1. Verify successful build: `npm run build`
2. Check debug adapter files were copied
3. Verify VS Code compatibility (requires ^1.84.0)
4. Check Developer Tools console (Help → Toggle Developer Tools)

### Analyze Bundle Contents

```bash
cd packages/extension
npx vsce ls --tree
```

## CI/CD Integration

GitHub Actions automatically builds and packages the extension on version tag pushes:

1. Detects tag push (e.g., `v0.3.0`)
2. Runs `npm run package`
3. Creates GitHub release with VSIX attached
4. Publishes to VS Code Marketplace (if VSCE_PAT secret configured)

See [.github/workflows/release.yml](.github/workflows/release.yml) for details.

## Resources

- [VS Code Extension Bundling Guide](https://code.visualstudio.com/api/working-with-extensions/bundling-extension)
- [esbuild Documentation](https://esbuild.github.io/)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
