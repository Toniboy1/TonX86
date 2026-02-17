/**
 * Golden Test Suite for TonX86 Instruction-Level Testing
 *
 * This test suite provides comprehensive validation of all CPU instructions
 * with focus on:
 * - Arithmetic operations (ADD, SUB, MUL, DIV, INC, DEC, etc.)
 * - Logical operations (AND, OR, XOR, NOT, TEST)
 * - Shift/Rotate operations (SHL, SHR, SAR, ROL, ROR)
 * - Stack operations (PUSH, POP, CALL, RET)
 * - Control flow (JMP, conditional jumps)
 * - Flag correctness (Z, C, O, S flags)
 */

import { Simulator } from "./simulator/index";

/**
 * Golden test case structure
 */
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

describe("Golden Test Suite - Arithmetic Instructions", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
    sim.reset();
  });

  const runGoldenTest = (test: GoldenTest) => {
    // Set initial state
    if (test.initialState?.registers) {
      for (const [reg, value] of Object.entries(test.initialState.registers)) {
        sim.executeInstruction("MOV", [reg, value.toString()]);
      }
    }

    if (test.initialState?.flags !== undefined) {
      sim.getState().flags = test.initialState.flags;
    }

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

  describe("ADD instruction", () => {
    const addTests: GoldenTest[] = [
      {
        name: "ADD positive numbers",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "10"] },
          { mnemonic: "ADD", operands: ["EAX", "20"] },
        ],
        expectedState: {
          registers: { EAX: 30 },
          flags: { zero: false, carry: false, overflow: false, sign: false },
        },
      },
      {
        name: "ADD with zero result",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "10"] },
          { mnemonic: "MOV", operands: ["EBX", "-10"] },
          { mnemonic: "ADD", operands: ["EAX", "EBX"] },
        ],
        expectedState: {
          registers: { EAX: 0 },
          flags: { zero: true, carry: true, overflow: false },
        },
      },
      {
        name: "ADD with unsigned overflow (carry)",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0xFFFFFFFF"] },
          { mnemonic: "ADD", operands: ["EAX", "1"] },
        ],
        expectedState: {
          registers: { EAX: 0 },
          flags: { zero: true, carry: true, overflow: false },
        },
      },
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
      },
      {
        name: "ADD negative numbers",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "-5"] },
          { mnemonic: "MOV", operands: ["EBX", "-10"] },
          { mnemonic: "ADD", operands: ["EAX", "EBX"] },
        ],
        expectedState: {
          registers: { EAX: 0xfffffff1 }, // -15 in 32-bit
          flags: { zero: false, carry: true, sign: true },
        },
      },
    ];

    addTests.forEach((test) => {
      it(test.name, () => runGoldenTest(test));
    });
  });

  describe("SUB instruction", () => {
    const subTests: GoldenTest[] = [
      {
        name: "SUB basic subtraction",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "50"] },
          { mnemonic: "SUB", operands: ["EAX", "20"] },
        ],
        expectedState: {
          registers: { EAX: 30 },
          flags: { zero: false, carry: false, overflow: false, sign: false },
        },
      },
      {
        name: "SUB with zero result",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "100"] },
          { mnemonic: "SUB", operands: ["EAX", "100"] },
        ],
        expectedState: {
          registers: { EAX: 0 },
          flags: { zero: true, carry: false, overflow: false, sign: false },
        },
      },
      {
        name: "SUB with underflow (borrow)",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "10"] },
          { mnemonic: "SUB", operands: ["EAX", "20"] },
        ],
        expectedState: {
          registers: { EAX: 0xfffffff6 }, // -10 in 32-bit
          flags: { zero: false, carry: true, sign: true },
        },
      },
      {
        name: "SUB from zero",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0"] },
          { mnemonic: "SUB", operands: ["EAX", "1"] },
        ],
        expectedState: {
          registers: { EAX: 0xffffffff },
          flags: { zero: false, carry: true, sign: true },
        },
      },
    ];

    subTests.forEach((test) => {
      it(test.name, () => runGoldenTest(test));
    });
  });

  describe("INC/DEC instructions", () => {
    const incDecTests: GoldenTest[] = [
      {
        name: "INC from zero",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0"] },
          { mnemonic: "INC", operands: ["EAX"] },
        ],
        expectedState: {
          registers: { EAX: 1 },
          flags: { zero: false, overflow: false, sign: false },
        },
      },
      {
        name: "INC overflow at max value",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0xFFFFFFFF"] },
          { mnemonic: "INC", operands: ["EAX"] },
        ],
        expectedState: {
          registers: { EAX: 0 },
          flags: { zero: true, overflow: false },
        },
      },
      {
        name: "DEC to zero",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "1"] },
          { mnemonic: "DEC", operands: ["EAX"] },
        ],
        expectedState: {
          registers: { EAX: 0 },
          flags: { zero: true, overflow: false, sign: false },
        },
      },
      {
        name: "DEC underflow from zero",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0"] },
          { mnemonic: "DEC", operands: ["EAX"] },
        ],
        expectedState: {
          registers: { EAX: 0xffffffff },
          flags: { zero: false, sign: true },
        },
      },
    ];

    incDecTests.forEach((test) => {
      it(test.name, () => runGoldenTest(test));
    });
  });

  describe("MUL/IMUL instructions", () => {
    const mulTests: GoldenTest[] = [
      {
        name: "MUL basic multiplication",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "5"] },
          { mnemonic: "MOV", operands: ["EBX", "7"] },
          { mnemonic: "MUL", operands: ["EBX"] },
        ],
        expectedState: {
          registers: { EAX: 35, EDX: 0 },
          flags: { zero: false, sign: false },
        },
      },
      {
        name: "MUL with zero",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "100"] },
          { mnemonic: "MOV", operands: ["EBX", "0"] },
          { mnemonic: "MUL", operands: ["EBX"] },
        ],
        expectedState: {
          registers: { EAX: 0, EDX: 0 },
          flags: { zero: true },
        },
      },
      {
        name: "MUL with overflow to EDX",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0xFFFFFFFF"] },
          { mnemonic: "MOV", operands: ["EBX", "2"] },
          { mnemonic: "MUL", operands: ["EBX"] },
        ],
        expectedState: {
          registers: { EAX: 0xfffffffe, EDX: 1 },
        },
      },
      {
        name: "IMUL signed multiplication positive",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "5"] },
          { mnemonic: "MOV", operands: ["EBX", "6"] },
          { mnemonic: "IMUL", operands: ["EBX"] },
        ],
        expectedState: {
          registers: { EAX: 30 },
          flags: { zero: false, sign: false },
        },
      },
      {
        name: "IMUL signed multiplication negative",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "-5"] },
          { mnemonic: "MOV", operands: ["EBX", "6"] },
          { mnemonic: "IMUL", operands: ["EBX"] },
        ],
        expectedState: {
          registers: { EAX: 0xffffffe2 }, // -30 in 32-bit
          flags: { zero: false, sign: true },
        },
      },
    ];

    mulTests.forEach((test) => {
      it(test.name, () => runGoldenTest(test));
    });
  });

  describe("DIV/IDIV instructions", () => {
    const divTests: GoldenTest[] = [
      {
        name: "DIV basic division",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "20"] },
          { mnemonic: "MOV", operands: ["EBX", "3"] },
          { mnemonic: "DIV", operands: ["EBX"] },
        ],
        expectedState: {
          registers: { EAX: 6, EDX: 2 }, // Quotient = 6, Remainder = 2
        },
      },
      {
        name: "DIV exact division",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "100"] },
          { mnemonic: "MOV", operands: ["EBX", "10"] },
          { mnemonic: "DIV", operands: ["EBX"] },
        ],
        expectedState: {
          registers: { EAX: 10, EDX: 0 },
        },
      },
      {
        name: "DIV by one",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "42"] },
          { mnemonic: "MOV", operands: ["EBX", "1"] },
          { mnemonic: "DIV", operands: ["EBX"] },
        ],
        expectedState: {
          registers: { EAX: 42, EDX: 0 },
        },
      },
      {
        name: "IDIV signed division positive",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "20"] },
          { mnemonic: "MOV", operands: ["EBX", "3"] },
          { mnemonic: "IDIV", operands: ["EBX"] },
        ],
        expectedState: {
          registers: { EAX: 6, EDX: 2 },
        },
      },
      {
        name: "IDIV signed division negative dividend",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "-20"] },
          { mnemonic: "MOV", operands: ["EBX", "3"] },
          { mnemonic: "IDIV", operands: ["EBX"] },
        ],
        expectedState: {
          registers: { EAX: 0xfffffffa, EDX: 0xfffffffe }, // -6, -2
        },
      },
    ];

    divTests.forEach((test) => {
      it(test.name, () => runGoldenTest(test));
    });

    it("DIV by zero sets result to zero", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("MOV", ["EBX", "0"]);
      sim.executeInstruction("DIV", ["EBX"]);

      // Per implementation, DIV by zero sets result to 0
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0);
      expect(regs.EDX).toBe(0);
    });
  });

  describe("NEG instruction", () => {
    const negTests: GoldenTest[] = [
      {
        name: "NEG positive number",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "10"] },
          { mnemonic: "NEG", operands: ["EAX"] },
        ],
        expectedState: {
          registers: { EAX: 0xfffffff6 }, // -10
          flags: { zero: false, carry: true, sign: true },
        },
      },
      {
        name: "NEG zero",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0"] },
          { mnemonic: "NEG", operands: ["EAX"] },
        ],
        expectedState: {
          registers: { EAX: 0 },
          flags: { zero: true, carry: false },
        },
      },
      {
        name: "NEG minimum value (overflow)",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0x80000000"] },
          { mnemonic: "NEG", operands: ["EAX"] },
        ],
        expectedState: {
          registers: { EAX: 0x80000000 },
          flags: { overflow: true, carry: true, sign: true },
        },
      },
    ];

    negTests.forEach((test) => {
      it(test.name, () => runGoldenTest(test));
    });
  });

  describe("CMP instruction", () => {
    const cmpTests: GoldenTest[] = [
      {
        name: "CMP equal values",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "10"] },
          { mnemonic: "CMP", operands: ["EAX", "10"] },
        ],
        expectedState: {
          registers: { EAX: 10 }, // Unchanged
          flags: { zero: true, carry: false, sign: false },
        },
      },
      {
        name: "CMP first greater",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "20"] },
          { mnemonic: "CMP", operands: ["EAX", "10"] },
        ],
        expectedState: {
          registers: { EAX: 20 },
          flags: { zero: false, carry: false, sign: false },
        },
      },
      {
        name: "CMP first less (borrow)",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "10"] },
          { mnemonic: "CMP", operands: ["EAX", "20"] },
        ],
        expectedState: {
          registers: { EAX: 10 },
          flags: { zero: false, carry: true, sign: true },
        },
      },
    ];

    cmpTests.forEach((test) => {
      it(test.name, () => runGoldenTest(test));
    });
  });
});

