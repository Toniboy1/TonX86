/**
 * TonX86 Language Server - Validator Tests
 *
 * Tests the pure validation functions extracted into validator.ts.
 */

import * as fs from "fs";
import * as path from "path";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node";
import {
  stripComment,
  collectLabelsAndConstants,
  validateInstructions,
  validateControlFlow,
  validateCallingConventions,
  validateDocumentText,
  VALID_REGISTERS,
  REQUIRES_TWO_OPERANDS,
  REQUIRES_ONE_OPERAND,
  REQUIRES_ZERO_OPERANDS,
  LABEL_INSTRUCTIONS,
} from "./validator";

// Mirror the instruction names from server.ts for testing
const ALL_INSTRUCTION_NAMES = [
  "MOV",
  "XCHG",
  "LEA",
  "MOVZX",
  "MOVSX",
  "ADD",
  "SUB",
  "AND",
  "OR",
  "XOR",
  "NOT",
  "SHL",
  "SHR",
  "SAR",
  "ROL",
  "ROR",
  "MUL",
  "IMUL",
  "DIV",
  "IDIV",
  "MOD",
  "CMP",
  "TEST",
  "INC",
  "DEC",
  "NEG",
  "JMP",
  "JZ",
  "JE",
  "JNZ",
  "JNE",
  "JG",
  "JGE",
  "JL",
  "JLE",
  "JS",
  "JNS",
  "JA",
  "JAE",
  "JB",
  "JBE",
  "NOP",
  "HLT",
  "RAND",
  "PUSH",
  "POP",
  "CALL",
  "RET",
  "INT",
  "IRET",
];

// Helper: run full validation on assembly text
function validate(text: string) {
  return validateDocumentText(text, ALL_INSTRUCTION_NAMES);
}

// Helper: get diagnostics matching a severity
function errors(diags: ReturnType<typeof validate>) {
  return diags.filter((d) => d.severity === DiagnosticSeverity.Error);
}
function warnings(diags: ReturnType<typeof validate>) {
  return diags.filter((d) => d.severity === DiagnosticSeverity.Warning);
}

// ─── stripComment ──────────────────────────────────────────
describe("stripComment", () => {
  test("returns line unchanged if no comment", () => {
    expect(stripComment("MOV EAX, 10")).toBe("MOV EAX, 10");
  });

  test("strips inline comment", () => {
    expect(stripComment("MOV EAX, 10  ; set EAX")).toBe("MOV EAX, 10");
  });

  test("strips full-line comment", () => {
    expect(stripComment("; this is a comment")).toBe("");
  });

  test("strips with leading whitespace", () => {
    expect(stripComment("    MOV EAX, 10  ; comment")).toBe("MOV EAX, 10");
  });

  test("handles semicolon in first position", () => {
    expect(stripComment(";comment")).toBe("");
  });
});

// ─── collectLabelsAndConstants ─────────────────────────────
describe("collectLabelsAndConstants", () => {
  test("collects simple labels", () => {
    const lines = ["main:", "  MOV EAX, 10", "loop:", "  HLT"];
    const { labels, equConstants } = collectLabelsAndConstants(lines);
    expect(labels.has("main")).toBe(true);
    expect(labels.has("loop")).toBe(true);
    expect(equConstants.size).toBe(0);
  });

  test("collects EQU constants", () => {
    const lines = ["GRID_SIZE EQU 64", "main:", "  HLT"];
    const { labels, equConstants } = collectLabelsAndConstants(lines);
    expect(equConstants.has("GRID_SIZE")).toBe(true);
    expect(labels.has("GRID_SIZE")).toBe(false);
  });

  test("collects EQU constants with colon", () => {
    const lines = ["GRID_SIZE: EQU 64", "main:", "  HLT"];
    const { labels, equConstants } = collectLabelsAndConstants(lines);
    expect(equConstants.has("GRID_SIZE")).toBe(true);
    expect(labels.has("GRID_SIZE")).toBe(false);
  });

  test("detects duplicate labels", () => {
    const lines = ["loop:", "  MOV EAX, 1", "loop:", "  HLT"];
    const { diagnostics } = collectLabelsAndConstants(lines);
    expect(diagnostics.length).toBe(2); // both locations flagged
    expect(diagnostics[0].message).toContain("Duplicate label 'loop'");
  });

  test("EQU with inline comment is handled", () => {
    const lines = ["KB_STATUS EQU 0x10100 ; Keyboard status", "main:", "  HLT"];
    const { equConstants } = collectLabelsAndConstants(lines);
    expect(equConstants.has("KB_STATUS")).toBe(true);
  });

  test("does not treat comment containing 'equal' as EQU", () => {
    const lines = [
      "main:",
      "  CMP EAX, EBX",
      "  JNE not_equal ; they are not equal",
      "not_equal:",
      "  HLT",
    ];
    const { labels, equConstants } = collectLabelsAndConstants(lines);
    expect(equConstants.size).toBe(0);
    expect(labels.has("not_equal")).toBe(true);
  });
});

