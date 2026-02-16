import { Simulator } from "../simulator/index";

describe("Flag Semantics - Multiply", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  describe("MUL/IMUL CF/OF Behavior", () => {
    it("MUL sets CF/OF when result doesn't fit in destination", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "4294967295"],
          raw: "MOV EAX, 4294967295",
        }, // 0xFFFFFFFF
        { line: 2, mnemonic: "MOV", operands: ["ECX", "2"], raw: "MOV ECX, 2" },
        { line: 3, mnemonic: "MUL", operands: ["ECX"], raw: "MUL ECX" },
        { line: 4, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV EAX
      sim.step(); // MOV ECX
      sim.step(); // MUL
      expect((sim.getState().flags & 0x01) !== 0).toBe(true); // CF set
      expect((sim.getState().flags & 0x800) !== 0).toBe(true); // OF set
      expect(sim.getState().registers[2]).toBe(1); // EDX = 1 (upper 32 bits)
    });

    it("MUL clears CF/OF when result fits in EAX", () => {
      const instructions = [
        { line: 1, mnemonic: "MOV", operands: ["EAX", "2"], raw: "MOV EAX, 2" },
        { line: 2, mnemonic: "MOV", operands: ["ECX", "3"], raw: "MOV ECX, 3" },
        { line: 3, mnemonic: "MUL", operands: ["ECX"], raw: "MUL ECX" },
        { line: 4, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV EAX
      sim.step(); // MOV ECX
      sim.step(); // MUL
      expect((sim.getState().flags & 0x01) !== 0).toBe(false); // CF clear
      expect((sim.getState().flags & 0x800) !== 0).toBe(false); // OF clear
    });

    it("IMUL (1-operand) sets CF/OF on signed overflow", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "4294967295"],
          raw: "MOV EAX, 4294967295",
        }, // -1
        {
          line: 2,
          mnemonic: "MOV",
          operands: ["ECX", "4294967295"],
          raw: "MOV ECX, 4294967295",
        }, // -1
        { line: 3, mnemonic: "IMUL", operands: ["ECX"], raw: "IMUL ECX" },
        { line: 4, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV EAX
      sim.step(); // MOV ECX
      sim.step(); // IMUL
      expect((sim.getState().flags & 0x01) !== 0).toBe(false); // CF clear (fits)
      expect((sim.getState().flags & 0x800) !== 0).toBe(false); // OF clear (fits)
    });
  });
});
