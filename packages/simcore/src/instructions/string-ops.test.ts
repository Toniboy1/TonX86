import { Simulator } from "../simulator/index";

describe("executeInstruction - String Operations (LODS/STOS/MOVS/SCAS/CMPS)", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("LODSB loads byte from [ESI] into AL and increments ESI", () => {
    // Write a value at address 100
    sim.executeInstruction("MOV", ["[100]", "0x42"]);
    sim.executeInstruction("MOV", ["ESI", "100"]);
    sim.executeInstruction("MOV", ["EAX", "0xFF00"]);
    sim.executeInstruction("LODSB", []);
    expect(sim.getRegisters().EAX & 0xff).toBe(0x42);
    expect(sim.getRegisters().ESI).toBe(101);
    // Upper bytes preserved
    expect(sim.getRegisters().EAX & 0xff00).toBe(0xff00);
  });

  test("LODS is alias for LODSB", () => {
    sim.executeInstruction("MOV", ["[200]", "0x55"]);
    sim.executeInstruction("MOV", ["ESI", "200"]);
    sim.executeInstruction("LODS", []);
    expect(sim.getRegisters().EAX & 0xff).toBe(0x55);
    expect(sim.getRegisters().ESI).toBe(201);
  });

  test("STOSB stores AL to [EDI] and increments EDI", () => {
    sim.executeInstruction("MOV", ["EAX", "0x42"]);
    sim.executeInstruction("MOV", ["EDI", "300"]);
    sim.executeInstruction("STOSB", []);
    sim.executeInstruction("MOV", ["EBX", "[300]"]);
    expect(sim.getRegisters().EBX).toBe(0x42);
    expect(sim.getRegisters().EDI).toBe(301);
  });

  test("STOS is alias for STOSB", () => {
    sim.executeInstruction("MOV", ["EAX", "0x77"]);
    sim.executeInstruction("MOV", ["EDI", "400"]);
    sim.executeInstruction("STOS", []);
    sim.executeInstruction("MOV", ["EBX", "[400]"]);
    expect(sim.getRegisters().EBX).toBe(0x77);
    expect(sim.getRegisters().EDI).toBe(401);
  });

  test("MOVSB copies byte from [ESI] to [EDI] and increments both", () => {
    sim.executeInstruction("MOV", ["[500]", "0xAB"]);
    sim.executeInstruction("MOV", ["ESI", "500"]);
    sim.executeInstruction("MOV", ["EDI", "600"]);
    sim.executeInstruction("MOVSB", []);
    sim.executeInstruction("MOV", ["EAX", "[600]"]);
    expect(sim.getRegisters().EAX).toBe(0xab);
    expect(sim.getRegisters().ESI).toBe(501);
    expect(sim.getRegisters().EDI).toBe(601);
  });

  test("MOVS is alias for MOVSB", () => {
    sim.executeInstruction("MOV", ["[700]", "0xCD"]);
    sim.executeInstruction("MOV", ["ESI", "700"]);
    sim.executeInstruction("MOV", ["EDI", "800"]);
    sim.executeInstruction("MOVS", []);
    sim.executeInstruction("MOV", ["EAX", "[800]"]);
    expect(sim.getRegisters().EAX).toBe(0xcd);
  });

  test("SCASB compares AL with [EDI] and sets flags", () => {
    sim.executeInstruction("MOV", ["[900]", "0x42"]);
    sim.executeInstruction("MOV", ["EAX", "0x42"]);
    sim.executeInstruction("MOV", ["EDI", "900"]);
    sim.executeInstruction("SCASB", []);
    expect(sim.isZeroFlagSet()).toBe(true); // equal
    expect(sim.getRegisters().EDI).toBe(901);
  });

  test("SCAS is alias for SCASB", () => {
    sim.executeInstruction("MOV", ["[1000]", "0x10"]);
    sim.executeInstruction("MOV", ["EAX", "0x20"]);
    sim.executeInstruction("MOV", ["EDI", "1000"]);
    sim.executeInstruction("SCAS", []);
    expect(sim.isZeroFlagSet()).toBe(false); // not equal
  });

  test("CMPSB compares [ESI] with [EDI] and sets flags", () => {
    sim.executeInstruction("MOV", ["[1100]", "0x42"]);
    sim.executeInstruction("MOV", ["[1200]", "0x42"]);
    sim.executeInstruction("MOV", ["ESI", "1100"]);
    sim.executeInstruction("MOV", ["EDI", "1200"]);
    sim.executeInstruction("CMPSB", []);
    expect(sim.isZeroFlagSet()).toBe(true); // equal
    expect(sim.getRegisters().ESI).toBe(1101);
    expect(sim.getRegisters().EDI).toBe(1201);
  });

  test("CMPS is alias for CMPSB", () => {
    sim.executeInstruction("MOV", ["[1300]", "0x10"]);
    sim.executeInstruction("MOV", ["[1400]", "0x20"]);
    sim.executeInstruction("MOV", ["ESI", "1300"]);
    sim.executeInstruction("MOV", ["EDI", "1400"]);
    sim.executeInstruction("CMPS", []);
    expect(sim.isZeroFlagSet()).toBe(false); // not equal
  });

  test("CMPSB sets carry flag when source < dest", () => {
    sim.executeInstruction("MOV", ["[1500]", "0x10"]);
    sim.executeInstruction("MOV", ["[1600]", "0x20"]);
    sim.executeInstruction("MOV", ["ESI", "1500"]);
    sim.executeInstruction("MOV", ["EDI", "1600"]);
    sim.executeInstruction("CMPSB", []);
    expect(sim.isCarryFlagSet()).toBe(true); // 0x10 < 0x20
  });
});
