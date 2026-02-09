# TonX86 Assembly User Guide

## File Format

TonX86 assembly programs should be saved with the `.asm` extension. The extension is automatically recognized and will provide:
- Syntax highlighting
- Diagnostics and error checking
- Code completion
- Debugging support
- Language server features (hover documentation, go to definition)

## Basic Program Structure

```asm
; TonX86 Assembly Program
; This is a comment

; Main program entry
start:
    MOV EAX, 0x00
    MOV ECX, 0xFF
    
loop_label:
    ADD EAX, 1
    JZ end_program
    JMP loop_label
    
end_program:
    HLT
```

## Syntax Rules

### Comments
- Line comments use semicolon (`;`)
- Comments extend to end of line

```asm
; This is a comment
MOV EAX, 1    ; Inline comment
```

### Labels
- Labels mark locations in code
- Must be at start of line (with optional leading whitespace)
- Followed by a colon (`:`), optionally followed by instruction on same line

```asm
start:
    MOV EAX, 0
    
loop:
    ADD EAX, 1
```

### Instructions
- Mnemonic followed by operands
- Operands separated by commas
- Case-insensitive mnemonics

```asm
MOV EAX, 0xFF
ADD EAX, ECX
JMP loop_label
```

### Registers
- 32-bit: EAX, ECX, EDX, EBX, ESP, EBP, ESI, EDI
- 16-bit: AX, CX, DX, BX, SP, BP, SI, DI
- 8-bit: AL, CL, DL, BL, AH, CH, DH, BH

### Numbers
- Decimal: `123`, `255`
- Hexadecimal: `0xFF`, `0x1A`
- Binary: `0b1010`, `0B11111111`

## Instruction Set

### Data Movement
- `MOV dest, src` - Move data between registers or register and memory

### Arithmetic
- `ADD dest, src` - Add two values
- `SUB dest, src` - Subtract source from destination
- `INC dest` - Increment by 1
- `DEC dest` - Decrement by 1
- `IMUL dest, src` - Signed multiply
- `IDIV src` - Signed divide (EAX / src)

### Bitwise Operations
- `AND dest, src` - Bitwise AND
- `OR dest, src` - Bitwise OR
- `XOR dest, src` - Bitwise XOR
- `NOT dest` - Bitwise NOT
- `SHL dest, count` - Shift left
- `SHR dest, count` - Shift right

### Control Flow
- `JMP label` - Unconditional jump
- `JZ label` - Jump if zero
- `JNZ label` - Jump if not zero
- `JE label` - Jump if equal
- `JNE label` - Jump if not equal
- `JL label` - Jump if less than
- `JLE label` - Jump if less or equal
- `JG label` - Jump if greater than
- `JGE label` - Jump if greater or equal
- `CALL label` - Call subroutine
- `RET` - Return from subroutine

### Stack Operations
- `PUSH src` - Push value onto stack
- `POP dest` - Pop value from stack

### Miscellaneous
- `CMP src1, src2` - Compare two values (sets flags)
- `HLT` - Halt execution
- `NOP` - No operation

## Debugging Programs

### Launch Configuration

TonX86 provides debug configuration snippets. To create a launch configuration:

1. Open `.vscode/launch.json` (or create it via Debug → Add Configuration)
2. Select "TonX86: Launch Program"
3. Configure with your `.asm` file

