/**
 * TonX86 Language Server - Validation Logic
 *
 * Pure validation functions extracted from the server for testability.
 * These operate on plain strings/arrays and return diagnostic objects
 * without depending on the LSP connection.
 */

import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node";

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
const ASSEMBLER_DIRECTIVES = [".TEXT", ".DATA", "DB", "DW", "DD", "ORG"];

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
export function shouldSuppressWarning(lines: string[], currentLineIndex: number): boolean {
  // Check current line for inline suppression
  const currentLine = lines[currentLineIndex];
  if (currentLine.includes("; tonx86-ignore") || currentLine.includes(";tonx86-ignore")) {
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
interface FirstPassResult {
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
 * Check operand counts and return an error message if wrong, or null if OK.
 */
function checkOperandCount(instruction: string, operandCount: number): string | null {
  if (REQUIRES_TWO_OPERANDS.includes(instruction) && operandCount !== 2) {
    return `${instruction} requires exactly 2 operands, found ${operandCount}`;
  }
  if (REQUIRES_ONE_OPERAND.includes(instruction) && operandCount !== 1) {
    return `${instruction} requires exactly 1 operand, found ${operandCount}`;
  }
  if (REQUIRES_ZERO_OPERANDS.includes(instruction) && operandCount > 0) {
    return `${instruction} does not take operands, found ${operandCount}`;
  }
  if (instruction === "IMUL" && (operandCount < 1 || operandCount > 3)) {
    return `IMUL requires 1 to 3 operands, found ${operandCount}`;
  }
  if (instruction === "RAND" && (operandCount < 1 || operandCount > 2)) {
    return `RAND requires 1 or 2 operands, found ${operandCount}`;
  }
  return null;
}

/** Regex matching operand prefixes that are clearly not registers */
const NON_REGISTER_PATTERN = /^[[\-']|^0[xXbB]|^\d+$/;

/**
 * Check whether an operand looks like an invalid register name.
 */
function isInvalidRegister(
  operand: string,
  labels: Set<string>,
  equConstants: Set<string>,
): boolean {
  if (NON_REGISTER_PATTERN.test(operand)) return false;
  const upper = operand.toUpperCase();
  return (
    /^E?[A-Z]{2,3}$/.test(upper) &&
    !VALID_REGISTERS.includes(upper) &&
    !labels.has(operand) &&
    !equConstants.has(operand)
  );
}

/**
 * Check whether a label target is undefined.
 */
function isUndefinedLabel(label: string, labels: Set<string>, equConstants: Set<string>): boolean {
  return (
    !label.startsWith("0x") &&
    !label.startsWith("0X") &&
    !VALID_REGISTERS.includes(label.toUpperCase()) &&
    !labels.has(label) &&
    !equConstants.has(label)
  );
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
      if (!/^(\w+:?)\s+EQU\s+(.+)/i.exec(cleanLine)) {
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
    if (/^ORG\s/i.test(cleanLine)) return;

    // Skip data directives (DB, DW, DD)
    if (/^(DB|DW|DD)\s/i.test(cleanLine)) return;

    // Handle labels with directives on same line (e.g., "message: DB 'Hi'")
    if (/^\w+:\s+(DB|DW|DD|ORG|EQU)\s/i.test(cleanLine)) return;

    // Tokenize
    const tokens = cleanLine.split(/[\s,]+/).filter((t) => t.length > 0);
    const instruction = tokens[0].toUpperCase();

    // Check valid instruction (skip if it's a directive)
    if (ASSEMBLER_DIRECTIVES.includes(instruction)) return;

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
    const operandError = checkOperandCount(instruction, operands.length);
    if (operandError) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: lineIndex, character: 0 },
          end: { line: lineIndex, character: trimmed.length },
        },
        message: operandError,
        source: "tonx86",
      });
      return;
    }

    // Validate register names in operands
    for (const operand of operands) {
      if (isInvalidRegister(operand, labels, equConstants)) {
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
    }

    // Check for jump/call with undefined labels
    if (LABEL_INSTRUCTIONS.includes(instruction)) {
      const label = operands[0];
      if (isUndefinedLabel(label, labels, equConstants)) {
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
    if (tokens.length > 0 && tokens[0].toUpperCase() === "RET" && currentLabel) {
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
          inFunction = functionLabels.has(labelName);
          break;
        }

        const prevTokens = prevClean.split(/[\s,]+/);
        if (
          prevTokens.length > 0 &&
          (prevTokens[0].toUpperCase() === "HLT" || prevTokens[0].toUpperCase() === "RET")
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
    if (instruction === "HLT" || instruction === "RET" || instruction === "JMP") {
      unreachableAfterLine = i;
    }
  }
}

/**
 * Calling convention analysis types and constants.
 */
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

const CALLEE_SAVED_REGS = new Set(["EBX", "ESI", "EDI", "EBP"]);
const CONTROL_FLOW_INSTRUCTIONS = ["JMP", "JE", "JZ", "JNE", "JNZ", "RET", "HLT"];
const MODIFYING_INSTRUCTIONS = [
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
const ENTRY_POINT_NAMES = new Set(["main", "start", "_start"]);

/** Collect all EQU constant names from lines. */
function collectEquNames(lines: string[]): Set<string> {
  const equNames = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const clean = stripComment(lines[i].trim());
    if (/\bEQU\b/i.test(clean)) {
      const m = /^(\w+):?\s+EQU\s+/i.exec(clean);
      if (m) equNames.add(m[1]);
    }
  }
  return equNames;
}

/** Identify function labels: CALL targets + well-known entry points. */
function identifyFunctionLabels(
  lines: string[],
  labels: Set<string>,
  equNames: Set<string>,
): Set<string> {
  const functionLabels = new Set<string>();

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
          ENTRY_POINT_NAMES.has(labelName.toLowerCase())
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
  return functionLabels;
}

/** Create a new empty FunctionInfo for a given label. */
function newFunctionInfo(name: string, startLine: number): FunctionInfo {
  return {
    name,
    startLine,
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
}

/** Update function info based on an instruction line. */
function updateFunctionForInstruction(
  func: FunctionInfo,
  instruction: string,
  tokens: string[],
  lineIndex: number,
  firstInstructionAfterLabel: boolean,
): void {
  if (instruction === "PUSH") {
    func.pushCount++;
    if (tokens.length > 1) {
      const reg = tokens[1].toUpperCase();
      if (reg === "EBP" && firstInstructionAfterLabel) {
        func.prologuePushEBPLine = lineIndex;
      }
      if (CALLEE_SAVED_REGS.has(reg)) {
        func.savesCalleeSavedRegs.add(reg);
      }
    }
  } else if (instruction === "POP") {
    func.popCount++;
    if (tokens.length > 1 && tokens[1].toUpperCase() === "EBP") {
      func.epiloguePopEBPLine = lineIndex;
    }
  } else if (instruction === "MOV" && tokens.length >= 3) {
    const dest = tokens[1].toUpperCase();
    const src = tokens[2].toUpperCase();
    if (dest === "EBP" && src === "ESP" && func.prologuePushEBPLine !== -1) {
      func.prologueMovEBPLine = lineIndex;
    }
    if (CALLEE_SAVED_REGS.has(dest) && dest !== "EBP") {
      func.modifiesCalleeSavedRegs.add(dest);
    }
  } else if (instruction === "CALL") {
    func.callInstructions.push(lineIndex);
  } else if (instruction === "RET") {
    func.retInstructions.push(lineIndex);
  } else if (MODIFYING_INSTRUCTIONS.includes(instruction) && tokens.length > 1) {
    const dest = tokens[1].toUpperCase();
    if (CALLEE_SAVED_REGS.has(dest) && dest !== "EBP") {
      func.modifiesCalleeSavedRegs.add(dest);
    }
  }
}

/** Parse lines into FunctionInfo array. */
function parseFunctions(lines: string[], functionLabels: Set<string>): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
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
        if (labelName && !labelName.includes(" ") && functionLabels.has(labelName)) {
          if (currentFunction) {
            currentFunction.endLine = lineIndex - 1;
            functions.push(currentFunction);
          }
          currentFunction = newFunctionInfo(labelName, lineIndex);
          firstInstructionAfterLabel = true;
        }
      }
      continue;
    }

    if (!currentFunction) continue;

    const tokens = fnClean.split(/[\s,]+/).filter((t) => t.length > 0);
    const instruction = tokens[0].toUpperCase();
    updateFunctionForInstruction(
      currentFunction,
      instruction,
      tokens,
      lineIndex,
      firstInstructionAfterLabel,
    );
    firstInstructionAfterLabel = false;
  }

  if (currentFunction !== null) {
    currentFunction.endLine = lines.length - 1;
    functions.push(currentFunction);
  }
  return functions;
}

/** Emit diagnostics for function prologue/epilogue and register usage. */
function analyzeFunctionBodies(
  functions: FunctionInfo[],
  lines: string[],
  diagnostics: Diagnostic[],
): void {
  for (const func of functions) {
    if (ENTRY_POINT_NAMES.has(func.name.toLowerCase())) continue;

    if (func.callInstructions.length > 0 || func.retInstructions.length > 0) {
      if (func.prologuePushEBPLine === -1) {
        diagnostics.push({
          severity: DiagnosticSeverity.Information,
          range: {
            start: { line: func.startLine, character: 0 },
            end: { line: func.startLine, character: lines[func.startLine].length },
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
            end: { line: func.endLine, character: lines[func.endLine].length },
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
          end: { line: func.endLine, character: lines[func.endLine].length },
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
            end: { line: func.endLine, character: lines[func.endLine].length },
          },
          message: `Function '${func.name}' modifies callee-saved register ${reg} but doesn't save/restore it`,
          source: "tonx86-convention",
        });
      }
    }
  }
}

/** Emit diagnostics for CALL-site patterns (cdecl, parameter passing). */
function analyzeCallSites(lines: string[], diagnostics: Diagnostic[]): void {
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
        const nextTokens = nextClean.split(/[\s,]+/).filter((t) => t.length > 0);
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
      for (let i = lineIndex + 1; i < Math.min(lineIndex + 10, lines.length); i++) {
        const futureClean = stripComment(lines[i].trim());
        if (!futureClean) continue;
        const futureTokens = futureClean.split(/[\s,]+/).filter((t) => t.length > 0);
        if (futureTokens[0].toUpperCase() === "CALL") {
          foundCall = true;
          break;
        }
        if (
          futureClean.endsWith(":") ||
          CONTROL_FLOW_INSTRUCTIONS.includes(futureTokens[0].toUpperCase())
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
  const equNames = collectEquNames(lines);
  const functionLabels = identifyFunctionLabels(lines, labels, equNames);
  const functions = parseFunctions(lines, functionLabels);
  analyzeFunctionBodies(functions, lines, diagnostics);
  analyzeCallSites(lines, diagnostics);
}

/**
 * Run all validation passes on a document and return all diagnostics.
 */
export function validateDocumentText(text: string, validInstructionNames: string[]): Diagnostic[] {
  const lines = text.split(/\r?\n/);

  // First pass
  const { labels, equConstants, diagnostics: labelDiags } = collectLabelsAndConstants(lines);

  // Second pass
  const instrDiags = validateInstructions(lines, validInstructionNames, labels, equConstants);

  // Third pass
  const cfDiags: Diagnostic[] = [];
  validateControlFlow(lines, labels, cfDiags);

  // Fourth pass
  const ccDiags: Diagnostic[] = [];
  validateCallingConventions(lines, labels, ccDiags);

  return [...labelDiags, ...instrDiags, ...cfDiags, ...ccDiags];
}
