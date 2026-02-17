import { Simulator } from "../simulator/index";

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

  test("AND with non-register dest is a no-op", () => {
    sim.executeInstruction("MOV", ["EAX", "0xFF"]);
    sim.executeInstruction("AND", ["10", "5"]);
    expect(sim.getRegisters().EAX).toBe(0xff);
  });

  test("OR with non-register dest is a no-op", () => {
    sim.executeInstruction("MOV", ["EAX", "0xFF"]);
    sim.executeInstruction("OR", ["10", "5"]);
    expect(sim.getRegisters().EAX).toBe(0xff);
  });

  test("XOR with non-register dest is a no-op", () => {
    sim.executeInstruction("MOV", ["EAX", "0xFF"]);
    sim.executeInstruction("XOR", ["10", "5"]);
    expect(sim.getRegisters().EAX).toBe(0xff);
  });

  test("NOT with non-register dest is a no-op", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("NOT", ["10"]);
    expect(sim.getRegisters().EAX).toBe(5);
  });

  test("TEST with non-register dest is a no-op", () => {
    const flagsBefore = sim.getState().flags;
    sim.executeInstruction("TEST", ["10", "5"]);
    expect(sim.getState().flags).toBe(flagsBefore);
  });
});