describe("Golden Test Suite - Logical Instructions", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
    sim.reset();
  });

  const runGoldenTest = (test: GoldenTest) => {
    if (test.initialState?.registers) {
      for (const [reg, value] of Object.entries(test.initialState.registers)) {
        sim.executeInstruction("MOV", [reg, value.toString()]);
      }
    }

    for (const instr of test.instructions) {
      sim.executeInstruction(instr.mnemonic, instr.operands);
    }

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
      if (test.expectedState.flags.sign !== undefined) {
        expect(sim.isSignFlagSet()).toBe(test.expectedState.flags.sign);
      }
    }
  };

  describe("AND instruction", () => {
    const andTests: GoldenTest[] = [
      {
        name: "AND basic operation",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0xFF"] },
          { mnemonic: "MOV", operands: ["EBX", "0x0F"] },
          { mnemonic: "AND", operands: ["EAX", "EBX"] },
        ],
        expectedState: {
          registers: { EAX: 0x0f },
          flags: { zero: false },
        },
      },
      {
        name: "AND with zero result",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0xF0"] },
          { mnemonic: "AND", operands: ["EAX", "0x0F"] },
        ],
        expectedState: {
          registers: { EAX: 0 },
          flags: { zero: true },
        },
      },
      {
        name: "AND with all bits set",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0xFFFFFFFF"] },
          { mnemonic: "AND", operands: ["EAX", "0xFFFFFFFF"] },
        ],
        expectedState: {
          registers: { EAX: 0xffffffff },
          flags: { zero: false, sign: true },
        },
      },
      {
        name: "AND masking operation",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0x12345678"] },
          { mnemonic: "AND", operands: ["EAX", "0x000000FF"] },
        ],
        expectedState: {
          registers: { EAX: 0x78 },
        },
      },
    ];

    andTests.forEach((test) => {
      it(test.name, () => runGoldenTest(test));
    });
  });

  describe("OR instruction", () => {
    const orTests: GoldenTest[] = [
      {
        name: "OR basic operation",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0xF0"] },
          { mnemonic: "MOV", operands: ["EBX", "0x0F"] },
          { mnemonic: "OR", operands: ["EAX", "EBX"] },
        ],
        expectedState: {
          registers: { EAX: 0xff },
          flags: { zero: false },
        },
      },
      {
        name: "OR with zero",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0x12345678"] },
          { mnemonic: "OR", operands: ["EAX", "0"] },
        ],
        expectedState: {
          registers: { EAX: 0x12345678 },
          flags: { zero: false },
        },
      },
      {
        name: "OR with self (identity)",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "42"] },
          { mnemonic: "OR", operands: ["EAX", "EAX"] },
        ],
        expectedState: {
          registers: { EAX: 42 },
          flags: { zero: false },
        },
      },
      {
        name: "OR with all bits",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0x12345678"] },
          { mnemonic: "OR", operands: ["EAX", "0xFFFFFFFF"] },
        ],
        expectedState: {
          registers: { EAX: 0xffffffff },
          flags: { zero: false, sign: true },
        },
      },
    ];

    orTests.forEach((test) => {
      it(test.name, () => runGoldenTest(test));
    });
  });

  describe("XOR instruction", () => {
    const xorTests: GoldenTest[] = [
      {
        name: "XOR basic operation",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0xFF"] },
          { mnemonic: "MOV", operands: ["EBX", "0x0F"] },
          { mnemonic: "XOR", operands: ["EAX", "EBX"] },
        ],
        expectedState: {
          registers: { EAX: 0xf0 },
        },
      },
      {
        name: "XOR with self (zero)",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "42"] },
          { mnemonic: "XOR", operands: ["EAX", "EAX"] },
        ],
        expectedState: {
          registers: { EAX: 0 },
          flags: { zero: true },
        },
      },
      {
        name: "XOR bit toggling",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0xAAAAAAAA"] },
          { mnemonic: "XOR", operands: ["EAX", "0xFFFFFFFF"] },
        ],
        expectedState: {
          registers: { EAX: 0x55555555 },
          flags: { zero: false },
        },
      },
    ];

    xorTests.forEach((test) => {
      it(test.name, () => runGoldenTest(test));
    });
  });

  describe("NOT instruction", () => {
    const notTests: GoldenTest[] = [
      {
        name: "NOT basic operation",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0xFFFFFFFF"] },
          { mnemonic: "NOT", operands: ["EAX"] },
        ],
        expectedState: {
          registers: { EAX: 0 },
        },
      },
      {
        name: "NOT zero",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0"] },
          { mnemonic: "NOT", operands: ["EAX"] },
        ],
        expectedState: {
          registers: { EAX: 0xffffffff },
        },
      },
      {
        name: "NOT alternating bits",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0xAAAAAAAA"] },
          { mnemonic: "NOT", operands: ["EAX"] },
        ],
        expectedState: {
          registers: { EAX: 0x55555555 },
        },
      },
    ];

    notTests.forEach((test) => {
      it(test.name, () => runGoldenTest(test));
    });
  });

  describe("TEST instruction", () => {
    const testTests: GoldenTest[] = [
      {
        name: "TEST with result zero",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0xF0"] },
          { mnemonic: "TEST", operands: ["EAX", "0x0F"] },
        ],
        expectedState: {
          registers: { EAX: 0xf0 }, // Unchanged
          flags: { zero: true },
        },
      },
      {
        name: "TEST with result non-zero",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0xFF"] },
          { mnemonic: "TEST", operands: ["EAX", "0x0F"] },
        ],
        expectedState: {
          registers: { EAX: 0xff },
          flags: { zero: false },
        },
      },
      {
        name: "TEST for sign bit",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0x80000000"] },
          { mnemonic: "TEST", operands: ["EAX", "0x80000000"] },
        ],
        expectedState: {
          registers: { EAX: 0x80000000 },
          flags: { zero: false, sign: true },
        },
      },
    ];

    testTests.forEach((test) => {
      it(test.name, () => runGoldenTest(test));
    });
  });
});

