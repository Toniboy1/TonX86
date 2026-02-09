# TonX86 — ROOT PROMPT

Educational x86-like assembly environment for VS Code.

## Core Features
- **Debugging**: Full DAP support with breakpoints, stepping, pause/continue
- **CPU Simulator**: 8 registers (EAX-EDI), flags (Z,C,O,S), 1-200% speed control
- **Memory-Mapped I/O**: LCD display (0xF000-0xF0FF), keyboard (0xF100-0xF102)
- **LCD Display**: 2x2 to 256x256 pixels, configurable size, pop-out support
- **Keyboard Input**: Real-time capture with key press/release events
- **Views**: Registers, Memory A/B, LCD, ISA docs
- **Language Server**: Syntax highlighting, diagnostics, completion

## Architecture
```
Extension (UI/LCD/Keyboard) ←→ Debug Adapter (DAP) ←→ Simulator
                                       ↓
                               Language Server (LSP)
```

## Instruction Set
`MOV` `ADD` `SUB` `AND` `OR` `CMP` `JMP` `JE/JZ` `JNE/JNZ` `HLT`

## Memory-Mapped I/O
- **0xF000-0xF0FF**: LCD pixels (write)
- **0xF100**: Keyboard status (read)
- **0xF101**: Key code (read, pops queue)
- **0xF102**: Key state (read, 1=pressed)