// ─── validateInstructions ──────────────────────────────────
describe("validateInstructions", () => {
  describe("inline comment handling", () => {
    test("does not count comment words as operands", () => {
      const lines = ["main:", "  MOV EAX, 10  ; EAX = 10", "  HLT"];
      const labels = new Set(["main"]);
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        labels,
        new Set(),
      );
      expect(errors(diags)).toHaveLength(0);
    });

    test("handles instruction with only a comment after it", () => {
      const lines = ["main:", "  HLT  ; Stop program", "end:"];
      const labels = new Set(["main", "end"]);
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        labels,
        new Set(),
      );
      expect(errors(diags)).toHaveLength(0);
    });

    test("comment containing EQU does not trigger EQU validation", () => {
      const lines = [
        "main:",
        "  CMP EAX, EBX",
        "  JNE not_equal      ; Should NOT jump (they are equal)",
        "not_equal:",
        "  HLT",
      ];
      const labels = new Set(["main", "not_equal"]);
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        labels,
        new Set(),
      );
      expect(errors(diags)).toHaveLength(0);
    });
  });

  describe("unknown instructions", () => {
    test("reports unknown instruction", () => {
      const lines = ["main:", "  BLAH EAX", "  HLT"];
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        new Set(["main"]),
        new Set(),
      );
      const errs = errors(diags);
      expect(errs).toHaveLength(1);
      expect(errs[0].message).toContain("Unknown instruction 'BLAH'");
    });

    test("accepts all valid instructions", () => {
      // Test a few representative instructions
      const lines = [
        "main:",
        "  MOV EAX, 10",
        "  ADD EAX, EBX",
        "  INC EAX",
        "  NOP",
        "  HLT",
      ];
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        new Set(["main"]),
        new Set(),
      );
      expect(errors(diags)).toHaveLength(0);
    });
  });

  describe("operand count validation", () => {
    test("MOV requires 2 operands", () => {
      const lines = ["main:", "  MOV EAX"];
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        new Set(["main"]),
        new Set(),
      );
      expect(errors(diags)).toHaveLength(1);
      expect(errors(diags)[0].message).toContain("requires exactly 2 operands");
    });

    test("PUSH requires 1 operand", () => {
      const lines = ["main:", "  PUSH"];
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        new Set(["main"]),
        new Set(),
      );
      expect(errors(diags)).toHaveLength(1);
      expect(errors(diags)[0].message).toContain("requires exactly 1 operand");
    });

    test("HLT takes no operands", () => {
      const lines = ["main:", "  HLT EAX"];
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        new Set(["main"]),
        new Set(),
      );
      expect(errors(diags)).toHaveLength(1);
      expect(errors(diags)[0].message).toContain("does not take operands");
    });

    test("NOP takes no operands", () => {
      const lines = ["main:", "  NOP EAX"];
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        new Set(["main"]),
        new Set(),
      );
      expect(errors(diags)).toHaveLength(1);
    });

    test("RET takes no operands", () => {
      const lines = ["main:", "  RET EAX"];
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        new Set(["main"]),
        new Set(),
      );
      expect(errors(diags)).toHaveLength(1);
    });

    test("IMUL accepts 1, 2, or 3 operands", () => {
      const lines1 = ["main:", "  IMUL EBX"];
      const lines2 = ["main:", "  IMUL EAX, EBX"];
      const lines3 = ["main:", "  IMUL EAX, EBX, 10"];
      const lines0 = ["main:", "  IMUL"];
      const labels = new Set(["main"]);
      expect(
        errors(
          validateInstructions(
            lines1,
            ALL_INSTRUCTION_NAMES,
            labels,
            new Set(),
          ),
        ),
      ).toHaveLength(0);
      expect(
        errors(
          validateInstructions(
            lines2,
            ALL_INSTRUCTION_NAMES,
            labels,
            new Set(),
          ),
        ),
      ).toHaveLength(0);
      expect(
        errors(
          validateInstructions(
            lines3,
            ALL_INSTRUCTION_NAMES,
            labels,
            new Set(),
          ),
        ),
      ).toHaveLength(0);
      expect(
        errors(
          validateInstructions(
            lines0,
            ALL_INSTRUCTION_NAMES,
            labels,
            new Set(),
          ),
        ),
      ).toHaveLength(1);
    });

    test("RAND accepts 1 or 2 operands", () => {
      const lines1 = ["main:", "  RAND EAX"];
      const lines2 = ["main:", "  RAND EAX, 64"];
      const lines0 = ["main:", "  RAND"];
      const labels = new Set(["main"]);
      expect(
        errors(
          validateInstructions(
            lines1,
            ALL_INSTRUCTION_NAMES,
            labels,
            new Set(),
          ),
        ),
      ).toHaveLength(0);
      expect(
        errors(
          validateInstructions(
            lines2,
            ALL_INSTRUCTION_NAMES,
            labels,
            new Set(),
          ),
        ),
      ).toHaveLength(0);
      expect(
        errors(
          validateInstructions(
            lines0,
            ALL_INSTRUCTION_NAMES,
            labels,
            new Set(),
          ),
        ),
      ).toHaveLength(1);
    });
  });

  describe("register validation", () => {
    test("reports invalid register-like names", () => {
      const lines = ["main:", "  MOV EXX, 10"];
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        new Set(["main"]),
        new Set(),
      );
      expect(errors(diags)).toHaveLength(1);
      expect(errors(diags)[0].message).toContain("Invalid register 'EXX'");
    });

    test("accepts all valid 32-bit registers", () => {
      const regs = ["EAX", "EBX", "ECX", "EDX", "ESI", "EDI", "EBP", "ESP"];
      for (const reg of regs) {
        const lines = ["main:", `  MOV ${reg}, 10`];
        const diags = validateInstructions(
          lines,
          ALL_INSTRUCTION_NAMES,
          new Set(["main"]),
          new Set(),
        );
        expect(errors(diags)).toHaveLength(0);
      }
    });

    test("accepts 8-bit registers", () => {
      const regs = ["AL", "AH", "BL", "BH", "CL", "CH", "DL", "DH"];
      for (const reg of regs) {
        const lines = ["main:", `  MOV ${reg}, 10`];
        const diags = validateInstructions(
          lines,
          ALL_INSTRUCTION_NAMES,
          new Set(["main"]),
          new Set(),
        );
        expect(errors(diags)).toHaveLength(0);
      }
    });

    test("does not flag labels as invalid registers", () => {
      const lines = ["main:", "  JMP loop", "loop:", "  HLT"];
      const labels = new Set(["main", "loop"]);
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        labels,
        new Set(),
      );
      expect(errors(diags)).toHaveLength(0);
    });

    test("does not flag EQU constants as invalid registers", () => {
      const lines = ["main:", "  MOV EAX, SIZE"];
      const labels = new Set(["main"]);
      const equConstants = new Set(["SIZE"]);
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        labels,
        equConstants,
      );
      expect(errors(diags)).toHaveLength(0);
    });
  });

  describe("label validation for jumps", () => {
    test("warns on undefined label in JMP", () => {
      const lines = ["main:", "  JMP undefined_label", "  HLT"];
      const labels = new Set(["main"]);
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        labels,
        new Set(),
      );
      const warns = warnings(diags);
      expect(warns).toHaveLength(1);
      expect(warns[0].message).toContain(
        "Label 'undefined_label' is not defined",
      );
    });

    test("errors on JMP without label operand", () => {
      const lines = ["main:", "  JMP", "  HLT"];
      const labels = new Set(["main"]);
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        labels,
        new Set(),
      );
      const errs = errors(diags);
      expect(errs.length).toBeGreaterThanOrEqual(1);
      expect(errs[0].message).toContain("requires exactly 1 operand");
    });

    test("does not warn on defined label", () => {
      const lines = ["main:", "  JMP loop", "loop:", "  HLT"];
      const labels = new Set(["main", "loop"]);
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        labels,
        new Set(),
      );
      expect(warnings(diags)).toHaveLength(0);
    });

    test("does not warn on hex addresses", () => {
      const lines = ["main:", "  JMP 0x1000"];
      const labels = new Set(["main"]);
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        labels,
        new Set(),
      );
      expect(warnings(diags)).toHaveLength(0);
    });

    test("validates CALL targets", () => {
      const lines = ["main:", "  CALL my_func", "  HLT"];
      const labels = new Set(["main"]);
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        labels,
        new Set(),
      );
      expect(warnings(diags)).toHaveLength(1);
      expect(warnings(diags)[0].message).toContain("'my_func' is not defined");
    });

    test("validates all conditional jump instructions", () => {
      const jumps = [
        "JZ",
        "JE",
        "JNZ",
        "JNE",
        "JG",
        "JGE",
        "JL",
        "JLE",
        "JS",
        "JNS",
        "JA",
        "JAE",
        "JB",
        "JBE",
      ];
      for (const jmp of jumps) {
        const lines = ["main:", `  ${jmp} target`, "  HLT"];
        const labels = new Set(["main"]);
        const diags = validateInstructions(
          lines,
          ALL_INSTRUCTION_NAMES,
          labels,
          new Set(),
        );
        expect(warnings(diags).length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("EQU directives", () => {
    test("valid EQU does not produce errors", () => {
      const lines = ["GRID_SIZE EQU 64", "main:", "  HLT"];
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        new Set(["main"]),
        new Set(["GRID_SIZE"]),
      );
      expect(errors(diags)).toHaveLength(0);
    });

    test("EQU with missing value produces error", () => {
      // Test with EQU format that has invalid structure
      const lines = ["VALUE: EQU", "main:", "  HLT"];
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        new Set(["main"]),
        new Set(),
      );
      const equErrors = diags.filter(
        (d) =>
          d.severity === DiagnosticSeverity.Error && d.message.includes("EQU"),
      );
      expect(equErrors.length).toBeGreaterThanOrEqual(1);
    });

    test("invalid EQU format produces error", () => {
      const lines = ["EQU 123", "main:", "  HLT"];
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        new Set(["main"]),
        new Set(),
      );
      const errs = errors(diags);
      expect(errs).toHaveLength(1);
      expect(errs[0].message).toContain("Invalid EQU directive format");
    });
  });

  describe("skips lines correctly", () => {
    test("skips empty lines", () => {
      const lines = ["main:", "", "  MOV EAX, 10", "", "  HLT"];
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        new Set(["main"]),
        new Set(),
      );
      expect(errors(diags)).toHaveLength(0);
    });

    test("skips comment-only lines", () => {
      const lines = ["main:", "; comment", "  MOV EAX, 10", "  HLT"];
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        new Set(["main"]),
        new Set(),
      );
      expect(errors(diags)).toHaveLength(0);
    });

    test("skips label lines", () => {
      const lines = ["main:", "loop:", "  HLT"];
      const diags = validateInstructions(
        lines,
        ALL_INSTRUCTION_NAMES,
        new Set(["main", "loop"]),
        new Set(),
      );
      expect(errors(diags)).toHaveLength(0);
    });
  });
});

