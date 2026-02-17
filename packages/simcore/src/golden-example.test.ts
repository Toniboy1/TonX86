/**
 * Example: How to Add New Golden Tests
 *
 * This file demonstrates how to add new tests to the golden test suite.
 * Copy the pattern below and modify for your specific instruction testing needs.
 */

import { Simulator } from "./simulator/index";

// Define the test case structure
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

/**
 * EXAMPLE 1: Testing a simple arithmetic operation
 */
describe("Example - Simple Arithmetic", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
    sim.reset();
  });

  const runGoldenTest = (test: GoldenTest) => {
    // Execute instructions
    for (const instr of test.instructions) {
      sim.executeInstruction(instr.mnemonic, instr.operands);
    }

    // Verify expected state
    if (test.expectedState.registers) {
      const regs = sim.getRegisters();
      for (const [reg, expectedValue] of Object.entries(test.expectedState.registers)) {
        expect(regs[reg as keyof typeof regs]).toBe(expectedValue);
      }
    }

    if (test.expectedState.flags) {
      if (test.expectedState.flags.zero !== undefined) {
        expect(sim.isZeroFlagSet()).toBe(test.expectedState.flags.zero);
      }
      if (test.expectedState.flags.carry !== undefined) {
        expect(sim.isCarryFlagSet()).toBe(test.expectedState.flags.carry);
      }
      if (test.expectedState.flags.overflow !== undefined) {
        expect(sim.isOverflowFlagSet()).toBe(test.expectedState.flags.overflow);
      }
      if (test.expectedState.flags.sign !== undefined) {
        expect(sim.isSignFlagSet()).toBe(test.expectedState.flags.sign);
      }
    }
  };

  const exampleTests: GoldenTest[] = [
    {
      name: "ADD two positive numbers",
      instructions: [
        { mnemonic: "MOV", operands: ["EAX", "100"] },
        { mnemonic: "MOV", operands: ["EBX", "200"] },
        { mnemonic: "ADD", operands: ["EAX", "EBX"] },
      ],
      expectedState: {
        registers: { EAX: 300, EBX: 200 },
        flags: { zero: false, carry: false, overflow: false, sign: false },
      },
    },
    {
      name: "SUB resulting in zero",
      instructions: [
        { mnemonic: "MOV", operands: ["ECX", "50"] },
        { mnemonic: "SUB", operands: ["ECX", "50"] },
      ],
      expectedState: {
        registers: { ECX: 0 },
        flags: { zero: true, carry: false },
      },
    },
  ];

  exampleTests.forEach((test) => {
    it(test.name, () => runGoldenTest(test));
  });
});

/**
 * EXAMPLE 2: Testing flag behavior
 */
describe("Example - Flag Behavior", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
    sim.reset();
  });

  it("Test overflow flag on signed addition", () => {
    // Max positive int32 + 1 should set overflow flag
    sim.executeInstruction("MOV", ["EAX", "0x7FFFFFFF"]);
    sim.executeInstruction("ADD", ["EAX", "1"]);

    expect(sim.getRegisters().EAX).toBe(0x80000000);
    expect(sim.isOverflowFlagSet()).toBe(true);
    expect(sim.isSignFlagSet()).toBe(true);
  });

  it("Test carry flag on unsigned overflow", () => {
    // Max uint32 + 1 should set carry flag
    sim.executeInstruction("MOV", ["EBX", "0xFFFFFFFF"]);
    sim.executeInstruction("ADD", ["EBX", "1"]);

    expect(sim.getRegisters().EBX).toBe(0);
    expect(sim.isCarryFlagSet()).toBe(true);
    expect(sim.isZeroFlagSet()).toBe(true);
  });
});

/**
 * EXAMPLE 3: Testing edge cases
 */
describe("Example - Edge Cases", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
    sim.reset();
  });

  it("Division by zero handling", () => {
    sim.executeInstruction("MOV", ["EAX", "100"]);
    sim.executeInstruction("MOV", ["EBX", "0"]);
    sim.executeInstruction("DIV", ["EBX"]);

    // Per implementation, DIV by zero sets result to 0
    expect(sim.getRegisters().EAX).toBe(0);
    expect(sim.getRegisters().EDX).toBe(0);
  });

  it("Shift left by large amount", () => {
    sim.executeInstruction("MOV", ["ECX", "0xFF"]);
    sim.executeInstruction("SHL", ["ECX", "8"]);

    expect(sim.getRegisters().ECX).toBe(0xff00);
  });

  it("Rotate right wrap-around", () => {
    sim.executeInstruction("MOV", ["EDX", "3"]); // 0b11
    sim.executeInstruction("ROR", ["EDX", "1"]);

    expect(sim.getRegisters().EDX).toBe(0x80000001);
  });
});

/**
 * EXAMPLE 4: Testing complex instruction sequences
 */
