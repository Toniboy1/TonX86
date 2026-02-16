import { Simulator } from "../simulator/index";

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

describe("executeInstruction - RCL/RCR (Rotate through Carry)", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("RCL rotates left through carry by 1", () => {
    sim.executeInstruction("MOV", ["EAX", "0x80000001"]);
    // Set carry flag via SUB that causes borrow
    sim.executeInstruction("MOV", ["EBX", "0"]);
    sim.executeInstruction("SUB", ["EBX", "1"]); // CF=1
    sim.executeInstruction("RCL", ["EAX", "1"]);
    // bit31 goes to CF, old CF (1) goes to bit0
    // 0x80000001 << 1 with CF in = 1 => bits shift left, CF(1)->bit0, bit31(1)->CF
    expect(sim.getRegisters().EAX).toBe(0x00000003);
    expect(sim.isCarryFlagSet()).toBe(true);
  });

  test("RCL with count 0 does nothing", () => {
    sim.executeInstruction("MOV", ["EAX", "0x12345678"]);
    sim.executeInstruction("RCL", ["EAX", "0"]);
    expect(sim.getRegisters().EAX).toBe(0x12345678);
  });

  test("RCL with register count", () => {
    sim.executeInstruction("MOV", ["EAX", "1"]);
    // Clear carry
    sim.executeInstruction("ADD", ["EAX", "0"]); // CF=0
    sim.executeInstruction("MOV", ["EAX", "1"]);
    sim.executeInstruction("MOV", ["ECX", "1"]);
    sim.executeInstruction("RCL", ["EAX", "ECX"]);
    // value=1, CF=0, rotate left 1: bit31(0)->CF, old CF(0)->bit0, val<<1 = 2
    expect(sim.getRegisters().EAX).toBe(2);
    expect(sim.isCarryFlagSet()).toBe(false);
  });

  test("RCL non-register destination is ignored", () => {
    expect(() => sim.executeInstruction("RCL", ["42", "1"])).not.toThrow();
  });

  test("RCL wrong operand count is ignored", () => {
    expect(() => sim.executeInstruction("RCL", ["EAX"])).not.toThrow();
  });

  test("RCL multi-bit rotation clears OF", () => {
    sim.executeInstruction("MOV", ["EAX", "1"]);
    sim.executeInstruction("ADD", ["EAX", "0"]); // clear CF
    sim.executeInstruction("MOV", ["EAX", "1"]);
    sim.executeInstruction("RCL", ["EAX", "3"]);
    expect(sim.isOverflowFlagSet()).toBe(false);
  });

  test("RCL single-bit sets OF when MSB differs from CF", () => {
    // Set up so MSB of result != CF => OF set
    sim.executeInstruction("MOV", ["EAX", "0x40000000"]);
    sim.executeInstruction("ADD", ["EAX", "0"]); // clear CF
    sim.executeInstruction("MOV", ["EAX", "0x40000000"]);
    sim.executeInstruction("RCL", ["EAX", "1"]);
    // Result: 0x80000000, CF=0, MSB=1 != CF=0 => OF=1
    expect(sim.getRegisters().EAX).toBe(0x80000000);
    expect(sim.isOverflowFlagSet()).toBe(true);
  });

  test("RCL in educational mode sets ZF/SF", () => {
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("ADD", ["EAX", "0"]); // CF=0
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("RCL", ["EAX", "1"]);
    expect(sim.isZeroFlagSet()).toBe(true);
  });

  test("RCR rotates right through carry by 1", () => {
    sim.executeInstruction("MOV", ["EAX", "0x00000002"]);
    // Set carry
    sim.executeInstruction("MOV", ["EBX", "0"]);
    sim.executeInstruction("SUB", ["EBX", "1"]); // CF=1
    sim.executeInstruction("RCR", ["EAX", "1"]);
    // value=2, CF=1: bit0(0)->CF, CF(1)->bit31
    // 2 >> 1 = 1, | (1<<31) = 0x80000001
    expect(sim.getRegisters().EAX).toBe(0x80000001);
    expect(sim.isCarryFlagSet()).toBe(false);
  });

  test("RCR with count 0 does nothing", () => {
    sim.executeInstruction("MOV", ["EAX", "0xABCDEF01"]);
    sim.executeInstruction("RCR", ["EAX", "0"]);
    expect(sim.getRegisters().EAX).toBe(0xabcdef01);
  });

  test("RCR with register count", () => {
    sim.executeInstruction("MOV", ["EAX", "4"]);
    sim.executeInstruction("ADD", ["EAX", "0"]); // clear CF
    sim.executeInstruction("MOV", ["EAX", "4"]);
    sim.executeInstruction("MOV", ["ECX", "1"]);
    sim.executeInstruction("RCR", ["EAX", "ECX"]);
    // value=4, CF=0: bit0(0)->CF, CF(0)->bit31, result = 4>>1 = 2
    expect(sim.getRegisters().EAX).toBe(2);
  });

  test("RCR non-register destination is ignored", () => {
    expect(() => sim.executeInstruction("RCR", ["42", "1"])).not.toThrow();
  });

  test("RCR wrong operand count is ignored", () => {
    expect(() => sim.executeInstruction("RCR", ["EAX"])).not.toThrow();
  });

  test("RCR multi-bit rotation clears OF", () => {
    sim.executeInstruction("MOV", ["EAX", "4"]);
    sim.executeInstruction("ADD", ["EAX", "0"]);
    sim.executeInstruction("MOV", ["EAX", "4"]);
    sim.executeInstruction("RCR", ["EAX", "3"]);
    expect(sim.isOverflowFlagSet()).toBe(false);
  });

  test("RCR single-bit sets OF based on top two bits", () => {
    // Set up CF=1, value=0: after RCR 1, result = 0x80000000
    // MSB=1, MSB-1=0, differ => OF=1
    sim.executeInstruction("MOV", ["EBX", "0"]);
    sim.executeInstruction("SUB", ["EBX", "1"]); // CF=1
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("RCR", ["EAX", "1"]);
    expect(sim.getRegisters().EAX).toBe(0x80000000);
    expect(sim.isOverflowFlagSet()).toBe(true);
  });

  test("RCR in educational mode sets ZF/SF", () => {
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("ADD", ["EAX", "0"]); // CF=0
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("RCR", ["EAX", "1"]);
    expect(sim.isZeroFlagSet()).toBe(true);
  });
});
