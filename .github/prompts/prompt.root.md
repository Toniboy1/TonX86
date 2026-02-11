# TonX86 — ROOT PROMPT

Educational x86-like assembly environment for VS Code.

## Core Features
- **Debugging**: Full DAP support with breakpoints, stepping, pause/continue
- **CPU Simulator**: 8 general-purpose 32-bit registers (EAX-EDI), 8-bit register aliases (AL, AH, etc.), flags (Z,C,O,S), 1-200% speed control
- **Memory-Mapped I/O**: LCD display (0xF000-0xFFFF, 64x64 max), keyboard (0x10100-0x10102)
- **LCD Display**: 2x2 to 256x256 pixels, configurable size, pop-out support
- **Keyboard Input**: Real-time capture with key press/release events
- **Stack Operations**: PUSH/POP, CALL/RET with proper stack management
- **Interrupts**: INT/IRET for software interrupts (0x10, 0x20, 0x21)
- **Views**: Registers, Memory A/B, LCD, ISA docs
- **Language Server**: Syntax highlighting, diagnostics, completion
- **Output Panel**: Mirrors Debug Console to VS Code Output panel

## Architecture
```
Extension (UI/LCD/Keyboard) ←→ Debug Adapter (DAP) ←→ Simulator Core
                                       ↓
                               Language Server (LSP)
```

## Full Instruction Set
**Data Movement**: MOV, XCHG, LEA, MOVZX, MOVSX
**Arithmetic**: ADD, SUB, INC, DEC, MUL, IMUL, DIV, IDIV, MOD, CMP, NEG
**Logical**: AND, OR, XOR, NOT, TEST
**Shifts/Rotates**: SHL, SHR, SAR, ROL, ROR
**Control Flow**: JMP, JE/JZ, JNE/JNZ, HLT
**Stack**: PUSH, POP, CALL, RET
**Interrupts**: INT, IRET
**Special**: RAND (educational random number generator)

## Registers
**32-bit**: EAX, ECX, EDX, EBX, ESP, EBP, ESI, EDI
**8-bit**: AL, AH, CL, CH, DL, DH, BL, BH (low/high bytes of EAX-EBX)

## Memory-Mapped I/O
- **0xF000-0xFFFF**: LCD pixels (write-only, 4096 bytes for 64x64 display)
- **0x10100**: Keyboard status (read-only, 1=key available)
- **0x10101**: Key code (read-only, pops from queue)
- **0x10102**: Key state (read-only, 1=pressed, 0=released)

## Examples
24 example programs in `/examples/` including Snake game (21-snake.asm)
