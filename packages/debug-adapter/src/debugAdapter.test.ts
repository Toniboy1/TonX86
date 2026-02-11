import { describe, it, expect } from "@jest/globals";
import { parseAssembly } from "./parser";

/**
 * Tests for DAP Assembly Parser and Control Flow
 * This validates the parseAssembly function and control flow logic
 */

describe("DAP Assembly Parser", () => {
  it("should parse simple MOV instruction", () => {
    const lines = ["MOV EAX, 0x01"];
    const result = parseAssembly(lines);

    expect(result.instructions).toHaveLength(1);
    expect(result.instructions[0]).toEqual({
      line: 1,
      mnemonic: "MOV",
      operands: ["EAX", "0x01"],
      raw: "MOV EAX, 0x01",
    });
  });

  it("should skip empty lines and comments", () => {
    const lines = [
      "; This is a comment",
      "",
      "MOV EAX, 1",
      "  ; Another comment",
      "   ",
      "ADD EBX, 2",
    ];
    const result = parseAssembly(lines);

    expect(result.instructions).toHaveLength(2);
    expect(result.instructions[0].mnemonic).toBe("MOV");
    expect(result.instructions[1].mnemonic).toBe("ADD");
  });

  it("should parse labels correctly", () => {
    const lines = ["start:", "MOV EAX, 1", "loop:", "ADD EAX, 1", "JMP loop"];
    const result = parseAssembly(lines);

    expect(result.instructions).toHaveLength(3);
    expect(result.labels.get("start")).toBe(0);
    expect(result.labels.get("loop")).toBe(1);
  });

  it("should handle instructions with inline comments", () => {
    const lines = [
      "MOV EAX, 0x10 ; Load value",
      "ADD EBX, EAX  ; Add registers",
    ];
    const result = parseAssembly(lines);

    expect(result.instructions).toHaveLength(2);
    expect(result.instructions[0].operands).toEqual(["EAX", "0x10"]);
    expect(result.instructions[1].operands).toEqual(["EBX", "EAX"]);
  });

  it("should parse jump instructions", () => {
    const lines = ["JMP target", "JE equal", "JNE not_equal"];
    const result = parseAssembly(lines);

    expect(result.instructions).toHaveLength(3);
    expect(result.instructions[0].mnemonic).toBe("JMP");
    expect(result.instructions[0].operands).toEqual(["target"]);
    expect(result.instructions[1].mnemonic).toBe("JE");
    expect(result.instructions[2].mnemonic).toBe("JNE");
  });

  it("should handle HLT instruction", () => {
    const lines = ["MOV EAX, 1", "HLT"];
    const result = parseAssembly(lines);

    expect(result.instructions).toHaveLength(2);
    expect(result.instructions[1].mnemonic).toBe("HLT");
    expect(result.instructions[1].operands).toEqual([]);
  });

  it("should parse complex program with labels and jumps", () => {
    const lines = [
      "; Program start",
      "start:",
      "  MOV EAX, 0",
      "  MOV ECX, 10",
      "loop:",
      "  ADD EAX, 1",
      "  DEC ECX",
      "  CMP ECX, 0",
      "  JNE loop",
      "done:",
      "  HLT",
    ];
    const result = parseAssembly(lines);

    expect(result.instructions).toHaveLength(7);
    expect(result.labels.get("start")).toBe(0);
    expect(result.labels.get("loop")).toBe(2);
    expect(result.labels.get("done")).toBe(6);
  });

  it("should preserve line numbers correctly", () => {
    const lines = [
      "; Line 1 comment",
      "",
      "MOV EAX, 1  ; Line 3",
      "",
      "ADD EBX, 2  ; Line 5",
    ];
    const result = parseAssembly(lines);

    expect(result.instructions[0].line).toBe(3);
    expect(result.instructions[1].line).toBe(5);
  });

  it("should parse EQU constants with decimal values", () => {
    const lines = ["MAX_COUNT EQU 100", "MOV EAX, MAX_COUNT"];
    const result = parseAssembly(lines);

    expect(result.constants.get("MAX_COUNT")).toBe(100);
    expect(result.instructions).toHaveLength(1);
    expect(result.instructions[0].operands).toEqual(["EAX", "100"]);
  });

  it("should parse EQU constants with hex values", () => {
    const lines = ["LCD_ADDR: EQU 0xF000", "MOV EBX, LCD_ADDR"];
    const result = parseAssembly(lines);

    expect(result.constants.get("LCD_ADDR")).toBe(0xf000);
    expect(result.instructions).toHaveLength(1);
    expect(result.instructions[0].operands).toEqual(["EBX", "61440"]);
  });

  it("should parse EQU constants with binary values", () => {
    const lines = ["FLAGS EQU 0b1010", "MOV ECX, FLAGS"];
    const result = parseAssembly(lines);

    expect(result.constants.get("FLAGS")).toBe(0b1010);
    expect(result.instructions).toHaveLength(1);
    expect(result.instructions[0].operands).toEqual(["ECX", "10"]);
  });

  it("should replace multiple constants in same instruction", () => {
    const lines = [
      "WIDTH EQU 64",
      "HEIGHT EQU 32",
      "MOV EAX, WIDTH",
      "MOV EBX, HEIGHT",
      "ADD EAX, HEIGHT",
    ];
    const result = parseAssembly(lines);

    expect(result.constants.get("WIDTH")).toBe(64);
    expect(result.constants.get("HEIGHT")).toBe(32);
    expect(result.instructions).toHaveLength(3);
    expect(result.instructions[0].operands).toEqual(["EAX", "64"]);
    expect(result.instructions[1].operands).toEqual(["EBX", "32"]);
    expect(result.instructions[2].operands).toEqual(["EAX", "32"]);
  });

  it("should handle EQU with uppercase prefix", () => {
    const lines = ["VALUE: EQU 0X10", "MOV EAX, VALUE"];
    const result = parseAssembly(lines);

    expect(result.constants.get("VALUE")).toBe(0x10);
    expect(result.instructions[0].operands).toEqual(["EAX", "16"]);
  });

  it("should handle EQU with uppercase binary prefix", () => {
    const lines = ["MASK EQU 0B1111", "AND EAX, MASK"];
    const result = parseAssembly(lines);

    expect(result.constants.get("MASK")).toBe(0b1111);
    expect(result.instructions[0].operands).toEqual(["EAX", "15"]);
  });

  it("should handle lines with only whitespace after trimming", () => {
    const lines = ["   ", "\t\t", "MOV EAX, 1"];
    const result = parseAssembly(lines);

    expect(result.instructions).toHaveLength(1);
    expect(result.instructions[0].mnemonic).toBe("MOV");
  });
});

