import { Simulator } from "./simulator";

/**
 * Tests for individual instruction execution (instructions.ts)
 * All tests exercise executeInstruction() through the Simulator wrapper.
 */

describe("executeInstruction - MOV", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("MOV immediate to register", () => {
    sim.executeInstruction("MOV", ["EAX", "42"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("MOV register to register", () => {
    sim.executeInstruction("MOV", ["EAX", "42"]);
    sim.executeInstruction("MOV", ["EBX", "EAX"]);
    expect(sim.getRegisters().EBX).toBe(42);
  });

  test("MOV handles hex values", () => {
    sim.executeInstruction("MOV", ["EAX", "0xFF"]);
    expect(sim.getRegisters().EAX).toBe(255);
  });

  test("MOV handles large values", () => {
    sim.executeInstruction("MOV", ["EAX", "0xFFFFFFFF"]);
    expect(sim.getRegisters().EAX).toBe(0xffffffff);
  });

  test("MOV updates only target register", () => {
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("MOV", ["EBX", "20"]);
    expect(sim.getRegisters().EAX).toBe(10);
    expect(sim.getRegisters().EBX).toBe(20);
  });

  test("MOV memory-to-register via [REG-offset]", () => {
    sim.executeInstruction("MOV", ["EBP", "100"]);
    sim.executeInstruction("MOV", ["[EBP-4]", "42"]);
    sim.executeInstruction("MOV", ["EAX", "[EBP-4]"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("MOV memory via [REG+REG]", () => {
    sim.executeInstruction("MOV", ["EBX", "1000"]);
    sim.executeInstruction("MOV", ["ECX", "50"]);
    sim.executeInstruction("MOV", ["[EBX+ECX]", "99"]);
    sim.executeInstruction("MOV", ["EAX", "[EBX+ECX]"]);
    expect(sim.getRegisters().EAX).toBe(99);
  });

  test("MOV supports binary literal addresses [0B...]", () => {
    sim.executeInstruction("MOV", ["[0B1111101000]", "77"]);
    sim.executeInstruction("MOV", ["EDX", "[0B1111101000]"]);
    expect(sim.getRegisters().EDX).toBe(77);
  });

  test("MOV supports uppercase hex addresses [0X...]", () => {
    sim.executeInstruction("MOV", ["[0X0500]", "88"]);
    sim.executeInstruction("MOV", ["ESI", "[0X0500]"]);
    expect(sim.getRegisters().ESI).toBe(88);
  });

  test("MOV supports uppercase binary addresses [0B...]", () => {
    sim.executeInstruction("MOV", ["[0B10000000]", "55"]);
    sim.executeInstruction("MOV", ["EDI", "[0B10000000]"]);
    expect(sim.getRegisters().EDI).toBe(55);
  });

  test("MOV supports character literal operands", () => {
    sim.executeInstruction("MOV", ["EAX", "'A'"]);
    expect(sim.getRegisters().EAX).toBe(65);
  });

  test("MOV supports different character literals", () => {
    sim.executeInstruction("MOV", ["EBX", "'Z'"]);
    expect(sim.getRegisters().EBX).toBe(90);
  });

  test("MOV supports space character literal", () => {
    sim.executeInstruction("MOV", ["ECX", "' '"]);
    expect(sim.getRegisters().ECX).toBe(32);
  });

  test("MOV with memory destination using I/O address", () => {
    const sim16 = new Simulator(16, 16);
    sim16.executeInstruction("MOV", ["[0xF000]", "1"]);
    const display = sim16.getLCDDisplay();
    expect(display[0]).toBe(1);
  });

  test("simple [REG] memory addressing", () => {
    sim.executeInstruction("MOV", ["EBX", "1000"]);
    sim.executeInstruction("MOV", ["[EBX]", "42"]);
    sim.executeInstruction("MOV", ["EAX", "[EBX]"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("binary format in memory addressing", () => {
    sim.executeInstruction("MOV", ["[0B1111101000]", "123"]);
    sim.executeInstruction("MOV", ["EAX", "[0B1111101000]"]);
    expect(sim.getRegisters().EAX).toBe(123);
  });

  test("MOV to absolute memory address", () => {
    sim.executeInstruction("MOV", ["[100]", "25"]);
    sim.executeInstruction("MOV", ["EAX", "[100]"]);
    expect(sim.getRegisters().EAX).toBe(25);
  });

  test("MOV and zero offsets", () => {
    sim.executeInstruction("MOV", ["[0]", "55"]);
    sim.executeInstruction("MOV", ["EAX", "[0]"]);
    expect(sim.getRegisters().EAX).toBe(55);
  });

  test("MOV memory addressing covers base and absolute", () => {
    sim.executeInstruction("MOV", ["EBP", "200"]);
    sim.executeInstruction("MOV", ["[EBP]", "77"]);
    sim.executeInstruction("MOV", ["EAX", "[EBP]"]);
    expect(sim.getRegisters().EAX).toBe(77);

    sim.executeInstruction("MOV", ["[150]", "88"]);
    sim.executeInstruction("MOV", ["ECX", "[150]"]);
    expect(sim.getRegisters().ECX).toBe(88);
  });

  test("reading from LCD address returns 0 (write-only)", () => {
    sim.executeInstruction("MOV", ["EAX", "[0xF000]"]);
    expect(sim.getRegisters().EAX).toBe(0);
  });

  test("reading from unknown keyboard I/O address throws error", () => {
    expect(() => {
      sim.executeInstruction("MOV", ["EAX", "[0x10103]"]);
    }).toThrow("Unknown I/O read address");
  });

  test("writing to keyboard registers is silently ignored", () => {
    sim.executeInstruction("MOV", ["EAX", "100"]);
    expect(() => {
      sim.executeInstruction("MOV", ["[0x10100]", "EAX"]);
    }).not.toThrow();
  });

  test("writing to unknown I/O address throws error", () => {
    expect(() => {
      sim.executeInstruction("MOV", ["0x10050", "1"]);
    }).toThrow("Unknown I/O address");
  });

  test("invalid hexadecimal immediate throws error", () => {
    expect(() => {
      sim.executeInstruction("MOV", ["EAX", "0XG123"]);
    }).toThrow("Invalid hexadecimal value");
  });

  test("invalid binary immediate throws error", () => {
    expect(() => {
      sim.executeInstruction("MOV", ["EAX", "0B1012"]);
    }).toThrow("Invalid binary value");
  });

  test("invalid decimal immediate throws error", () => {
    expect(() => {
      sim.executeInstruction("MOV", ["EAX", "12ABC"]);
    }).toThrow("Invalid operand");
  });

  test("MOV operand guard (wrong arg count)", () => {
    expect(() => sim.executeInstruction("MOV", ["EAX"])).not.toThrow();
  });
});

describe("executeInstruction - 8-bit registers", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("8-bit register operations preserve upper bits", () => {
    sim.executeInstruction("MOV", ["EAX", "0xAABBCCDD"]);
    sim.executeInstruction("MOV", ["AL", "0x11"]);
    expect(sim.getRegisters().EAX).toBe(0xaabbcc11);
  });

  test("8-bit high register operations", () => {
    sim.executeInstruction("MOV", ["EAX", "0x12345678"]);
    sim.executeInstruction("MOV", ["AH", "0xFF"]);
    expect(sim.getRegisters().EAX).toBe(0x1234ff78);
  });

  test("8-bit high register (AH) read with byteOffset", () => {
    sim.executeInstruction("MOV", ["EAX", "0x12345678"]);
    sim.executeInstruction("MOV", ["BL", "0"]);
    sim.executeInstruction("MOV", ["BL", "AH"]);
    expect(sim.getRegisters().EBX & 0xff).toBe(0x56);
  });

  test("MOV handles register8 read/write", () => {
    sim.executeInstruction("MOV", ["EAX", "0x1234"]);
    sim.executeInstruction("MOV", ["AL", "0x56"]);
    expect(sim.getRegisters().EAX & 0xff).toBe(0x56);

    sim.executeInstruction("MOV", ["EBX", "AL"]);
    expect(sim.getRegisters().EBX).toBe(0x56);
  });

  test("various immediate operand formats", () => {
    sim.executeInstruction("MOV", ["EAX", "255"]);
    expect(sim.getRegisters().EAX).toBe(255);

    sim.executeInstruction("MOV", ["EBX", "0xFF"]);
    expect(sim.getRegisters().EBX).toBe(255);

    sim.executeInstruction("MOV", ["ECX", "0B11111111"]);
    expect(sim.getRegisters().ECX).toBe(255);
  });

  test("read/write register8 handle missing byteOffset", () => {
    const helpers = sim as unknown as {
      readRegisterValue: (op: {
        type: string;
        value: number;
        byteOffset?: number;
      }) => number;
      writeRegisterValue: (
        op: { type: string; value: number; byteOffset?: number },
        value: number,
      ) => void;
    };

    sim.executeInstruction("MOV", ["EAX", "0x12345678"]);
    const low = helpers.readRegisterValue({ type: "register8", value: 0 });
    const high = helpers.readRegisterValue({
      type: "register8",
      value: 0,
      byteOffset: 8,
    });
    expect(low).toBe(0x78);
    expect(high).toBe(0x56);

    helpers.writeRegisterValue({ type: "register8", value: 1 }, 0xaa);
    helpers.writeRegisterValue(
      { type: "register8", value: 1, byteOffset: 8 },
      0xbb,
    );
    expect(sim.getRegisters().ECX & 0xff).toBe(0xaa);
    expect((sim.getRegisters().ECX >> 8) & 0xff).toBe(0xbb);
  });
});

describe("executeInstruction - XCHG", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("exchanges two register values", () => {
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("MOV", ["EBX", "20"]);
    sim.executeInstruction("XCHG", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(20);
    expect(sim.getRegisters().EBX).toBe(10);
  });

  test("XCHG handles register8 operands", () => {
    sim.executeInstruction("MOV", ["EAX", "0x11"]);
    sim.executeInstruction("MOV", ["EBX", "0x22"]);
    sim.executeInstruction("XCHG", ["AL", "BL"]);
    expect(sim.getRegisters().EAX & 0xff).toBe(0x22);
    expect(sim.getRegisters().EBX & 0xff).toBe(0x11);
  });

  test("XCHG ignores non-register operands", () => {
    expect(() => sim.executeInstruction("XCHG", ["EAX", "5"])).not.toThrow();
  });

  test("XCHG operand guard", () => {
    expect(() => sim.executeInstruction("XCHG", ["EAX"])).not.toThrow();
  });
});

describe("executeInstruction - LEA", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("LEA computes base + offset", () => {
    sim.executeInstruction("MOV", ["EBX", "100"]);
    sim.executeInstruction("LEA", ["EAX", "[EBX+8]"]);
    expect(sim.getRegisters().EAX).toBe(108);
  });

  test("LEA with zero offset", () => {
    sim.executeInstruction("MOV", ["ECX", "200"]);
    sim.executeInstruction("LEA", ["EAX", "[ECX+0]"]);
    expect(sim.getRegisters().EAX).toBe(200);
  });

  test("LEA does not dereference memory", () => {
    sim.executeInstruction("MOV", ["EBX", "0xF000"]);
    sim.executeInstruction("LEA", ["EAX", "[EBX+16]"]);
    expect(sim.getRegisters().EAX).toBe(0xf010);
  });

  test("LEA with absolute address", () => {
    sim.executeInstruction("LEA", ["EAX", "[5000]"]);
    expect(sim.getRegisters().EAX).toBe(5000);
  });

  test("LEA handles absolute memory operand [0]", () => {
    sim.executeInstruction("LEA", ["EAX", "[0]"]);
    expect(sim.getRegisters().EAX).toBe(0);
  });

  test("LEA handles base register memory operand", () => {
    sim.executeInstruction("MOV", ["EBP", "400"]);
    sim.executeInstruction("LEA", ["EAX", "[EBP+4]"]);
    expect(sim.getRegisters().EAX).toBe(404);
  });

  test("LEA with immediate (non-memory) source loads value directly", () => {
    sim.executeInstruction("LEA", ["EAX", "5000"]);
    expect(sim.getRegisters().EAX).toBe(5000);
  });

  test("LEA operand guard", () => {
    expect(() => sim.executeInstruction("LEA", ["EAX"])).not.toThrow();
  });
});

describe("executeInstruction - MOVZX/MOVSX", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("MOVZX zero-extends 8-bit to 32-bit", () => {
    sim.executeInstruction("MOVZX", ["EAX", "0x80"]);
    expect(sim.getRegisters().EAX).toBe(0x80);
  });

  test("MOVZX with register8 source", () => {
    sim.executeInstruction("MOV", ["EAX", "0xFFAB"]);
    sim.executeInstruction("MOVZX", ["EBX", "AL"]);
    expect(sim.getRegisters().EBX).toBe(0xab);
  });

  test("MOVSX sign-extends 8-bit negative to 32-bit", () => {
    sim.executeInstruction("MOVSX", ["EAX", "0x80"]);
    expect(sim.getRegisters().EAX).toBe(0xffffff80);
  });

  test("MOVSX with register8 source (negative)", () => {
    sim.executeInstruction("MOV", ["EBX", "0xFF"]);
    sim.executeInstruction("MOVSX", ["EAX", "BL"]);
    expect(sim.getRegisters().EAX).toBe(0xffffffff);
  });

  test("MOVSX with register8 source (positive, no sign extension)", () => {
    sim.executeInstruction("MOV", ["EBX", "0x50"]);
    sim.executeInstruction("MOVSX", ["EAX", "BL"]);
    expect(sim.getRegisters().EAX).toBe(0x50);
  });

  test("MOVSX with immediate 8-bit negative value", () => {
    sim.executeInstruction("MOVSX", ["EAX", "128"]);
    expect(sim.getRegisters().EAX).toBe(0xffffff80);
  });

  test("MOVZX operand guard", () => {
    expect(() => sim.executeInstruction("MOVZX", ["EAX"])).not.toThrow();
  });

  test("MOVSX operand guard", () => {
    expect(() => sim.executeInstruction("MOVSX", ["EAX"])).not.toThrow();
  });
});

describe("executeInstruction - ADD", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("ADD two registers", () => {
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("MOV", ["EBX", "20"]);
    sim.executeInstruction("ADD", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(30);
  });

  test("ADD immediate to register", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("ADD", ["EAX", "3"]);
    expect(sim.getRegisters().EAX).toBe(8);
  });

  test("ADD sets carry flag on unsigned overflow", () => {
    sim.executeInstruction("MOV", ["EAX", "0xFFFFFFFF"]);
    sim.executeInstruction("ADD", ["EAX", "1"]);
    expect(sim.isCarryFlagSet()).toBe(true);
  });

  test("ADD clears carry flag on no unsigned overflow", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("ADD", ["EAX", "3"]);
    expect(sim.isCarryFlagSet()).toBe(false);
  });

  test("ADD sets overflow on positive + positive = negative", () => {
    sim.executeInstruction("MOV", ["EAX", "0x7FFFFFFF"]);
    sim.executeInstruction("ADD", ["EAX", "1"]);
    expect(sim.isOverflowFlagSet()).toBe(true);
    expect(sim.isSignFlagSet()).toBe(true);
  });

  test("ADD clears overflow on no signed overflow", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("ADD", ["EAX", "3"]);
    expect(sim.isOverflowFlagSet()).toBe(false);
  });

  test("ADD with memory source", () => {
    sim.executeInstruction("MOV", ["EBX", "1000"]);
    sim.executeInstruction("MOV", ["[EBX]", "5"]);
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("ADD", ["EAX", "[EBX]"]);
    expect(sim.getRegisters().EAX).toBe(15);
  });

  test("ADD operand guard (wrong arg count)", () => {
    expect(() => sim.executeInstruction("ADD", ["EAX"])).not.toThrow();
  });

  test("SUB operand guard", () => {
    expect(() => sim.executeInstruction("SUB", ["EAX"])).not.toThrow();
  });
});

describe("executeInstruction - SUB", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("SUB two registers", () => {
    sim.executeInstruction("MOV", ["EAX", "20"]);
    sim.executeInstruction("MOV", ["EBX", "5"]);
    sim.executeInstruction("SUB", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(15);
  });

  test("SUB immediate from register", () => {
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("SUB", ["EAX", "3"]);
    expect(sim.getRegisters().EAX).toBe(7);
  });

  test("SUB sets carry flag on borrow (unsigned underflow)", () => {
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("SUB", ["EAX", "1"]);
    expect(sim.isCarryFlagSet()).toBe(true);
  });

  test("SUB clears carry flag when no borrow", () => {
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("SUB", ["EAX", "5"]);
    expect(sim.isCarryFlagSet()).toBe(false);
  });

  test("SUB sets overflow on signed overflow", () => {
    sim.executeInstruction("MOV", ["EAX", "0x7FFFFFFF"]);
    sim.executeInstruction("MOV", ["ECX", "0xFFFFFFFF"]);
    sim.executeInstruction("SUB", ["EAX", "ECX"]);
    expect(sim.isOverflowFlagSet()).toBe(true);
  });

  test("SUB with memory source", () => {
    sim.executeInstruction("MOV", ["EBX", "1000"]);
    sim.executeInstruction("MOV", ["[EBX]", "5"]);
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("SUB", ["EAX", "[EBX]"]);
    expect(sim.getRegisters().EAX).toBe(5);
  });
});

describe("executeInstruction - INC/DEC", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("INC increments register", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("INC", ["EAX"]);
    expect(sim.getRegisters().EAX).toBe(6);
  });

  test("DEC decrements register", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("DEC", ["EAX"]);
    expect(sim.getRegisters().EAX).toBe(4);
  });

  test("INC preserves carry flag when set", () => {
    sim.executeInstruction("MOV", ["EAX", "0xFFFFFFFF"]);
    sim.executeInstruction("ADD", ["EAX", "1"]);
    expect(sim.isCarryFlagSet()).toBe(true);

    sim.executeInstruction("MOV", ["EBX", "5"]);
    sim.executeInstruction("INC", ["EBX"]);
    expect(sim.isCarryFlagSet()).toBe(true);
    expect(sim.getRegisters().EBX).toBe(6);
  });

  test("DEC preserves carry flag when set", () => {
    sim.executeInstruction("MOV", ["EAX", "0xFFFFFFFF"]);
    sim.executeInstruction("ADD", ["EAX", "1"]);
    expect(sim.isCarryFlagSet()).toBe(true);

    sim.executeInstruction("MOV", ["EBX", "5"]);
    sim.executeInstruction("DEC", ["EBX"]);
    expect(sim.isCarryFlagSet()).toBe(true);
    expect(sim.getRegisters().EBX).toBe(4);
  });

  test("INC preserves carry flag when clear", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("ADD", ["EAX", "3"]);
    expect(sim.isCarryFlagSet()).toBe(false);

    sim.executeInstruction("INC", ["EAX"]);
    expect(sim.isCarryFlagSet()).toBe(false);
  });

  test("INC operand guard", () => {
    expect(() => sim.executeInstruction("INC", [])).not.toThrow();
  });

  test("DEC operand guard", () => {
    expect(() => sim.executeInstruction("DEC", [])).not.toThrow();
  });
});

describe("executeInstruction - CMP", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("CMP sets zero flag when equal", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("CMP", ["EAX", "5"]);
    expect(sim.isZeroFlagSet()).toBe(true);
  });

  test("CMP clears zero flag when not equal", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("CMP", ["EAX", "10"]);
    expect(sim.isZeroFlagSet()).toBe(false);
  });

  test("CMP sets carry flag when first < second (unsigned)", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("CMP", ["EAX", "10"]);
    expect(sim.isCarryFlagSet()).toBe(true);
  });

  test("CMP clears carry flag when first >= second (unsigned)", () => {
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("CMP", ["EAX", "5"]);
    expect(sim.isCarryFlagSet()).toBe(false);
  });

  test("CMP operand guard", () => {
    expect(() => sim.executeInstruction("CMP", ["EAX"])).not.toThrow();
  });
});

