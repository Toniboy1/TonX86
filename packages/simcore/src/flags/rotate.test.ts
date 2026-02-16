import { Simulator } from "../simulator/index";

describe("Flag Semantics - Rotate", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  describe("ROL (Rotate Left) Flags", () => {
    it("sets CF to bit rotated into LSB", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "2147483648"],
          raw: "MOV EAX, 2147483648",
        }, // 0x80000000
        { line: 2, mnemonic: "ROL", operands: ["EAX", "1"], raw: "ROL EAX, 1" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // ROL
      expect((sim.getState().flags & 0x01) !== 0).toBe(true); // CF = LSB of result
      expect(sim.getState().registers[0]).toBe(1); // MSB rotated to LSB
    });

    it("sets OF when MSB XOR CF for single-bit rotate", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "1073741824"],
          raw: "MOV EAX, 1073741824",
        }, // 0x40000000
        { line: 2, mnemonic: "ROL", operands: ["EAX", "1"], raw: "ROL EAX, 1" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // ROL
      expect((sim.getState().flags & 0x800) !== 0).toBe(true); // OF = MSB XOR CF
    });

    it("does not modify flags when count is zero", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "4294967295"],
          raw: "MOV EAX, 4294967295",
        }, // 0xFFFFFFFF
        { line: 2, mnemonic: "ROL", operands: ["EAX", "0"], raw: "ROL EAX, 0" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      const flagsBefore = sim.getState().flags;
      sim.step(); // ROL with count=0
      expect(sim.getState().registers[0]).toBe(4294967295);
      expect(sim.getState().flags).toBe(flagsBefore);
    });
  });

  describe("ROR (Rotate Right) Flags", () => {
    it("sets CF to bit rotated into MSB", () => {
      const instructions = [
        { line: 1, mnemonic: "MOV", operands: ["EAX", "1"], raw: "MOV EAX, 1" },
        { line: 2, mnemonic: "ROR", operands: ["EAX", "1"], raw: "ROR EAX, 1" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // ROR
      expect((sim.getState().flags & 0x01) !== 0).toBe(true); // CF = MSB of result
      expect(sim.getState().registers[0]).toBe(2147483648); // LSB rotated to MSB
    });

    it("sets OF when top two bits differ for single-bit rotate", () => {
      const instructions = [
        { line: 1, mnemonic: "MOV", operands: ["EAX", "3"], raw: "MOV EAX, 3" },
        { line: 2, mnemonic: "ROR", operands: ["EAX", "1"], raw: "ROR EAX, 1" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // ROR
      expect((sim.getState().flags & 0x800) !== 0).toBe(true); // OF = bit 31 XOR bit 30
    });

    it("clears OF when top two bits are equal for single-bit rotate", () => {
      const instructions = [
        { line: 1, mnemonic: "MOV", operands: ["EAX", "2"], raw: "MOV EAX, 2" },
        { line: 2, mnemonic: "ROR", operands: ["EAX", "1"], raw: "ROR EAX, 1" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // ROR: 2 >> 1 = 1, bit 31=0, bit 30=0 → OF cleared
      expect(sim.getState().registers[0]).toBe(1);
      expect((sim.getState().flags & 0x800) !== 0).toBe(false); // OF = 0
    });

    it("does not modify flags when count is zero", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "4294967295"],
          raw: "MOV EAX, 4294967295",
        }, // 0xFFFFFFFF
        { line: 2, mnemonic: "ROR", operands: ["EAX", "0"], raw: "ROR EAX, 0" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      const flagsBefore = sim.getState().flags;
      sim.step(); // ROR with count=0
      expect(sim.getState().registers[0]).toBe(4294967295);
      expect(sim.getState().flags).toBe(flagsBefore);
    });
  });
});
