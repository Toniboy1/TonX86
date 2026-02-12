import { Simulator } from "./simulator";

describe("Flag Semantics", () => {
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