describe("executeInstruction - MUL/IMUL", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("MUL multiplies EAX by register", () => {
    sim.executeInstruction("MOV", ["EAX", "6"]);
    sim.executeInstruction("MOV", ["ECX", "7"]);
    sim.executeInstruction("MUL", ["ECX"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("IMUL single-operand form", () => {
    sim.executeInstruction("MOV", ["EAX", "6"]);
    sim.executeInstruction("MOV", ["ECX", "7"]);
    sim.executeInstruction("IMUL", ["ECX"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("IMUL two-operand: dest = dest * src", () => {
    sim.executeInstruction("MOV", ["EAX", "7"]);
    sim.executeInstruction("IMUL", ["EAX", "6"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("IMUL two-operand with registers", () => {
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("MOV", ["ECX", "3"]);
    sim.executeInstruction("IMUL", ["EAX", "ECX"]);
    expect(sim.getRegisters().EAX).toBe(30);
  });

  test("IMUL three-operand: dest = src * imm", () => {
    sim.executeInstruction("MOV", ["ECX", "8"]);
    sim.executeInstruction("IMUL", ["EAX", "ECX", "5"]);
    expect(sim.getRegisters().EAX).toBe(40);
  });

  test("IMUL three-operand with negative multiplier", () => {
    sim.executeInstruction("MOV", ["ECX", "10"]);
    sim.executeInstruction("IMUL", ["EAX", "ECX", "-3"]);
    expect(sim.getRegisters().EAX).toBe(0xffffffe2);
  });

  test("IMUL two-operand with memory source", () => {
    sim.executeInstruction("MOV", ["EBX", "1000"]);
    sim.executeInstruction("MOV", ["[EBX]", "5"]);
    sim.executeInstruction("MOV", ["EAX", "3"]);
    sim.executeInstruction("IMUL", ["EAX", "[EBX]"]);
    expect(sim.getRegisters().EAX).toBe(15);
  });

  test("IMUL three-operand with memory source", () => {
    sim.executeInstruction("MOV", ["EBX", "1000"]);
    sim.executeInstruction("MOV", ["[EBX]", "4"]);
    sim.executeInstruction("IMUL", ["EAX", "[EBX]", "5"]);
    expect(sim.getRegisters().EAX).toBe(20);
  });

  test("MUL operand guard", () => {
    expect(() => sim.executeInstruction("MUL", [])).not.toThrow();
  });

  test("IMUL operand guards", () => {
    expect(() => sim.executeInstruction("IMUL", ["5", "EAX"])).not.toThrow();
    expect(() =>
      sim.executeInstruction("IMUL", ["5", "EAX", "2"]),
    ).not.toThrow();
  });

  test("MUL/IMUL in strict-x86 mode clears ZF and SF", () => {
    const strictSim = new Simulator(8, 8, "strict-x86");
    strictSim.executeInstruction("MOV", ["EAX", "0"]);
    strictSim.executeInstruction("SUB", ["EAX", "1"]);

    strictSim.executeInstruction("MOV", ["EAX", "5"]);
    strictSim.executeInstruction("MOV", ["ECX", "3"]);
    strictSim.executeInstruction("MUL", ["ECX"]);
    const flags = strictSim.getState().flags;
    expect(flags & 0x40).toBe(0); // ZF cleared
    expect(flags & 0x80).toBe(0); // SF cleared
  });

  test("IMUL in strict-x86 mode clears ZF and SF", () => {
    const strictSim = new Simulator(8, 8, "strict-x86");
    strictSim.executeInstruction("MOV", ["EAX", "0"]);
    strictSim.executeInstruction("SUB", ["EAX", "1"]);

    strictSim.executeInstruction("MOV", ["EAX", "5"]);
    strictSim.executeInstruction("MOV", ["ECX", "3"]);
    strictSim.executeInstruction("IMUL", ["ECX"]);
    const flags = strictSim.getState().flags;
    expect(flags & 0x40).toBe(0);
    expect(flags & 0x80).toBe(0);
  });
});

describe("executeInstruction - DIV/IDIV", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("DIV divides EAX by register", () => {
    sim.executeInstruction("MOV", ["EAX", "42"]);
    sim.executeInstruction("MOV", ["ECX", "7"]);
    sim.executeInstruction("DIV", ["ECX"]);
    expect(sim.getRegisters().EAX).toBe(6);
  });

  test("DIV stores remainder in EDX", () => {
    sim.executeInstruction("MOV", ["EAX", "43"]);
    sim.executeInstruction("MOV", ["ECX", "7"]);
    sim.executeInstruction("DIV", ["ECX"]);
    expect(sim.getRegisters().EAX).toBe(6);
    expect(sim.getRegisters().EDX).toBe(1);
  });

  test("IDIV performs signed division", () => {
    sim.executeInstruction("MOV", ["EAX", "42"]);
    sim.executeInstruction("MOV", ["ECX", "7"]);
    sim.executeInstruction("IDIV", ["ECX"]);
    expect(sim.getRegisters().EAX).toBe(6);
  });

  test("DIV/IDIV in strict-x86 mode clears CF and OF", () => {
    const strictSim = new Simulator(8, 8, "strict-x86");
    strictSim.executeInstruction("MOV", ["EAX", "0x80000000"]);
    strictSim.executeInstruction("ADD", ["EAX", "0x80000000"]);

    strictSim.executeInstruction("MOV", ["EAX", "100"]);
    strictSim.executeInstruction("MOV", ["EDX", "0"]);
    strictSim.executeInstruction("MOV", ["ECX", "10"]);
    strictSim.executeInstruction("DIV", ["ECX"]);
    const flags = strictSim.getState().flags;
    expect(flags & 0x01).toBe(0); // CF cleared
    expect(flags & 0x800).toBe(0); // OF cleared
  });

  test("IDIV in strict-x86 mode clears CF and OF", () => {
    const strictSim = new Simulator(8, 8, "strict-x86");
    strictSim.executeInstruction("MOV", ["EAX", "10"]);
    strictSim.executeInstruction("MOV", ["EBX", "2"]);
    strictSim.executeInstruction("IDIV", ["EBX"]);
    const flags = strictSim.getState().flags;
    expect(flags & 0x01).toBe(0);
    expect(flags & 0x800).toBe(0);
  });

  test("DIV operand guard", () => {
    expect(() => sim.executeInstruction("DIV", [])).not.toThrow();
  });

  test("IDIV with zero divisor sets EAX and EDX to 0", () => {
    sim.executeInstruction("MOV", ["EAX", "100"]);
    sim.executeInstruction("MOV", ["ECX", "0"]);
    sim.executeInstruction("IDIV", ["ECX"]);
    expect(sim.getRegisters().EAX).toBe(0);
    expect(sim.getRegisters().EDX).toBe(0);
  });

  test("IDIV operand guard", () => {
    expect(() => sim.executeInstruction("IDIV", [])).not.toThrow();
  });
});

describe("executeInstruction - MOD", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("MOD instruction with register source", () => {
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("MOV", ["EBX", "3"]);
    sim.executeInstruction("MOD", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(1);
  });

  test("MOD instruction with immediate source", () => {
    sim.executeInstruction("MOV", ["EAX", "17"]);
    sim.executeInstruction("MOD", ["EAX", "5"]);
    expect(sim.getRegisters().EAX).toBe(2);
  });

  test("MOD instruction with zero divisor sets result to 0", () => {
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("MOD", ["EAX", "0"]);
    expect(sim.getRegisters().EAX).toBe(0);
  });

  test("MOD instruction with invalid operands does nothing", () => {
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("MOD", ["EAX"]);
    expect(sim.getRegisters().EAX).toBe(10);
  });

  test("MOD operand guard", () => {
    expect(() => sim.executeInstruction("MOD", ["5", "2"])).not.toThrow();
  });
});

describe("executeInstruction - Logical (AND/OR/XOR/NOT/NEG/TEST)", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("AND performs bitwise AND", () => {
    sim.executeInstruction("MOV", ["EAX", "0xFF00"]);
    sim.executeInstruction("AND", ["EAX", "0x0F0F"]);
    expect(sim.getRegisters().EAX).toBe(0x0f00);
  });

  test("OR performs bitwise OR", () => {
    sim.executeInstruction("MOV", ["EAX", "0xFF00"]);
    sim.executeInstruction("OR", ["EAX", "0x0F0F"]);
    expect(sim.getRegisters().EAX).toBe(0xff0f);
  });

  test("XOR performs bitwise XOR", () => {
    sim.executeInstruction("MOV", ["EAX", "0xFF00"]);
    sim.executeInstruction("XOR", ["EAX", "0x0F0F"]);
    expect(sim.getRegisters().EAX).toBe(0xf00f);
  });

  test("XOR register with itself zeros it", () => {
    sim.executeInstruction("MOV", ["EAX", "42"]);
    sim.executeInstruction("XOR", ["EAX", "EAX"]);
    expect(sim.getRegisters().EAX).toBe(0);
    expect(sim.isZeroFlagSet()).toBe(true);
  });

  test("NOT performs bitwise NOT", () => {
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("NOT", ["EAX"]);
    expect(sim.getRegisters().EAX).toBe(0xffffffff);
  });

  test("NEG negates a value", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("NEG", ["EAX"]);
    expect(sim.getRegisters().EAX).toBe(0xfffffffb); // -5 as unsigned 32-bit
  });

  test("TEST sets flags without changing value", () => {
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("TEST", ["EAX", "EAX"]);
    expect(sim.isZeroFlagSet()).toBe(true);
    expect(sim.getRegisters().EAX).toBe(0); // Unchanged
  });

  test("AND/OR/XOR/NOT operand guards", () => {
    expect(() => sim.executeInstruction("AND", ["EAX"])).not.toThrow();
    expect(() => sim.executeInstruction("OR", ["EAX"])).not.toThrow();
    expect(() => sim.executeInstruction("XOR", ["EAX"])).not.toThrow();
    expect(() => sim.executeInstruction("NOT", [])).not.toThrow();
  });

  test("NEG/TEST operand guards", () => {
    expect(() => sim.executeInstruction("NEG", [])).not.toThrow();
    expect(() => sim.executeInstruction("TEST", ["EAX"])).not.toThrow();
  });
});

describe("executeInstruction - Shifts (SHL/SHR/SAR)", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("SHL left shifts by immediate", () => {
    sim.executeInstruction("MOV", ["EAX", "1"]);
    sim.executeInstruction("SHL", ["EAX", "4"]);
    expect(sim.getRegisters().EAX).toBe(16);
  });

  test("SHR right shifts by immediate", () => {
    sim.executeInstruction("MOV", ["EAX", "16"]);
    sim.executeInstruction("SHR", ["EAX", "4"]);
    expect(sim.getRegisters().EAX).toBe(1);
  });

  test("SHR right shifts by register count", () => {
    sim.executeInstruction("MOV", ["EAX", "32"]);
    sim.executeInstruction("MOV", ["ECX", "3"]);
    sim.executeInstruction("SHR", ["EAX", "ECX"]);
    expect(sim.getRegisters().EAX).toBe(4);
  });

  test("SAR sign-extends on right shift", () => {
    sim.executeInstruction("MOV", ["EAX", "0x80000000"]);
    sim.executeInstruction("SAR", ["EAX", "1"]);
    expect(sim.getRegisters().EAX).toBe(0xc0000000);
  });

  test("SHL count > 31 uses count mod 32", () => {
    sim.executeInstruction("MOV", ["EAX", "1"]);
    sim.executeInstruction("SHL", ["EAX", "33"]); // 33 mod 32 = 1
    expect(sim.getRegisters().EAX).toBe(2);
  });

  test("SHR count > 31 uses count mod 32", () => {
    sim.executeInstruction("MOV", ["EAX", "0x80000000"]);
    sim.executeInstruction("SHR", ["EAX", "33"]);
    expect(sim.getRegisters().EAX).toBe(0x40000000);
  });

  test("SAR count > 31 uses count mod 32", () => {
    sim.executeInstruction("MOV", ["EAX", "0x80000000"]);
    sim.executeInstruction("SAR", ["EAX", "33"]);
    expect(sim.getRegisters().EAX).toBe(0xc0000000);
  });

  test("shift by 32 is equivalent to shift by 0", () => {
    sim.executeInstruction("MOV", ["EAX", "0xFF"]);
    sim.executeInstruction("SHL", ["EAX", "32"]);
    expect(sim.getRegisters().EAX).toBe(0xff);
  });

  test("SHL clears CF when raw count > 32", () => {
    sim.executeInstruction("MOV", ["EAX", "0xFFFFFFFF"]);
    sim.executeInstruction("MOV", ["ECX", "40"]);
    sim.executeInstruction("SHL", ["EAX", "ECX"]);
    const flags = sim.getState().flags;
    expect(flags & 0x01).toBe(0);
    expect(sim.getRegisters().EAX).toBe(0xffffff00);
  });

  test("SAR handles register count and missing operands", () => {
    expect(() => sim.executeInstruction("SAR", ["EAX"])).not.toThrow();

    sim.executeInstruction("MOV", ["EAX", "0x80000000"]);
    sim.executeInstruction("MOV", ["ECX", "1"]);
    sim.executeInstruction("SAR", ["EAX", "ECX"]);
    expect(sim.getRegisters().EAX).toBe(0xc0000000);
  });

  test("SHL/SHR operand guards", () => {
    expect(() => sim.executeInstruction("SHL", ["EAX"])).not.toThrow();
    expect(() => sim.executeInstruction("SHR", ["EAX"])).not.toThrow();
  });
});

describe("executeInstruction - Rotates (ROL/ROR)", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("ROL rotates left", () => {
    sim.executeInstruction("MOV", ["EAX", "0x80000000"]);
    sim.executeInstruction("ROL", ["EAX", "1"]);
    expect(sim.getRegisters().EAX).toBe(1);
  });

  test("ROL rotates left by register count", () => {
    sim.executeInstruction("MOV", ["EAX", "0x80000000"]);
    sim.executeInstruction("MOV", ["ECX", "2"]);
    sim.executeInstruction("ROL", ["EAX", "ECX"]);
    expect(sim.getRegisters().EAX).toBe(2);
  });

  test("ROR rotates right", () => {
    sim.executeInstruction("MOV", ["EAX", "1"]);
    sim.executeInstruction("ROR", ["EAX", "1"]);
    expect(sim.getRegisters().EAX).toBe(0x80000000);
  });

  test("ROR rotates right by register count", () => {
    sim.executeInstruction("MOV", ["EAX", "4"]);
    sim.executeInstruction("MOV", ["ECX", "2"]);
    sim.executeInstruction("ROR", ["EAX", "ECX"]);
    expect(sim.getRegisters().EAX).toBe(1);
  });

  test("ROL clears OF when MSB equals CF for single-bit ROL", () => {
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("ROL", ["EAX", "1"]);
    const flags = sim.getState().flags;
    expect(flags & 0x800).toBe(0);
  });

  test("ROL sets OF when MSB != CF for single-bit ROL", () => {
    sim.executeInstruction("MOV", ["EAX", "0x80000000"]);
    sim.executeInstruction("ROL", ["EAX", "1"]);
    const flags = sim.getState().flags;
    expect(flags & 0x800).not.toBe(0);
  });

  test("ROL operand guard", () => {
    expect(() => sim.executeInstruction("ROL", ["EAX"])).not.toThrow();
  });

  test("ROR operand guard", () => {
    expect(() => sim.executeInstruction("ROR", ["EAX"])).not.toThrow();
  });
});

describe("executeInstruction - Stack (PUSH/POP)", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator(8, 8);
  });

  test("PUSH and POP round-trip", () => {
    sim.executeInstruction("MOV", ["EAX", "42"]);
    sim.executeInstruction("PUSH", ["EAX"]);
    sim.executeInstruction("POP", ["EBX"]);
    expect(sim.getRegisters().EBX).toBe(42);
  });

  test("PUSH decrements ESP", () => {
    const initialESP = sim.getRegisters().ESP;
    sim.executeInstruction("PUSH", ["EAX"]);
    expect(sim.getRegisters().ESP).toBe(initialESP - 4);
  });

  test("POP increments ESP", () => {
    sim.executeInstruction("PUSH", ["EAX"]);
    const esp = sim.getRegisters().ESP;
    sim.executeInstruction("POP", ["EBX"]);
    expect(sim.getRegisters().ESP).toBe(esp + 4);
  });

  test("PUSH with immediate", () => {
    sim.executeInstruction("PUSH", ["123"]);
    sim.executeInstruction("POP", ["EAX"]);
    expect(sim.getRegisters().EAX).toBe(123);
  });

  test("PUSH with memory source", () => {
    sim.executeInstruction("MOV", ["EBX", "1000"]);
    sim.executeInstruction("MOV", ["[EBX]", "42"]);
    sim.executeInstruction("PUSH", ["[EBX]"]);
    sim.executeInstruction("POP", ["EAX"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("PUSH with memory operand via register base", () => {
    sim.executeInstruction("MOV", ["EAX", "12345"]);
    sim.executeInstruction("MOV", ["EBX", "0x1000"]);
    sim.executeInstruction("MOV", ["[EBX]", "EAX"]);
    sim.executeInstruction("PUSH", ["[EBX]"]);
    sim.executeInstruction("POP", ["ECX"]);
    expect(sim.getRegisters().ECX).toBe(12345);
  });

  test("POP reads register8 destination", () => {
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("PUSH", ["0xAB"]);
    sim.executeInstruction("POP", ["AL"]);
    expect(sim.getRegisters().EAX & 0xff).toBe(0xab);
  });

  test("PUSH and POP ignore invalid operand counts", () => {
    expect(() => sim.executeInstruction("PUSH", [])).not.toThrow();
    expect(() => sim.executeInstruction("POP", [])).not.toThrow();
  });

  test("multiple push/pop maintain LIFO order", () => {
    sim.executeInstruction("PUSH", ["10"]);
    sim.executeInstruction("PUSH", ["20"]);
    sim.executeInstruction("PUSH", ["30"]);
    sim.executeInstruction("POP", ["EAX"]);
    sim.executeInstruction("POP", ["EBX"]);
    sim.executeInstruction("POP", ["ECX"]);
    expect(sim.getRegisters().EAX).toBe(30);
    expect(sim.getRegisters().EBX).toBe(20);
    expect(sim.getRegisters().ECX).toBe(10);
  });
});

describe("executeInstruction - INT", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  describe("INT 0x10 - Video services", () => {
    test("INT 0x10 with AH=0x0E writes character to console", () => {
      sim.executeInstruction("MOV", ["EAX", "0x0E48"]);
      sim.executeInstruction("INT", ["0x10"]);
      expect(sim.getConsoleOutput()).toBe("H");
    });

    test("INT 0x10 outputs multiple characters", () => {
      sim.executeInstruction("MOV", ["EAX", "0x0E48"]);
      sim.executeInstruction("INT", ["0x10"]);
      sim.executeInstruction("MOV", ["EAX", "0x0E69"]);
      sim.executeInstruction("INT", ["0x10"]);
      expect(sim.getConsoleOutput()).toBe("Hi");
    });

    test("INT 0x10 handles newline character", () => {
      sim.executeInstruction("MOV", ["EAX", "0x0E0A"]);
      sim.executeInstruction("INT", ["0x10"]);
      expect(sim.getConsoleOutput()).toBe("\n");
    });
  });

  describe("INT 0x20 - Program terminate", () => {
    test("INT 0x20 halts the program", () => {
      sim.executeInstruction("INT", ["0x20"]);
      const state = sim.getState();
      expect(state.halted).toBe(true);
      expect(state.running).toBe(false);
    });
  });

  describe("INT 0x21 - DOS services", () => {
    test("INT 0x21 with AH=0x02 writes character from DL", () => {
      sim.executeInstruction("MOV", ["EAX", "0x0200"]);
      sim.executeInstruction("MOV", ["EDX", "0x41"]);
      sim.executeInstruction("INT", ["0x21"]);
      expect(sim.getConsoleOutput()).toBe("A");
    });

    test("INT 0x21 AH=0x02 outputs multiple characters", () => {
      sim.executeInstruction("MOV", ["EAX", "0x0200"]);
      sim.executeInstruction("MOV", ["EDX", "0x48"]);
      sim.executeInstruction("INT", ["0x21"]);
      sim.executeInstruction("MOV", ["EDX", "0x69"]);
      sim.executeInstruction("INT", ["0x21"]);
      expect(sim.getConsoleOutput()).toBe("Hi");
    });

    test("INT 0x21 function 0x09 (write string) is a no-op", () => {
      sim.executeInstruction("MOV", ["EAX", "0x0900"]);
      expect(() => {
        sim.executeInstruction("INT", ["0x21"]);
      }).not.toThrow();
    });
  });

  describe("IRET instruction", () => {
    test("IRET is recognized and doesn't crash", () => {
      expect(() => {
        sim.executeInstruction("IRET", []);
      }).not.toThrow();
    });
  });

  describe("case insensitivity", () => {
    test("int is case insensitive", () => {
      sim.executeInstruction("MOV", ["EAX", "0x0E48"]);
      sim.executeInstruction("int", ["0x10"]);
      expect(sim.getConsoleOutput()).toBe("H");
    });

    test("iret is case insensitive", () => {
      expect(() => {
        sim.executeInstruction("iret", []);
      }).not.toThrow();
    });
  });

  describe("hex number parsing", () => {
    test("INT accepts hex interrupt numbers", () => {
      sim.executeInstruction("MOV", ["EAX", "0x0E48"]);
      sim.executeInstruction("INT", ["0x10"]);
      expect(sim.getConsoleOutput()).toBe("H");
    });

    test("INT accepts decimal interrupt numbers", () => {
      sim.executeInstruction("MOV", ["EAX", "0x0E48"]);
      sim.executeInstruction("INT", ["16"]);
      expect(sim.getConsoleOutput()).toBe("H");
    });
  });

  test("INT with missing operand is a no-op", () => {
    expect(() => sim.executeInstruction("INT", [])).not.toThrow();
  });
});

describe("executeInstruction - RAND", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("RAND generates random value in register", () => {
    sim.executeInstruction("RAND", ["EAX", "100"]);
    const value = sim.getRegisters().EAX;
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(100);
  });

  test("RAND with one operand generates default range", () => {
    sim.executeInstruction("RAND", ["EAX"]);
    const value = sim.getRegisters().EAX;
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(0xffffffff);
  });

  test("RAND with maxValue <= 0 sets maxValue to 1", () => {
    sim.executeInstruction("RAND", ["EAX", "0"]);
    expect(sim.getRegisters().EAX).toBe(0);
  });

  test("RAND supports register max operand", () => {
    sim.executeInstruction("MOV", ["EBX", "10"]);
    sim.executeInstruction("RAND", ["EAX", "EBX"]);
    const value = sim.getRegisters().EAX;
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(10);
  });

  test("RAND ignores invalid or missing operands", () => {
    expect(() => sim.executeInstruction("RAND", [])).not.toThrow();
    expect(() => sim.executeInstruction("RAND", ["10"])).not.toThrow();
  });
});

describe("executeInstruction - HLT", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("HLT halts the simulator", () => {
    sim.executeInstruction("HLT", []);
    const state = sim.getState();
    expect(state.halted).toBe(true);
    expect(state.running).toBe(false);
  });
});

describe("executeInstruction - NOP", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("NOP does not modify any register", () => {
    sim.executeInstruction("MOV", ["EAX", "42"]);
    sim.executeInstruction("MOV", ["ECX", "100"]);
    sim.executeInstruction("NOP", []);
    expect(sim.getRegisters().EAX).toBe(42);
    expect(sim.getRegisters().ECX).toBe(100);
  });

  test("NOP does not modify flags", () => {
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("ADD", ["EAX", "0"]);
    expect(sim.isZeroFlagSet()).toBe(true);
    sim.executeInstruction("NOP", []);
    expect(sim.isZeroFlagSet()).toBe(true);
  });
});

describe("executeInstruction - Jump NOPs (in executeInstruction context)", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("conditional jumps are no-ops in executeInstruction", () => {
    const jumpMnemonics = [
      "JMP",
      "JE",
      "JZ",
      "JNE",
      "JNZ",
      "JG",
      "JGE",
      "JL",
      "JLE",
      "JS",
      "JNS",
      "JA",
      "JAE",
      "JB",
      "JBE",
    ];
    for (const mnemonic of jumpMnemonics) {
      expect(() => sim.executeInstruction(mnemonic, ["label"])).not.toThrow();
    }
  });

  test("CALL/RET are no-ops in executeInstruction", () => {
    expect(() => sim.executeInstruction("CALL", ["function"])).not.toThrow();
    expect(() => sim.executeInstruction("RET", [])).not.toThrow();
  });
});

describe("executeInstruction - unknown instruction", () => {
  test("throws for unrecognized mnemonic", () => {
    const sim = new Simulator();
    expect(() => sim.executeInstruction("BOGUS", ["EAX"])).toThrow(
      "Unknown instruction: BOGUS",
    );
  });
});

describe("executeInstruction - resolveSourceValue", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("resolves absolute memory and IO", () => {
    sim.executeInstruction("MOV", ["[100]", "25"]);
    sim.executeInstruction("MOV", ["EAX", "1"]);
    sim.executeInstruction("ADD", ["EAX", "[100]"]);
    expect(sim.getRegisters().EAX).toBe(26);

    sim.executeInstruction("ADD", ["EAX", "[0xF000]"]);
    expect(sim.getRegisters().EAX).toBe(26);
  });

  test("resolves IO keyboard range and zero offset", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("ADD", ["EAX", "[0]"]);
    expect(sim.getRegisters().EAX).toBe(5);

    sim.executeInstruction("ADD", ["EAX", "[0x10100]"]);
    expect(sim.getRegisters().EAX).toBe(5);
  });

  test("resolves register8 sources", () => {
    sim.executeInstruction("MOV", ["EAX", "0xFF"]);
    sim.executeInstruction("ADD", ["EAX", "AL"]);
    expect(sim.getRegisters().EAX).toBe(0x1fe);
  });
});

