# TonX86 Instruction Set Architecture

> **Verification source:** This ISA is based on the [x86 Assembly Guide](https://www.cs.virginia.edu/~evans/cs216/guides/x86.html) from the University of Virginia CS216 course by David Evans (originally by Adam Ferrari, updated by Alan Batson, Mike Lack, and Anita Jones). Additional x86 architecture and instruction reference verified against [Shichao's Notes on x86 Assembly](https://notes.shichao.io/asm/#x86-assembly).

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

Register names are **not case-sensitive** (e.g., `EAX` and `eax` refer to the same register).

## Flags

- **Z** (Zero, bit 6) - Set when result is zero
- **C** (Carry, bit 0) - Set on unsigned overflow/borrow
- **O** (Overflow, bit 11) - Set on signed overflow
- **S** (Sign, bit 7) - Set when result is negative (bit 31 of result is 1)

## Addressing Modes

Addressing modes specify how instruction operands are accessed. The x86 architecture supports multiple addressing modes for flexible memory and register access.

### Register Addressing

Operand is a CPU register.

```asm
MOV EAX, EBX       ; Move contents of EBX into EAX
ADD ECX, EDX       ; Add EDX to ECX
```

### Immediate Addressing

Operand is an immediate value (constant) specified directly in the instruction.

```asm
MOV EAX, 42        ; Move constant 42 into EAX
MOV EBX, 0x1000    ; Move constant 0x1000 into EBX
ADD ECX, 5         ; Add constant 5 to ECX
```

### Direct Memory Addressing

Operand is at a memory address specified directly in the instruction.

```asm
MOV EAX, [0x2000]  ; Load 32-bit value from address 0x2000
MOV [0x2000], ECX  ; Store ECX to address 0x2000
```

### Register Indirect Addressing

Address is contained in a register (denoted by square brackets).

```asm
MOV EAX, [EBX]     ; Load from address in EBX
MOV [EDI], ECX     ; Store ECX to address in EDI
```

Valid base registers for indirect addressing: **EBX, EBP, ESI, EDI**

### Displacement Addressing

Address is calculated as register + displacement (offset).

```asm
MOV EAX, [EBX+4]   ; Load from address (EBX + 4)
MOV ECX, [EBP+8]   ; Load from address (EBP + 8)
```

### Base-Index Addressing

Address is calculated as base register + index register.

```asm
MOV EAX, [EBX+EDI]  ; Load from address (EBX + EDI)
MOV ECX, [EBP+ESI]  ; Load from address (EBP + ESI)
```

### Base-Index with Displacement

Address is calculated as base register + index register + displacement.

```asm
MOV EAX, [EBX+EDI+4]   ; Load from address (EBX + EDI + 4)
MOV ECX, [EBP+ESI+8]   ; Load from address (EBP + ESI + 8)
```

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
- Note: Computes the effective address of src and places it in dest. The memory contents are **not** loaded, only the address is computed.
- Examples:
  - `LEA EAX, 0x1000` (load address 0x1000 into EAX)
  - `LEA EAX, [EBX+4]` (compute EBX+4 and store address in EAX)

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
- Flags: Z, O, S (CF is **not** modified)
- Example: `INC EAX`
- Note: Per x86 specification, INC does not affect the carry flag, making it distinct from ADD dest, 1

**DEC dest** - Decrement
- Cycles: 1
- Flags: Z, O, S (CF is **not** modified)
- Example: `DEC EAX`
- Note: Per x86 specification, DEC does not affect the carry flag, making it distinct from SUB dest, 1

**NEG dest** - Two's complement negation
- Cycles: 1
- Flags: Z, C, O, S
- Example: `NEG EAX`
- Note: CF is set if source is non-zero, cleared if source is zero (special x86 behavior)

**MUL src** - Unsigned multiply (EAX * src -> EDX:EAX)
- Cycles: 1
- Flags: C, O (Z, S are undefined per x86 spec, cleared in strict-x86 mode)
- Example: `MUL ECX`
- Note: CF and OF are set if the upper 32 bits (EDX) are non-zero, indicating the result doesn't fit in EAX

**IMUL** - Signed multiply (supports 1, 2, and 3 operand forms per x86 spec)
- **1 operand:** `IMUL src` - EAX * src → EDX:EAX (signed)
- **2 operand:** `IMUL dest, src` - dest * src → dest
- **3 operand:** `IMUL dest, src, const` - src * const → dest
- Cycles: 1
- Flags: C, O (Z, S are undefined per x86 spec, cleared in strict-x86 mode)
- Examples:
  - `IMUL ECX` (EAX = EAX * ECX, signed, single-operand form)
  - `IMUL EAX, EBX` (EAX = EAX * EBX, two-operand form)
  - `IMUL ESI, EDI, 25` (ESI = EDI * 25, three-operand form)
- Note: CF and OF are set if the result is truncated (i.e., cannot be represented in the destination size)

**DIV src** - Unsigned divide (EAX / src -> quotient in EAX, remainder in EDX)
- Cycles: 1
- Flags: Z, S (educational mode); undefined (strict-x86 mode - CF/OF cleared)
- Example: `DIV ECX`
- Note: Per x86 spec, all flags are undefined after DIV. In educational mode, ZF and SF are set for learning purposes.

**IDIV src** - Signed divide (EAX / src -> quotient in EAX, remainder in EDX)
- Cycles: 1
- Flags: Z, S (educational mode); undefined (strict-x86 mode - CF/OF cleared)
- Example: `IDIV ECX`
- Note: Per x86 spec, all flags are undefined after IDIV. In educational mode, ZF and SF are set for learning purposes.

**MOD dest, src** - Modulo operation (dest = dest % src)
- Cycles: 1
- Flags: Z, S
- Example: `MOD EAX, 64`
- Note: Educational instruction for easier modulo calculations. Alternatively, use DIV and read remainder from EDX.

### Logical

**AND dest, src** - Bitwise AND
- Cycles: 1
- Flags: Z, S (CF and OF are always cleared)
- Example: `AND EAX, ECX`

**OR dest, src** - Bitwise OR
- Cycles: 1
- Flags: Z, S (CF and OF are always cleared)
- Example: `OR EAX, ECX`

**XOR dest, src** - Bitwise XOR
- Cycles: 1
- Flags: Z, S (CF and OF are always cleared)
- Example: `XOR EAX, ECX`

**NOT dest** - Bitwise NOT (one's complement)
- Cycles: 1
- Flags: None
- Example: `NOT EAX`

**TEST op1, op2** - Logical AND (affects flags only, doesn't store result)
- Cycles: 1
- Flags: Z, S (CF and OF are always cleared)
- Example: `TEST EAX, 0xFF`
- Note: Performs bitwise AND of the two operands but does not store the result. Used to test if specific bits are set.

### Shifts and Rotates

> **Note:** Per x86 specification, shift counts greater than 31 are performed modulo 32.

**SHL dest, count** - Shift left
- Cycles: 1
- Flags: Z, S, C, O (if count > 0)
- Example: `SHL EAX, 4`
- Flag behavior:
  - **CF**: Set to the last bit shifted out (the bit that was shifted beyond the register)
  - **OF**: For count=1, set to (MSB of result) XOR CF; undefined for count>1
  - **ZF/SF**: Reflect the result
  - If count=0, no flags are modified

**SHR dest, count** - Shift right (logical, zero-fill)
- Cycles: 1
- Flags: Z, S, C, O (if count > 0)
- Example: `SHR EAX, 2`
- Flag behavior:
  - **CF**: Set to the last bit shifted out (the LSB before the shift)
  - **OF**: For count=1, set to the MSB of the original operand; undefined for count>1
  - **ZF/SF**: Reflect the result
  - If count=0, no flags are modified

**SAR dest, count** - Shift arithmetic right (sign-extend)
- Cycles: 1
- Flags: Z, S, C, O (if count > 0)
- Example: `SAR EAX, 3`
- Flag behavior:
  - **CF**: Set to the last bit shifted out
  - **OF**: Always cleared for count=1; undefined for count>1
  - **ZF/SF**: Reflect the result (sign is preserved)
  - If count=0, no flags are modified

**ROL dest, count** - Rotate left
- Cycles: 1
- Flags: C, O (if count > 0)
- Example: `ROL EAX, 8`
- Flag behavior:
  - **CF**: Set to the bit rotated into the LSB position
  - **OF**: For count=1, set to (MSB of result) XOR CF; undefined for count>1
  - **ZF/SF**: Not modified by rotate operations
  - If count=0, no flags are modified

**ROR dest, count** - Rotate right
- Cycles: 1
- Flags: C, O (if count > 0)
- Example: `ROR EAX, 8`
- Flag behavior:
  - **CF**: Set to the bit rotated into the MSB position
  - **OF**: For count=1, set to (MSB XOR second MSB) of result; undefined for count>1
  - **ZF/SF**: Not modified by rotate operations
  - If count=0, no flags are modified

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

**JG label** - Jump if greater (signed)
- Cycles: 1
- Flags: None (reads Z, S, O flags)
- Condition: SF == OF and ZF == 0
- Example: `JG greater_handler`

**JGE label** - Jump if greater or equal (signed)
- Cycles: 1
- Flags: None (reads S, O flags)
- Condition: SF == OF
- Example: `JGE ge_handler`

**JL label** - Jump if less (signed)
- Cycles: 1
- Flags: None (reads S, O flags)
- Condition: SF != OF
- Example: `JL less_handler`

**JLE label** - Jump if less or equal (signed)
- Cycles: 1
- Flags: None (reads Z, S, O flags)
- Condition: SF != OF or ZF == 1
- Example: `JLE le_handler`

**JS label** - Jump if sign flag set
- Cycles: 1
- Flags: None (reads S flag)
- Example: `JS negative_handler`

**JNS label** - Jump if sign flag not set
- Cycles: 1
- Flags: None (reads S flag)
- Example: `JNS positive_handler`

**JA label** - Jump if above (unsigned greater)
- Cycles: 1
- Flags: None (reads C, Z flags)
- Condition: CF == 0 and ZF == 0
- Example: `JA above_handler`

**JAE label** - Jump if above or equal (unsigned greater or equal)
- Cycles: 1
- Flags: None (reads C flag)
- Condition: CF == 0
- Example: `JAE ae_handler`

**JB label** - Jump if below (unsigned less)
- Cycles: 1
- Flags: None (reads C flag)
- Condition: CF == 1
- Example: `JB below_handler`

**JBE label** - Jump if below or equal (unsigned less or equal)
- Cycles: 1
- Flags: None (reads C, Z flags)
- Condition: CF == 1 or ZF == 1
- Example: `JBE be_handler`

**NOP** - No operation
- Cycles: 1
- Flags: None
- Example: `NOP`

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
- Operation: Pops return address from stack, pops and restores flags from stack, then jumps to the return address. Used to return from interrupt handlers.
- Example: `IRET`

### Rotate Through Carry

**RCL reg, imm/reg** - Rotate left through carry
- Cycles: 1
- Flags: C, O
- Operation: Rotates bits left through carry flag. The carry flag is shifted into the LSB and the MSB is shifted into the carry flag.
- Example: `RCL EAX, 1`

**RCR reg, imm/reg** - Rotate right through carry
- Cycles: 1
- Flags: C, O
- Operation: Rotates bits right through carry flag. The carry flag is shifted into the MSB and the LSB is shifted into the carry flag.
- Example: `RCR EAX, 1`

### Loop Instructions

**LOOP label** - Loop with counter
- Cycles: 1
- Flags: None
- Operation: Decrements ECX, jumps to label if ECX != 0
- Example: `LOOP my_loop`

**LOOPE label** - Loop while equal (alias: LOOPZ)
- Cycles: 1
- Flags: None
- Operation: Decrements ECX, jumps if ECX != 0 AND ZF=1
- Example: `LOOPE my_loop`

**LOOPNE label** - Loop while not equal (alias: LOOPNZ)
- Cycles: 1
- Flags: None
- Operation: Decrements ECX, jumps if ECX != 0 AND ZF=0
- Example: `LOOPNE my_loop`

### Conditional Move

Moves the source to the destination only if the specified condition is true. Does not modify flags.

| Mnemonic | Condition | Description |
|----------|-----------|-------------|
| CMOVE / CMOVZ | ZF=1 | Move if equal / zero |
| CMOVNE / CMOVNZ | ZF=0 | Move if not equal / not zero |
| CMOVL | SF≠OF | Move if less (signed) |
| CMOVLE | SF≠OF or ZF=1 | Move if less or equal (signed) |
| CMOVG | SF=OF and ZF=0 | Move if greater (signed) |
| CMOVGE | SF=OF | Move if greater or equal (signed) |
| CMOVA | CF=0 and ZF=0 | Move if above (unsigned) |
| CMOVAE | CF=0 | Move if above or equal (unsigned) |
| CMOVB | CF=1 | Move if below (unsigned) |
| CMOVBE | CF=1 or ZF=1 | Move if below or equal (unsigned) |
| CMOVS | SF=1 | Move if sign |
| CMOVNS | SF=0 | Move if not sign |

- Cycles: 1
- Flags: None
- Example: `CMOVE EAX, EBX   ; Move EBX to EAX if ZF=1`

### Flag Manipulation

**LAHF** - Load flags into AH
- Cycles: 1
- Flags: None
- Operation: Loads SF, ZF, and CF from the flags register into AH (bits 7, 6, and 0 respectively)
- Example: `LAHF`

**SAHF** - Store AH into flags
- Cycles: 1
- Flags: S, Z, C
- Operation: Stores AH bit 7 → SF, bit 6 → ZF, bit 0 → CF
- Example: `SAHF`

### Exchange and Add

**XADD reg, reg** - Exchange and add
- Cycles: 1
- Flags: Z, C, O, S
- Operation: Temp = dest; dest = dest + src; src = Temp
- Example: `XADD EAX, EBX`

### Bit Scan

**BSF reg, reg/imm** - Bit scan forward
- Cycles: 1
- Flags: Z
- Operation: Scans source from bit 0 (LSB) to MSB for the first set bit. Stores the index in destination. Sets ZF if source is zero.
- Example: `BSF EAX, EBX`

**BSR reg, reg/imm** - Bit scan reverse
- Cycles: 1
- Flags: Z
- Operation: Scans source from MSB to bit 0 (LSB) for the first set bit. Stores the index in destination. Sets ZF if source is zero.
- Example: `BSR EAX, EBX`

### Byte Swap

**BSWAP reg** - Byte swap
- Cycles: 1
- Flags: None
- Operation: Reverses the byte order of a 32-bit register (endianness conversion). Byte 0 ↔ Byte 3, Byte 1 ↔ Byte 2.
- Example: `BSWAP EAX  ; 0x12345678 → 0x78563412`

### String Operations

String operations use ESI (source index), EDI (destination index), and AL/EAX for data. They automatically increment ESI/EDI after each operation.

**LODSB / LODS** - Load string byte
- Cycles: 1
- Flags: None
- Operation: AL = [ESI]; ESI++
- Example: `LODSB`

**STOSB / STOS** - Store string byte
- Cycles: 1
- Flags: None
- Operation: [EDI] = AL; EDI++
- Example: `STOSB`

**MOVSB / MOVS** - Move string byte
- Cycles: 1
- Flags: None
- Operation: [EDI] = [ESI]; ESI++; EDI++
- Example: `MOVSB`

**SCASB / SCAS** - Scan string byte
- Cycles: 1
- Flags: Z, C, O, S
- Operation: Compare AL with [EDI]; set flags; EDI++
- Example: `SCASB`

**CMPSB / CMPS** - Compare string bytes
- Cycles: 1
- Flags: Z, C, O, S
- Operation: Compare [ESI] with [EDI]; set flags; ESI++; EDI++
- Example: `CMPSB`

### Debugging

**INT3** - Breakpoint interrupt
- Cycles: 1
- Flags: None
- Operation: Triggers a debugger breakpoint and halts execution
- Example: `INT3`

## Memory-Mapped I/O

### LCD Display (0xF000-0xF0FF)
**Write-only** - Set pixel state

Address formula: `0xF000 + (y * width + x)`

```asm
MOV 0xF000, 1      ; Turn on pixel (0,0)
MOV 0xF008, 0      ; Turn off pixel (0,1) in 8x8 grid
```

### Keyboard (0x10100-0x10102)
**Read-only** - Keyboard input

- `0x10100` - Status register (1=key available, 0=empty)
- `0x10101` - Key code register (reading pops from queue)
- `0x10102` - Key state register (1=pressed, 0=released)

```asm
MOV EAX, 0x10100    ; Check keyboard status
MOV EBX, 0x10101    ; Read key code
MOV ECX, 0x10102    ; Read key state
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
  MOV EAX, 0x10100   ; Check keyboard
  CMP EAX, 1
  JNE loop          ; Wait for key
  
  MOV EBX, 0x10101   ; Read key code
  MOV ECX, 0x10102   ; Read key state
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

Example programs demonstrating each convention are available in the `examples/` folder.

## Verification Sources

This ISA documentation is verified against the following authoritative x86 assembly references:

- **x86 Assembly Guide** — University of Virginia CS216  
  By David Evans (originally by Adam Ferrari, updated by Alan Batson, Mike Lack, and Anita Jones)  
  https://www.cs.virginia.edu/~evans/cs216/guides/x86.html  
  Licensed under [Creative Commons BY-NC-SA 3.0 US](https://creativecommons.org/licenses/by-nc-sa/3.0/us/)

- **x86 Assembly Notes** — Shichao's Notes  
  Comprehensive reference on x86 architecture, instruction formats, addressing modes, and memory organization  
  https://notes.shichao.io/asm/#x86-assembly

- **Wikibooks: x86 Assembly**  
  Community-maintained x86 assembly language reference  
  https://en.wikibooks.org/wiki/X86_Assembly

These sources ensure TonX86's instruction implementations and x86 semantics are compliant with actual x86 architecture specifications.
