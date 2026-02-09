# TonX86 Instruction Set Architecture

## Overview

TonX86 is an educational x86-like assembly instruction set designed for learning low-level programming concepts.

## Registers

- **EAX** (Accumulator)
- **ECX** (Counter)
- **EDX** (Data)
- **EBX** (Base)
- **ESP** (Stack Pointer)
- **EBP** (Base Pointer)
- **ESI** (Source Index)
- **EDI** (Destination Index)

## Memory

Two separate memory banks (A and B), each 64KB.

## Flags

- **Z** (Zero) - Set when result is zero
- **C** (Carry) - Set when operation overflows
- **O** (Overflow) - Set when signed overflow occurs
- **S** (Sign) - Set when result is negative

## Display

LCD Grid support from 2x4 to 16x16 pixels for visual feedback.

## Instructions

### Data Movement

**MOV reg, reg** - Move data between registers (1 cycle)

### Arithmetic

**ADD reg, reg** - Add two values (1 cycle, affects Z, C, O, S flags)

**SUB reg, reg** - Subtract two values (1 cycle, affects Z, C, O, S flags)

### Logical

**AND reg, reg** - Bitwise AND (1 cycle, affects Z, S flags)

**OR reg, reg** - Bitwise OR (1 cycle, affects Z, S flags)

### Control Flow

**JMP addr** - Unconditional jump (1 cycle)

**JZ addr** - Jump if zero flag set (1 cycle)

**HLT** - Halt execution (1 cycle)

## Example Program

```asm
MOV EAX, 5      ; Load 5 into EAX
MOV ECX, 3      ; Load 3 into ECX
ADD EAX, ECX    ; EAX = 8
HLT             ; Stop execution
```
