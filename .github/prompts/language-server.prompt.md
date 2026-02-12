# TonX86 — LANGUAGE SERVER PROMPT

LSP server for TonX86 assembly language support.

## Features
- **Diagnostics**: Unknown mnemonics, invalid operands, undefined labels
- **Hover**: Instruction documentation with cycles and flags
- **Completion**: Mnemonics, registers (EAX-EDI, AL-BH), labels
- **Go to Definition**: Jump to label declarations

## Supported Instructions
**Data Movement**: MOV, XCHG, LEA, MOVZX, MOVSX
**Arithmetic**: ADD, SUB, INC, DEC, MUL, IMUL, DIV, IDIV, MOD, CMP, NEG
**Logical**: AND, OR, XOR, NOT, TEST
**Shifts/Rotates**: SHL, SHR, SAR, ROL, ROR
**Control Flow**: JMP, JE/JZ, JNE/JNZ, HLT
**Stack**: PUSH, POP, CALL, RET
**Interrupts**: INT, IRET
**Special**: RAND

## Registers
**32-bit**: EAX, ECX, EDX, EBX, ESP, EBP, ESI, EDI
**8-bit**: AL, AH, CL, CH, DL, DH, BL, BH

## Syntax Rules
- Comments: `;` to end of line
- Labels: `name:` at start of line
- Instructions: `MNEMONIC operand1, operand2`
- Numbers: Decimal (123), Hex (0xFF), Binary (0b1010)
- Constants: `NAME: EQU value` (e.g., `GRID_SIZE: EQU 64`)
- Memory I/O: 0xF000-0xFFFF (LCD), 0x10100-0x10102 (Keyboard)

## Data Source
`packages/docs/isa.json` contains instruction definitions

## Validation
- Check mnemonic against valid instruction set
- Verify operand count matches instruction requirements
- Validate register names (32-bit and 8-bit)
- Check label references exist
- Warn on writes to read-only I/O addresses (0x10100-0x10102)
- Validate constant definitions (EQU)
