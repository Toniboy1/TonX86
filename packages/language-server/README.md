# TonX86 Language Server

Language Server Protocol (LSP) implementation for TonX86 assembly language.

## Features

### Diagnostics

- **Syntax Error Detection**: Identifies unknown/invalid instructions
- **Label Validation**: Warns when jump instructions reference undefined labels
- **Real-time Validation**: Diagnostics update as you type
- **Calling Convention Checks**: Validates prologues, epilogues, and stack cleanup
- **Control Flow Analysis**: Detects unreachable code after HLT, JMP, and RET

Example diagnostics:

- `Unknown instruction 'INVALID'` — Error for unrecognized instructions
- `Label 'undefined_label' is not defined` — Warning for missing labels
- `JMP requires a label operand` — Error for missing operands
- `Unreachable code: instruction follows JMP on line 5` — Warning for unreachable code

#### Suppressing Warnings

For demonstration or educational code where warnings are intentional, you can suppress them using special comments:

```asm
; Suppress warning on the next line
; tonx86-disable-next-line
MOV EAX, 99        ; This unreachable code won't trigger a warning

; Or suppress inline
JMP end
MOV EBX, 1 ; tonx86-ignore  (this unreachable code won't warn)
end:
    HLT
```

### Hover Documentation

Rich markdown documentation when hovering over:

- **Instructions**: Syntax, description, cycles, flags affected, and examples
- **Registers**: Register purpose and usage
- **Flags**: Flag meaning and behavior

### Code Completion

Auto-completion with documentation for:

- All supported instructions (MOV, ADD, SUB, MUL, DIV, AND, OR, XOR, CMP, INC, DEC, JMP, JZ, JE, JNZ, JNE, HLT, and more)
- All 8 registers (EAX, ECX, EDX, EBX, ESP, EBP, ESI, EDI)
- Triggered on space and comma

## Architecture

```
Extension (Language Client)
    ↓ IPC Transport
Language Server (Node.js)
    ↓ LSP Protocol
VS Code Editor
```

### Protocol Features

- `textDocument/didOpen` — Document opened
- `textDocument/didChange` — Document changed (triggers validation)
- `textDocument/completion` — Code completion
- `textDocument/hover` — Hover documentation
- Diagnostics pushed automatically on document changes

## Development

```bash
# Build
npm run build

# Run tests
npm test

# Watch mode
npm run watch
```

## Test Results

```
Language Server: 104 tests ✅
```

## Future Enhancements

- Symbol/label navigation (go to definition)
- Reference finding (find all uses of a label)
- Rename refactoring
- Document symbols outline
- Signature help for instruction operands
- Semantic syntax highlighting
- Format document command