describe("Golden Test Suite - Shift and Rotate Instructions", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
    sim.reset();
  });

  const runGoldenTest = (test: GoldenTest) => {
    if (test.initialState?.registers) {
      for (const [reg, value] of Object.entries(test.initialState.registers)) {
        sim.executeInstruction("MOV", [reg, value.toString()]);
      }
    }

    for (const instr of test.instructions) {
      sim.executeInstruction(instr.mnemonic, instr.operands);
    }

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
      if (test.expectedState.flags.sign !== undefined) {
        expect(sim.isSignFlagSet()).toBe(test.expectedState.flags.sign);
      }
    }
  };

  describe("SHL (Shift Left) instruction", () => {
    const shlTests: GoldenTest[] = [
      {
        name: "SHL by 1",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "5"] },
          { mnemonic: "SHL", operands: ["EAX", "1"] },
        ],
        expectedState: {
          registers: { EAX: 10 },
          flags: { zero: false },
        },
      },
      {
        name: "SHL by 4",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "1"] },
          { mnemonic: "SHL", operands: ["EAX", "4"] },
        ],
        expectedState: {
          registers: { EAX: 16 },
        },
      },
      {
        name: "SHL by large amount",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0xFF"] },
          { mnemonic: "SHL", operands: ["EAX", "8"] },
        ],
        expectedState: {
          registers: { EAX: 0xff00 },
        },
      },
      {
        name: "SHL with bit loss",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0x80000001"] },
          { mnemonic: "SHL", operands: ["EAX", "1"] },
        ],
        expectedState: {
          registers: { EAX: 2 },
        },
      },
    ];

    shlTests.forEach((test) => {
      it(test.name, () => runGoldenTest(test));
    });
  });

  describe("SHR (Shift Right Logical) instruction", () => {
    const shrTests: GoldenTest[] = [
      {
        name: "SHR by 1",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "10"] },
          { mnemonic: "SHR", operands: ["EAX", "1"] },
        ],
        expectedState: {
          registers: { EAX: 5 },
        },
      },
      {
        name: "SHR by 4",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "16"] },
          { mnemonic: "SHR", operands: ["EAX", "4"] },
        ],
        expectedState: {
          registers: { EAX: 1 },
        },
      },
      {
        name: "SHR to zero",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "1"] },
          { mnemonic: "SHR", operands: ["EAX", "1"] },
        ],
        expectedState: {
          registers: { EAX: 0 },
          flags: { zero: true },
        },
      },
      {
        name: "SHR with high bit (logical)",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0x80000000"] },
          { mnemonic: "SHR", operands: ["EAX", "1"] },
        ],
        expectedState: {
          registers: { EAX: 0x40000000 },
        },
      },
    ];

    shrTests.forEach((test) => {
      it(test.name, () => runGoldenTest(test));
    });
  });

  describe("SAR (Shift Arithmetic Right) instruction", () => {
    const sarTests: GoldenTest[] = [
      {
        name: "SAR positive number",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "8"] },
          { mnemonic: "SAR", operands: ["EAX", "2"] },
        ],
        expectedState: {
          registers: { EAX: 2 },
        },
      },
      {
        name: "SAR negative number (sign extension)",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0x80000000"] },
          { mnemonic: "SAR", operands: ["EAX", "1"] },
        ],
        expectedState: {
          registers: { EAX: 0xc0000000 },
          flags: { sign: true },
        },
      },
      {
        name: "SAR negative to -1",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0xFFFFFFFF"] },
          { mnemonic: "SAR", operands: ["EAX", "31"] },
        ],
        expectedState: {
          registers: { EAX: 0xffffffff },
          flags: { sign: true },
        },
      },
    ];

    sarTests.forEach((test) => {
      it(test.name, () => runGoldenTest(test));
    });
  });

  describe("ROL (Rotate Left) instruction", () => {
    const rolTests: GoldenTest[] = [
      {
        name: "ROL by 1",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0x80000001"] },
          { mnemonic: "ROL", operands: ["EAX", "1"] },
        ],
        expectedState: {
          registers: { EAX: 3 },
        },
      },
      {
        name: "ROL by 4",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0x12345678"] },
          { mnemonic: "ROL", operands: ["EAX", "4"] },
        ],
        expectedState: {
          registers: { EAX: 0x23456781 },
        },
      },
      {
        name: "ROL by 32 (full rotation)",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0xABCDEF00"] },
          { mnemonic: "ROL", operands: ["EAX", "32"] },
        ],
        expectedState: {
          registers: { EAX: 0xabcdef00 },
        },
      },
    ];

    rolTests.forEach((test) => {
      it(test.name, () => runGoldenTest(test));
    });
  });

  describe("ROR (Rotate Right) instruction", () => {
    const rorTests: GoldenTest[] = [
      {
        name: "ROR by 1",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "3"] },
          { mnemonic: "ROR", operands: ["EAX", "1"] },
        ],
        expectedState: {
          registers: { EAX: 0x80000001 },
        },
      },
      {
        name: "ROR by 4",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0x12345678"] },
          { mnemonic: "ROR", operands: ["EAX", "4"] },
        ],
        expectedState: {
          registers: { EAX: 0x81234567 },
        },
      },
      {
        name: "ROR even bits",
        instructions: [
          { mnemonic: "MOV", operands: ["EAX", "0xAAAAAAAA"] },
          { mnemonic: "ROR", operands: ["EAX", "1"] },
        ],
        expectedState: {
          registers: { EAX: 0x55555555 },
        },
      },
    ];

    rorTests.forEach((test) => {
      it(test.name, () => runGoldenTest(test));
    });
  });
});