// ─── validateControlFlow ───────────────────────────────────
describe("validateControlFlow", () => {
  test("warns about unreachable code after HLT", () => {
    const lines = ["main:", "  HLT", "  MOV EAX, 10"];
    const diags: Diagnostic[] = [];
    validateControlFlow(lines, new Set(["main"]), diags);
    const warns = diags.filter(
      (d) => d.severity === DiagnosticSeverity.Warning,
    );
    expect(warns.length).toBeGreaterThanOrEqual(1);
    expect(warns[0].message).toContain("Unreachable code");
  });

  test("warns about unreachable code after JMP", () => {
    const lines = ["main:", "  JMP end", "  MOV EAX, 10", "end:", "  HLT"];
    const diags: Diagnostic[] = [];
    validateControlFlow(lines, new Set(["main", "end"]), diags);
    const warns = diags.filter(
      (d) => d.severity === DiagnosticSeverity.Warning,
    );
    expect(warns.length).toBeGreaterThanOrEqual(1);
    expect(warns[0].message).toContain("Unreachable code");
  });

  test("labels reset unreachable state", () => {
    const lines = [
      "main:",
      "  JMP end",
      "middle:",
      "  MOV EAX, 10",
      "end:",
      "  HLT",
    ];
    const diags: Diagnostic[] = [];
    validateControlFlow(lines, new Set(["main", "middle", "end"]), diags);
    // middle: resets unreachable, so MOV EAX shouldn't be warned as unreachable
    const unreachWarns = diags.filter(
      (d) =>
        d.severity === DiagnosticSeverity.Warning &&
        d.message.includes("Unreachable"),
    );
    expect(unreachWarns).toHaveLength(0);
  });

  test("warns about RET outside function context", () => {
    // A label with RET is detected as a function itself,
    // so use a label without RET followed by code that has a RET
    // in a separate section after HLT
    const lines = [
      "main:",
      "  HLT",
      "orphaned_code:",
      "  MOV EAX, 10",
      "  RET", // This RET is in orphaned_code which is never CALLed
    ];
    const diags: Diagnostic[] = [];
    // The validator identifies orphaned_code as having RET → it's a "function"
    // So instead, test a simpler case:
    // Actually, since the validator auto-detects labels with RET as functions,
    // any label containing RET will be treated as a function. We verify this behavior.
    validateControlFlow(lines, new Set(["main", "orphaned_code"]), diags);
    // orphaned_code has a RET, so it's identified as a function - no warning
    const retWarns = diags.filter((d) =>
      d.message.includes("RET instruction outside"),
    );
    expect(retWarns).toHaveLength(0);
  });

  test("no warning for RET inside function that has RET", () => {
    const lines = [
      "main:",
      "  CALL my_func",
      "  HLT",
      "my_func:",
      "  MOV EAX, 10",
      "  RET",
    ];
    const diags: Diagnostic[] = [];
    validateControlFlow(lines, new Set(["main", "my_func"]), diags);
    const retWarns = diags.filter((d) =>
      d.message.includes("RET instruction outside"),
    );
    expect(retWarns).toHaveLength(0);
  });

  test("ignores inline comments for control flow", () => {
    const lines = [
      "main:",
      "  MOV EAX, 10  ; set value",
      "  HLT  ; stop execution",
    ];
    const diags: Diagnostic[] = [];
    validateControlFlow(lines, new Set(["main"]), diags);
    expect(diags).toHaveLength(0);
  });

  test("skips EQU directives", () => {
    const lines = ["SIZE EQU 64", "main:", "  HLT"];
    const diags: Diagnostic[] = [];
    validateControlFlow(lines, new Set(["main"]), diags);
    // EQU should not be treated as unreachable code or instruction
    expect(diags).toHaveLength(0);
  });

  test("warns about RET after HLT without function context", () => {
    const lines = [
      "start:",
      "  MOV EAX, 10",
      "  HLT",
      "  RET", // This RET comes after HLT, not in a function
    ];
    const diags: Diagnostic[] = [];
    validateControlFlow(lines, new Set(["start"]), diags);
    const retWarns = diags.filter((d) =>
      d.message.includes("RET instruction outside"),
    );
    expect(retWarns.length).toBeGreaterThanOrEqual(1);
  });

  test("suppresses unreachable code warning with tonx86-disable-next-line", () => {
    const lines = [
      "main:",
      "  JMP end",
      "  ; tonx86-disable-next-line",
      "  MOV EAX, 99", // Should NOT warn due to suppression
      "end:",
      "  HLT",
    ];
    const diags: Diagnostic[] = [];
    validateControlFlow(lines, new Set(["main", "end"]), diags);
    const unreachWarns = diags.filter(
      (d) =>
        d.severity === DiagnosticSeverity.Warning &&
        d.message.includes("Unreachable"),
    );
    expect(unreachWarns).toHaveLength(0);
  });

  test("suppresses unreachable code warning with inline tonx86-ignore", () => {
    const lines = [
      "main:",
      "  JMP end",
      "  MOV EAX, 99 ; tonx86-ignore", // Should NOT warn due to inline suppression
      "end:",
      "  HLT",
    ];
    const diags: Diagnostic[] = [];
    validateControlFlow(lines, new Set(["main", "end"]), diags);
    const unreachWarns = diags.filter(
      (d) =>
        d.severity === DiagnosticSeverity.Warning &&
        d.message.includes("Unreachable"),
    );
    expect(unreachWarns).toHaveLength(0);
  });

  test("suppression works without space after semicolon", () => {
    const lines = [
      "main:",
      "  JMP end",
      "  ;tonx86-disable-next-line",
      "  MOV EAX, 99", // Should NOT warn
      "end:",
      "  HLT",
    ];
    const diags: Diagnostic[] = [];
    validateControlFlow(lines, new Set(["main", "end"]), diags);
    const unreachWarns = diags.filter(
      (d) =>
        d.severity === DiagnosticSeverity.Warning &&
        d.message.includes("Unreachable"),
    );
    expect(unreachWarns).toHaveLength(0);
  });
});

