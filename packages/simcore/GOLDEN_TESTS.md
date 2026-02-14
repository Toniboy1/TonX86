# Golden Test Suite Documentation

## Overview

The Golden Test Suite provides comprehensive instruction-level validation for the TonX86 CPU simulator. It serves as a reference implementation for correct CPU behavior, ensuring that all instructions execute correctly with proper flag handling.

## Test Coverage

### Arithmetic Instructions (30 tests)
- **ADD**: Positive numbers, zero results, unsigned overflow (carry), signed overflow, negative numbers
- **SUB**: Basic subtraction, zero results, underflow (borrow), edge cases
- **INC/DEC**: Increment/decrement with overflow/underflow handling
- **MUL/IMUL**: Unsigned/signed multiplication with zero, overflow to EDX
- **DIV/IDIV**: Unsigned/signed division with quotient/remainder, division by zero handling
- **NEG**: Two's complement negation with overflow detection
- **CMP**: Comparison operations that set flags without modifying operands

### Logical Instructions (18 tests)
- **AND**: Bitwise AND with masking operations, zero results
- **OR**: Bitwise OR with identity operations, all bits set
- **XOR**: Bitwise XOR including zero-self trick, bit toggling
- **NOT**: Bitwise complement operations
- **TEST**: Logical AND for flag testing without modifying operands

### Shift and Rotate Instructions (15 tests)
- **SHL**: Shift left logical with various shift counts
- **SHR**: Shift right logical with high bit handling
- **SAR**: Shift arithmetic right with sign extension
- **ROL**: Rotate left with wrap-around
- **ROR**: Rotate right with wrap-around

### Stack Operations (5 tests)
- **PUSH/POP**: Stack operations with LIFO verification
- Register preservation through stack
- Immediate value push operations
- ESP manipulation validation

### Control Flow (9 tests)
- **Conditional Jumps**: Flag requirements for JE/JZ, JNE/JNZ, JS, JNS, JB, JAE
- **Signed Comparisons**: JG, JGE, JL, JLE flag interactions
- **Flag Conditions**: Zero, Sign, Carry, Overflow flag testing

### Flag Correctness (22 tests)
- **Zero Flag (ZF)**: Set/clear conditions for arithmetic and logical operations
- **Carry Flag (CF)**: Unsigned overflow/underflow detection
- **Overflow Flag (OF)**: Signed overflow detection
- **Sign Flag (SF)**: Negative result detection
- **Flag Preservation**: Instructions that don't modify flags (MOV, NOT)

### Complex Scenarios (7 tests)
Realistic programming patterns:
- Factorial calculation (iterative)
- Array sum simulation
- Bit counting algorithms
- Power of 2 detection using AND trick
- XOR swap technique
- Absolute value with conditional logic
- Min/Max using CMP

## Test Structure

### Golden Test Case Format

```typescript
interface GoldenTest {
  name: string;
  instructions: Array<{ mnemonic: string; operands: string[] }>;
  initialState?: {
    registers?: { [key: string]: number };
    flags?: number;
  };
  expectedState: {
    registers?: { [key: string]: number };
    flags?: {
      zero?: boolean;
      carry?: boolean;
      overflow?: boolean;
      sign?: boolean;
    };
  };
}
```

### Example Test

```typescript
{
  name: "ADD with signed overflow",
  instructions: [
    { mnemonic: "MOV", operands: ["EAX", "0x7FFFFFFF"] }, // Max positive int32
    { mnemonic: "ADD", operands: ["EAX", "1"] },
  ],
  expectedState: {
    registers: { EAX: 0x80000000 },
    flags: { zero: false, carry: false, overflow: true, sign: true },
  },
}
```

## Running the Tests

### Run all golden tests
```bash
cd packages/simcore
npm test golden.test.ts
```

### Run specific test suite
```bash
npm test -- golden.test.ts -t "Arithmetic"
npm test -- golden.test.ts -t "Flag Correctness"
```

### Run with coverage
```bash
npm test -- golden.test.ts --coverage
```

## CI Integration

The golden test suite is integrated into the CI pipeline ([.github/workflows/ci.yml](../../.github/workflows/ci.yml)):

```yaml
- name: Run golden test suite
  run: |
    cd packages/simcore
    npm test golden.test.ts
```

This ensures that all instruction implementations remain correct across all code changes.

## Adding New Tests

1. **Identify the instruction category** (arithmetic, logical, shift, etc.)
2. **Create a GoldenTest object** with clear test name
3. **Specify initial state** if needed (usually not required)
4. **List instructions** to execute
5. **Define expected state** including register values and flags
6. **Add to appropriate test array** and verify with `npm test`

### Example: Adding a new ADD test

```typescript
const addTests: GoldenTest[] = [
  // ... existing tests ...
  {
    name: "ADD with carry propagation",
    instructions: [
      { mnemonic: "MOV", operands: ["EAX", "0xFFFFFFFE"] },
      { mnemonic: "ADD", operands: ["EAX", "2"] },
    ],
    expectedState: {
      registers: { EAX: 0 },
      flags: { zero: true, carry: true },
    },
  },
];
```

## Flag Behavior Reference

### Zero Flag (ZF)
- Set when result equals zero
- Cleared when result is non-zero
- Used by: JE/JZ, JNE/JNZ

### Carry Flag (CF)
- Set on unsigned overflow (ADD) or underflow (SUB)
- Set by NEG on non-zero values
- Used by: JB, JAE, JBE, JA (unsigned comparisons)

### Overflow Flag (OF)
- Set on signed overflow (two positives → negative, or two negatives → positive)
- Used by: JG, JGE, JL, JLE (signed comparisons)

### Sign Flag (SF)
- Set when bit 31 is set (negative in signed interpretation)
- Cleared when bit 31 is clear
- Used by: JS, JNS

## Educational vs Strict-x86 Mode

Some instructions behave differently based on compatibility mode:

- **Educational Mode** (default): All instructions update flags for learning
  - DIV/IDIV: Set ZF and SF based on quotient
  - MUL/IMUL: Set ZF and SF based on lower 32 bits
  - Rotates: Set ZF and SF based on result

- **Strict-x86 Mode**: Matches real x86 processor
  - DIV/IDIV: All flags undefined (CF/OF cleared)
  - MUL/IMUL: ZF/SF undefined (cleared), CF/OF set on upper bits
  - Rotates: ZF/SF not modified

## Test Statistics

- **Total Tests**: 106
- **Test Suites**: 7 major categories
- **Instructions Covered**: 30+ unique instructions
- **Flag Combinations**: 20+ different flag states validated
- **Edge Cases**: 15+ boundary conditions tested

## Benefits

1. **Regression Prevention**: Catch instruction bugs immediately
2. **Documentation**: Tests serve as executable specification
3. **Confidence**: Comprehensive validation of CPU behavior
4. **Learning Tool**: Clear examples of instruction behavior
5. **CI Integration**: Automatic validation on every commit

## Resources

- [Instruction Set Architecture](../docs/ISA.md)
- [Simulator Implementation](../packages/simcore/src/simulator.ts)
- [Example Programs](../examples/)
- [Prompt File](.github/prompts/simcore.prompt.md)