Example `launch.json`:
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "TonX86: Launch",
            "type": "tonx86",
            "request": "launch",
            "program": "${workspaceFolder}/program.asm",
            "stopOnEntry": true,
            "console": "internalConsole"
        }
    ]
}
```

### Debug Options

| Option | Type | Default | Description |
|---|---|---|---|
| `program` | string | `${workspaceFolder}/${fileBasename}` | Path to .asm file to debug |
| `stopOnEntry` | boolean | `true` | Break at program entry |
| `console` | string | `internalConsole` | Console type (internalConsole, integratedTerminal, externalTerminal) |

### Debug Features

During debugging, you can:
- **Set breakpoints**: Click on line number to toggle breakpoint
- **Step**: Step into instructions, step over calls, step out of functions
- **Continue**: Run until next breakpoint or halt
- **View state**: Inspect registers and memory in sidebar views
- **Watch LCD**: Monitor LCD display updates (if configured)

### Debug Commands

| Command | Keybinding | Description |
|---|---|---|
| TonX86: Run | (custom) | Start execution |
| TonX86: Pause | (custom) | Pause execution |
| TonX86: Step Over | (custom) | Execute next instruction (CALL = 1 step) |
| TonX86: Step In | (custom) | Step into next instruction |
| TonX86: Step Out | (custom) | Run until RET |
| TonX86: Reset | (custom) | Reset CPU state |

## Example Programs

### Simple Loop (adds numbers 1-10)

```asm
; Calculate sum of 1..10
start:
    MOV EAX, 0      ; accumulator
    MOV ECX, 1      ; counter
    
loop:
    ADD EAX, ECX    ; add counter to accumulator
    INC ECX         ; increment counter
    CMP ECX, 11     ; check if counter > 10
    JLE loop        ; loop if <=
    
    HLT             ; halt with result in EAX
```

### Function with Call/Return

```asm
; Main program
main:
    MOV EAX, 5
    CALL multiply_by_2
    HLT
    
; Multiply EAX by 2
multiply_by_2:
    SHL EAX, 1      ; shift left = multiply by 2
    RET
```

### Conditional Jump

```asm
start:
    MOV EAX, 10
    MOV ECX, 5
    
    CMP EAX, ECX    ; compare
    JG greater_than ; jump if EAX > ECX
    JL less_than    ; jump if EAX < ECX
    JE equal        ; jump if EAX == ECX
    
equal:
    MOV EDX, 0
    JMP done
    
greater_than:
    MOV EDX, 1
    JMP done
    
less_than:
    MOV EDX, -1
    
done:
    HLT
```

## Common Issues

### Unknown Mnemonic
- Check spelling (mnemonics are case-insensitive but must match instruction set)
- Ensure not using extended instruction set (only supported instructions available)

### Bad Operands
- Verify operand types match instruction (register-to-register, register-to-memory, etc.)
- Check register names for typos

### Undefined Label
- Ensure label is defined before use
- Check label spelling and case sensitivity

### Stack Underflow
- POP without matching PUSH
- Too many POPs or not enough PUSHes

## Settings

### Assembly Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `tonx86.assembly.autoAssemble` | boolean | `true` | Auto-assemble on file save |
| `tonx86.assembly.showDiagnostics` | boolean | `true` | Show diagnostics |

### LCD Display Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `tonx86.lcd.enabled` | boolean | `true` | Enable LCD view |
| `tonx86.lcd.width` | integer | `16` | LCD width (2-256) |
| `tonx86.lcd.height` | integer | `16` | LCD height (2-256) |

## Tips & Tricks

1. **Use labels for jumps**: More readable than addresses
2. **Comment your code**: Helps debugging and learning
3. **Break complex operations into steps**: Easier to debug
4. **Watch the LCD**: If using LCD output, monitor changes in the LCD view
5. **Check register values**: Use the Registers view to inspect state during execution
6. **Memory breakpoints**: Set breakpoints where memory is modified
7. **Step through**: Use step commands to understand instruction flow

## Keyboard Shortcuts

Add these to your `keybindings.json` for quick debugging:

```json
[
    {
        "key": "f5",
        "command": "tonx86.run"
    },
    {
        "key": "f6",
        "command": "tonx86.pause"
    },
    {
        "key": "f10",
        "command": "tonx86.stepOver"
    },
    {
        "key": "f11",
        "command": "tonx86.stepIn"
    },
    {
        "key": "shift+f11",
        "command": "tonx86.stepOut"
    }
]
```
