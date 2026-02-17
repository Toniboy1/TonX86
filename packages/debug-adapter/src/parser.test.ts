import { describe, it, expect } from "@jest/globals";
import { parseAssembly } from "./parser";

/**
 * Tests for assembler directives (.text, .data, db, dw, dd, equ, org)
 */

describe("Parser - Assembler Directives", () => {
  describe("Data section (.data)", () => {
    it("should parse DB (define byte) directive", () => {
      const lines = [".data", "DB 0x48, 0x65, 0x6C"];
      const result = parseAssembly(lines);

      expect(result.dataSegment.items).toHaveLength(1);
      expect(result.dataSegment.items[0]).toMatchObject({
        size: 1,
        values: [0x48, 0x65, 0x6c],
      });
    });

    it("should parse DB with string literal", () => {
      const lines = [".data", 'message: DB "Hello"'];
      const result = parseAssembly(lines);

      expect(result.dataSegment.items).toHaveLength(1);
      const item = result.dataSegment.items[0];
      expect(item.size).toBe(1);
      expect(item.values).toEqual([72, 101, 108, 108, 111]); // "Hello" ASCII
      expect(item.label).toBe("message");
      expect(result.labels.get("message")).toBe(0x2000); // Default data start
    });

    it("should parse DW (define word) directive", () => {
      const lines = [".data", "DW 0x1234, 0xABCD"];
      const result = parseAssembly(lines);

      expect(result.dataSegment.items).toHaveLength(1);
      expect(result.dataSegment.items[0]).toMatchObject({
        size: 2,
        values: [0x1234, 0xabcd],
      });
    });

    it("should parse DD (define doubleword) directive", () => {
      const lines = [".data", "DD 0x12345678, 0xDEADBEEF"];
      const result = parseAssembly(lines);

      expect(result.dataSegment.items).toHaveLength(1);
      expect(result.dataSegment.items[0]).toMatchObject({
        size: 4,
        values: [0x12345678, 0xdeadbeef],
      });
    });

    it("should track memory addresses for multiple data items", () => {
      const lines = [".data", "DB 0x01", "DW 0x1234", "DD 0xABCDEF00"];
      const result = parseAssembly(lines);

      expect(result.dataSegment.items).toHaveLength(3);
      expect(result.dataSegment.items[0].address).toBe(0x2000); // Start
      expect(result.dataSegment.items[1].address).toBe(0x2001); // +1 byte
      expect(result.dataSegment.items[2].address).toBe(0x2003); // +2 bytes
    });

    it("should handle data labels", () => {
      const lines = [".data", "value1:", "DB 0x42", "value2:", "DW 0x1234"];
      const result = parseAssembly(lines);

      expect(result.labels.get("value1")).toBe(0x2000);
      expect(result.labels.get("value2")).toBe(0x2001);
      expect(result.dataSegment.items[0].label).toBe("value1");
      expect(result.dataSegment.items[1].label).toBe("value2");
    });

    it("should parse DB with character literals", () => {
      const lines = [".data", "DB 'A', 'B', 'C'"];
      const result = parseAssembly(lines);

      expect(result.dataSegment.items[0].values).toEqual([65, 66, 67]);
    });

    it("should parse standalone DB with string in quotes", () => {
      const lines = [".data", 'DB "Test"'];
      const result = parseAssembly(lines);

      expect(result.dataSegment.items[0].values).toEqual([84, 101, 115, 116]); // "Test"
      expect(result.dataSegment.items[0].size).toBe(1);
    });

    it("should parse standalone DW with string in quotes", () => {
      const lines = [".data", 'DW "AB"'];
      const result = parseAssembly(lines);

      expect(result.dataSegment.items[0].values).toEqual([65, 66]); // "AB"
      expect(result.dataSegment.items[0].size).toBe(2);
    });
  });

  describe("ORG directive", () => {
    it("should set data section origin with ORG", () => {
      const lines = [".data", "ORG 0x3000", "DB 0x42"];
      const result = parseAssembly(lines);

      expect(result.dataSegment.items[0].address).toBe(0x3000);
    });

    it("should set code section origin with ORG", () => {
      const lines = [".text", "ORG 0x1000", "MOV EAX, 1"];
      const result = parseAssembly(lines);

      expect(result.codeStartAddress).toBe(0x1000);
    });

    it("should handle ORG with hex prefix", () => {
      const lines = [".data", "ORG 0x4000", "DB 0x01"];
      const result = parseAssembly(lines);

      expect(result.dataSegment.items[0].address).toBe(0x4000);
    });
  });

  describe(".text and .data sections", () => {
    it("should switch between .text and .data sections", () => {
      const lines = [
        ".data",
        "value: DB 0x42",
        ".text",
        "MOV EAX, value",
        ".data",
        "another: DW 0x1234",
      ];
      const result = parseAssembly(lines);

      expect(result.dataSegment.items).toHaveLength(2);
      expect(result.instructions).toHaveLength(1);
      expect(result.labels.get("value")).toBe(0x2000);
      expect(result.labels.get("another")).toBe(0x2001);
    });

    it("should default to .text section", () => {
      const lines = ["MOV EAX, 1", "ADD EBX, 2"];
      const result = parseAssembly(lines);

      expect(result.instructions).toHaveLength(2);
      expect(result.dataSegment.items).toHaveLength(0);
    });

    it("should handle .text labels correctly", () => {
      const lines = [".text", "start:", "MOV EAX, 1", "loop:", "ADD EAX, 1"];
      const result = parseAssembly(lines);

      expect(result.labels.get("start")).toBe(0); // Instruction index
      expect(result.labels.get("loop")).toBe(1); // Instruction index
    });
  });

  describe("EQU with data directives", () => {
    it("should use constants in data directives", () => {
      const lines = ["MAX EQU 255", ".data", "DB MAX"];
      const result = parseAssembly(lines);

      expect(result.constants.get("MAX")).toBe(255);
      expect(result.dataSegment.items[0].values).toEqual([255]);
    });

    it("should handle multiple constants in DB", () => {
      const lines = ["VAL1 EQU 10", "VAL2 EQU 20", ".data", "DB VAL1, VAL2"];
      const result = parseAssembly(lines);

      expect(result.dataSegment.items[0].values).toEqual([10, 20]);
    });

    it("should replace constants in label + data directive", () => {
      const lines = ["SIZE EQU 64", ".data", "buffer: DB SIZE, SIZE"];
      const result = parseAssembly(lines);

      expect(result.constants.get("SIZE")).toBe(64);
      expect(result.dataSegment.items[0].values).toEqual([64, 64]);
      expect(result.dataSegment.items[0].label).toBe("buffer");
    });

    it("should replace constants in standalone data directives", () => {
      const lines = ["WIDTH EQU 32", "HEIGHT EQU 16", ".data", "DD WIDTH, HEIGHT"];
      const result = parseAssembly(lines);

      expect(result.dataSegment.items[0].values).toEqual([32, 16]);
      expect(result.dataSegment.items[0].size).toBe(4);
    });
  });

  describe("Mixed code and data", () => {
    it("should parse complete program with code and data", () => {
      const lines = [
        "; Data section",
        ".data",
        "message: DB 'H', 'i', 0x00",
        "count: DD 100",
        "",
        "; Code section",
        ".text",
        "start:",
        "  MOV EAX, message",
        "  MOV EBX, count",
        "  HLT",
      ];
      const result = parseAssembly(lines);

      // Check data section
      expect(result.dataSegment.items).toHaveLength(2);
      expect(result.labels.get("message")).toBe(0x2000);
      expect(result.labels.get("count")).toBe(0x2003);

      // Check code section
      expect(result.instructions).toHaveLength(3);
      expect(result.labels.get("start")).toBe(0);
    });

    it("should handle label with instruction on same line", () => {
      const lines = [".text", "start: MOV EAX, 1", "loop: ADD EAX, 1"];
      const result = parseAssembly(lines);

      expect(result.labels.get("start")).toBe(0);
      expect(result.labels.get("loop")).toBe(1);
      expect(result.instructions).toHaveLength(2);
      expect(result.instructions[0].mnemonic).toBe("MOV");
      expect(result.instructions[1].mnemonic).toBe("ADD");
    });

    it("should handle label with instruction and inline comment", () => {
      const lines = [".text", "main: MOV EAX, 10 ; initialize"];
      const result = parseAssembly(lines);

      expect(result.labels.get("main")).toBe(0);
      expect(result.instructions[0].operands).toEqual(["EAX", "10"]);
    });

    it("should replace constants in label + instruction", () => {
      const lines = ["MAX EQU 100", ".text", "start: MOV EAX, MAX", "loop: ADD EAX, MAX"];
      const result = parseAssembly(lines);

      expect(result.constants.get("MAX")).toBe(100);
      expect(result.instructions[0].operands).toEqual(["EAX", "100"]);
      expect(result.instructions[1].operands).toEqual(["EAX", "100"]);
    });

    it("should handle label in data section followed by directive", () => {
      const lines = [".data", "msg:", "DB 'X'"];
      const result = parseAssembly(lines);

      expect(result.labels.get("msg")).toBe(0x2000);
      expect(result.dataSegment.items[0].label).toBe("msg");
    });

    it("should handle label on separate line in data section", () => {
      const lines = [".data", "value:", "DD 0x12345678"];
      const result = parseAssembly(lines);

      expect(result.labels.get("value")).toBe(0x2000);
      expect(result.dataSegment.items[0].label).toBe("value");
      expect(result.dataSegment.items[0].values).toEqual([0x12345678]);
    });

    it("should handle label with non-directive content in data section", () => {
      // When label has something after colon that's not a directive
      // The label is saved for next line
      const lines = [".data", "data: something", "DB 0x42"];
      const result = parseAssembly(lines);

      // Label should be saved and applied to next directive
      expect(result.dataSegment.items).toHaveLength(1);
      expect(result.dataSegment.items[0].label).toBe("data");
      expect(result.labels.get("data")).toBe(0x2000);
    });
  });

  describe("Error handling", () => {
    it("should throw error for invalid directive in data section", () => {
      const lines = [".data", "MOV EAX, 1"]; // MOV is not allowed in .data

      expect(() => parseAssembly(lines)).toThrow(/Expected data directive.*in \.data section/);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty data section", () => {
      const lines = [".data", ".text", "MOV EAX, 1"];
      const result = parseAssembly(lines);

      expect(result.dataSegment.items).toHaveLength(0);
      expect(result.instructions).toHaveLength(1);
    });

    it("should handle comments in data section", () => {
      const lines = [".data", "; This is a comment", "DB 0x42 ; inline"];
      const result = parseAssembly(lines);

      expect(result.dataSegment.items).toHaveLength(1);
      expect(result.dataSegment.items[0].values).toEqual([0x42]);
    });

    it("should handle DB with mixed types", () => {
      const lines = [".data", "DB 0x48, 'e', 108, 0x6C"];
      const result = parseAssembly(lines);

      expect(result.dataSegment.items[0].values).toEqual([0x48, 101, 108, 0x6c]);
    });
  });
});
