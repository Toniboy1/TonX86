import { Simulator } from "../simulator/index";

describe("Flag Semantics - Arithmetic", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  describe("NEG Special CF Handling", () => {
    it("sets CF when negating a non-zero value", () => {
      const instructions = [
        { line: 1, mnemonic: "MOV", operands: ["EAX", "5"], raw: "MOV EAX, 5" },
        { line: 2, mnemonic: "NEG", operands: ["EAX"], raw: "NEG EAX" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // NEG
      expect((sim.getState().flags & 0x01) !== 0).toBe(true); // CF set
      expect(sim.getState().registers[0]).toBe(4294967291); // -5 in two's complement (0xFFFFFFFB)
    });

    it("clears CF when negating zero", () => {
      const instructions = [
        { line: 1, mnemonic: "MOV", operands: ["EAX", "0"], raw: "MOV EAX, 0" },
        { line: 2, mnemonic: "NEG", operands: ["EAX"], raw: "NEG EAX" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // NEG
      expect((sim.getState().flags & 0x01) !== 0).toBe(false); // CF clear
      expect(sim.getState().registers[0]).toBe(0); // -0 = 0
    });

    it("sets OF when negating minimum signed value", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "2147483648"],
          raw: "MOV EAX, 2147483648",
        }, // 0x80000000 (-2147483648)
        { line: 2, mnemonic: "NEG", operands: ["EAX"], raw: "NEG EAX" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // NEG
      expect((sim.getState().flags & 0x800) !== 0).toBe(true); // OF set (overflow)
      expect(sim.getState().registers[0]).toBe(2147483648); // Can't represent +2147483648
    });
  });

  describe("INC/DEC CF Preservation", () => {
    it("INC does not modify CF", () => {
      const instructions = [
        { line: 1, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
        { line: 2, mnemonic: "NEG", operands: ["EBX"], raw: "NEG EBX" }, // Sets CF
        { line: 3, mnemonic: "MOV", operands: ["EAX", "5"], raw: "MOV EAX, 5" },
        { line: 4, mnemonic: "INC", operands: ["EAX"], raw: "INC EAX" },
        { line: 5, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV EBX
      sim.step(); // NEG (sets CF)
      sim.step(); // MOV EAX
      sim.step(); // INC
      expect((sim.getState().flags & 0x01) !== 0).toBe(true); // CF still set
      expect(sim.getState().registers[0]).toBe(6);
    });

    it("DEC does not modify CF", () => {
      const instructions = [
        { line: 1, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
        { line: 2, mnemonic: "NEG", operands: ["EBX"], raw: "NEG EBX" }, // Sets CF
        { line: 3, mnemonic: "MOV", operands: ["EAX", "5"], raw: "MOV EAX, 5" },
        { line: 4, mnemonic: "DEC", operands: ["EAX"], raw: "DEC EAX" },
        { line: 5, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV EBX
      sim.step(); // NEG (sets CF)
      sim.step(); // MOV EAX
      sim.step(); // DEC
      expect((sim.getState().flags & 0x01) !== 0).toBe(true); // CF still set
      expect(sim.getState().registers[0]).toBe(4);
    });
  });
});
