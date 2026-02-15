/**
 * TonX86 Language Server - Validation Logic
 *
 * Pure validation functions extracted from the server for testability.
 * These operate on plain strings/arrays and return diagnostic objects
 * without depending on the LSP connection.
 */

import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node";

// Re-export the instruction/register/flag definitions from server
// so tests can use them. We define them here to avoid circular deps.

export interface InstructionDef {
  name: string;
  description: string;
  syntax: string;
  cycles: number;
  flags: string[];
  example: string;
}

/**
 * All valid 32-bit and 8-bit register names
 */
export const VALID_REGISTERS = [
  "EAX",
  "EBX",
  "ECX",
  "EDX",
  "ESI",
  "EDI",
  "EBP",
  "ESP",
  "AL",
  "AH",
  "BL",
  "BH",
  "CL",
  "CH",
  "DL",
  "DH",
];

/**
 * Instructions requiring exactly 2 operands
 */
export const REQUIRES_TWO_OPERANDS = [
  "MOV",
  "ADD",
  "SUB",
  "AND",
  "OR",
  "XOR",
  "CMP",
  "TEST",
  "XCHG",
  "LEA",
  "MOVZX",
  "MOVSX",
  "MOD",
  "SHL",
  "SHR",
  "SAR",
  "ROL",
  "ROR",
  "RCL",
  "RCR",
  "CMOVE",
  "CMOVZ",
  "CMOVNE",
  "CMOVNZ",
  "CMOVL",
  "CMOVLE",
  "CMOVG",
  "CMOVGE",
  "CMOVA",
  "CMOVAE",
  "CMOVB",
  "CMOVBE",
  "CMOVS",
  "CMOVNS",
  "XADD",
  "BSF",
  "BSR",
];

/**
 * Instructions requiring exactly 1 operand
 */
export const REQUIRES_ONE_OPERAND = [
  "PUSH",
  "POP",
  "INC",
  "DEC",
  "NEG",
  "NOT",
  "MUL",
  "DIV",
  "IDIV",
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
  "CALL",
  "INT",
  "LOOP",
  "LOOPE",
  "LOOPZ",
  "LOOPNE",
  "LOOPNZ",
  "BSWAP",
];

/**
 * Instructions requiring zero operands
 */
export const REQUIRES_ZERO_OPERANDS = [
  "RET",
  "HLT",
  "IRET",
  "NOP",
  "LAHF",
  "SAHF",
  "LODSB",
  "LODS",
  "STOSB",
  "STOS",
  "MOVSB",
  "MOVS",
  "SCASB",
  "SCAS",
  "CMPSB",
  "CMPS",
  "INT3",
];

/**
 * Assembler directives (non-instructions)
 */
export const ASSEMBLER_DIRECTIVES = [".TEXT", ".DATA", "DB", "DW", "DD", "ORG"];

/**
 * Jump/call instructions that take label targets
 */
export const LABEL_INSTRUCTIONS = [
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
  "CALL",
  "LOOP",
  "LOOPE",
  "LOOPZ",
  "LOOPNE",
  "LOOPNZ",
];

/**
 * Strip inline comment from a line.
 * Returns the portion before the first ';', trimmed.
 */
export function stripComment(line: string): string {
  const idx = line.indexOf(";");
  return idx >= 0 ? line.substring(0, idx).trim() : line.trim();
}

/**
 * Check if a line or the previous line contains a warning suppression directive.
 * Supported directives:
 * - ; tonx86-disable-next-line
 * - ; tonx86-ignore
 */
