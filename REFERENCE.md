# TonX86 Extension Reference

This document provides a comprehensive listing of all commands, settings, views, and features for documentation purposes.

## Commands

### Debug Control Commands

| Command ID | Title | Category | Icon | Description |
|---|---|---|---|---|
| `tonx86.assemble` | TonX86: Assemble | TonX86 | `$(symbol-class)` | Assemble source code |
| `tonx86.run` | TonX86: Run | TonX86 | `$(debug-start)` | Start execution |
| `tonx86.pause` | TonX86: Pause | TonX86 | `$(debug-pause)` | Pause execution |
| `tonx86.stepOver` | TonX86: Step Over | TonX86 | `$(debug-step-over)` | Step over current instruction |
| `tonx86.stepIn` | TonX86: Step In | TonX86 | `$(debug-step-in)` | Step into function |
| `tonx86.stepOut` | TonX86: Step Out | TonX86 | `$(debug-step-out)` | Step out of function |
| `tonx86.reset` | TonX86: Reset | TonX86 | `$(debug-disconnect)` | Reset execution state |

### LCD Display Commands

| Command ID | Title | Category | Icon | Description |
|---|---|---|---|---|
| `tonx86.lcdPopOut` | TonX86: Pop Out LCD Display | TonX86 | `$(open-preview)` | Open LCD display in separate panel |
| `tonx86.lcdPopIn` | TonX86: Pop In LCD Display | TonX86 | `$(close)` | Close popped-out LCD panel |

## Configuration Settings

### LCD Display Configuration (`tonx86.lcd.*`)

| Setting | Type | Default | Min/Max | Description |
|---|---|---|---|---|
| `tonx86.lcd.enabled` | boolean | `true` | - | Enable/disable LCD display view in the debug explorer |
| `tonx86.lcd.width` | integer | `16` | 2-256 | LCD display width in pixels |
| `tonx86.lcd.height` | integer | `16` | 2-256 | LCD display height in pixels |

**Validation Rules:**
- Width must be integer between 2 and 256 (inclusive)
- Height must be integer between 2 and 256 (inclusive)
- Invalid values reset to default (16)
- Warnings logged to console for invalid configurations
- Settings apply on extension reload or debug session restart

## Views & Panels

### Explorer View Container

**ID:** `tonx86-explorer`  
**Title:** TonX86  
**Icon:** `$(bracket)`  
**Location:** Activity Bar

#### Tree Views

| View ID | Name | Type | Description |
|---|---|---|---|
| `tonx86.registers` | Registers | Tree | Display CPU register state (EAX, ECX, EDX, EBX, ESP, EBP, ESI, EDI) |
| `tonx86.memoryA` | Memory A | Tree | Display first memory bank (16 bytes configurable) |
| `tonx86.memoryB` | Memory B | Tree | Display second memory bank (16 bytes configurable) |

#### Webview Views

| View ID | Name | Type | Description |
|---|---|---|---|
| `tonx86.lcd` | LCD Display | Webview | Configurable LCD display (2x2 to 256x256 pixels) with pop out/pop in support |
| `tonx86.docs` | ISA Docs | Webview | ISA instruction reference documentation |

### Webview Panels

| Panel Type ID | Title | Description |
|---|---|---|
| `tonx86.lcd.panel` | TonX86 LCD Display | Popped-out LCD display panel (opened via `tonx86.lcdPopOut` command) |

## Features

### Register Display
- Shows 8 CPU registers: EAX, ECX, EDX, EBX, ESP, EBP, ESI, EDI
- Displays register values in hexadecimal format (8 digits, zero-padded)
- Updateable via `updateRegisters(values: number[])` method
- Updates trigger tree view refresh via EventEmitter

### Memory Views
- Two independent memory view banks (Memory A, Memory B)
- Default: 16 bytes per view
- Configurable address range and length
- Displays memory in address:value pairs (hex format)
- Updateable via `updateMemory(data: Uint8Array)` method

### LCD Display
- Configurable dimensions (2x2 to 256x256 pixels)
- Dynamic pixel sizing based on viewport and configuration
- HTML5 canvas-based rendering with CSS grid
- Pop out functionality to separate WebviewPanel for large displays
- Configuration change monitoring with user notifications
- Can be toggled enabled/disabled

### ISA Documentation View
- Displays CPU instruction reference
- Current instructions: MOV, ADD, SUB, AND, OR, JMP, JZ, HLT
- Shows instruction description and cycle count
- Styled for readability

## Debug Adapter Integration

### Debug Type
- **Type ID:** `tonx86`
- **Configuration Type:** `tonx86` (to be configured in launch.json)

### Breakpoints
- Supported language: `asm` (assembly)
- Configurable via debug configuration

## File Structure

```
packages/extension/
├── package.json              # Extension manifest with commands, settings, views
├── tsconfig.json
└── src/
    └── extension.ts          # Main extension implementation
```

## Interfaces & Types

### `LCDConfig`
```typescript
interface LCDConfig {
  enabled: boolean;    // Whether LCD display is active
  width: number;       // Width in pixels (2-256)
  height: number;      // Height in pixels (2-256)
}
```

### `RegisterItem`
```typescript
interface RegisterItem {
  name: string;        // Register name (EAX, ECX, etc.)
  value: number;       // Register value
}
```

### `MemoryRange`
```typescript
interface MemoryRange {
  address: string;     // Memory address (hex format)
  value: string;       // Memory value (hex format)
}
```

## Extension Activation

- **Activation Event:** `*` (activates on all events)
- **Main Entry Point:** `out/extension.js` (compiled from `src/extension.ts`)
- **Required VS Code Version:** `^1.84.0`

## Notes for Documentation

- Commands are accessible via Command Palette (`Ctrl+Shift+P`)
- Settings can be modified in VS Code Settings UI or `settings.json`
- Views appear in the TonX86 explorer sidebar on activation
- Configuration changes are monitored and trigger appropriate updates
- All dimensions and values support zero-padding and formatting for clarity
- Extension is non-blocking on the UI thread
