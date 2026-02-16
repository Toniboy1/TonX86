import { Simulator } from "../simulator/index";

describe("executeInstruction - LAHF/SAHF (Load/Store flags)", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("LAHF loads flags into AH", () => {
    // Set ZF and SF
    sim.executeInstruction("MOV", ["EAX", "0x80000000"]);
    sim.executeInstruction("ADD", ["EAX", "0x80000000"]); // result=0, ZF=1, CF=1
    sim.executeInstruction("MOV", ["EAX", "0"]); // clear EAX but flags remain
    sim.executeInstruction("LAHF", []);
    const ah = (sim.getRegisters().EAX >> 8) & 0xff;
    // CF(1) + bit1(1) + ZF(1) = 0x01 | 0x02 | 0x40 = 0x43
    expect(ah & 0x01).toBe(0x01); // CF
    expect(ah & 0x02).toBe(0x02); // bit1 always set
    expect(ah & 0x40).toBe(0x40); // ZF
  });

  test("LAHF preserves other EAX bits", () => {
    sim.executeInstruction("MOV", ["EAX", "0xDEAD00FF"]);
    sim.executeInstruction("CMP", ["EAX", "EAX"]); // ZF=1, CF=0, SF=0
    sim.executeInstruction("MOV", ["EAX", "0xDEAD00FF"]);
    sim.executeInstruction("LAHF", []);
    const eax = sim.getRegisters().EAX;
    // AL should still be 0xFF
    expect(eax & 0xff).toBe(0xff);
    // Upper 16 bits should still be 0xDEAD
    expect((eax >>> 16) & 0xffff).toBe(0xdead);
  });

  test("LAHF captures SF when sign flag is set", () => {
    sim.executeInstruction("MOV", ["EAX", "1"]);
    sim.executeInstruction("CMP", ["EAX", "2"]); // 1-2 = negative => SF=1
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("LAHF", []);
    const ah = (sim.getRegisters().EAX >> 8) & 0xff;
    expect(ah & 0x80).toBe(0x80); // SF set
  });

  test("SAHF stores AH into flags", () => {
    sim.executeInstruction("MOV", ["EAX", "0x0000C100"]); // AH = 0xC1 => SF|ZF|CF
    sim.executeInstruction("SAHF", []);
    expect(sim.isCarryFlagSet()).toBe(true);
    expect(sim.isZeroFlagSet()).toBe(true);
    expect(sim.isSignFlagSet()).toBe(true);
  });

  test("SAHF clears flags when AH is 0", () => {
    // First set some flags
    sim.executeInstruction("MOV", ["EBX", "0"]);
    sim.executeInstruction("SUB", ["EBX", "1"]); // set CF
    // Then clear via SAHF
    sim.executeInstruction("MOV", ["EAX", "0x00000000"]); // AH=0
    sim.executeInstruction("SAHF", []);
    expect(sim.isCarryFlagSet()).toBe(false);
    expect(sim.isZeroFlagSet()).toBe(false);
    expect(sim.isSignFlagSet()).toBe(false);
  });
});

