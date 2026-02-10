# Packaging TonX86 Extension

This document describes how to package the TonX86 VS Code extension as a VSIX file for local installation.

## Bundling with esbuild

The extension uses [esbuild](https://esbuild.github.io/) to bundle all TypeScript code into optimized JavaScript files. This approach:

- **Reduces extension size** by bundling dependencies
- **Improves load time** by shipping fewer files
- **Enables web compatibility** for platforms like github.dev and vscode.dev
- **Follows VS Code best practices** for extension development

### Build Output

- Extension: `packages/extension/dist/extension.js`
- Debug Adapter: `packages/debug-adapter/dist/debugAdapter.js`
- Language Server: `packages/language-server/dist/server.js`

## Prerequisites

The `@vscode/vsce` and `esbuild` packages are installed as dev dependencies. They will be installed automatically when you run `npm install` in the project root.

## Development Workflow

### Building for Development

```bash
# Build all packages (development mode with source maps)
npm run compile

# Watch mode (recommended for development)
npm run watch
```

Watch mode runs two processes in parallel:
- Type checking with `tsc --noEmit`
- Bundling with `esbuild --watch`

### Building for Production

```bash
# Build all packages (production mode, minified)
npm run build
```

## Creating a VSIX Package

To create a VSIX package for distribution:

```bash
npm run package
```

This command will:
1. Build all workspace packages (simcore, debug-adapter, language-server, extension)
2. Run type checks with TypeScript
3. Bundle code with esbuild in production mode (minified, no source maps)
4. Copy the debug adapter into the extension dist folder
5. Create a VSIX file at `packages/extension/tonx86-0.0.1.vsix`

## Installing the VSIX Locally

Once the VSIX is created, you can install it in VS Code:

### Option 1: Using VS Code UI
1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
3. Click the `...` menu at the top of the Extensions view
4. Select "Install from VSIX..."
5. Navigate to `packages/extension/tonx86-0.0.1.vsix` and select it

### Option 2: Using Command Line
```bash
code --install-extension packages/extension/tonx86-0.0.1.vsix
```

## Package Contents

The VSIX includes only the essential bundled files:

- **Bundled extension code** (`dist/extension.js`) - ~13KB
- **Bundled debug adapter** (`dist/debugAdapter.js`) - ~47KB  
- **Syntax highlighting** (`syntaxes/tonx86.tmLanguage.json`)
- **Language configuration** (`language-configuration.json`)
- **LICENSE** file
- **package.json** manifest

**Total size:** ~22KB (compressed)

### What's Excluded

Source files and development artifacts are excluded via `.vscodeignore`:
- TypeScript source files (`src/**`)
- Build scripts (`esbuild.js`, `copy-debug-adapter.js`)
- Configuration files (`tsconfig.json`, `.eslintrc.json`)
- Node modules (bundled into dist files)
- Source maps (only in production builds)

## Troubleshooting

### Type Errors

If you encounter TypeScript errors during build:
```bash
npm run check-types
```

This will show type errors without attempting to build.

### Extension Not Loading

If the extension doesn't work after installation:
1. Ensure all packages were built successfully (`npm run build`)
2. Check that the debug adapter files were copied correctly
3. Verify VS Code version compatibility (requires ^1.84.0)
4. Check the VS Code Developer Tools console for errors (Help → Toggle Developer Tools)

### Bundle Size Issues

To analyze what's included in the bundle:
```bash
cd packages/extension
npx vsce ls --tree
```

This shows all files that will be included in the VSIX.

## CI/CD Integration

The GitHub Actions workflow automatically builds and packages the extension when the version in `package.json` changes. The workflow:

1. Detects version changes
2. Runs `npm run package`
3. Creates a GitHub release with the VSIX attached
4. Publishes to VS Code Marketplace (if secrets are configured)

## Further Reading

- [VS Code Extension Bundling Guide](https://code.visualstudio.com/api/working-with-extensions/bundling-extension)
- [esbuild Documentation](https://esbuild.github.io/)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
