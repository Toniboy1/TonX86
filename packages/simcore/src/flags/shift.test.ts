import { Simulator } from "../simulator/index";

describe("Flag Semantics - Shift", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  describe("SHL (Shift Left) Flags", () => {
    it("sets CF to last bit shifted out to the left", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "2147483648"],
          raw: "MOV EAX, 2147483648",
        }, // 0x80000000
        { line: 2, mnemonic: "SHL", operands: ["EAX", "1"], raw: "SHL EAX, 1" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // SHL
      expect((sim.getState().flags & 0x01) !== 0).toBe(true); // CF set
    });

    it("clears CF when last bit shifted out is 0", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "1073741824"],
          raw: "MOV EAX, 1073741824",
        }, // 0x40000000
        { line: 2, mnemonic: "SHL", operands: ["EAX", "1"], raw: "SHL EAX, 1" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // SHL
      expect((sim.getState().flags & 0x01) !== 0).toBe(false); // CF clear
    });

    it("sets OF when top two bits of original differ for single-bit shift", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "1073741824"],
          raw: "MOV EAX, 1073741824",
        }, // 0x40000000 (bit30=1, bit31=0)
        { line: 2, mnemonic: "SHL", operands: ["EAX", "1"], raw: "SHL EAX, 1" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // SHL
      expect((sim.getState().flags & 0x800) !== 0).toBe(true); // OF set (sign changed)
    });

    it("clears OF when top two bits of original are same for single-bit shift", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "536870912"],
          raw: "MOV EAX, 536870912",
        }, // 0x20000000 (bit30=0, bit31=0)
        { line: 2, mnemonic: "SHL", operands: ["EAX", "1"], raw: "SHL EAX, 1" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // SHL
      expect((sim.getState().flags & 0x800) !== 0).toBe(false); // OF clear (sign didn't change)
    });

    it("does not modify flags when shift count is zero", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "2147483648"],
          raw: "MOV EAX, 2147483648",
        }, // 0x80000000
        { line: 2, mnemonic: "SHL", operands: ["EAX", "0"], raw: "SHL EAX, 0" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      const flagsBefore = sim.getState().flags;
      sim.step(); // SHL with count=0
      expect(sim.getState().registers[0]).toBe(2147483648); // Value unchanged
      expect(sim.getState().flags).toBe(flagsBefore); // Flags unchanged
    });

    it("updates ZF when result is zero", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "2147483648"],
          raw: "MOV EAX, 2147483648",
        }, // 0x80000000
        { line: 2, mnemonic: "SHL", operands: ["EAX", "1"], raw: "SHL EAX, 1" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // SHL
      expect(sim.getState().registers[0]).toBe(0);
      expect((sim.getState().flags & 0x40) !== 0).toBe(true); // ZF set
    });

    it("sets SF when result is negative", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "1073741824"],
          raw: "MOV EAX, 1073741824",
        }, // 0x40000000
        { line: 2, mnemonic: "SHL", operands: ["EAX", "1"], raw: "SHL EAX, 1" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // SHL
      expect(sim.getState().registers[0]).toBe(2147483648); // 0x80000000
      expect((sim.getState().flags & 0x80) !== 0).toBe(true); // SF set
    });
  });

  describe("SHR (Shift Right) Flags", () => {
    it("sets CF to last bit shifted out to the right", () => {
      const instructions = [
        { line: 1, mnemonic: "MOV", operands: ["EAX", "1"], raw: "MOV EAX, 1" },
        { line: 2, mnemonic: "SHR", operands: ["EAX", "1"], raw: "SHR EAX, 1" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // SHR
      expect((sim.getState().flags & 0x01) !== 0).toBe(true); // CF set
    });

    it("clears CF when last bit shifted out is 0", () => {
      const instructions = [
        { line: 1, mnemonic: "MOV", operands: ["EAX", "2"], raw: "MOV EAX, 2" },
        { line: 2, mnemonic: "SHR", operands: ["EAX", "1"], raw: "SHR EAX, 1" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // SHR
      expect((sim.getState().flags & 0x01) !== 0).toBe(false); // CF clear
    });

    it("sets OF to original MSB for single-bit shift", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "2147483648"],
          raw: "MOV EAX, 2147483648",
        }, // 0x80000000
        { line: 2, mnemonic: "SHR", operands: ["EAX", "1"], raw: "SHR EAX, 1" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // SHR
      expect((sim.getState().flags & 0x800) !== 0).toBe(true); // OF = original MSB (1)
    });

    it("clears OF when original value had MSB clear", () => {
      const instructions = [
        { line: 1, mnemonic: "MOV", operands: ["EAX", "4"], raw: "MOV EAX, 4" },
        { line: 2, mnemonic: "SHR", operands: ["EAX", "1"], raw: "SHR EAX, 1" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // SHR
      expect((sim.getState().flags & 0x800) !== 0).toBe(false); // OF = original MSB (0)
    });

    it("does not modify flags when shift count is zero", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "4294967295"],
          raw: "MOV EAX, 4294967295",
        }, // 0xFFFFFFFF
        { line: 2, mnemonic: "SHR", operands: ["EAX", "0"], raw: "SHR EAX, 0" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      const flagsBefore = sim.getState().flags;
      sim.step(); // SHR with count=0
      expect(sim.getState().registers[0]).toBe(4294967295); // Value unchanged
      expect(sim.getState().flags).toBe(flagsBefore); // Flags unchanged
    });
  });

  describe("SAR (Arithmetic Shift Right) Flags", () => {
    it("sets CF to last bit shifted out", () => {
      const instructions = [
        { line: 1, mnemonic: "MOV", operands: ["EAX", "1"], raw: "MOV EAX, 1" },
        { line: 2, mnemonic: "SAR", operands: ["EAX", "1"], raw: "SAR EAX, 1" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // SAR
      expect((sim.getState().flags & 0x01) !== 0).toBe(true); // CF set
    });

    it("clears OF for single-bit shift", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "2147483648"],
          raw: "MOV EAX, 2147483648",
        }, // 0x80000000
        { line: 2, mnemonic: "SAR", operands: ["EAX", "1"], raw: "SAR EAX, 1" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // SAR
      expect((sim.getState().flags & 0x800) !== 0).toBe(false); // OF always cleared for SAR count=1
    });

    it("preserves sign by filling with MSB", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "2147483648"],
          raw: "MOV EAX, 2147483648",
        }, // 0x80000000
        { line: 2, mnemonic: "SAR", operands: ["EAX", "1"], raw: "SAR EAX, 1" },
        { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
      ];
      sim.loadInstructions(instructions, new Map());
      sim.step(); // MOV
      sim.step(); // SAR
      expect(sim.getState().registers[0]).toBe(3221225472); // 0xC0000000 - Sign extended
    });
  });
});