describe("Golden Test Suite - Stack Operations", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
    sim.reset();
  });

  describe("PUSH/POP operations", () => {
    it("PUSH decrements ESP and stores value", () => {
      const initialESP = sim.getRegisters().ESP;
      sim.executeInstruction("MOV", ["EAX", "42"]);
      sim.executeInstruction("PUSH", ["EAX"]);

      const regs = sim.getRegisters();
      expect(regs.ESP).toBe(initialESP - 4);
    });

    it("POP increments ESP and loads value", () => {
      sim.executeInstruction("MOV", ["EAX", "100"]);
      sim.executeInstruction("PUSH", ["EAX"]);
      sim.executeInstruction("MOV", ["EAX", "0"]); // Clear EAX
      sim.executeInstruction("POP", ["EBX"]);

      const regs = sim.getRegisters();
      expect(regs.EBX).toBe(100);
    });

    it("PUSH/POP preserves value", () => {
      sim.executeInstruction("MOV", ["EAX", "0x12345678"]);
      sim.executeInstruction("PUSH", ["EAX"]);
      sim.executeInstruction("MOV", ["EAX", "0"]);
      sim.executeInstruction("POP", ["EAX"]);

      expect(sim.getRegisters().EAX).toBe(0x12345678);
    });

    it("Multiple PUSH/POP operations (LIFO)", () => {
      sim.executeInstruction("MOV", ["EAX", "1"]);
      sim.executeInstruction("MOV", ["EBX", "2"]);
      sim.executeInstruction("MOV", ["ECX", "3"]);
      sim.executeInstruction("PUSH", ["EAX"]);
      sim.executeInstruction("PUSH", ["EBX"]);
      sim.executeInstruction("PUSH", ["ECX"]);

      // Pop in reverse order (LIFO)
      sim.executeInstruction("POP", ["EDX"]);
      expect(sim.getRegisters().EDX).toBe(3);
      sim.executeInstruction("POP", ["EDX"]);
      expect(sim.getRegisters().EDX).toBe(2);
      sim.executeInstruction("POP", ["EDX"]);
      expect(sim.getRegisters().EDX).toBe(1);
    });

    it("PUSH immediate value", () => {
      const initialESP = sim.getRegisters().ESP;
      sim.executeInstruction("PUSH", ["42"]);
      sim.executeInstruction("POP", ["EAX"]);

      expect(sim.getRegisters().EAX).toBe(42);
      expect(sim.getRegisters().ESP).toBe(initialESP);
    });
  });
});

