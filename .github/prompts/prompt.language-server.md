# TonX86 — LANGUAGE SERVER PROMPT

LSP server for TonX86 assembly language support.

## Features
- **Diagnostics**: Unknown mnemonics, invalid operands, undefined labels
- **Hover**: Instruction documentation with cycles and flags
- **Completion**: Mnemonics (MOV, ADD, SUB, etc.), registers (EAX-EDI)
- **Go to Definition**: Jump to label declarations

## Supported Instructions
`MOV` `ADD` `SUB` `AND` `OR` `CMP` `JMP` `JE` `JZ` `JNE` `JNZ` `HLT`

## Registers
EAX, ECX, EDX, EBX, ESP, EBP, ESI, EDI

## Syntax Rules
- Comments: `;` to end of line
- Labels: `name:` at start of line
- Instructions: `MNEMONIC operand1, operand2`
- Numbers: Decimal (123), Hex (0xFF), Binary (0b1010)
- Memory I/O: 0xF000-0xF0FF (LCD), 0xF100-0xF102 (Keyboard)

## Data Source
`packages/docs/isa.json` contains instruction definitions

## Validation
- Check mnemonic against valid instruction set
- Verify operand count matches instruction requirements
- Validate register names
- Check label references exist
- Warn on writes to read-only I/O addresses (0xF100-0xF102)