describe("executeInstruction - XADD (Exchange and Add)", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("XADD exchanges and adds", () => {
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("MOV", ["EBX", "20"]);
    sim.executeInstruction("XADD", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(30); // 10+20
    expect(sim.getRegisters().EBX).toBe(10); // old EAX
  });

  test("XADD sets flags correctly", () => {
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("MOV", ["EBX", "0"]);
    sim.executeInstruction("XADD", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(0);
    expect(sim.isZeroFlagSet()).toBe(true);
  });

  test("XADD with wrong operand count is ignored", () => {
    expect(() => sim.executeInstruction("XADD", ["EAX"])).not.toThrow();
  });

  test("XADD with non-register operands is ignored", () => {
    expect(() => sim.executeInstruction("XADD", ["42", "EAX"])).not.toThrow();
  });
});

describe("executeInstruction - BSF/BSR (Bit Scan)", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("BSF finds least significant set bit", () => {
    sim.executeInstruction("MOV", ["EBX", "0x80"]); // bit 7
    sim.executeInstruction("BSF", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(7);
    expect(sim.isZeroFlagSet()).toBe(false);
  });

  test("BSF with source 0 sets ZF", () => {
    sim.executeInstruction("MOV", ["EBX", "0"]);
    sim.executeInstruction("BSF", ["EAX", "EBX"]);
    expect(sim.isZeroFlagSet()).toBe(true);
  });

  test("BSF finds bit 0 for odd numbers", () => {
    sim.executeInstruction("MOV", ["EBX", "0xFF"]);
    sim.executeInstruction("BSF", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(0);
  });

  test("BSF with immediate source", () => {
    sim.executeInstruction("BSF", ["EAX", "16"]); // bit 4
    expect(sim.getRegisters().EAX).toBe(4);
  });

  test("BSF with wrong operand count is ignored", () => {
    expect(() => sim.executeInstruction("BSF", ["EAX"])).not.toThrow();
  });

  test("BSF with non-register dest is ignored", () => {
    expect(() => sim.executeInstruction("BSF", ["42", "EBX"])).not.toThrow();
  });

  test("BSR finds most significant set bit", () => {
    sim.executeInstruction("MOV", ["EBX", "0xFF"]);
    sim.executeInstruction("BSR", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(7);
    expect(sim.isZeroFlagSet()).toBe(false);
  });

  test("BSR with source 0 sets ZF", () => {
    sim.executeInstruction("MOV", ["EBX", "0"]);
    sim.executeInstruction("BSR", ["EAX", "EBX"]);
    expect(sim.isZeroFlagSet()).toBe(true);
  });

  test("BSR finds bit 31 for large values", () => {
    sim.executeInstruction("MOV", ["EBX", "0x80000000"]);
    sim.executeInstruction("BSR", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(31);
  });

  test("BSR with immediate source", () => {
    sim.executeInstruction("BSR", ["EAX", "1"]); // bit 0
    expect(sim.getRegisters().EAX).toBe(0);
  });

  test("BSR with wrong operand count is ignored", () => {
    expect(() => sim.executeInstruction("BSR", ["EAX"])).not.toThrow();
  });

  test("BSR with non-register dest is ignored", () => {
    expect(() => sim.executeInstruction("BSR", ["42", "EBX"])).not.toThrow();
  });
});

describe("executeInstruction - BSWAP (Byte Swap)", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("BSWAP reverses byte order", () => {
    sim.executeInstruction("MOV", ["EAX", "0x12345678"]);
    sim.executeInstruction("BSWAP", ["EAX"]);
    expect(sim.getRegisters().EAX).toBe(0x78563412);
  });

  test("BSWAP on zero stays zero", () => {
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("BSWAP", ["EAX"]);
    expect(sim.getRegisters().EAX).toBe(0);
  });

  test("BSWAP on 0xFFFFFFFF stays same", () => {
    sim.executeInstruction("MOV", ["EAX", "0xFFFFFFFF"]);
    sim.executeInstruction("BSWAP", ["EAX"]);
    expect(sim.getRegisters().EAX).toBe(0xffffffff);
  });

  test("BSWAP double swap returns original", () => {
    sim.executeInstruction("MOV", ["EAX", "0xAABBCCDD"]);
    sim.executeInstruction("BSWAP", ["EAX"]);
    sim.executeInstruction("BSWAP", ["EAX"]);
    expect(sim.getRegisters().EAX).toBe(0xaabbccdd);
  });

  test("BSWAP with wrong operand count is ignored", () => {
    expect(() => sim.executeInstruction("BSWAP", [])).not.toThrow();
  });

  test("BSWAP with non-register is ignored", () => {
    expect(() => sim.executeInstruction("BSWAP", ["42"])).not.toThrow();
  });
});