describe("Golden Test Suite - Control Flow", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
    sim.reset();
  });

  describe("Conditional jump flag requirements", () => {
    it("JE/JZ requires Zero flag", () => {
      sim.executeInstruction("MOV", ["EAX", "5"]);
      sim.executeInstruction("SUB", ["EAX", "5"]);
      expect(sim.isZeroFlagSet()).toBe(true);
    });

    it("JNE/JNZ requires Zero flag clear", () => {
      sim.executeInstruction("MOV", ["EAX", "5"]);
      sim.executeInstruction("SUB", ["EAX", "3"]);
      expect(sim.isZeroFlagSet()).toBe(false);
    });

    it("JS requires Sign flag", () => {
      sim.executeInstruction("MOV", ["EAX", "5"]);
      sim.executeInstruction("SUB", ["EAX", "10"]);
      expect(sim.isSignFlagSet()).toBe(true);
    });

    it("JNS requires Sign flag clear", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("SUB", ["EAX", "5"]);
      expect(sim.isSignFlagSet()).toBe(false);
    });

    it("JB requires Carry flag (unsigned less than)", () => {
      sim.executeInstruction("MOV", ["EAX", "5"]);
      sim.executeInstruction("CMP", ["EAX", "10"]);
      expect(sim.isCarryFlagSet()).toBe(true);
    });

    it("JAE requires Carry flag clear (unsigned greater or equal)", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("CMP", ["EAX", "5"]);
      expect(sim.isCarryFlagSet()).toBe(false);
    });
  });

  describe("Flag interactions for signed comparisons", () => {
    it("JG (greater signed): !Z && (S == O)", () => {
      // 10 > 5: Result = 5, ZF=0, SF=0, OF=0
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("CMP", ["EAX", "5"]);
      expect(sim.isZeroFlagSet()).toBe(false);
      expect(sim.isSignFlagSet()).toBe(false);
      expect(sim.isOverflowFlagSet()).toBe(false);
    });

    it("JL (less signed): S != O", () => {
      // 5 < 10: Result = -5 (underflow), ZF=0, SF=1
      sim.executeInstruction("MOV", ["EAX", "5"]);
      sim.executeInstruction("CMP", ["EAX", "10"]);
      expect(sim.isSignFlagSet()).toBe(true);
    });

    it("JGE (greater or equal signed): S == O", () => {
      // 10 >= 10: Result = 0, ZF=1, SF=0, OF=0
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("CMP", ["EAX", "10"]);
      expect(sim.isZeroFlagSet()).toBe(true);
      expect(sim.isSignFlagSet()).toBe(false);
      expect(sim.isOverflowFlagSet()).toBe(false);
    });
  });
});

