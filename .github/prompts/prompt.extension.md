# TonX86 — EXTENSION PROMPT

VS Code extension UI for TonX86 assembly debugging.

## Components
- **Debug Type**: `tonx86` with DAP integration
- **Commands**: Assemble, Run, Pause, Step, Reset, LCD Pop-out
- **Tree Views**: Registers (EAX-EDI), Memory A, Memory B
- **Webviews**: LCD Display (canvas-based), ISA Docs
- **Keyboard Capture**: LCD webview captures keydown/keyup events

## Settings (tonx86.*)

### LCD Display
- `lcd.enabled` (boolean, default: true) - Enable LCD display
- `lcd.width` (integer, 2-256, default: 16) - LCD width in pixels
- `lcd.height` (integer, 2-256, default: 16) - LCD height in pixels
- `lcd.pixelSize` (string|number, default: "auto") - Pixel size: "auto" or 2-500

### Keyboard
- `keyboard.enabled` (boolean, default: true) - Enable keyboard capture

### CPU
- `cpu.speed` (number, 1-200, default: 100) - Execution speed percentage

## Launch Configuration
```json
{
  "type": "tonx86",
  "request": "launch",
  "program": "${workspaceFolder}/program.asm",
  "stopOnEntry": true,
  "cpuSpeed": 100,
  "enableLogging": false
}
```

## Communication
- **LCD Updates**: Poll debug adapter via `customRequest("getLCDState")` every 50ms
- **Keyboard Events**: Forward via `customRequest("keyboardEvent", {keyCode, pressed})`
- **Register/Memory**: Update on `StoppedEvent` from debug adapter

## Key Mappings
Letters (A-Z=65-90, a-z=97-122), Numbers (0-9=48-57), Arrows (128-131), Special keys (Space=32, Enter=13, Esc=27)
