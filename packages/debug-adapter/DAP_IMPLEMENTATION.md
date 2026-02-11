# DAP (Debug Adapter Protocol) Implementation

## Overview

TonX86 includes a fully functional Debug Adapter Protocol (DAP) implementation that enables debugging of x86-like assembly programs in Visual Studio Code.

## Features

### ✅ Stepping Operations

The debug adapter supports all standard stepping operations:

- **Next (Step Over)**: Execute the current instruction and stop at the next instruction
- **Step In**: Execute the current instruction (same as Next for flat assembly programs)
- **Step Out**: Move to the next instruction (same as Next, as there are no function calls in flat assembly)

All stepping operations properly handle:
- Regular instructions (MOV, ADD, SUB, etc.)
- Jump instructions (JMP, JE, JZ, JNE, JNZ)
- Labels and label resolution
- CPU speed control (1-200% for adjustable execution speed)

### ✅ Breakpoint Support

The debug adapter supports setting and managing breakpoints:

- **Set Breakpoints**: Breakpoints can be set on any line containing an instruction
- **Breakpoint Validation**: The adapter validates breakpoints and only accepts those on valid instruction lines
- **Breakpoint Detection**: During execution, the adapter stops when a breakpoint is hit
- **Event Loop Yielding**: Every 1000 instructions, yields to the event loop with a 1ms sleep for responsive UI

### ✅ Execution Control

- **Continue**: Run the program until a breakpoint is hit or the program terminates with HLT
- **Pause**: Pause execution (implemented but depends on async execution)
- **Terminate**: Program automatically terminates when HLT instruction is reached

### ✅ Debug Information

- **Register Inspection**: View all registers (EAX, ECX, EDX, EBX, ESP, EBP, ESI, EDI) in hexadecimal format
- **Stack Trace**: Single stack frame showing current execution line
- **Source Viewing**: View the assembly source code being debugged

### ✅ Custom Features

- **LCD Display**: Custom request to get LCD pixel state
- **Keyboard Events**: Custom request to send keyboard events to the simulator
- **CPU Speed Control**: Adjustable execution speed from 1% to 200%
- **File Logging**: Optional file-based logging for debugging

## Implementation Details

### Assembly Parser

The debug adapter includes a robust assembly parser that:
- Parses instructions with mnemonics and operands
- Handles labels (lines ending with `:`)
- Skips empty lines and comments (lines starting with `;`)
- Preserves original line numbers for accurate debugging
- Strips inline comments from instructions

### Control Flow

The control flow implementation:
- Tracks instruction pointer (IP) as an index into the instruction array
- Handles unconditional jumps (JMP)
- Handles conditional jumps (JE, JZ, JNE, JNZ) based on Zero flag
- Resolves labels to instruction indices
- Includes error handling for invalid jump targets

### Breakpoint Handling

Breakpoints are checked:
1. After each instruction is executed
2. After the instruction pointer is moved
3. Only on valid instruction lines
4. With proper stopped event notification to the debugger

## Testing

The debug adapter includes comprehensive unit tests covering:

### Assembly Parser Tests (8 tests)
- ✅ Parse simple MOV instruction
- ✅ Skip empty lines and comments
- ✅ Parse labels correctly
- ✅ Handle instructions with inline comments
- ✅ Parse jump instructions
- ✅ Handle HLT instruction
- ✅ Parse complex programs with labels and jumps
- ✅ Preserve line numbers correctly

### Control Flow Tests (5 tests)
- ✅ Validate breakpoints on instruction lines
- ✅ Move to next instruction for non-jump
- ✅ Handle unconditional jump
- ✅ Handle conditional jump when zero flag set
- ✅ Not jump when condition not met

Run tests with:
```bash
cd packages/debug-adapter
npm test
```

## Example Usage

See `examples/test-dap.js` for a DAP protocol test utility that exercises:
- Basic stepping through instructions
- Arithmetic operations and flag setting
- Conditional jumps (JE, JNE)
- Unconditional jumps (JMP)
- Loops with counters
- Program termination with HLT

## Limitations

The current implementation has the following known limitations:

1. **No Conditional Breakpoints**: `supportsConditionalBreakpoints: false`
2. **No Function Breakpoints**: `supportsFunctionBreakpoints: false` (not applicable to flat assembly)
3. **No Step Back**: `supportsStepBack: false` (no reverse execution)
4. **Flat Program Model**: No call stack or function concepts
5. **Simple Pause**: Pause implementation is basic and depends on async execution

## Architecture

```
TonX86DebugSession
├── parseAssembly()         - Parse assembly file into instructions and labels
├── continueExecution()     - Execute until breakpoint or program end
├── nextRequest()           - Step over (execute one instruction)
├── stepInRequest()         - Step into (same as next)
├── stepOutRequest()        - Step out (same as next)
├── setBreakPointsRequest() - Set and validate breakpoints
├── continueRequest()       - Continue execution
└── pauseRequest()          - Pause execution
```

## Integration

The debug adapter integrates with:
- **@tonx86/simcore**: CPU simulator for instruction execution
- **vscode-debugadapter**: DAP protocol implementation
- **vscode-debugprotocol**: DAP protocol types

## Configuration

Launch configuration example (from `.vscode/launch.json`):
```json
{
  "type": "tonx86",
  "request": "launch",
  "name": "Debug TonX86 Program",
  "program": "${file}",
  "stopOnEntry": true,
  "cpuSpeed": 100,
  "enableLogging": false
}
```

Parameters:
- `program`: Path to the assembly file to debug
- `stopOnEntry`: If true, stops at the first instruction
- `cpuSpeed`: CPU execution speed (1-200%, default: 100)
- `enableLogging`: Enable file-based logging for debugging

## Conclusion

The DAP implementation in TonX86 is **feature-complete** for debugging flat assembly programs. It provides all essential debugging capabilities including stepping, breakpoints, and register inspection, with robust error handling and comprehensive test coverage.