function shouldSuppressWarning(
  lines: string[],
  currentLineIndex: number,
): boolean {
  // Check current line for inline suppression
  const currentLine = lines[currentLineIndex];
  if (
    currentLine.includes("; tonx86-ignore") ||
    currentLine.includes(";tonx86-ignore")
  ) {
    return true;
  }

  // Check previous line for next-line suppression
  if (currentLineIndex > 0) {
    const previousLine = lines[currentLineIndex - 1];
    if (
      previousLine.includes("; tonx86-disable-next-line") ||
      previousLine.includes(";tonx86-disable-next-line")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Result of the first pass: labels, EQU constants, and duplicate-label diagnostics.
 */
export interface FirstPassResult {
  labels: Set<string>;
  equConstants: Set<string>;
  diagnostics: Diagnostic[];
}

/**
 * First pass: collect labels and EQU constants, detect duplicate labels.
 */
export function collectLabelsAndConstants(lines: string[]): FirstPassResult {
  const labels = new Set<string>();
  const equConstants = new Set<string>();
  const labelLines = new Map<string, number[]>();
  const diagnostics: Diagnostic[] = [];

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();

    // Detect EQU constants
    const clean = stripComment(trimmed);
    if (/\bEQU\b/i.test(clean)) {
      const equMatch = /^(\w+):?\s+EQU\s+/i.exec(clean);
      if (equMatch) {
        equConstants.add(equMatch[1]);
      }
      return; // EQU lines are not labels
    }

    if (trimmed.endsWith(":") || trimmed.includes(":")) {
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex > 0) {
        const label = trimmed.substring(0, colonIndex).trim();
        if (label && !label.includes(" ")) {
          labels.add(label);
          if (!labelLines.has(label)) {
            labelLines.set(label, []);
          }
          labelLines.get(label)!.push(lineIndex);
        }
      }
    }
  });

  // Duplicate label diagnostics
  labelLines.forEach((lineNumbers, label) => {
    if (lineNumbers.length > 1) {
      lineNumbers.forEach((lineIndex) => {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: lineIndex, character: 0 },
            end: { line: lineIndex, character: lines[lineIndex].length },
          },
          message: `Duplicate label '${label}' (also defined on line ${lineNumbers
            .filter((l) => l !== lineIndex)
            .map((l) => l + 1)
            .join(", ")})`,
          source: "tonx86",
        });
      });
    }
  });

  return { labels, equConstants, diagnostics };
}

/**
 * Validate instructions in the document.
 * Returns diagnostics for unknown instructions, wrong operand counts,
 * invalid registers, and undefined label targets.
 */
