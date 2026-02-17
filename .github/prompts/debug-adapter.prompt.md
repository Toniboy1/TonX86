# TonX86 — DEBUG ADAPTER PROMPT

Debug Adapter Protocol (DAP) server for TonX86 assembly debugging.

## Architecture (Updated v0.5.0)

The Debug Adapter coordinates debugging sessions between VS Code and the simcore execution engine.

**Simcore now owns**: EIP, instructions array, labels map, control flow logic (JMP/CALL/RET), call stack

**Debug Adapter owns**: Breakpoints, current line tracking, execution control (continue/pause/step), speed control

## DAP Protocol Implementation

- `initialize` - Capability negotiation
- `launch` - Load .asm file, parse instructions/labels/constants, create simulator, load into simcore
- `configurationDone` - Ready for execution
- `setBreakpoints` - Validate against instruction lines from `simulator.getInstructions()`
- `continue` - Execute until breakpoint/HLT via `simulator.step()`
- `pause` - Stop execution
- `next` - Execute one instruction via `simulator.step()`
- `stepIn` - Same as next (simcore handles CALL internally)
- `stepOut` - Same as next
- `threads` - Single thread (ID=1)
- `stackTrace` - Single frame with current line
- `scopes` - Registers scope
- `variables` - Return EAX-EDI (and 8-bit aliases AL-BH) in hex format

## Custom Requests

- `getLCDState` - Return pixel array from simulator (up to 64x64)
- `keyboardEvent` - Forward {keyCode, pressed} to simulator

## Execution Model (v0.5.0)

1. Parse assembly into Instruction[] with labels Map<string, index> and constants
2. Load into simcore: `simulator.loadInstructions(instructions, labels)`
3. Execute via `simulator.step()` which:
   - Executes instruction at EIP
   - Handles control flow (JMP/CALL/RET/conditional jumps)
   - Updates EIP automatically
   - Returns executed line number
4. Debug adapter tracks current line from step() return value
5. Check for breakpoints before each step
6. Check halted state after each step

## CPU Speed Control

- Read `cpuSpeed` (1-200%) from launch args (injected by extension from settings)
- Speed implementation:
  - **≤ 50%**: Yield every 100 instructions, sleep 5ms
  - **51-99%**: Yield every 100 instructions, sleep 2ms
  - **100%**: Yield every 100 instructions, sleep 1ms (normal)
  - **> 100%**: Yield every (1000 × speed/100) instructions, sleep 0.1ms
    - 200%: Yield every 2000 instructions → 20x less yielding
- Always sleep at least 0.1ms to ensure event loop can process DAP requests
- Configured via `tonx86.cpu.speed` extension setting

## Optional Logging

- Read `enableLogging` from launch args (injected by extension from settings)
- When true: Create `tonx86-debug.log` in program directory
- When false: No file I/O (performance optimized)
- Configured via `tonx86.debug.enableLogging` extension setting

## Stopped Events

- `entry` - Initial stop at first instruction
- `step` - After next/stepIn/stepOut
- `breakpoint` - Hit breakpoint
- Terminate - HLT instruction or error

## Memory-Mapped I/O

- **LCD**: 0xF000-0xFFFF (64x64 max = 4096 pixels)
- **Keyboard**: 0x10100 (status), 0x10101 (keycode), 0x10102 (keystate)

## Supported Instructions

All instructions from ISA: MOV, XCHG, LEA, MOVZX, MOVSX, ADD, SUB, INC, DEC, MUL, IMUL, DIV, IDIV, MOD, CMP, NEG, AND, OR, XOR, NOT, TEST, SHL, SHR, SAR, ROL, ROR, JMP, JE/JZ, JNE/JNZ, JG, JGE, JL, JLE, JS, JNS, JA, JAE, JB, JBE, PUSH, POP, CALL, RET, INT, IRET, RAND, HLT
