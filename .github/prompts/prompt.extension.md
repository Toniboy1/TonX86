# TonX86 — EXTENSION PROMPT

Implement VS Code UI.

Required:
- Debug type: tonx86
- Commands: Assemble, Run, Reset
- Views: Registers, Memory A, Memory B
- LCD Webview (2x4..16x16)
- Docs panel Webview

Rules:
- No blocking extension thread
- UI updates on debug stop events

## Configuration Settings

### LCD Display Configuration

Add to VS Code settings with namespace `tonx86.lcd`:

```json
{
  "tonx86.lcd.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable LCD display view in the debug explorer"
  },
  "tonx86.lcd.width": {
    "type": "integer",
    "default": 16,
    "minimum": 2,
    "maximum": 256,
    "description": "LCD display width in pixels (2-256)"
  },
  "tonx86.lcd.height": {
    "type": "integer",
    "default": 16,
    "minimum": 2,
    "maximum": 256,
    "description": "LCD display height in pixels (2-256)"
  }
}
```

Validation Rules:
- Width: minimum 2, maximum 256
- Height: minimum 2, maximum 256
- Both must be integers
- Default configuration: 16x16 pixels
- Settings apply on extension reload or debug session restart