export function validateInstructions(
  lines: string[],
  validInstructionNames: string[],
  labels: Set<string>,
  equConstants: Set<string>,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();

    // Skip empty lines, comments
    if (!trimmed || trimmed.startsWith(";")) return;

    // Skip section directives (.text, .data) - case insensitive
    const upperTrimmed = trimmed.toUpperCase();
    if (upperTrimmed === ".TEXT" || upperTrimmed === ".DATA") {
      return;
    }

    // Skip standalone labels (lines ending with :)
    if (trimmed.endsWith(":")) return;

    // Strip inline comments
    const cleanLine = stripComment(trimmed);

    // Skip EQU directives
    if (/\bEQU\b/i.test(cleanLine)) {
      const equMatch = /^(\w+:?)\s+EQU\s+(.+)/i.exec(cleanLine);
      if (!equMatch) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: lineIndex, character: 0 },
            end: { line: lineIndex, character: trimmed.length },
          },
          message: `Invalid EQU directive format. Expected: NAME EQU value`,
          source: "tonx86",
        });
      }
      return;
    }

    // Skip ORG directive
    if (/^ORG\s/i.test(cleanLine)) {
      return;
    }

    // Skip data directives (DB, DW, DD)
    if (/^(DB|DW|DD)\s/i.test(cleanLine)) {
      return;
    }

    // Handle labels with directives on same line (e.g., "message: DB 'Hi'")
    // Must be checked BEFORE tokenization to avoid treating "label:" as instruction
    if (/^\w+:\s+(DB|DW|DD|ORG|EQU)\s/i.test(cleanLine)) {
      return;
    }

    // Tokenize
    const tokens = cleanLine.split(/[\s,]+/).filter((t) => t.length > 0);

    const instruction = tokens[0].toUpperCase();

    // Check valid instruction (skip if it's a directive)
    if (ASSEMBLER_DIRECTIVES.includes(instruction)) {
      return; // Already handled above
    }

    if (!validInstructionNames.includes(instruction)) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: lineIndex, character: 0 },
          end: { line: lineIndex, character: trimmed.length },
        },
        message: `Unknown instruction '${instruction}'`,
        source: "tonx86",
      });
      return;
    }

    const operands = tokens.slice(1);

    // Validate operand counts
    if (REQUIRES_TWO_OPERANDS.includes(instruction) && operands.length !== 2) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: lineIndex, character: 0 },
          end: { line: lineIndex, character: trimmed.length },
        },
        message: `${instruction} requires exactly 2 operands, found ${operands.length}`,
        source: "tonx86",
      });
      return;
    }

    if (REQUIRES_ONE_OPERAND.includes(instruction) && operands.length !== 1) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: lineIndex, character: 0 },
          end: { line: lineIndex, character: trimmed.length },
        },
        message: `${instruction} requires exactly 1 operand, found ${operands.length}`,
        source: "tonx86",
      });
      return;
    }

    if (REQUIRES_ZERO_OPERANDS.includes(instruction) && operands.length > 0) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: lineIndex, character: 0 },
          end: { line: lineIndex, character: trimmed.length },
        },
        message: `${instruction} does not take operands, found ${operands.length}`,
        source: "tonx86",
      });
      return;
    }

    // IMUL: 1-3 operands
    if (
      instruction === "IMUL" &&
      (operands.length < 1 || operands.length > 3)
    ) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: lineIndex, character: 0 },
          end: { line: lineIndex, character: trimmed.length },
        },
        message: `IMUL requires 1 to 3 operands, found ${operands.length}`,
        source: "tonx86",
      });
      return;
    }

    // RAND: 1-2 operands
    if (
      instruction === "RAND" &&
      (operands.length < 1 || operands.length > 2)
    ) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: lineIndex, character: 0 },
          end: { line: lineIndex, character: trimmed.length },
        },
        message: `RAND requires 1 or 2 operands, found ${operands.length}`,
        source: "tonx86",
      });
      return;
    }

    // Validate register names in operands
    operands.forEach((operand) => {
      // Skip memory addresses, numbers, labels, character literals
      if (
        operand.startsWith("[") ||
        operand.startsWith("0x") ||
        operand.startsWith("0X") ||
        operand.startsWith("0b") ||
        operand.startsWith("0B") ||
        /^\d+$/.test(operand) ||
        operand.startsWith("-") ||
        operand.startsWith("'")
      ) {
        return;
      }

      const upperOperand = operand.toUpperCase();

      // Check if it looks like a register but isn't valid
      if (
        /^E?[A-Z]{2,3}$/.test(upperOperand) &&
        !VALID_REGISTERS.includes(upperOperand) &&
        !labels.has(operand) &&
        !equConstants.has(operand)
      ) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: lineIndex, character: 0 },
            end: { line: lineIndex, character: trimmed.length },
          },
          message: `Invalid register '${operand}'. Valid registers are: ${VALID_REGISTERS.join(", ")}`,
          source: "tonx86",
        });
      }
    });

    // Check for jump/call with undefined labels
    // Note: operands.length is always >= 1 here because LABEL_INSTRUCTIONS
    // are all in REQUIRES_ONE_OPERAND, which returns early above if count != 1
    if (LABEL_INSTRUCTIONS.includes(instruction)) {
      const label = operands[0];
      if (
        !label.startsWith("0x") &&
        !label.startsWith("0X") &&
        !VALID_REGISTERS.includes(label.toUpperCase()) &&
        !labels.has(label) &&
        !equConstants.has(label)
      ) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: { line: lineIndex, character: 0 },
            end: { line: lineIndex, character: trimmed.length },
          },
          message: `Label '${label}' is not defined`,
          source: "tonx86",
        });
      }
    }
  });

  return diagnostics;
}