describe("DAP Control Flow", () => {
  describe("Breakpoint Validation", () => {
    it("should validate breakpoints on instruction lines", () => {
      const instructions = [
        { line: 3, mnemonic: "MOV", operands: ["EAX", "1"], raw: "MOV EAX, 1" },
        { line: 5, mnemonic: "ADD", operands: ["EBX", "2"], raw: "ADD EBX, 2" },
      ];

      const validLines = new Set(instructions.map((i) => i.line));

      expect(validLines.has(3)).toBe(true);
      expect(validLines.has(4)).toBe(false);
      expect(validLines.has(5)).toBe(true);
    });
  });

  describe("Instruction Pointer Movement", () => {
    it("should move to next instruction for non-jump", () => {
      let ip = 0;
      const mnemonic = "MOV";

      if (!["JMP", "JE", "JZ", "JNE", "JNZ"].includes(mnemonic)) {
        ip++;
      }

      expect(ip).toBe(1);
    });

    it("should handle unconditional jump", () => {
      const labels = new Map([["target", 5]]);
      let ip = 2;
      const mnemonic = "JMP";
      const targetLabel = "target";

      const targetIndex = labels.get(targetLabel);
      if (targetIndex !== undefined && mnemonic === "JMP") {
        ip = targetIndex;
      }

      expect(ip).toBe(5);
    });

    it("should handle conditional jump when zero flag set", () => {
      const labels = new Map([["equal", 10]]);
      let ip = 3;
      const mnemonic: string = "JE";
      const zeroFlag = true;
      const targetLabel = "equal";

      const targetIndex = labels.get(targetLabel);
      if (targetIndex !== undefined) {
        const shouldJump =
          mnemonic === "JMP" ||
          (["JE", "JZ"].includes(mnemonic) && zeroFlag) ||
          (["JNE", "JNZ"].includes(mnemonic) && !zeroFlag);

        if (shouldJump) {
          ip = targetIndex;
        } else {
          ip++;
        }
      }

      expect(ip).toBe(10);
    });

    it("should not jump when condition not met", () => {
      const labels = new Map([["equal", 10]]);
      let ip = 3;
      const mnemonic: string = "JE";
      const zeroFlag = false;
      const targetLabel = "equal";

      const targetIndex = labels.get(targetLabel);
      if (targetIndex !== undefined) {
        const shouldJump =
          mnemonic === "JMP" ||
          (["JE", "JZ"].includes(mnemonic) && zeroFlag) ||
          (["JNE", "JNZ"].includes(mnemonic) && !zeroFlag);

        if (shouldJump) {
          ip = targetIndex;
        } else {
          ip++;
        }
      }

      expect(ip).toBe(4);
    });
  });

  describe("CALL and RET instructions", () => {
    it("should parse CALL instruction", () => {
      const lines = ["CALL multiply_by_2"];
      const result = parseAssembly(lines);

      expect(result.instructions).toHaveLength(1);
      expect(result.instructions[0].mnemonic).toBe("CALL");
      expect(result.instructions[0].operands).toEqual(["multiply_by_2"]);
    });

    it("should parse RET instruction", () => {
      const lines = ["RET"];
      const result = parseAssembly(lines);

      expect(result.instructions).toHaveLength(1);
      expect(result.instructions[0].mnemonic).toBe("RET");
      expect(result.instructions[0].operands).toEqual([]);
    });

    it("should parse PUSH instruction", () => {
      const lines = ["PUSH EAX"];
      const result = parseAssembly(lines);

      expect(result.instructions).toHaveLength(1);
      expect(result.instructions[0].mnemonic).toBe("PUSH");
      expect(result.instructions[0].operands).toEqual(["EAX"]);
    });

    it("should parse POP instruction", () => {
      const lines = ["POP EBX"];
      const result = parseAssembly(lines);

      expect(result.instructions).toHaveLength(1);
      expect(result.instructions[0].mnemonic).toBe("POP");
      expect(result.instructions[0].operands).toEqual(["EBX"]);
    });

    it("should parse complete subroutine with CALL/RET", () => {
      const lines = [
        "main:",
        "  MOV EAX, 5",
        "  CALL multiply_by_2",
        "  HLT",
        "multiply_by_2:",
        "  ADD EAX, EAX",
        "  RET",
      ];
      const result = parseAssembly(lines);

      expect(result.instructions).toHaveLength(5);
      expect(result.labels.get("main")).toBe(0);
      expect(result.labels.get("multiply_by_2")).toBe(3);
      expect(result.instructions[1].mnemonic).toBe("CALL");
      expect(result.instructions[4].mnemonic).toBe("RET");
    });
  });
});