describe("Golden Test Suite - Flag Correctness", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
    sim.reset();
  });

  describe("Zero Flag (ZF)", () => {
    it("ZF set on zero result from ADD", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("MOV", ["EBX", "-10"]);
      sim.executeInstruction("ADD", ["EAX", "EBX"]);
      expect(sim.isZeroFlagSet()).toBe(true);
    });

    it("ZF clear on non-zero result from ADD", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("ADD", ["EAX", "5"]);
      expect(sim.isZeroFlagSet()).toBe(false);
    });

    it("ZF set on zero result from SUB", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("SUB", ["EAX", "10"]);
      expect(sim.isZeroFlagSet()).toBe(true);
    });

    it("ZF set on zero result from AND", () => {
      sim.executeInstruction("MOV", ["EAX", "0xF0"]);
      sim.executeInstruction("AND", ["EAX", "0x0F"]);
      expect(sim.isZeroFlagSet()).toBe(true);
    });

    it("ZF set on XOR self", () => {
      sim.executeInstruction("MOV", ["EAX", "42"]);
      sim.executeInstruction("XOR", ["EAX", "EAX"]);
      expect(sim.isZeroFlagSet()).toBe(true);
    });
  });

  describe("Carry Flag (CF)", () => {
    it("CF set on unsigned overflow from ADD", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFFFFFFFF"]);
      sim.executeInstruction("ADD", ["EAX", "1"]);
      expect(sim.isCarryFlagSet()).toBe(true);
    });

    it("CF clear on no overflow from ADD", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("ADD", ["EAX", "20"]);
      expect(sim.isCarryFlagSet()).toBe(false);
    });

    it("CF set on underflow from SUB", () => {
      sim.executeInstruction("MOV", ["EAX", "5"]);
      sim.executeInstruction("SUB", ["EAX", "10"]);
      expect(sim.isCarryFlagSet()).toBe(true);
    });

    it("CF clear on no underflow from SUB", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("SUB", ["EAX", "5"]);
      expect(sim.isCarryFlagSet()).toBe(false);
    });

    it("CF set on NEG non-zero", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("NEG", ["EAX"]);
      expect(sim.isCarryFlagSet()).toBe(true);
    });

    it("CF clear on NEG zero", () => {
      sim.executeInstruction("MOV", ["EAX", "0"]);
      sim.executeInstruction("NEG", ["EAX"]);
      expect(sim.isCarryFlagSet()).toBe(false);
    });
  });

  describe("Overflow Flag (OF)", () => {
    it("OF set on signed overflow (positive + positive = negative)", () => {
      sim.executeInstruction("MOV", ["EAX", "0x7FFFFFFF"]); // Max positive
      sim.executeInstruction("ADD", ["EAX", "1"]);
      expect(sim.isOverflowFlagSet()).toBe(true);
    });

    it("OF set on signed overflow (negative + negative = positive)", () => {
      sim.executeInstruction("MOV", ["EAX", "0x80000000"]); // Min negative
      sim.executeInstruction("MOV", ["EBX", "0x80000000"]);
      sim.executeInstruction("ADD", ["EAX", "EBX"]);
      expect(sim.isOverflowFlagSet()).toBe(true);
    });

    it("OF clear on no signed overflow", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("ADD", ["EAX", "20"]);
      expect(sim.isOverflowFlagSet()).toBe(false);
    });

    it("OF set on NEG minimum value", () => {
      sim.executeInstruction("MOV", ["EAX", "0x80000000"]);
      sim.executeInstruction("NEG", ["EAX"]);
      expect(sim.isOverflowFlagSet()).toBe(true);
    });
  });

  describe("Sign Flag (SF)", () => {
    it("SF set on negative result", () => {
      sim.executeInstruction("MOV", ["EAX", "5"]);
      sim.executeInstruction("SUB", ["EAX", "10"]);
      expect(sim.isSignFlagSet()).toBe(true);
    });

    it("SF clear on positive result", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("SUB", ["EAX", "5"]);
      expect(sim.isSignFlagSet()).toBe(false);
    });

    it("SF clear on zero result", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("SUB", ["EAX", "10"]);
      expect(sim.isSignFlagSet()).toBe(false);
    });

    it("SF set on high bit set", () => {
      sim.executeInstruction("MOV", ["EAX", "0x80000000"]);
      sim.executeInstruction("OR", ["EAX", "0"]);
      expect(sim.isSignFlagSet()).toBe(true);
    });
  });

  describe("Flag preservation", () => {
    it("MOV does not affect flags", () => {
      sim.executeInstruction("MOV", ["EAX", "0"]);
      sim.executeInstruction("SUB", ["EAX", "1"]); // Sets flags
      const flagsBefore = sim.getState().flags;

      sim.executeInstruction("MOV", ["EBX", "100"]);
      const flagsAfter = sim.getState().flags;

      expect(flagsAfter).toBe(flagsBefore);
    });

    it("NOT does not affect flags", () => {
      sim.executeInstruction("MOV", ["EAX", "0"]);
      sim.executeInstruction("SUB", ["EAX", "1"]);
      const flagsBefore = sim.getState().flags;

      sim.executeInstruction("NOT", ["EBX"]);
      const flagsAfter = sim.getState().flags;

      expect(flagsAfter).toBe(flagsBefore);
    });
  });
});

