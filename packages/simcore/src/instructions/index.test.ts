import { Simulator } from "../simulator/index";

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
