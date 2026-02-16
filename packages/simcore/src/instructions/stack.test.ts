import { Simulator } from "../simulator/index";

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