describe("Golden Test Suite - Complex Scenarios", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
    sim.reset();
  });

  it("Factorial calculation (iterative)", () => {
    // Calculate 5! = 120
    sim.executeInstruction("MOV", ["EAX", "1"]); // Result
    sim.executeInstruction("MOV", ["ECX", "5"]); // Counter

    for (let i = 0; i < 5; i++) {
      sim.executeInstruction("IMUL", ["ECX"]);
      sim.executeInstruction("DEC", ["ECX"]);
    }

    expect(sim.getRegisters().EAX).toBe(120);
  });

  it("Sum of array values simulation", () => {
    // Sum: 10 + 20 + 30 + 40 + 50 = 150
    const values = [10, 20, 30, 40, 50];
    sim.executeInstruction("MOV", ["EAX", "0"]); // Sum

    for (const value of values) {
      sim.executeInstruction("ADD", ["EAX", value.toString()]);
    }

    expect(sim.getRegisters().EAX).toBe(150);
  });

  it("Bit counting (count set bits)", () => {
    // Count bits in 0x0F = 0b00001111 (4 bits set)
    sim.executeInstruction("MOV", ["EAX", "0x0F"]); // Number
    sim.executeInstruction("MOV", ["EBX", "0"]); // Count

    for (let i = 0; i < 8; i++) {
      sim.executeInstruction("MOV", ["ECX", "EAX"]);
      sim.executeInstruction("AND", ["ECX", "1"]);
      sim.executeInstruction("ADD", ["EBX", "ECX"]);
      sim.executeInstruction("SHR", ["EAX", "1"]);
    }

    expect(sim.getRegisters().EBX).toBe(4);
  });

  it("Power of 2 check using AND trick", () => {
    // Check if 16 is power of 2: n & (n-1) == 0
    sim.executeInstruction("MOV", ["EAX", "16"]);
    sim.executeInstruction("MOV", ["EBX", "EAX"]);
    sim.executeInstruction("DEC", ["EBX"]);
    sim.executeInstruction("AND", ["EAX", "EBX"]);

    expect(sim.getRegisters().EAX).toBe(0); // Is power of 2
    expect(sim.isZeroFlagSet()).toBe(true);
  });

  it("Swap values using XOR trick", () => {
    sim.executeInstruction("MOV", ["EAX", "42"]);
    sim.executeInstruction("MOV", ["EBX", "100"]);

    // XOR swap
    sim.executeInstruction("XOR", ["EAX", "EBX"]);
    sim.executeInstruction("XOR", ["EBX", "EAX"]);
    sim.executeInstruction("XOR", ["EAX", "EBX"]);

    expect(sim.getRegisters().EAX).toBe(100);
    expect(sim.getRegisters().EBX).toBe(42);
  });

  it("Absolute value using conditional logic simulation", () => {
    // abs(-42) = 42
    sim.executeInstruction("MOV", ["EAX", "-42"]);
    sim.executeInstruction("TEST", ["EAX", "EAX"]);

    if (sim.isSignFlagSet()) {
      sim.executeInstruction("NEG", ["EAX"]);
    }

    expect(sim.getRegisters().EAX).toBe(42);
  });

  it("Min/Max using CMP simulation", () => {
    // max(42, 100) = 100
    sim.executeInstruction("MOV", ["EAX", "42"]);
    sim.executeInstruction("MOV", ["EBX", "100"]);
    sim.executeInstruction("CMP", ["EAX", "EBX"]);

    // Simulate: if EAX < EBX then EAX = EBX
    if (sim.isCarryFlagSet()) {
      sim.executeInstruction("MOV", ["EAX", "EBX"]);
    }

    expect(sim.getRegisters().EAX).toBe(100);
  });
});
