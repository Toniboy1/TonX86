import { describe, it, expect, beforeEach } from "@jest/globals";
import { Simulator } from "./simulator";

/**
 * Tests for data loading functionality (loadData method)
 */
describe("Simulator - Data Loading", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  describe("loadData method", () => {
    it("should load byte data (DB) into memory", () => {
      sim.loadData([
        { address: 0x2000, size: 1, values: [0x48, 0x65, 0x6c, 0x6c, 0x6f] },
      ]);

      const memory = sim.getMemoryA(0x2000, 5);
      expect(Array.from(memory)).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    });

    it("should load word data (DW) into memory in little-endian", () => {
      sim.loadData([{ address: 0x3000, size: 2, values: [0x1234, 0xabcd] }]);

      const memory = sim.getMemoryA(0x3000, 4);
      // 0x1234 -> 0x34, 0x12 (little-endian)
      // 0xABCD -> 0xCD, 0xAB (little-endian)
      expect(Array.from(memory)).toEqual([0x34, 0x12, 0xcd, 0xab]);
    });

    it("should load doubleword data (DD) into memory in little-endian", () => {
      sim.loadData([{ address: 0x4000, size: 4, values: [0x12345678] }]);

      const memory = sim.getMemoryA(0x4000, 4);
      // 0x12345678 -> 0x78, 0x56, 0x34, 0x12 (little-endian)
      expect(Array.from(memory)).toEqual([0x78, 0x56, 0x34, 0x12]);
    });

    it("should load multiple data items to different addresses", () => {
      sim.loadData([
        { address: 0x2000, size: 1, values: [0x01, 0x02] },
        { address: 0x3000, size: 2, values: [0x1234] },
        { address: 0x4000, size: 4, values: [0xdeadbeef] },
      ]);

      expect(Array.from(sim.getMemoryA(0x2000, 2))).toEqual([0x01, 0x02]);
      expect(Array.from(sim.getMemoryA(0x3000, 2))).toEqual([0x34, 0x12]);
      expect(Array.from(sim.getMemoryA(0x4000, 4))).toEqual([
        0xef, 0xbe, 0xad, 0xde,
      ]);
    });

    it("should handle sequential data items", () => {
      sim.loadData([
        { address: 0x2000, size: 1, values: [0x42] },
        { address: 0x2001, size: 2, values: [0x1234] },
        { address: 0x2003, size: 4, values: [0xabcdef00] },
      ]);

      const memory = sim.getMemoryA(0x2000, 7);
      expect(Array.from(memory)).toEqual([
        0x42, // DB
        0x34,
        0x12, // DW
        0x00,
        0xef,
        0xcd,
        0xab, // DD
      ]);
    });

    it("should handle empty data items array", () => {
      // Should not throw
      expect(() => sim.loadData([])).not.toThrow();
    });

    it("should allow reading data back via MOV instruction", () => {
      // Load string "Hi" at 0x2000
      sim.loadData([
        { address: 0x2000, size: 1, values: [0x48, 0x69, 0x00] }, // "Hi\0"
      ]);

      sim.loadInstructions(
        [
          { line: 1, mnemonic: "MOV", operands: ["EAX", "[0x2000]"], raw: "" },
          { line: 2, mnemonic: "MOV", operands: ["EBX", "[0x2001]"], raw: "" },
        ],
        new Map(),
      );

      sim.step();
      sim.step();

      const state = sim.getState();
      // Note: MOV reads 32-bit values in little-endian
      // At 0x2000: 0x00 0x69 0x48 0x?? -> 0x??006948 (depends on memory)
      // Let's just check the first byte
      expect(state.registers[0] & 0xff).toBe(0x48); // EAX low byte = 'H'
      expect(state.registers[3] & 0xff).toBe(0x69); // EBX low byte = 'i'
    });
  });

  describe("Integration with parser", () => {
    it("should handle data loaded before instructions", () => {
      // Simulate: .data section with message, then .text section that reads it
      sim.loadData([
        {
          address: 0x2000,
          size: 1,
          values: [72, 101, 108, 108, 111],
        }, // "Hello"
      ]);

      sim.loadInstructions(
        [
          { line: 1, mnemonic: "MOV", operands: ["EAX", "0x2000"], raw: "" },
          { line: 2, mnemonic: "MOV", operands: ["EBX", "[EAX]"], raw: "" },
        ],
        new Map([["message", 0x2000]]),
      );

      sim.step(); // MOV EAX, 0x2000
      sim.step(); // MOV EBX, [EAX]

      const state = sim.getState();
      expect(state.registers[0]).toBe(0x2000); // EAX = address
      expect(state.registers[3] & 0xff).toBe(72); // EBX low byte = 'H'
    });
  });

  describe("Data at various memory locations", () => {
    it("should load data at high memory address", () => {
      sim.loadData([{ address: 0xf000 - 100, size: 1, values: [0xff] }]);

      const memory = sim.getMemoryA(0xf000 - 100, 1);
      expect(memory[0]).toBe(0xff);
    });

    it("should handle data at low memory address", () => {
      sim.loadData([{ address: 0x0000, size: 1, values: [0x42] }]);

      const memory = sim.getMemoryA(0x0000, 1);
      expect(memory[0]).toBe(0x42);
    });
  });
});
