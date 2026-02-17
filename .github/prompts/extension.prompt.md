# TonX86 — EXTENSION PROMPT

VS Code extension UI for TonX86 assembly debugging.

## Components

- **Debug Type**: `tonx86` with DAP integration
- **Commands**: Assemble, Run, Pause, Step (Over/In/Out), Reset, LCD Pop-out/Pop-in
- **Tree Views**: Registers (EAX-EDI + 8-bit), Memory A, Memory B
- **Webviews**: LCD Display (canvas-based, up to 64x64), ISA Docs
- **Keyboard Capture**: LCD webview captures keydown/keyup events
- **Output Panel**: Mirrors Debug Console to VS Code Output (TonX86)

## Settings (tonx86.\*)

### LCD Display

- `lcd.enabled` (boolean, default: true) - Enable LCD display
- `lcd.width` (integer, 2-256, default: 16) - LCD width in pixels
- `lcd.height` (integer, 2-256, default: 16) - LCD height in pixels
- `lcd.pixelSize` (number, default: 5) - Pixel size in pixels (1-50)

### Keyboard

- `keyboard.enabled` (boolean, default: true) - Enable keyboard capture

### CPU

- `cpu.speed` (number, 1-200, default: 100) - Execution speed percentage

### Assembly

- `assembly.autoAssemble` (boolean, default: true) - Auto-assemble on save
- `assembly.showDiagnostics` (boolean, default: true) - Show diagnostics

### Compatibility

- `compatibility.mode` (string, default: "educational") - Mode: "educational" or "strict-x86"

### Debug

- `debug.stopOnEntry` (boolean, default: true) - Stop at first instruction when debugging starts
- `debug.enableLogging` (boolean, default: false) - Enable debug adapter logging to file

## Launch Configuration

```json
{
  "type": "tonx86",
  "request": "launch",
  "program": "${workspaceFolder}/${fileBasename}"
}
```

Note: All debug settings (cpuSpeed, stopOnEntry, enableLogging) are now configured via extension settings and automatically applied to all debug sessions.

## Communication

- **LCD Updates**: Poll debug adapter via `customRequest("getLCDState")` every 50ms
- **Keyboard Events**: Forward via `customRequest("keyboardEvent", {keyCode, pressed})`
- **Register/Memory**: Update on `StoppedEvent` from debug adapter
- **Output Panel**: Listens to debug console and mirrors to Output channel

## Key Mappings

Letters (A-Z=65-90, a-z=97-122), Numbers (0-9=48-57), Arrows (Up=128, Down=129, Left=130, Right=131), Special keys (Space=32, Enter=13, Esc=27, Tab=9, Backspace=8)

## Memory-Mapped I/O Addresses

- **LCD**: 0xF000-0xFFFF (write-only, 4096 bytes for 64x64 pixels)
- **Keyboard**: 0x10100-0x10102 (read-only)
  - 0x10100: Status (1=key available)
  - 0x10101: Key code (pops from queue)
  - 0x10102: Key state (1=pressed, 0=released)
