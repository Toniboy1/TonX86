# TonX86 Project Structure

A monorepo with the following packages:

## Packages

### `/packages/extension`
VS Code Extension UI and command implementations

### `/packages/debug-adapter`
Debug Adapter Protocol (DAP) server for breakpoints, stepping, and execution control

### `/packages/language-server`
Language Server Protocol (LSP) for assembly syntax support and diagnostics

### `/packages/simcore`
Simulator core with CPU emulation, memory management, and LCD display

### `/packages/docs`
ISA documentation and instruction reference

## Getting Started

```bash
npm install
npm run build
```

## Development

```bash
npm run watch    # Watch mode for development
npm run lint     # Run linter
npm run test     # Run tests
```

## Architecture

```
Extension (UI) ←→ Debug Adapter (DAP)
                      ↓
                  Simulator Core
                      ↑
Language Server ← Documentation
```

The extension provides the user interface, the debug adapter handles execution control and debugging, the language server provides code intelligence, and the simulator core executes x86-like assembly programs with memory banks and LCD display support.
