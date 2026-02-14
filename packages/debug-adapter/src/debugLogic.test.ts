import { describe, it, expect } from "@jest/globals";
import {
  detectLCDDimensions,
  getNextInstructionLine,
  formatRegisterValue,
  formatFlagValue,
  validateCPUSpeed,
  isExecutableLine,
  findInstructionByLine,
  parseInterruptNumber,
} from "./debugLogic";
import { Instruction } from "@tonx86/simcore";

describe("Debug Logic Business Functions", () => {
  describe("detectLCDDimensions", () => {
    it("should return 8x8 when no LCD access is detected", () => {
      const instructions: Instruction[] = [
        { line: 1, mnemonic: "MOV", operands: ["EAX", "1"], raw: "MOV EAX, 1" },
        { line: 2, mnemonic: "ADD", operands: ["EAX", "2"], raw: "ADD EAX, 2" },
      ];
      const constants = new Map<string, number>();

      const [width, height] = detectLCDDimensions(instructions, constants);

      expect(width).toBe(8);
      expect(height).toBe(8);
    });

    it("should detect LCD size from EQU constants with LCD_BASE and GRID_SIZE", () => {
      const instructions: Instruction[] = [];
      const constants = new Map<string, number>();
      constants.set("LCD_BASE", 0xf000);
      constants.set("GRID_SIZE", 64);

      const [width, height] = detectLCDDimensions(instructions, constants);

      expect(width).toBe(64);
      expect(height).toBe(64);
    });

    it("should detect LCD from hardcoded memory address [0xF000]", () => {
      const instructions: Instruction[] = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["[0xF000]", "1"],
          raw: "MOV [0xF000], 1",
        },
      ];
      const constants = new Map<string, number>();

      const [width, height] = detectLCDDimensions(instructions, constants);

      // Should detect LCD usage and default to 16x16
      expect(width).toBeGreaterThan(8);
      expect(height).toBeGreaterThan(8);
    });

    it("should detect 64x64 LCD from high memory addresses", () => {
      const instructions: Instruction[] = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["[0xF100]", "1"],
          raw: "MOV [0xF100], 1",
        },
        {
          line: 2,
          mnemonic: "MOV",
          operands: ["[0xF200]", "2"],
          raw: "MOV [0xF200], 2",
        },
      ];
      const constants = new Map<string, number>();

      const [width, height] = detectLCDDimensions(instructions, constants);

      expect(width).toBe(64);
      expect(height).toBe(64);
    });

    it("should detect 64x64 LCD from very high offset (>= 4096)", () => {
      const instructions: Instruction[] = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["[0xFFFF]", "1"],
          raw: "MOV [0xFFFF], 1",
        }, // offset = 4095
      ];
      const constants = new Map<string, number>();

      const [width, height] = detectLCDDimensions(instructions, constants);

      expect(width).toBe(64);
      expect(height).toBe(64);
    });

    it("should detect 16x16 LCD from medium offset addresses", () => {
      const instructions: Instruction[] = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["[0xF040]", "1"],
          raw: "MOV [0xF040], 1",
        }, // offset = 64
      ];
      const constants = new Map<string, number>();

      const [width, height] = detectLCDDimensions(instructions, constants);

      expect(width).toBe(16);
      expect(height).toBe(16);
    });

    it("should detect 64x64 LCD from offset >= 256", () => {
      const instructions: Instruction[] = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["[0xF150]", "1"],
          raw: "MOV [0xF150], 1",
        }, // offset = 336, should be 64x64
      ];
      const constants = new Map<string, number>();

      const [width, height] = detectLCDDimensions(instructions, constants);

      expect(width).toBe(64);
      expect(height).toBe(64);
    });

    it("should detect 16x16 LCD from small offset addresses", () => {
      const instructions: Instruction[] = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["[0xF010]", "1"],
          raw: "MOV [0xF010], 1",
        }, // offset = 16
      ];
      const constants = new Map<string, number>();

      const [width, height] = detectLCDDimensions(instructions, constants);

      expect(width).toBe(16);
      expect(height).toBe(16);
    });

    it("should detect LCD_W constant for width", () => {
      const instructions: Instruction[] = [];
      const constants = new Map<string, number>();
      constants.set("LCD_BASE", 0xf000);
      constants.set("LCD_WIDTH", 32);

      const [width, height] = detectLCDDimensions(instructions, constants);

      expect(width).toBe(32);
      expect(height).toBe(32);
    });

    it("should detect SCREEN_SIZE constant", () => {
      const instructions: Instruction[] = [];
      const constants = new Map<string, number>();
      constants.set("LCD_BASE", 0xf000);
      constants.set("SCREEN_SIZE", 16);

      const [width, height] = detectLCDDimensions(instructions, constants);

      expect(width).toBe(16);
      expect(height).toBe(16);
    });

    it("should handle decimal LCD base addresses", () => {
      const instructions: Instruction[] = [
        {
          line: 1,
          mnemonic: "MOV",
          operands: ["EAX", "61440"],
          raw: "MOV EAX, 61440",
        }, // 61440 = 0xF000
      ];
      const constants = new Map<string, number>();

      const [width, height] = detectLCDDimensions(instructions, constants);

      expect(width).toBeGreaterThan(8);
      expect(height).toBeGreaterThan(8);
    });
  });

  describe("getNextInstructionLine", () => {
    const instructions: Instruction[] = [
      { line: 2, mnemonic: "MOV", operands: ["EAX", "1"], raw: "MOV EAX, 1" },
      { line: 3, mnemonic: "ADD", operands: ["EAX", "2"], raw: "ADD EAX, 2" },
      { line: 5, mnemonic: "HLT", operands: [], raw: "HLT" },
    ];

    it("should return correct line for valid EIP", () => {
      expect(getNextInstructionLine(0, instructions)).toBe(2);
      expect(getNextInstructionLine(1, instructions)).toBe(3);
      expect(getNextInstructionLine(2, instructions)).toBe(5);
    });

    it("should return 1 for invalid EIP", () => {
      expect(getNextInstructionLine(-1, instructions)).toBe(1);
      expect(getNextInstructionLine(10, instructions)).toBe(1);
    });

    it("should handle empty instruction array", () => {
      expect(getNextInstructionLine(0, [])).toBe(1);
    });
  });

  describe("formatRegisterValue", () => {
    it("should format zero correctly", () => {
      const result = formatRegisterValue(0);
      expect(result).toContain("0");
      expect(result).toContain("0x00000000");
      expect(result).toContain("0b");
    });

    it("should format positive values correctly", () => {
      const result = formatRegisterValue(255);
      expect(result).toContain("255");
      expect(result).toContain("0x000000FF");
    });

    it("should format large values correctly", () => {
      const result = formatRegisterValue(0xdeadbeef);
      expect(result).toContain("0xDEADBEEF");
      expect(result).toContain("3735928559");
    });

    it("should include binary representation", () => {
      const result = formatRegisterValue(7);
      expect(result).toContain("0b");
      expect(result).toContain("00000111");
    });
  });

  describe("formatFlagValue", () => {
    it("should format true as 1", () => {
      expect(formatFlagValue(true)).toBe("1");
    });

    it("should format false as 0", () => {
      expect(formatFlagValue(false)).toBe("0");
    });

    it("should format 1 as 1", () => {
      expect(formatFlagValue(1)).toBe("1");
    });

    it("should format 0 as 0", () => {
      expect(formatFlagValue(0)).toBe("0");
    });
  });

  describe("validateCPUSpeed", () => {
    it("should return 100 for undefined", () => {
      expect(validateCPUSpeed(undefined)).toBe(100);
    });

    it("should clamp values below 1", () => {
      expect(validateCPUSpeed(0)).toBe(1);
      expect(validateCPUSpeed(-10)).toBe(1);
    });

    it("should clamp values above 200", () => {
      expect(validateCPUSpeed(250)).toBe(200);
      expect(validateCPUSpeed(1000)).toBe(200);
    });

    it("should pass through valid values", () => {
      expect(validateCPUSpeed(1)).toBe(1);
      expect(validateCPUSpeed(50)).toBe(50);
      expect(validateCPUSpeed(100)).toBe(100);
      expect(validateCPUSpeed(150)).toBe(150);
      expect(validateCPUSpeed(200)).toBe(200);
    });
  });

  describe("isExecutableLine", () => {
    const instructions: Instruction[] = [
      { line: 2, mnemonic: "MOV", operands: ["EAX", "1"], raw: "MOV EAX, 1" },
      { line: 3, mnemonic: "ADD", operands: ["EAX", "2"], raw: "ADD EAX, 2" },
      { line: 5, mnemonic: "HLT", operands: [], raw: "HLT" },
    ];

    it("should return true for executable lines", () => {
      expect(isExecutableLine(2, instructions)).toBe(true);
      expect(isExecutableLine(3, instructions)).toBe(true);
      expect(isExecutableLine(5, instructions)).toBe(true);
    });

    it("should return false for non-executable lines", () => {
      expect(isExecutableLine(1, instructions)).toBe(false);
      expect(isExecutableLine(4, instructions)).toBe(false);
      expect(isExecutableLine(6, instructions)).toBe(false);
    });

    it("should handle empty instruction array", () => {
      expect(isExecutableLine(1, [])).toBe(false);
    });
  });

  describe("findInstructionByLine", () => {
    const instructions: Instruction[] = [
      { line: 2, mnemonic: "MOV", operands: ["EAX", "1"], raw: "MOV EAX, 1" },
      { line: 3, mnemonic: "ADD", operands: ["EAX", "2"], raw: "ADD EAX, 2" },
      { line: 5, mnemonic: "HLT", operands: [], raw: "HLT" },
    ];

    it("should find instruction indices correctly", () => {
      expect(findInstructionByLine(2, instructions)).toBe(0);
      expect(findInstructionByLine(3, instructions)).toBe(1);
      expect(findInstructionByLine(5, instructions)).toBe(2);
    });

    it("should return -1 for non-existent lines", () => {
      expect(findInstructionByLine(1, instructions)).toBe(-1);
      expect(findInstructionByLine(4, instructions)).toBe(-1);
      expect(findInstructionByLine(10, instructions)).toBe(-1);
    });

    it("should handle empty instruction array", () => {
      expect(findInstructionByLine(1, [])).toBe(-1);
    });
  });

  describe("parseInterruptNumber", () => {
    it("should parse interrupt from OUT 0x20, N", () => {
      expect(parseInterruptNumber(["0x20", "3"])).toBe(3);
      expect(parseInterruptNumber(["0x20", "5"])).toBe(5);
    });

    it("should parse interrupt from OUT 32, N (decimal port)", () => {
      expect(parseInterruptNumber(["32", "7"])).toBe(7);
    });

    it("should return -1 for non-interrupt instructions", () => {
      expect(parseInterruptNumber(["0x30", "1"])).toBe(-1);
      expect(parseInterruptNumber(["EAX", "EBX"])).toBe(-1);
    });

    it("should return -1 for insufficient operands", () => {
      expect(parseInterruptNumber(["0x20"])).toBe(-1);
      expect(parseInterruptNumber([])).toBe(-1);
    });
  });
});