/**
 * Validate control flow: unreachable code, RET outside function context.
 */
export function validateControlFlow(
  lines: string[],
  _labels: Set<string>,
  diagnostics: Diagnostic[],
): void {
  let unreachableAfterLine = -1;
  const terminationInstructions = ["HLT", "RET", "JMP"];
  const functionLabels = new Set<string>();

  // Identify function labels (labels that have RET before the next label)
  let currentLabel: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const cleanLine = stripComment(lines[i].trim());
    if (!cleanLine) continue;

    if (cleanLine.endsWith(":")) {
      currentLabel = cleanLine.substring(0, cleanLine.length - 1);
      continue;
    }

    const tokens = cleanLine.split(/[\s,]+/);
    if (
      tokens.length > 0 &&
      tokens[0].toUpperCase() === "RET" &&
      currentLabel
    ) {
      functionLabels.add(currentLabel);
    }
  }

  // Check for unreachable code and misplaced RET
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const cleanLine = stripComment(trimmed);

    if (!cleanLine) continue;

    // Labels reset unreachable state
    if (cleanLine.endsWith(":")) {
      unreachableAfterLine = -1;
      continue;
    }

    // Skip EQU
    if (/\bEQU\b/i.test(cleanLine)) continue;

    const tokens = cleanLine.split(/[\s,]+/);

    const instruction = tokens[0].toUpperCase();

    // Warn about unreachable code (unless suppressed)
    if (unreachableAfterLine >= 0 && !shouldSuppressWarning(lines, i)) {
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: trimmed.length },
        },
        message: `Unreachable code: instruction follows ${terminationInstructions.includes(instruction) ? instruction : "terminating instruction"} on line ${unreachableAfterLine + 1}`,
        source: "tonx86",
      });
    }

    // Check for RET outside function context
    if (instruction === "RET") {
      let inFunction = false;
      for (let j = i - 1; j >= 0; j--) {
        const prevClean = stripComment(lines[j].trim());
        if (!prevClean) continue;

        if (prevClean.endsWith(":")) {
          const labelName = prevClean.substring(0, prevClean.length - 1);
          if (functionLabels.has(labelName)) {
            inFunction = true;
          }
          break;
        }

        const prevTokens = prevClean.split(/[\s,]+/);
        if (
          prevTokens.length > 0 &&
          (prevTokens[0].toUpperCase() === "HLT" ||
            prevTokens[0].toUpperCase() === "RET")
        ) {
          break;
        }
      }

      if (!inFunction) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: { line: i, character: 0 },
            end: { line: i, character: trimmed.length },
          },
          message: `RET instruction outside of function context (no preceding CALL target)`,
          source: "tonx86",
        });
      }
    }

    // Mark after terminating instructions
    if (
      instruction === "HLT" ||
      instruction === "RET" ||
      instruction === "JMP"
    ) {
      unreachableAfterLine = i;
    }
  }
}

/**
 * Validate calling conventions:
 * - Prologue/epilogue checks
 * - Balanced PUSH/POP
 * - Callee-saved register preservation
 * - cdecl pattern detection
 */
