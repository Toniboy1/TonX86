# TonX86 Instruction Set Architecture

## Registers

**General Purpose (32-bit):**
- `EAX` - Accumulator
- `ECX` - Counter
- `EDX` - Data
- `EBX` - Base
- `ESP` - Stack Pointer
- `EBP` - Base Pointer
- `ESI` - Source Index
- `EDI` - Destination Index

**8-bit Register Aliases:**
- `AL` - Low byte of EAX (bits 0-7)
- `AH` - High byte of EAX (bits 8-15)
- `CL` - Low byte of ECX (bits 0-7)
- `CH` - High byte of ECX (bits 8-15)
- `DL` - Low byte of EDX (bits 0-7)
- `DH` - High byte of EDX (bits 8-15)
- `BL` - Low byte of EBX (bits 0-7)
- `BH` - High byte of EBX (bits 8-15)

These 8-bit registers provide access to individual bytes of the 32-bit general purpose registers. They are commonly used for byte-oriented operations, character I/O, and interrupt service routines.

## Flags

- **Z** (Zero) - Set when result is zero
- **C** (Carry) - Set on unsigned overflow
- **O** (Overflow) - Set on signed overflow
- **S** (Sign) - Set when result is negative

## Instructions

### Data Movement

**MOV dest, src** - Move data
- Cycles: 1
- Flags: None
- Examples:
  ```asm
  MOV EAX, 42        ; Load immediate
  MOV EAX, ECX       ; Register to register
  MOV EAX, 0xF100    ; Read from I/O
  MOV 0xF000, 1      ; Write to I/O
  MOV AL, 'H'        ; Move character to low byte of EAX
  MOV AH, 0x0E       ; Move to high byte of EAX
  MOV DL, 65         ; Move to low byte of EDX
  ```

**XCHG dest, src** - Exchange values
- Cycles: 1
- Flags: None
- Example: `XCHG EAX, ECX`

**LEA dest, src** - Load effective address
- Cycles: 1
- Flags: None
- Example: `LEA EAX, 0x1000`

**MOVZX dest, src** - Move with zero extend
- Cycles: 1
- Flags: None
- Example: `MOVZX EAX, ECX` (moves low byte of ECX to EAX, zero-extending)

**MOVSX dest, src** - Move with sign extend
- Cycles: 1
- Flags: None
- Example: `MOVSX EAX, ECX` (moves low byte of ECX to EAX, sign-extending)

### Arithmetic

**ADD dest, src** - Add
- Cycles: 1
- Flags: Z, C, O, S
- Example: `ADD EAX, ECX`

**SUB dest, src** - Subtract
- Cycles: 1
- Flags: Z, C, O, S
- Example: `SUB EAX, ECX`

**CMP op1, op2** - Compare (SUB without storing result)
- Cycles: 1
- Flags: Z, C, O, S
- Example: `CMP EAX, 0`

**INC dest** - Increment
- Cycles: 1
- Flags: Z, C, O, S
- Example: `INC EAX`

**DEC dest** - Decrement
- Cycles: 1
- Flags: Z, C, O, S
- Example: `DEC EAX`

**NEG dest** - Two's complement negation
- Cycles: 1
- Flags: Z, C, O, S
- Example: `NEG EAX`

**MUL src** - Unsigned multiply (EAX * src -> EDX:EAX)
- Cycles: 1
- Flags: Z, S
- Example: `MUL ECX`

**IMUL src** - Signed multiply (EAX * src -> EAX)
- Cycles: 1
- Flags: Z, S
- Example: `IMUL ECX`

**DIV src** - Unsigned divide (EAX / src -> quotient in EAX, remainder in EDX)
- Cycles: 1
- Flags: Z, S
- Example: `DIV ECX`

**IDIV src** - Signed divide (EAX / src -> quotient in EAX, remainder in EDX)
- Cycles: 1
- Flags: Z, S
- Example: `IDIV ECX`

**MOD dest, src** - Modulo operation (dest = dest % src)
- Cycles: 1
- Flags: Z, S
- Example: `MOD EAX, 64`
- Note: Educational instruction for easier modulo calculations. Alternatively, use DIV and read remainder from EDX.

### Logical

**AND dest, src** - Bitwise AND
- Cycles: 1
- Flags: Z, S
- Example: `AND EAX, ECX`

**OR dest, src** - Bitwise OR
- Cycles: 1
- Flags: Z, S
- Example: `OR EAX, ECX`

**XOR dest, src** - Bitwise XOR
- Cycles: 1
- Flags: Z, S
- Example: `XOR EAX, ECX`