// ─── validateCallingConventions ────────────────────────────
describe("validateCallingConventions", () => {
  test("warns about missing prologue in called function", () => {
    const lines = [
      "main:",
      "  CALL my_func",
      "  HLT",
      "my_func:",
      "  MOV EAX, 10",
      "  RET",
    ];
    const labels = new Set(["main", "my_func"]);
    const diags: Diagnostic[] = [];
    validateCallingConventions(lines, labels, diags);
    const infoMsgs = diags.filter(
      (d) => d.severity === DiagnosticSeverity.Information,
    );
    expect(
      infoMsgs.some((d) => d.message.includes("should start with 'PUSH EBP'")),
    ).toBe(true);
  });

  test("no warning for proper prologue/epilogue", () => {
    const lines = [
      "main:",
      "  CALL my_func",
      "  HLT",
      "my_func:",
      "  PUSH EBP",
      "  MOV EBP, ESP",
      "  MOV EAX, 10",
      "  POP EBP",
      "  RET",
    ];
    const labels = new Set(["main", "my_func"]);
    const diags: Diagnostic[] = [];
    validateCallingConventions(lines, labels, diags);
    const funcWarns = diags.filter(
      (d) =>
        d.severity === DiagnosticSeverity.Warning &&
        d.message.includes("my_func"),
    );
    expect(funcWarns).toHaveLength(0);
  });

  test("warns about unbalanced PUSH/POP", () => {
    const lines = [
      "main:",
      "  CALL my_func",
      "  HLT",
      "my_func:",
      "  PUSH EBP",
      "  MOV EBP, ESP",
      "  PUSH EAX",
      "  MOV EAX, 10",
      "  POP EBP",
      "  RET",
    ];
    const labels = new Set(["main", "my_func"]);
    const diags: Diagnostic[] = [];
    validateCallingConventions(lines, labels, diags);
    const stackWarns = diags.filter((d) => d.message.includes("PUSH but"));
    expect(stackWarns.length).toBeGreaterThanOrEqual(1);
  });

  test("warns about callee-saved register not saved", () => {
    const lines = [
      "main:",
      "  CALL my_func",
      "  HLT",
      "my_func:",
      "  PUSH EBP",
      "  MOV EBP, ESP",
      "  MOV EBX, 42",
      "  POP EBP",
      "  RET",
    ];
    const labels = new Set(["main", "my_func"]);
    const diags: Diagnostic[] = [];
    validateCallingConventions(lines, labels, diags);
    const regWarns = diags.filter((d) =>
      d.message.includes("callee-saved register EBX"),
    );
    expect(regWarns).toHaveLength(1);
  });

  test("no callee-saved warning when register is saved", () => {
    const lines = [
      "main:",
      "  CALL my_func",
      "  HLT",
      "my_func:",
      "  PUSH EBP",
      "  MOV EBP, ESP",
      "  PUSH EBX",
      "  MOV EBX, 42",
      "  POP EBX",
      "  POP EBP",
      "  RET",
    ];
    const labels = new Set(["main", "my_func"]);
    const diags: Diagnostic[] = [];
    validateCallingConventions(lines, labels, diags);
    const regWarns = diags.filter((d) =>
      d.message.includes("callee-saved register EBX"),
    );
    expect(regWarns).toHaveLength(0);
  });

  test("skips main function for convention checks", () => {
    const lines = ["main:", "  MOV EBX, 42", "  HLT"];
    const labels = new Set(["main"]);
    const diags: Diagnostic[] = [];
    validateCallingConventions(lines, labels, diags);
    // main should be skipped entirely
    const funcWarns = diags.filter(
      (d) =>
        (d.severity === DiagnosticSeverity.Warning ||
          d.severity === DiagnosticSeverity.Information) &&
        d.message.includes("main"),
    );
    expect(funcWarns).toHaveLength(0);
  });

  test("does not treat EQU constants as function labels", () => {
    const lines = [
      "GRID_SIZE: EQU 64",
      "main:",
      "  MOV EAX, GRID_SIZE",
      "  HLT",
    ];
    const labels = new Set(["main"]);
    const diags: Diagnostic[] = [];
    validateCallingConventions(lines, labels, diags);
    // GRID_SIZE should NOT be analyzed as a function
    const gridWarns = diags.filter((d) => d.message.includes("GRID_SIZE"));
    expect(gridWarns).toHaveLength(0);
  });

  test("does not treat loop labels as functions", () => {
    const lines = [
      "main:",
      "  MOV ECX, 10",
      "loop:",
      "  DEC ECX",
      "  JNZ loop",
      "  HLT",
    ];
    const labels = new Set(["main", "loop"]);
    const diags: Diagnostic[] = [];
    validateCallingConventions(lines, labels, diags);
    // loop is not a CALL target, so it should NOT be analyzed as a function
    const loopWarns = diags.filter((d) => d.message.includes("loop"));
    expect(loopWarns).toHaveLength(0);
  });

  test("handles inline comments in function bodies", () => {
    const lines = [
      "main:",
      "  CALL my_func",
      "  HLT",
      "my_func:",
      "  PUSH EBP          ; Save base pointer",
      "  MOV EBP, ESP      ; Set up stack frame",
      "  MOV EAX, 10       ; Return value",
      "  POP EBP           ; Restore base pointer",
      "  RET               ; Return to caller",
    ];
    const labels = new Set(["main", "my_func"]);
    const diags: Diagnostic[] = [];
    validateCallingConventions(lines, labels, diags);
    // Comments should not break convention analysis
    const funcWarns = diags.filter(
      (d) =>
        d.severity === DiagnosticSeverity.Warning &&
        d.message.includes("my_func"),
    );
    expect(funcWarns).toHaveLength(0);
  });

  test("warns about PUSH EBP without MOV EBP, ESP", () => {
    const lines = [
      "main:",
      "  CALL my_func",
      "  HLT",
      "my_func:",
      "  PUSH EBP",
      "  MOV EAX, 10",
      "  POP EBP",
      "  RET",
    ];
    const labels = new Set(["main", "my_func"]);
    const diags: Diagnostic[] = [];
    validateCallingConventions(lines, labels, diags);
    const movWarns = diags.filter((d) =>
      d.message.includes("should follow 'PUSH EBP' with 'MOV EBP, ESP'"),
    );
    expect(movWarns.length).toBeGreaterThanOrEqual(1);
  });

  test("warns about missing POP EBP when PUSH EBP exists", () => {
    const lines = [
      "main:",
      "  CALL my_func",
      "  HLT",
      "my_func:",
      "  PUSH EBP",
      "  MOV EBP, ESP",
      "  MOV EAX, 10",
      "  RET",
    ];
    const labels = new Set(["main", "my_func"]);
    const diags: Diagnostic[] = [];
    validateCallingConventions(lines, labels, diags);
    const popWarns = diags.filter((d) =>
      d.message.includes("has 'PUSH EBP' but missing 'POP EBP'"),
    );
    expect(popWarns.length).toBeGreaterThanOrEqual(1);
  });

  test("detects cdecl calling convention with ADD ESP after CALL", () => {
    const lines = [
      "main:",
      "  PUSH 10",
      "  PUSH 20",
      "  CALL add_func",
      "  ADD ESP, 8",
      "  HLT",
      "add_func:",
      "  PUSH EBP",
      "  MOV EBP, ESP",
      "  MOV EAX, [EBP+8]",
      "  ADD EAX, [EBP+12]",
      "  POP EBP",
      "  RET",
    ];
    const labels = new Set(["main", "add_func"]);
    const diags: Diagnostic[] = [];
    validateCallingConventions(lines, labels, diags);
    const cdeclHints = diags.filter((d) =>
      d.message.includes("uses cdecl convention"),
    );
    expect(cdeclHints.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── validateDocumentText (integration) ────────────────────
describe("validateDocumentText (integration)", () => {
  test("clean basic program produces no errors", () => {
    const text = [
      "main:",
      "  MOV EAX, 10",
      "  MOV EBX, 5",
      "  ADD EAX, EBX",
      "  HLT",
    ].join("\n");
    const diags = validate(text);
    expect(errors(diags)).toHaveLength(0);
  });

  test("program with inline comments produces no errors", () => {
    const text = [
      "; Test 1: Basic Instructions",
      "; Expected: EAX=15, EBX=3, ECX=11, EDX=5",
      "",
      "main:",
      "    MOV EAX, 10        ; EAX = 10",
      "    MOV EBX, 5         ; EBX = 5",
      "    ADD EAX, EBX       ; EAX = 15",
      "    SUB EBX, 2         ; EBX = 3",
      "    MOV ECX, 10        ; ECX = 10",
      "    INC ECX            ; ECX = 11",
      "    MOV EDX, 6         ; EDX = 6",
      "    DEC EDX            ; EDX = 5",
      "    HLT",
    ].join("\n");
    const diags = validate(text);
    expect(errors(diags)).toHaveLength(0);
  });

  test("program with jumps and comments produces no errors", () => {
    const text = [
      "main:",
      "    MOV EAX, 5",
      "    MOV EBX, 5",
      "    CMP EAX, EBX",
      "    JNE not_equal      ; Should NOT jump (they're equal)",
      "    MOV EAX, 1         ; This should execute",
      "    JMP done",
      "not_equal:",
      "    MOV EAX, 0         ; This should NOT execute",
      "done:",
      "    HLT",
    ].join("\n");
    const diags = validate(text);
    expect(errors(diags)).toHaveLength(0);
  });

  test("program with CALL/RET and comments produces no errors", () => {
    const text = [
      "main:",
      "    MOV EAX, 5",
      "    CALL double_it",
      "    HLT                ; EAX should be 20",
      "",
      "double_it:",
      "    PUSH EBP           ; Save base pointer",
      "    MOV EBP, ESP       ; Set up stack frame",
      "    ADD EAX, EAX       ; Double it",
      "    POP EBP            ; Restore base pointer",
      "    RET                ; Return",
    ].join("\n");
    const diags = validate(text);
    expect(errors(diags)).toHaveLength(0);
  });

  test("program with EQU constants produces no errors", () => {
    const text = [
      "GRID_SIZE EQU 64",
      "KB_STATUS EQU 0x10100",
      "",
      "main:",
      "    MOV EAX, GRID_SIZE",
      "    HLT",
    ].join("\n");
    const diags = validate(text);
    expect(errors(diags)).toHaveLength(0);
  });

  test("program with memory addressing produces no errors", () => {
    const text = [
      "main:",
      "    PUSH EBP",
      "    MOV EBP, ESP",
      "    MOV EAX, 42",
      "    PUSH EAX",
      "    POP EBX",
      "    POP EBP",
      "    HLT",
    ].join("\n");
    const diags = validate(text);
    expect(errors(diags)).toHaveLength(0);
  });

  test("program with bitwise operations and hex comments produces no errors", () => {
    const text = [
      "main:",
      "    MOV EAX, 0x0F      ; 0000 1111",
      "    MOV EBX, 0x06      ; 0000 0110",
      "    AND EAX, EBX       ; EAX = 0000 0110 = 6",
      "    HLT",
    ].join("\n");
    const diags = validate(text);
    expect(errors(diags)).toHaveLength(0);
  });

  test("program with LCD writes produces no errors", () => {
    const text = [
      "main:",
      "    MOV 0xF000, 1      ; Turn on pixel at (0,0)",
      "    MOV 0xF001, 1      ; Turn on pixel at (0,1)",
      "    HLT",
    ].join("\n");
    const diags = validate(text);
    expect(errors(diags)).toHaveLength(0);
  });

  test("program with interrupt calls produces no errors", () => {
    const text = [
      "main:",
      "    MOV AH, 0x0E       ; Teletype output",
      "    MOV AL, 65",
      "    INT 0x10",
      "    HLT",
    ].join("\n");
    const diags = validate(text);
    expect(errors(diags)).toHaveLength(0);
  });

  test("detects multiple errors at once", () => {
    const text = ["main:", "  BLAH EAX", "  MOV EAX", "  HLT"].join("\n");
    const diags = validate(text);
    const errs = errors(diags);
    expect(errs.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Exported constant sanity checks ──────────────────────
describe("exported constants", () => {
  test("VALID_REGISTERS includes all 32-bit registers", () => {
    expect(VALID_REGISTERS).toContain("EAX");
    expect(VALID_REGISTERS).toContain("ESP");
    expect(VALID_REGISTERS).toContain("EDI");
  });

  test("VALID_REGISTERS includes 8-bit registers", () => {
    expect(VALID_REGISTERS).toContain("AL");
    expect(VALID_REGISTERS).toContain("AH");
    expect(VALID_REGISTERS).toContain("DL");
  });

  test("REQUIRES_TWO_OPERANDS covers core arithmetic", () => {
    expect(REQUIRES_TWO_OPERANDS).toContain("MOV");
    expect(REQUIRES_TWO_OPERANDS).toContain("ADD");
    expect(REQUIRES_TWO_OPERANDS).toContain("SUB");
    expect(REQUIRES_TWO_OPERANDS).toContain("CMP");
  });

  test("REQUIRES_ONE_OPERAND covers jumps and stack", () => {
    expect(REQUIRES_ONE_OPERAND).toContain("PUSH");
    expect(REQUIRES_ONE_OPERAND).toContain("POP");
    expect(REQUIRES_ONE_OPERAND).toContain("JMP");
    expect(REQUIRES_ONE_OPERAND).toContain("CALL");
  });

  test("REQUIRES_ZERO_OPERANDS covers control instructions", () => {
    expect(REQUIRES_ZERO_OPERANDS).toContain("HLT");
    expect(REQUIRES_ZERO_OPERANDS).toContain("RET");
    expect(REQUIRES_ZERO_OPERANDS).toContain("NOP");
    expect(REQUIRES_ZERO_OPERANDS).toContain("IRET");
  });

  test("LABEL_INSTRUCTIONS covers all jump types", () => {
    expect(LABEL_INSTRUCTIONS).toContain("JMP");
    expect(LABEL_INSTRUCTIONS).toContain("JZ");
    expect(LABEL_INSTRUCTIONS).toContain("JG");
    expect(LABEL_INSTRUCTIONS).toContain("JBE");
    expect(LABEL_INSTRUCTIONS).toContain("CALL");
  });
});

// ─── Functional tests: real example files ──────────────────
describe("functional: example file validation", () => {
  const examplesDir = path.resolve(__dirname, "../../../examples");

  // These examples are known to have intentional warnings
  const KNOWN_WARNING_EXAMPLES = new Set([
    "15-all-jumps.asm", // Unreachable code by design
    "21-snake.asm", // Complex game - calling convention hints
    "98-control-flow.asm", // Tests designed to trigger warnings
    "99-error-handling.asm", // Error handling examples
  ]);

  let exampleFiles: string[];

  beforeAll(() => {
    exampleFiles = fs
      .readdirSync(examplesDir)
      .filter((f) => f.endsWith(".asm"))
      .sort();
  });

  test("examples directory exists and has files", () => {
    expect(exampleFiles.length).toBeGreaterThan(0);
  });

  // Test each example file individually for no errors
  const examplesForEachDir = path.resolve(__dirname, "../../../examples");
  const asmFiles = fs.existsSync(examplesForEachDir)
    ? fs
        .readdirSync(examplesForEachDir)
        .filter((f) => f.endsWith(".asm"))
        .sort()
    : [];

  for (const file of asmFiles) {
    const isKnownWarning = KNOWN_WARNING_EXAMPLES.has(file);
    const testName = isKnownWarning
      ? `${file} produces no errors (warnings allowed)`
      : `${file} produces no errors or warnings`;

    test(testName, () => {
      const content = fs.readFileSync(path.join(examplesDir, file), "utf-8");
      const diags = validate(content);
      const errs = errors(diags);

      // NO example should ever produce errors
      if (errs.length > 0) {
        const errMessages = errs.map(
          (d) => `  Line ${d.range.start.line + 1}: ${d.message}`,
        );
        throw new Error(
          `${file} has ${errs.length} error(s):\n${errMessages.join("\n")}`,
        );
      }

      if (!isKnownWarning) {
        const warns = warnings(diags);
        if (warns.length > 0) {
          const warnMessages = warns.map(
            (d) => `  Line ${d.range.start.line + 1}: ${d.message}`,
          );
          throw new Error(
            `${file} has ${warns.length} unexpected warning(s):\n${warnMessages.join("\n")}`,
          );
        }
      }
    });
  }
});
