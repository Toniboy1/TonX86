# @tonx86/simcore

Core CPU simulator for TonX86 assembly execution.

## Features

- 8 x 32-bit registers (EAX, ECX, EDX, EBX, ESP, EBP, ESI, EDI)
- 8-bit register support (AL, AH, CL, CH, DL, DH, BL, BH)
- CPU flags (Zero, Carry, Overflow, Sign)
- 64KB dual-bank memory (Memory A, Memory B)
- Memory-mapped I/O (LCD Display, Keyboard)
- 30+ x86-like instructions
- Control flow management (EIP, labels, jumps)
- Stack operations (PUSH, POP, CALL, RET)
- Interrupt handling (INT 0x10, 0x20, 0x21)
- Breakpoint support

## Testing

### Unit Tests
```bash
npm test
```

### Golden Test Suite
Comprehensive instruction-level validation suite with 106 tests covering:
- Arithmetic operations (ADD, SUB, MUL, DIV, NEG, etc.)
- Logical operations (AND, OR, XOR, NOT, TEST)
- Shift/rotate operations (SHL, SHR, SAR, ROL, ROR)
- Stack operations (PUSH, POP)
- Control flow (conditional jumps, flag testing)
- Flag correctness (Z, C, O, S flags)

```bash
npm test golden.test.ts
```

See [GOLDEN_TESTS.md](./GOLDEN_TESTS.md) for detailed documentation.

### Test Coverage
```bash
npm test -- --coverage
```

## API

### Initialization
```typescript
import { Simulator } from '@tonx86/simcore';

const sim = new Simulator();
sim.reset();
```

### Loading Programs
```typescript
// Load instructions and labels
const instructions = [
  { line: 1, mnemonic: "MOV", operands: ["EAX", "10"], raw: "MOV EAX, 10" },
  { line: 2, mnemonic: "ADD", operands: ["EAX", "20"], raw: "ADD EAX, 20" },
];
const labels = new Map([["start", 0]]);

sim.loadInstructions(instructions, labels);
```

### Execution
```typescript
// Execute one instruction
const lineNumber = sim.step();

// Execute single instruction (no control flow)
sim.executeInstruction("MOV", ["EAX", "42"]);
```

### State Access
```typescript
// Get registers
const regs = sim.getRegisters(); // { EAX, ECX, EDX, EBX, ESP, EBP, ESI, EDI }

// Get CPU state
const state = sim.getState(); // { registers, memory, flags, eip, callStackDepth }

// Check flags
const isZero = sim.isZeroFlagSet();
const hasCarry = sim.isCarryFlagSet();
const hasOverflow = sim.isOverflowFlagSet();
const isNegative = sim.isSignFlagSet();

// Get EIP
const eip = sim.getEIP();
```

### I/O Operations
```typescript
// LCD Display (64x64 pixels)
const display = sim.getLCDDisplay(); // Uint8Array

// Keyboard
sim.pushKeyboardEvent(65, true); // Key 'A' pressed
const status = sim.getKeyboardStatus();
```

## Instruction Set

See the [ISA documentation](../docs/ISA.md) for complete instruction reference.

### Data Movement
MOV, XCHG, LEA, MOVZX, MOVSX, PUSH, POP

### Arithmetic
ADD, SUB, INC, DEC, MUL, IMUL, DIV, IDIV, NEG, CMP, MOD

### Logical
AND, OR, XOR, NOT, TEST

### Shift/Rotate
SHL, SHR, SAR, ROL, ROR

### Control Flow
JMP, JE/JZ, JNE/JNZ, JG, JGE, JL, JLE, JS, JNS, JA, JAE, JB, JBE, CALL, RET, HLT

### Interrupts
INT, IRET

### Special
NOP, RAND

## Development

```bash
# Build
npm run build

# Watch mode
npm run watch

# Lint
npm run lint

# Test with coverage
npm test -- --coverage
```

## Architecture

- `simulator.ts` - Main simulator class with instruction execution
- `simulator.test.ts` - Unit tests for core functionality
- `golden.test.ts` - Golden test suite for instruction validation
- `index.ts` - Public API exports

## License

MIT