**NOT dest** - Bitwise NOT (one's complement)
- Cycles: 1
- Flags: None
- Example: `NOT EAX`

**TEST op1, op2** - Logical AND (affects flags only, doesn't store result)
- Cycles: 1
- Flags: Z, S
- Example: `TEST EAX, 0xFF`

### Shifts and Rotates

**SHL dest, count** - Shift left
- Cycles: 1
- Flags: Z, S
- Example: `SHL EAX, 4`

**SHR dest, count** - Shift right (logical, zero-fill)
- Cycles: 1
- Flags: Z, S
- Example: `SHR EAX, 2`

**SAR dest, count** - Shift arithmetic right (sign-extend)
- Cycles: 1
- Flags: Z, S
- Example: `SAR EAX, 3`

**ROL dest, count** - Rotate left
- Cycles: 1
- Flags: Z, S
- Example: `ROL EAX, 8`

**ROR dest, count** - Rotate right
- Cycles: 1
- Flags: Z, S
- Example: `ROR EAX, 8`

### Control Flow

**JMP label** - Unconditional jump
- Cycles: 1
- Flags: None
- Example: `JMP loop_start`

**JE/JZ label** - Jump if zero
- Cycles: 1
- Flags: None (reads Z flag)
- Example: `JE end_loop`

**JNE/JNZ label** - Jump if not zero
- Cycles: 1
- Flags: None (reads Z flag)
- Example: `JNE loop_start`

**HLT** - Halt execution
- Cycles: 1
- Flags: None
- Example: `HLT`

### Special Instructions

**RAND dest, max** - Generate random number
- Cycles: 1
- Flags: Z, S
- Operation: Generates random number from 0 to max-1, stores in dest
- Example: `RAND EAX, 64` (generates 0-63)
- Note: Educational instruction for game development and simulations. If max is omitted, generates full 32-bit random value.

### Stack Operations

**PUSH reg** - Push register onto stack
- Cycles: 1
- Flags: None
- Operation: Decrements ESP by 4, writes register value to memory
- Example: `PUSH EAX`

**POP reg** - Pop from stack into register
- Cycles: 1
- Flags: None
- Operation: Reads value from memory, increments ESP by 4
- Example: `POP EAX`

**CALL label** - Call subroutine
- Cycles: 2
- Flags: None
- Operation: Pushes return address, jumps to label
- Example: `CALL my_function`

**RET** - Return from subroutine
- Cycles: 2
- Flags: None
- Operation: Pops return address, jumps to it
- Example: `RET`

### Interrupts

**INT imm8** - Software interrupt
- Cycles: 2
- Flags: None
- Operation: Executes interrupt handler for the specified number
- Example: `INT 0x10`

**IRET** - Return from interrupt
- Cycles: 2
- Flags: All restored from stack
- Operation: Returns from interrupt handler
- Example: `IRET`

## Memory-Mapped I/O

### LCD Display (0xF000-0xF0FF)
**Write-only** - Set pixel state

Address formula: `0xF000 + (y * width + x)`

```asm
MOV 0xF000, 1      ; Turn on pixel (0,0)
MOV 0xF008, 0      ; Turn off pixel (0,1) in 8x8 grid
```

### Keyboard (0xF100-0xF102)
**Read-only** - Keyboard input

- `0xF100` - Status register (1=key available, 0=empty)
- `0xF101` - Key code register (reading pops from queue)
- `0xF102` - Key state register (1=pressed, 0=released)

```asm
MOV EAX, 0xF100    ; Check keyboard status
MOV EBX, 0xF101    ; Read key code
MOV ECX, 0xF102    ; Read key state
```

**Key Codes:**
- Letters: A-Z (65-90), a-z (97-122)
- Numbers: 0-9 (48-57)
- Arrows: Up=128, Down=129, Left=130, Right=131
- Special: Space=32, Enter=13, Esc=27, Tab=9, Backspace=8

## Example Programs

### Simple Addition
```asm
MOV EAX, 5
MOV ECX, 3
ADD EAX, ECX      ; EAX = 8
HLT
```

### Conditional Jump
```asm
MOV EAX, 10
SUB EAX, 10       ; Z flag set
JZ is_zero        ; Jump taken
HLT

is_zero:
  MOV EBX, 1      ; EBX = 1
  HLT
```

### LCD Display
```asm
MOV 0xF000, 1     ; Turn on top-left pixel
MOV 0xF001, 1     ; Turn on next pixel
HLT
```

### Keyboard Input
```asm
loop:
  MOV EAX, 0xF100   ; Check keyboard
  CMP EAX, 1
  JNE loop          ; Wait for key
  
  MOV EBX, 0xF101   ; Read key code
  MOV ECX, 0xF102   ; Read key state
  HLT
```

### Function Call (cdecl)
```asm
; Call add(5, 3)
PUSH 3
PUSH 5
CALL add
ADD ESP, 8        ; Caller cleans stack

add:
  PUSH EBP
  MOV EBP, ESP
  MOV EAX, [EBP+8]
  ADD EAX, [EBP+12]
  POP EBP
  RET
```

## Calling Conventions

TonX86 supports standard x86 calling conventions. See [CALLING_CONVENTIONS.md](CALLING_CONVENTIONS.md) for detailed documentation on:
- **cdecl** - C declaration (caller cleans stack)
- **stdcall** - Standard call (callee cleans stack)
- **fastcall** - Fast call (first 2 params in registers)

Example programs demonstrating each convention are available in `/examples/calling-conventions/`.