describe("executeInstruction - Compatibility Mode", () => {
  describe("Educational mode (default)", () => {
    test("allows memory-to-memory MOV in educational mode", () => {
      const sim = new Simulator(16, 16);
      sim.executeInstruction("MOV", ["0xF000", "0xF100"]);
      expect(sim.getCompatibilityMode()).toBe("educational");
    });
  });

  describe("Strict x86 mode", () => {
    test("prevents memory-to-memory MOV in strict-x86 mode", () => {
      const sim = new Simulator(16, 16, "strict-x86");
      expect(() => {
        sim.executeInstruction("MOV", ["0xF000", "0xF100"]);
      }).toThrow("Memory-to-memory MOV not allowed in strict-x86 mode");
    });

    test("allows register-to-memory MOV in strict-x86 mode", () => {
      const sim = new Simulator(16, 16, "strict-x86");
      sim.executeInstruction("MOV", ["EAX", "42"]);
      sim.executeInstruction("MOV", ["0xF000", "EAX"]);
      const lcd = sim.getLCDDisplay();
      expect(lcd[0]).toBe(1);
    });

    test("allows immediate-to-register MOV in strict-x86 mode", () => {
      const sim = new Simulator(8, 8, "strict-x86");
      sim.executeInstruction("MOV", ["EAX", "42"]);
      expect(sim.getRegisters().EAX).toBe(42);
    });

    test("allows register-to-register MOV in strict-x86 mode", () => {
      const sim = new Simulator(8, 8, "strict-x86");
      sim.executeInstruction("MOV", ["EAX", "100"]);
      sim.executeInstruction("MOV", ["EBX", "EAX"]);
      expect(sim.getRegisters().EBX).toBe(100);
    });

    test("allows immediate-to-memory MOV in strict-x86 mode", () => {
      const sim = new Simulator(16, 16, "strict-x86");
      sim.executeInstruction("MOV", ["0xF000", "1"]);
      const lcd = sim.getLCDDisplay();
      expect(lcd[0]).toBe(1);
    });

    test("Strict-x86 MOV rejects memory-to-memory and IO immediates", () => {
      const strictSim = new Simulator(8, 8, "strict-x86");
      expect(() =>
        strictSim.executeInstruction("MOV", ["[100]", "[200]"]),
      ).toThrow("Memory-to-memory MOV not allowed");

      expect(() =>
        strictSim.executeInstruction("MOV", ["[100]", "0xF000"]),
      ).toThrow("Memory-to-memory MOV not allowed");

      expect(() =>
        strictSim.executeInstruction("MOV", ["[100]", "0x10100"]),
      ).toThrow("Memory-to-memory MOV not allowed");

      strictSim.executeInstruction("MOV", ["[120]", "0x200"]);
      strictSim.executeInstruction("MOV", ["EAX", "[120]"]);
      expect(strictSim.getRegisters().EAX).toBe(0x200);
    });
  });
});
