# TonX86 Development Guide

## Testing the Extension in VS Code

### Quick Start

1. **Build the extension:**
   ```bash
   npm run build
   ```

2. **In VS Code, open the TonX86 folder and press `F5`**
   
   This will:
   - Launch the Extension Development Host (a new VS Code window)
   - Load the TonX86 extension
   - Allow you to test all commands and features

### Available Launch Configurations

In `.vscode/launch.json`:

- **Run Extension** - Launches Extension Development Host with the extension loaded
- **Run Tests** - Runs extension tests (when you add tests)

### Development Workflow

#### Option 1: Build Once, Then Run
```bash
npm run build    # Compile all packages
# Press F5 in VS Code to launch Extension Development Host
```

#### Option 2: Watch Mode (Recommended)
```bash
npm run dev      # Watch all files for changes
# In another terminal or VS Code integrated terminal:
# Press F5 to launch Extension Development Host
```

The Extension Development Host will auto-reload when files change.

### Testing Commands

Once the extension is running in the Extension Development Host:

1. **Press `Ctrl+Shift+P` to open Command Palette**

2. **Look for TonX86 commands:**
   - `TonX86: Run` - Execute program
   - `TonX86: Pause` - Pause execution
   - `TonX86: Step Over` - Execute one instruction
   - `TonX86: Step In` - Step into calls
   - `TonX86: Step Out` - Step out of calls
   - `TonX86: Reset` - Reset CPU state

### Debugging the Extension

1. **Set breakpoints** in TypeScript source files (VS Code will use source maps)
2. **Open Debug Console** (Ctrl+Shift+Y)
3. **Inspect variables** and execution flow

### Running Tests

```bash
npm test
# Or press F5 and select "Run Tests" configuration
```

### Linting

```bash
npm run lint
# Check code quality
```

### Project Structure During Development

- `packages/extension/src/` - Extension source code
- `packages/extension/out/` - Compiled JavaScript (generated)
- `packages/debug-adapter/src/` - Debug protocol implementation
- `packages/language-server/src/` - Language support
- `packages/simcore/src/` - CPU simulator
- `.vscode/launch.json` - Extension launch configuration
- `.vscode/tasks.json` - Build and watch tasks

### Troubleshooting

**Extension doesn't load:**
- Check that `npm run build` completed successfully
- Verify `packages/extension/out/extension.js` exists
- Check VS Code output channel for errors

**Changes not reflected:**
- Make sure you're running `npm run watch` or `npm run build`
- Reload the Extension Development Host (Ctrl+R in the dev window)

**TypeScript errors:**
- Run `npm run build` to see compile errors
- Check that all imports are correct
- Verify `tsconfig.json` settings

### Key Files

- [VS Code Extension API Docs](https://code.visualstudio.com/api)
- `package.json` - Extension manifest
- `extension.ts` - Main extension code
- `debugAdapter.ts` - Debug protocol handler
- `simulator.ts` - CPU emulation logic

### Next Steps

1. **Test the current extension setup**
2. **Add real command implementations** in `extension.ts`
3. **Connect to simulator core** for execution
4. **Implement UI panels** for registers/memory
5. **Add debugger integration** via DAP

---

**Happy developing! 🚀**
