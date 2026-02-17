import { Simulator } from "../simulator/index";

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

    test("INT 0x21 AH=0x09 writes $-terminated string", () => {
      // Set up a $-terminated string in memory
      sim.executeInstruction("MOV", ["EDX", "0x1000"]); // Address of string
      sim.executeInstruction("MOV", ["EAX", "0x1000"]);
      sim.executeInstruction("MOV", ["EBX", "0x48"]); // 'H'
      sim.executeInstruction("MOV", ["[EAX]", "EBX"]);
      sim.executeInstruction("MOV", ["EAX", "0x1001"]);
      sim.executeInstruction("MOV", ["EBX", "0x65"]); // 'e'
      sim.executeInstruction("MOV", ["[EAX]", "EBX"]);
      sim.executeInstruction("MOV", ["EAX", "0x1002"]);
      sim.executeInstruction("MOV", ["EBX", "0x6C"]); // 'l'
      sim.executeInstruction("MOV", ["[EAX]", "EBX"]);
      sim.executeInstruction("MOV", ["EAX", "0x1003"]);
      sim.executeInstruction("MOV", ["EBX", "0x6C"]); // 'l'
      sim.executeInstruction("MOV", ["[EAX]", "EBX"]);
      sim.executeInstruction("MOV", ["EAX", "0x1004"]);
      sim.executeInstruction("MOV", ["EBX", "0x6F"]); // 'o'
      sim.executeInstruction("MOV", ["[EAX]", "EBX"]);
      sim.executeInstruction("MOV", ["EAX", "0x1005"]);
      sim.executeInstruction("MOV", ["EBX", "0x24"]); // '$' terminator
      sim.executeInstruction("MOV", ["[EAX]", "EBX"]);

      // Execute INT 0x21 with AH=0x09
      sim.executeInstruction("MOV", ["EAX", "0x0900"]);
      sim.executeInstruction("INT", ["0x21"]);
      expect(sim.getConsoleOutput()).toBe("Hello");
    });

    test("INT 0x21 AH=0x09 handles empty string", () => {
      // String with immediate $ terminator
      sim.executeInstruction("MOV", ["EDX", "0x2000"]);
      sim.executeInstruction("MOV", ["EAX", "0x2000"]);
      sim.executeInstruction("MOV", ["EBX", "0x24"]); // '$' terminator
      sim.executeInstruction("MOV", ["[EAX]", "EBX"]);

      sim.executeInstruction("MOV", ["EAX", "0x0900"]);
      sim.executeInstruction("INT", ["0x21"]);
      expect(sim.getConsoleOutput()).toBe("");
    });

    test("INT 0x21 AH=0x09 handles max length safety", () => {
      // No $ terminator - should stop at max length
      sim.executeInstruction("MOV", ["EDX", "0x3000"]);
      sim.executeInstruction("MOV", ["EAX", "0x0900"]);
      sim.executeInstruction("INT", ["0x21"]);
      // Should not throw or hang
      expect(sim.getConsoleOutput().length).toBeLessThanOrEqual(4096);
    });
  });

  describe("IRET instruction", () => {
    test("IRET is recognized and doesn't crash", () => {
      expect(() => {
        sim.executeInstruction("IRET", []);
      }).not.toThrow();
    });

    test("IRET accepts no operands", () => {
      // IRET takes no operands, should not throw
      expect(() => {
        sim.executeInstruction("IRET", []);
      }).not.toThrow();
    });

    test("IRET is case insensitive", () => {
      expect(() => {
        sim.executeInstruction("iret", []);
      }).not.toThrow();
      expect(() => {
        sim.executeInstruction("IrEt", []);
      }).not.toThrow();
    });

    // Note: Full IRET behavior (popping return address and flags) is tested
    // in simulator.test.ts using step() method, as IRET requires special
    // control flow handling that is only active when using step()
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

describe("executeInstruction - INT3 (Breakpoint)", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("INT3 halts the processor", () => {
    sim.executeInstruction("INT3", []);
    const state = sim.getState();
    expect(state.halted).toBe(true);
    expect(state.running).toBe(false);
  });
});

describe("INT edge cases", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("INT with non-immediate operand (register) is a no-op", () => {
    sim.executeInstruction("MOV", ["EAX", "0x10"]);
    sim.executeInstruction("INT", ["EAX"]);
    const state = sim.getState();
    expect(state.halted).toBe(false);
  });

  test("INT 0x10 with AH != 0x0E does nothing", () => {
    // AH = 0x01, not 0x0E, so no character output
    sim.executeInstruction("MOV", ["EAX", "0x0148"]);
    sim.executeInstruction("INT", ["0x10"]);
    expect(sim.getConsoleOutput()).toBe("");
  });
});