describe("Example - Complex Sequences", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
    sim.reset();
  });

  it("Calculate factorial of 5", () => {
    // 5! = 120
    sim.executeInstruction("MOV", ["EAX", "1"]); // Result accumulator
    sim.executeInstruction("MOV", ["ECX", "5"]); // Counter

    // Loop: EAX *= ECX; ECX--
    for (let i = 0; i < 5; i++) {
      sim.executeInstruction("IMUL", ["ECX"]);
      sim.executeInstruction("DEC", ["ECX"]);
    }

    expect(sim.getRegisters().EAX).toBe(120);
  });

  it("Check if number is power of 2", () => {
    // Power of 2 check: n & (n-1) == 0
    sim.executeInstruction("MOV", ["EAX", "16"]);
    sim.executeInstruction("MOV", ["EBX", "EAX"]);
    sim.executeInstruction("DEC", ["EBX"]);
    sim.executeInstruction("AND", ["EAX", "EBX"]);

    expect(sim.getRegisters().EAX).toBe(0);
    expect(sim.isZeroFlagSet()).toBe(true);
  });

  it("Swap values using XOR trick", () => {
    sim.executeInstruction("MOV", ["ESI", "100"]);
    sim.executeInstruction("MOV", ["EDI", "200"]);

    // XOR swap
    sim.executeInstruction("XOR", ["ESI", "EDI"]);
    sim.executeInstruction("XOR", ["EDI", "ESI"]);
    sim.executeInstruction("XOR", ["ESI", "EDI"]);

    expect(sim.getRegisters().ESI).toBe(200);
    expect(sim.getRegisters().EDI).toBe(100);
  });
});

/**
 * TIPS FOR WRITING GOLDEN TESTS:
 *
 * 1. Test Name: Be descriptive about what's being tested
 *    ✅ Good: "ADD with signed overflow"
 *    ❌ Bad: "Test ADD"
 *
 * 2. Instructions: Keep sequences concise and focused
 *    - Test one thing per test case
 *    - Use MOV to set up initial state
 *    - Execute the instruction being tested
 *
 * 3. Expected State: Be explicit about what should happen
 *    - Always specify expected register values
 *    - Always specify expected flag states (when relevant)
 *
 * 4. Edge Cases: Cover boundary conditions
 *    - Zero values
 *    - Maximum/minimum values
 *    - Overflow/underflow
 *    - Division by zero
 *
 * 5. Flags: Test all relevant flags
 *    - Zero (ZF): Result == 0
 *    - Carry (CF): Unsigned overflow/underflow
 *    - Overflow (OF): Signed overflow
 *    - Sign (SF): Negative result (bit 31 set)
 *
 * 6. Organization: Group related tests
 *    - Use describe() blocks for logical grouping
 *    - Use arrays for similar test cases
 *    - Use forEach() to run multiple tests with same structure
 *
 * 7. Verification: Always verify the test
 *    - Run: npm test golden.test.ts
 *    - Check coverage: npm test -- --coverage
 *    - Verify in CI: Push to GitHub and check Actions
 */

/**
 * COMMON PATTERNS (copy these to your test file):
 *
 * // Pattern 1: Testing immediate values
 * const immediateTest: GoldenTest = {
 *   name: "MOV immediate to register",
 *   instructions: [{ mnemonic: "MOV", operands: ["EAX", "42"] }],
 *   expectedState: {
 *     registers: { EAX: 42 },
 *   },
 * };
 *
 * // Pattern 2: Testing register-to-register operations
 * const registerTest: GoldenTest = {
 *   name: "ADD two registers",
 *   instructions: [
 *     { mnemonic: "MOV", operands: ["EAX", "10"] },
 *     { mnemonic: "MOV", operands: ["EBX", "20"] },
 *     { mnemonic: "ADD", operands: ["EAX", "EBX"] },
 *   ],
 *   expectedState: {
 *     registers: { EAX: 30, EBX: 20 },
 *   },
 * };
 *
 * // Pattern 3: Testing flag effects
 * const flagTest: GoldenTest = {
 *   name: "SUB to zero sets zero flag",
 *   instructions: [
 *     { mnemonic: "MOV", operands: ["ECX", "100"] },
 *     { mnemonic: "SUB", operands: ["ECX", "100"] },
 *   ],
 *   expectedState: {
 *     registers: { ECX: 0 },
 *     flags: { zero: true },
 *   },
 * };
 *
 * // Pattern 4: Testing hex values
 * const hexTest: GoldenTest = {
 *   name: "AND with hex mask",
 *   instructions: [
 *     { mnemonic: "MOV", operands: ["EDX", "0x12345678"] },
 *     { mnemonic: "AND", operands: ["EDX", "0xFF"] },
 *   ],
 *   expectedState: {
 *     registers: { EDX: 0x78 },
 *   },
 * };
 */

/**
 * EXPORTING FOR USE:
 *
 * To add these to the actual golden test suite:
 * 1. Copy the test structure to golden.test.ts
 * 2. Add to the appropriate describe() block
 * 3. Run npm test golden.test.ts
 * 4. Commit and push to trigger CI
 */
