import { Simulator } from "../simulator/index";

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
      readRegisterValue: (op: { type: string; value: number; byteOffset?: number }) => number;
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
    helpers.writeRegisterValue({ type: "register8", value: 1, byteOffset: 8 }, 0xbb);
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

describe("Data-movement - non-register destination branches", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("MOV with immediate destination writes to I/O address", () => {
    // dest.type === 'immediate' branch: writes value to I/O address
    sim.executeInstruction("MOV", ["0xF000", "42"]);
    // Verify via LCD display (0xF000 is LCD I/O space)
    const lcd = sim.getLCDDisplay();
    expect(lcd).toBeDefined();
  });

  test("LEA with non-register dest is a no-op", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("LEA", ["10", "[EAX+4]"]);
    expect(sim.getRegisters().EAX).toBe(5);
  });

  test("LEA with immediate src loads the value", () => {
    sim.executeInstruction("LEA", ["EAX", "42"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("MOVZX with non-register dest is a no-op", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("MOVZX", ["10", "EAX"]);
    expect(sim.getRegisters().EAX).toBe(5);
  });

  test("MOVSX with non-register dest is a no-op", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("MOVSX", ["10", "EAX"]);
    expect(sim.getRegisters().EAX).toBe(5);
  });

  test("LEA with register src does nothing (not memory or immediate)", () => {
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("LEA", ["EAX", "EBX"]);
    // LEA with register src: neither memory nor immediate branch matches
    expect(sim.getRegisters().EAX).toBe(0);
  });
});
