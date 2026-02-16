import { Simulator } from "../simulator/index";

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