export function validateCallingConventions(
  lines: string[],
  labels: Set<string>,
  diagnostics: Diagnostic[],
): void {
  interface FunctionInfo {
    name: string;
    startLine: number;
    endLine: number;
    prologuePushEBPLine: number;
    prologueMovEBPLine: number;
    epiloguePopEBPLine: number;
    pushCount: number;
    popCount: number;
    callInstructions: number[];
    retInstructions: number[];
    modifiesCalleeSavedRegs: Set<string>;
    savesCalleeSavedRegs: Set<string>;
  }

  const functions: FunctionInfo[] = [];
  const calleeSavedRegs = new Set(["EBX", "ESI", "EDI", "EBP"]);
  const controlFlowInstructions = [
    "JMP",
    "JE",
    "JZ",
    "JNE",
    "JNZ",
    "RET",
    "HLT",
  ];
  const modifyingInstructions = [
    "ADD",
    "SUB",
    "INC",
    "DEC",
    "AND",
    "OR",
    "XOR",
    "SHL",
    "SHR",
    "MOV",
    "MUL",
    "DIV",
    "IMUL",
    "IDIV",
    "MOD",
    "NEG",
    "NOT",
    "RAND",
    "RCL",
    "RCR",
    "XADD",
    "BSF",
    "BSR",
    "BSWAP",
    "CMOVE",
    "CMOVZ",
    "CMOVNE",
    "CMOVNZ",
    "CMOVL",
    "CMOVLE",
    "CMOVG",
    "CMOVGE",
    "CMOVA",
    "CMOVAE",
    "CMOVB",
    "CMOVBE",
    "CMOVS",
    "CMOVNS",
    "SAHF",
  ];

  // Collect EQU names
  const equNames = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const clean = stripComment(lines[i].trim());
    if (/\bEQU\b/i.test(clean)) {
      const m = /^(\w+):?\s+EQU\s+/i.exec(clean);
      if (m) equNames.add(m[1]);
    }
  }

  // Identify function labels: CALL targets + well-known entry points
  const functionLabels = new Set<string>();
  const entryPointNames = new Set(["main", "start", "_start"]);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const trimmed = lines[lineIndex].trim();
    if (!trimmed || trimmed.startsWith(";")) continue;

    const clean = stripComment(trimmed);
    if (/\bEQU\b/i.test(clean)) continue;

    if (trimmed.includes(":")) {
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex > 0) {
        const labelName = trimmed.substring(0, colonIndex).trim();
        if (
          labelName &&
          !labelName.includes(" ") &&
          !equNames.has(labelName) &&
          entryPointNames.has(labelName.toLowerCase())
        ) {
          functionLabels.add(labelName);
        }
      }
      continue;
    }

    const tokens = stripComment(trimmed)
      .split(/[\s,]+/)
      .filter((t) => t.length > 0);
    if (tokens.length > 0 && tokens[0].toUpperCase() === "CALL") {
      if (tokens.length > 1 && labels.has(tokens[1])) {
        functionLabels.add(tokens[1]);
      }
    }
  }

  // Parse functions
  let currentFunction: FunctionInfo | null = null;
  let firstInstructionAfterLabel = true;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const trimmed = lines[lineIndex].trim();
    if (!trimmed || trimmed.startsWith(";")) continue;

    const fnClean = stripComment(trimmed);
    if (/\bEQU\b/i.test(fnClean)) continue;

    if (trimmed.includes(":")) {
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex > 0) {
        const labelName = trimmed.substring(0, colonIndex).trim();
        if (
          labelName &&
          !labelName.includes(" ") &&
          functionLabels.has(labelName)
        ) {
          if (currentFunction) {
            currentFunction.endLine = lineIndex - 1;
            functions.push(currentFunction);
          }
          currentFunction = {
            name: labelName,
            startLine: lineIndex,
            endLine: -1,
            prologuePushEBPLine: -1,
            prologueMovEBPLine: -1,
            epiloguePopEBPLine: -1,
            pushCount: 0,
            popCount: 0,
            callInstructions: [],
            retInstructions: [],
            modifiesCalleeSavedRegs: new Set(),
            savesCalleeSavedRegs: new Set(),
          };
          firstInstructionAfterLabel = true;
        }
      }
      continue;
    }

    if (!currentFunction) continue;

    const tokens = fnClean.split(/[\s,]+/).filter((t) => t.length > 0);

    const instruction = tokens[0].toUpperCase();

    if (instruction === "PUSH") {
      currentFunction.pushCount++;
      if (tokens.length > 1) {
        const reg = tokens[1].toUpperCase();
        if (reg === "EBP" && firstInstructionAfterLabel) {
          currentFunction.prologuePushEBPLine = lineIndex;
        }
        if (calleeSavedRegs.has(reg)) {
          currentFunction.savesCalleeSavedRegs.add(reg);
        }
      }
    } else if (instruction === "POP") {
      currentFunction.popCount++;
      if (tokens.length > 1) {
        const reg = tokens[1].toUpperCase();
        if (reg === "EBP") {
          currentFunction.epiloguePopEBPLine = lineIndex;
        }
      }
    } else if (instruction === "MOV") {
      if (tokens.length >= 3) {
        const dest = tokens[1].toUpperCase();
        const src = tokens[2].toUpperCase();
        if (
          dest === "EBP" &&
          src === "ESP" &&
          currentFunction.prologuePushEBPLine !== -1
        ) {
          currentFunction.prologueMovEBPLine = lineIndex;
        }
        if (calleeSavedRegs.has(dest) && dest !== "EBP") {
          currentFunction.modifiesCalleeSavedRegs.add(dest);
        }
      }
    } else if (instruction === "CALL") {
      currentFunction.callInstructions.push(lineIndex);
    } else if (instruction === "RET") {
      currentFunction.retInstructions.push(lineIndex);
    } else if (modifyingInstructions.includes(instruction)) {
      if (tokens.length > 1) {
        const dest = tokens[1].toUpperCase();
        if (calleeSavedRegs.has(dest) && dest !== "EBP") {
          currentFunction.modifiesCalleeSavedRegs.add(dest);
        }
      }
    }

    firstInstructionAfterLabel = false;
  }

  if (currentFunction !== null) {
    currentFunction.endLine = lines.length - 1;
    functions.push(currentFunction);
  }

  // Analyze functions
  for (const func of functions) {
    if (
      func.name === "main" ||
      func.name === "start" ||
      func.name === "_start"
    ) {
      continue;
    }

    if (func.callInstructions.length > 0 || func.retInstructions.length > 0) {
      if (func.prologuePushEBPLine === -1) {
        diagnostics.push({
          severity: DiagnosticSeverity.Information,
          range: {
            start: { line: func.startLine, character: 0 },
            end: {
              line: func.startLine,
              character: lines[func.startLine].length,
            },
          },
          message: `Function '${func.name}' should start with 'PUSH EBP' (standard prologue)`,
          source: "tonx86-convention",
        });
      }

      if (func.prologuePushEBPLine !== -1 && func.prologueMovEBPLine === -1) {
        diagnostics.push({
          severity: DiagnosticSeverity.Information,
          range: {
            start: { line: func.prologuePushEBPLine, character: 0 },
            end: {
              line: func.prologuePushEBPLine,
              character: lines[func.prologuePushEBPLine].length,
            },
          },
          message: `Function '${func.name}' should follow 'PUSH EBP' with 'MOV EBP, ESP' (standard prologue)`,
          source: "tonx86-convention",
        });
      }

      if (func.epiloguePopEBPLine === -1 && func.prologuePushEBPLine !== -1) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: { line: func.startLine, character: 0 },
            end: {
              line: func.endLine,
              character: lines[func.endLine].length,
            },
          },
          message: `Function '${func.name}' has 'PUSH EBP' but missing 'POP EBP' (unbalanced stack)`,
          source: "tonx86-convention",
        });
      }
    }

    if (func.pushCount !== func.popCount) {
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: { line: func.startLine, character: 0 },
          end: {
            line: func.endLine,
            character: lines[func.endLine].length,
          },
        },
        message: `Function '${func.name}' has ${func.pushCount} PUSH but ${func.popCount} POP (unbalanced stack)`,
        source: "tonx86-convention",
      });
    }

    for (const reg of func.modifiesCalleeSavedRegs) {
      if (!func.savesCalleeSavedRegs.has(reg)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: { line: func.startLine, character: 0 },
            end: {
              line: func.endLine,
              character: lines[func.endLine].length,
            },
          },
          message: `Function '${func.name}' modifies callee-saved register ${reg} but doesn't save/restore it`,
          source: "tonx86-convention",
        });
      }
    }
  }

  // CALL-site analysis
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const trimmed = lines[lineIndex].trim();
    if (!trimmed || trimmed.startsWith(";")) continue;

    const siteClean = stripComment(trimmed);

    const tokens = siteClean.split(/[\s,]+/).filter((t) => t.length > 0);

    const instruction = tokens[0].toUpperCase();

    // cdecl stack cleanup detection
    if (instruction === "CALL" && tokens.length > 1) {
      const targetLabel = tokens[1];

      let nextLineIndex = lineIndex + 1;
      while (nextLineIndex < lines.length) {
        const nextTrimmed = lines[nextLineIndex].trim();
        if (nextTrimmed && !nextTrimmed.startsWith(";")) break;
        nextLineIndex++;
      }

      if (nextLineIndex < lines.length) {
        const nextClean = stripComment(lines[nextLineIndex].trim());
        const nextTokens = nextClean
          .split(/[\s,]+/)
          .filter((t) => t.length > 0);
        const nextInstruction = nextTokens[0].toUpperCase();

        if (nextInstruction === "ADD" && nextTokens.length >= 3) {
          const dest = nextTokens[1].toUpperCase();
          const src = nextTokens[2];
          if (dest === "ESP") {
            diagnostics.push({
              severity: DiagnosticSeverity.Hint,
              range: {
                start: { line: lineIndex, character: 0 },
                end: {
                  line: nextLineIndex,
                  character: lines[nextLineIndex].length,
                },
              },
              message: `Call to '${targetLabel}' uses cdecl convention (caller cleans stack with ADD ESP, ${src})`,
              source: "tonx86-convention",
            });
          }
        }
      }
    }

    // Parameter passing detection
    if (instruction === "PUSH") {
      let foundCall = false;
      for (
        let i = lineIndex + 1;
        i < Math.min(lineIndex + 10, lines.length);
        i++
      ) {
        const futureClean = stripComment(lines[i].trim());
        if (!futureClean) continue;
        const futureTokens = futureClean
          .split(/[\s,]+/)
          .filter((t) => t.length > 0);
        if (futureTokens[0].toUpperCase() === "CALL") {
          foundCall = true;
          break;
        }
        if (
          futureClean.endsWith(":") ||
          controlFlowInstructions.includes(futureTokens[0].toUpperCase())
        ) {
          break;
        }
      }

      if (foundCall && tokens.length > 1) {
        diagnostics.push({
          severity: DiagnosticSeverity.Hint,
          range: {
            start: { line: lineIndex, character: 0 },
            end: { line: lineIndex, character: trimmed.length },
          },
          message: `Pushing parameter '${tokens[1]}' for upcoming function call (cdecl/stdcall pattern)`,
          source: "tonx86-convention",
        });
      }
    }
  }
}

/**
 * Run all validation passes on a document and return all diagnostics.
 */
export function validateDocumentText(
  text: string,
  validInstructionNames: string[],
): Diagnostic[] {
  const lines = text.split(/\r?\n/);

  // First pass
  const {
    labels,
    equConstants,
    diagnostics: labelDiags,
  } = collectLabelsAndConstants(lines);

  // Second pass
  const instrDiags = validateInstructions(
    lines,
    validInstructionNames,
    labels,
    equConstants,
  );

  // Third pass
  const cfDiags: Diagnostic[] = [];
  validateControlFlow(lines, labels, cfDiags);

  // Fourth pass
  const ccDiags: Diagnostic[] = [];
  validateCallingConventions(lines, labels, ccDiags);

  return [...labelDiags, ...instrDiags, ...cfDiags, ...ccDiags];
}
