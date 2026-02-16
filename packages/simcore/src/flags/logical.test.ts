import { Simulator } from "../simulator/index";

describe("Flag Semantics - Logical", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  describe("Logical Instructions Clear CF/OF", () => {
    it("AND clears CF and OF", () => {
      const instructions = [
        { line: 1, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
        { line: 2, mnemonic: "NEG", operands: ["EBX"], raw: "NEG EBX" }, // Sets CF
        {
          line: 3,
          mnemonic: "MOV",
          operands: ["EAX", "15"],
          raw: "MOV EAX, 15",
        },
        { line: 4, mnemonic: "MOV", operands: ["ECX", "3"], raw: "MOV ECX, 3" },
        {
          line: 5,
          mnemonic: "AND",
          operands: ["EAX", "ECX"],
          raw: "AND EAX, ECX",
        },
        { line: 6, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV EBX
      sim.step(); // NEG (sets CF)
      sim.step(); // MOV EAX
      sim.step(); // MOV ECX
      sim.step(); // AND
      expect((sim.getState().flags & 0x01) !== 0).toBe(false); // CF cleared
      expect((sim.getState().flags & 0x800) !== 0).toBe(false); // OF cleared
    });

    it("OR clears CF and OF", () => {
      const instructions = [
        { line: 1, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
        { line: 2, mnemonic: "NEG", operands: ["EBX"], raw: "NEG EBX" }, // Sets CF
        {
          line: 3,
          mnemonic: "MOV",
          operands: ["EAX", "12"],
          raw: "MOV EAX, 12",
        },
        { line: 4, mnemonic: "MOV", operands: ["ECX", "3"], raw: "MOV ECX, 3" },
        {
          line: 5,
          mnemonic: "OR",
          operands: ["EAX", "ECX"],
          raw: "OR EAX, ECX",
        },
        { line: 6, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV EBX
      sim.step(); // NEG (sets CF)
      sim.step(); // MOV EAX
      sim.step(); // MOV ECX
      sim.step(); // OR
      expect((sim.getState().flags & 0x01) !== 0).toBe(false); // CF cleared
      expect((sim.getState().flags & 0x800) !== 0).toBe(false); // OF cleared
    });

    it("XOR clears CF and OF", () => {
      const instructions = [
        { line: 1, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
        { line: 2, mnemonic: "NEG", operands: ["EBX"], raw: "NEG EBX" }, // Sets CF
        {
          line: 3,
          mnemonic: "MOV",
          operands: ["EAX", "15"],
          raw: "MOV EAX, 15",
        },
        { line: 4, mnemonic: "MOV", operands: ["ECX", "3"], raw: "MOV ECX, 3" },
        {
          line: 5,
          mnemonic: "XOR",
          operands: ["EAX", "ECX"],
          raw: "XOR EAX, ECX",
        },
        { line: 6, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV EBX
      sim.step(); // NEG (sets CF)
      sim.step(); // MOV EAX
      sim.step(); // MOV ECX
      sim.step(); // XOR
      expect((sim.getState().flags & 0x01) !== 0).toBe(false); // CF cleared
      expect((sim.getState().flags & 0x800) !== 0).toBe(false); // OF cleared
    });
  });
});
