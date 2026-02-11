# TonX86 — DEBUG ADAPTER PROMPT

DAP server for TonX86 assembly debugging.

## DAP Protocol Implementation
- `initialize` - Capability negotiation
- `launch` - Load .asm file, parse instructions/labels/constants, create simulator
- `configurationDone` - Ready for execution
- `setBreakpoints` - Validate against instruction lines only
- `continue` - Execute until breakpoint/HLT (max 100k iterations)
- `pause` - Stop execution
- `next` - Execute one instruction, advance IP
- `stepIn` - Same as next (no nested execution in simulator)
- `stepOut` - Same as next
- `threads` - Single thread (ID=1)
- `stackTrace` - Single frame with current line
- `scopes` - Registers scope
- `variables` - Return EAX-EDI (and 8-bit aliases AL-BH) in hex format

## Custom Requests
- `getLCDState` - Return pixel array from simulator (up to 64x64)
- `keyboardEvent` - Forward {keyCode, pressed} to simulator

## Execution Model
- Parse assembly into Instruction[] with labels Map<string, index> and constants
- Support for EQU constants: `NAME: EQU value`
- Instruction pointer (IP) tracks current instruction index
- Execute via `simulator.executeInstruction(mnemonic, operands)`
- Jump instructions: Set IP to label index, loop continues
- Stack operations: PUSH/POP, CALL/RET handled properly
- Interrupt handling: INT executes based on interrupt number
- Breakpoint check: After IP moves, check if new line has breakpoint
- HLT: Terminate session immediately

## CPU Speed Control
- Read `cpuSpeed` (1-200%) from launch args
- Formula: `delayMs = (100 - speed) / 2` for speeds < 100%
- Apply async delay in continueExecution() loop
- 50% speed = ~1ms delay, 1% speed = ~50ms delay

## Optional Logging
- Read `enableLogging` from launch args (default: false)
- When true: Create `tonx86-debug.log` in program directory
- When false: No file I/O (performance optimized)

## Stopped Events
- `entry` - Initial stop at first instruction
- `step` - After next/stepIn/stepOut
- `breakpoint` - Hit breakpoint
- `pause` - Iteration limit reached (100k)
- Terminate - HLT instruction or error

## Memory-Mapped I/O
- **LCD**: 0xF000-0xFFFF (64x64 max = 4096 pixels)
- **Keyboard**: 0x10100 (status), 0x10101 (keycode), 0x10102 (keystate)

## Supported Instructions
All instructions from ISA: MOV, XCHG, LEA, MOVZX, MOVSX, ADD, SUB, INC, DEC, MUL, IMUL, DIV, IDIV, MOD, CMP, NEG, AND, OR, XOR, NOT, TEST, SHL, SHR, SAR, ROL, ROR, JMP, JE/JZ, JNE/JNZ, PUSH, POP, CALL, RET, INT, IRET, RAND, HLT
