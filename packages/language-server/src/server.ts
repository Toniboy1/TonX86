/**
 * TonX86 Language Server Protocol implementation
 * Provides syntax highlighting, completion, and diagnostics for assembly code
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  CompletionItem,
  CompletionItemKind,
  Diagnostic,
  DiagnosticSeverity,
  Hover,
  MarkupKind,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents = new TextDocuments(TextDocument);

// Instruction set definition
const INSTRUCTIONS = [
  {
    name: "MOV",
    description: "Move data between registers or memory",
    syntax: "MOV destination, source",
    cycles: 1,
    flags: [],
    example: "MOV EAX, EBX  ; Copy EBX to EAX",
  },
  {
    name: "ADD",
    description: "Add two values and store result in destination",
    syntax: "ADD destination, source",
    cycles: 1,
    flags: ["Z", "C", "O", "S"],
    example: "ADD EAX, EBX  ; EAX = EAX + EBX",
  },
  {
    name: "SUB",
    description: "Subtract source from destination",
    syntax: "SUB destination, source",
    cycles: 1,
    flags: ["Z", "C", "O", "S"],
    example: "SUB EAX, EBX  ; EAX = EAX - EBX",
  },
  {
    name: "AND",
    description: "Bitwise AND two registers",
    syntax: "AND destination, source",
    cycles: 1,
    flags: ["Z", "S"],
    example: "AND EAX, EBX  ; EAX = EAX & EBX",
  },
  {
    name: "OR",
    description: "Bitwise OR two registers",
    syntax: "OR destination, source",
    cycles: 1,
    flags: ["Z", "S"],
    example: "OR EAX, EBX  ; EAX = EAX | EBX",
  },
  {
    name: "CMP",
    description: "Compare two values (SUB without storing result)",
    syntax: "CMP destination, source",
    cycles: 1,
    flags: ["Z", "C", "O", "S"],
    example: "CMP EAX, 0  ; Compare EAX with 0",
  },
  {
    name: "INC",
    description: "Increment register by 1",
    syntax: "INC register",
    cycles: 1,
    flags: ["Z", "O", "S"],
    example: "INC EAX  ; EAX = EAX + 1",
  },
  {
    name: "DEC",
    description: "Decrement register by 1",
    syntax: "DEC register",
    cycles: 1,
    flags: ["Z", "O", "S"],
    example: "DEC ECX  ; ECX = ECX - 1",
  },
  {
    name: "JMP",
    description: "Unconditional jump to label or address",
    syntax: "JMP label",
    cycles: 1,
    flags: [],
    example: "JMP main_loop",
  },
  {
    name: "JZ",
    description: "Jump if zero flag is set (equal)",
    syntax: "JZ label",
    cycles: 1,
    flags: [],
    example: "JZ zero_handler  ; Jump if Z=1",
  },
  {
    name: "JE",
    description: "Jump if equal (alias for JZ)",
    syntax: "JE label",
    cycles: 1,
    flags: [],
    example: "JE equal_handler  ; Jump if Z=1",
  },
  {
    name: "JNZ",
    description: "Jump if not zero (not equal)",
    syntax: "JNZ label",
    cycles: 1,
    flags: [],
    example: "JNZ non_zero  ; Jump if Z=0",
  },
  {
    name: "JNE",
    description: "Jump if not equal (alias for JNZ)",
    syntax: "JNE label",
    cycles: 1,
    flags: [],
    example: "JNE not_equal  ; Jump if Z=0",
  },
  {
    name: "HLT",
    description: "Halt execution",
    syntax: "HLT",
    cycles: 1,
    flags: [],
    example: "HLT  ; Stop program",
  },
  {
    name: "PUSH",
    description: "Push register onto stack",
    syntax: "PUSH register",
    cycles: 1,
    flags: [],
    example: "PUSH EAX  ; Save EAX on stack",
  },
  {
    name: "POP",
    description: "Pop from stack into register",
    syntax: "POP register",
    cycles: 1,
    flags: [],
    example: "POP EAX  ; Restore EAX from stack",
  },
  {
    name: "CALL",
    description: "Call subroutine - push return address and jump to label",
    syntax: "CALL label",
    cycles: 2,
    flags: [],
    example: "CALL my_function  ; Call function",
  },
  {
    name: "RET",
    description: "Return from subroutine - pop return address and jump",
    syntax: "RET",
    cycles: 2,
    flags: [],
    example: "RET  ; Return to caller",
  },
  {
    name: "INT",
    description: "Software interrupt - call interrupt handler",
    syntax: "INT interrupt_number",
    cycles: 2,
    flags: [],
    example: "INT 0x10  ; Call BIOS video interrupt",
  },
  {
    name: "IRET",
    description: "Return from interrupt handler",
    syntax: "IRET",
    cycles: 2,
    flags: ["All restored from stack"],
    example: "IRET  ; Return from interrupt",
  },
];

// Register definitions
const REGISTERS = [
  { name: "EAX", description: "Accumulator register (general purpose)" },
  { name: "ECX", description: "Counter register (loop counter)" },
  { name: "EDX", description: "Data register (general purpose)" },
  { name: "EBX", description: "Base register (general purpose)" },
  { name: "ESP", description: "Stack Pointer register" },
  { name: "EBP", description: "Base Pointer register (stack frame)" },
  { name: "ESI", description: "Source Index register (string operations)" },
  { name: "EDI", description: "Destination Index register (string operations)" },
];

// Flag definitions
const FLAGS = [
  { name: "Z", description: "Zero flag - Set when result is zero" },
  { name: "C", description: "Carry flag - Set when arithmetic carry/borrow occurs" },
  { name: "O", description: "Overflow flag - Set when signed overflow occurs" },
  { name: "S", description: "Sign flag - Set when result is negative" },
];

connection.onInitialize(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (_params: InitializeParams) => {
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: [" ", ","],
      },
      hoverProvider: true,
    },
  };
  return result;
});

connection.onInitialized(() => {
  connection.console.log("TonX86 Language Server initialized");
});

// Analyze document and provide diagnostics
function validateDocument(document: TextDocument): void {
  const diagnostics: Diagnostic[] = [];
  const text = document.getText();
  const lines = text.split(/\r?\n/);
  const labels = new Set<string>();

  // First pass: collect all labels
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.endsWith(":")) {
      const label = trimmed.slice(0, -1).trim();
      if (label && !label.includes(" ")) {
        labels.add(label);
      }
    }
  });

  // Second pass: validate instructions
  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith(";")) {
      return;
    }

    // Skip labels
    if (trimmed.endsWith(":")) {
      return;
    }

    // Parse instruction
    const tokens = trimmed.split(/[\s,]+/).filter((t) => !t.startsWith(";"));
    if (tokens.length === 0) {
      return;
    }

    const instruction = tokens[0].toUpperCase();
    const validInstructionNames = INSTRUCTIONS.map((i) => i.name);

    // Check if instruction is valid
    if (!validInstructionNames.includes(instruction)) {
      const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: lineIndex, character: 0 },
          end: { line: lineIndex, character: trimmed.length },
        },
        message: `Unknown instruction '${instruction}'`,
        source: "tonx86",
      };
      diagnostics.push(diagnostic);
      return;
    }

    // Basic operand validation
    const instructionDef = INSTRUCTIONS.find((i) => i.name === instruction);
    if (instructionDef) {
      // Check for jump instructions with undefined labels
      if (["JMP", "JZ", "JE", "JNZ", "JNE"].includes(instruction)) {
        if (tokens.length < 2) {
          const diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: {
              start: { line: lineIndex, character: 0 },
              end: { line: lineIndex, character: trimmed.length },
            },
            message: `${instruction} requires a label operand`,
            source: "tonx86",
          };
          diagnostics.push(diagnostic);
        } else {
          const label = tokens[1];
          // Check if it's a hex address or a label
          if (!label.startsWith("0x") && !labels.has(label)) {
            const diagnostic: Diagnostic = {
              severity: DiagnosticSeverity.Warning,
              range: {
                start: { line: lineIndex, character: 0 },
                end: { line: lineIndex, character: trimmed.length },
              },
              message: `Label '${label}' is not defined`,
              source: "tonx86",
            };
            diagnostics.push(diagnostic);
          }
        }
      }
    }
  });

  // Third pass: Calling convention validation
  validateCallingConventions(lines, labels, diagnostics);

  connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

/**
 * Analyze calling conventions and detect potential violations
 * Provides helpful warnings for common mistakes
 */
function validateCallingConventions(
  lines: string[],
  labels: Set<string>,
  diagnostics: Diagnostic[],
): void {
  // Track function boundaries and their properties
  interface FunctionInfo {
    name: string;
    startLine: number;
    endLine: number;
    hasProloguePushEBP: boolean;
    hasPrologueMovEBP: boolean;
    hasEpiloguePopEBP: boolean;
    pushCount: number;
    popCount: number;
    callInstructions: number[];
    retInstructions: number[];
    modifiesCalleeSavedRegs: Set<string>;
    savesCalleeSavedRegs: Set<string>;
  }

  const functions: FunctionInfo[] = [];
  const calleeSavedRegs = new Set(["EBX", "ESI", "EDI", "EBP"]);

  // Parse functions
  let currentFunction: FunctionInfo | null = null;
  
  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith(";")) {
      return;
    }

    // Check for function start (label)
    if (trimmed.endsWith(":")) {
      if (currentFunction) {
        currentFunction.endLine = lineIndex - 1;
        functions.push(currentFunction);
      }
      
      const funcName = trimmed.slice(0, -1).trim();
      currentFunction = {
        name: funcName,
        startLine: lineIndex,
        endLine: -1,
        hasProloguePushEBP: false,
        hasPrologueMovEBP: false,
        hasEpiloguePopEBP: false,
        pushCount: 0,
        popCount: 0,
        callInstructions: [],
        retInstructions: [],
        modifiesCalleeSavedRegs: new Set(),
        savesCalleeSavedRegs: new Set(),
      };
      return;
    }

    if (!currentFunction) {
      return;
    }

    // Parse instruction
    const tokens = trimmed.split(/[\s,]+/).filter((t) => !t.startsWith(";"));
    if (tokens.length === 0) {
      return;
    }

    const instruction = tokens[0].toUpperCase();

    // Track stack operations
    if (instruction === "PUSH") {
      currentFunction.pushCount++;
      if (tokens.length > 1) {
        const reg = tokens[1].toUpperCase();
        if (reg === "EBP" && lineIndex === currentFunction.startLine + 1) {
          currentFunction.hasProloguePushEBP = true;
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
          currentFunction.hasEpiloguePopEBP = true;
        }
      }
    } else if (instruction === "MOV") {
      if (tokens.length >= 3) {
        const dest = tokens[1].toUpperCase();
        const src = tokens[2].toUpperCase();
        
        // Check for prologue: MOV EBP, ESP
        if (dest === "EBP" && src === "ESP" && lineIndex === currentFunction.startLine + 2) {
          currentFunction.hasPrologueMovEBP = true;
        }
        
        // Track modifications to callee-saved registers
        if (calleeSavedRegs.has(dest) && dest !== "EBP") {
          currentFunction.modifiesCalleeSavedRegs.add(dest);
        }
      }
    } else if (instruction === "CALL") {
      currentFunction.callInstructions.push(lineIndex);
    } else if (instruction === "RET") {
      currentFunction.retInstructions.push(lineIndex);
    } else if (["ADD", "SUB", "INC", "DEC", "AND", "OR"].includes(instruction)) {
      // Track modifications to callee-saved registers
      if (tokens.length > 1) {
        const dest = tokens[1].toUpperCase();
        if (calleeSavedRegs.has(dest) && dest !== "EBP") {
          currentFunction.modifiesCalleeSavedRegs.add(dest);
        }
      }
    }
  });

  // Add last function
  if (currentFunction) {
    currentFunction.endLine = lines.length - 1;
    functions.push(currentFunction);
  }

  // Analyze each function for calling convention issues
  functions.forEach((func) => {
    // Skip main/entry point functions
    if (func.name === "main" || func.name === "start" || func.name === "_start") {
      return;
    }

    // Check for standard function prologue
    if (func.callInstructions.length > 0 || func.retInstructions.length > 0) {
      if (!func.hasProloguePushEBP) {
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

      if (func.hasProloguePushEBP && !func.hasPrologueMovEBP) {
        diagnostics.push({
          severity: DiagnosticSeverity.Information,
          range: {
            start: { line: func.startLine + 1, character: 0 },
            end: { line: func.startLine + 1, character: lines[func.startLine + 1]?.length || 0 },
          },
          message: `Function '${func.name}' should follow 'PUSH EBP' with 'MOV EBP, ESP' (standard prologue)`,
          source: "tonx86-convention",
        });
      }

      if (!func.hasEpiloguePopEBP && func.hasProloguePushEBP) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: { line: func.startLine, character: 0 },
            end: { line: func.endLine, character: lines[func.endLine]?.length || 0 },
          },
          message: `Function '${func.name}' has 'PUSH EBP' but missing 'POP EBP' (unbalanced stack)`,
          source: "tonx86-convention",
        });
      }
    }

    // Check for unbalanced push/pop
    if (func.pushCount !== func.popCount) {
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: { line: func.startLine, character: 0 },
          end: { line: func.endLine, character: lines[func.endLine]?.length || 0 },
        },
        message: `Function '${func.name}' has ${func.pushCount} PUSH but ${func.popCount} POP (unbalanced stack)`,
        source: "tonx86-convention",
      });
    }

    // Check for callee-saved register violations
    func.modifiesCalleeSavedRegs.forEach((reg) => {
      if (!func.savesCalleeSavedRegs.has(reg)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: { line: func.startLine, character: 0 },
            end: { line: func.endLine, character: lines[func.endLine]?.length || 0 },
          },
          message: `Function '${func.name}' modifies callee-saved register ${reg} but doesn't save/restore it`,
          source: "tonx86-convention",
        });
      }
    });
  });

  // Analyze CALL sites for potential calling convention issues
  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(";")) {
      return;
    }

    const tokens = trimmed.split(/[\s,]+/).filter((t) => !t.startsWith(";"));
    if (tokens.length === 0) {
      return;
    }

    const instruction = tokens[0].toUpperCase();

    // Check for stack cleanup after CALL (cdecl pattern)
    if (instruction === "CALL" && tokens.length > 1) {
      const targetLabel = tokens[1];
      
      // Look at next non-comment, non-empty line
      let nextLineIndex = lineIndex + 1;
      while (nextLineIndex < lines.length) {
        const nextTrimmed = lines[nextLineIndex].trim();
        if (nextTrimmed && !nextTrimmed.startsWith(";")) {
          break;
        }
        nextLineIndex++;
      }

      if (nextLineIndex < lines.length) {
        const nextLine = lines[nextLineIndex].trim();
        const nextTokens = nextLine.split(/[\s,]+/).filter((t) => !t.startsWith(";"));
        const nextInstruction = nextTokens.length > 0 ? nextTokens[0].toUpperCase() : "";

        // Check for cdecl stack cleanup pattern
        if (nextInstruction === "ADD" && nextTokens.length >= 3) {
          const dest = nextTokens[1].toUpperCase();
          const src = nextTokens[2];
          
          if (dest === "ESP") {
            // This looks like cdecl (caller cleans stack)
            diagnostics.push({
              severity: DiagnosticSeverity.Hint,
              range: {
                start: { line: lineIndex, character: 0 },
                end: { line: nextLineIndex, character: lines[nextLineIndex].length },
              },
              message: `Call to '${targetLabel}' uses cdecl convention (caller cleans stack with ADD ESP, ${src})`,
              source: "tonx86-convention",
            });
          }
        }
      }
    }

    // Detect potential parameter passing patterns
    if (instruction === "PUSH") {
      // Look ahead for CALL within next few lines
      let foundCall = false;
      for (let i = lineIndex + 1; i < Math.min(lineIndex + 10, lines.length); i++) {
        const futureTrimmed = lines[i].trim();
        if (!futureTrimmed || futureTrimmed.startsWith(";")) {
          continue;
        }
        const futureTokens = futureTrimmed.split(/[\s,]+/).filter((t) => !t.startsWith(";"));
        if (futureTokens.length > 0 && futureTokens[0].toUpperCase() === "CALL") {
          foundCall = true;
          break;
        }
        // Stop if we hit a label or control flow
        if (futureTrimmed.endsWith(":") || 
            ["JMP", "JE", "JZ", "JNE", "JNZ", "RET", "HLT"].includes(futureTokens[0]?.toUpperCase())) {
          break;
        }
      }

      if (foundCall && tokens.length > 1) {
        const param = tokens[1];
        diagnostics.push({
          severity: DiagnosticSeverity.Hint,
          range: {
            start: { line: lineIndex, character: 0 },
            end: { line: lineIndex, character: trimmed.length },
          },
          message: `Pushing parameter '${param}' for upcoming function call (cdecl/stdcall pattern)`,
          source: "tonx86-convention",
        });
      }
    }
  });
}

// Document change handler
documents.onDidChangeContent((change) => {
  validateDocument(change.document);
});

// Completion provider
connection.onCompletion(() => {
  const completions: CompletionItem[] = [];

  // Add instructions
  INSTRUCTIONS.forEach((instr) => {
    completions.push({
      label: instr.name,
      kind: CompletionItemKind.Keyword,
      detail: instr.description,
      documentation: {
        kind: MarkupKind.Markdown,
        value: `**${instr.name}** - ${instr.description}\n\n**Syntax:** \`${instr.syntax}\`\n\n**Cycles:** ${instr.cycles}\n\n**Flags:** ${instr.flags.length > 0 ? instr.flags.join(", ") : "None"}\n\n**Example:**\n\`\`\`asm\n${instr.example}\n\`\`\``,
      },
    });
  });

  // Add registers
  REGISTERS.forEach((reg) => {
    completions.push({
      label: reg.name,
      kind: CompletionItemKind.Variable,
      detail: reg.description,
      documentation: reg.description,
    });
  });

  return completions;
});

// Hover provider
connection.onHover((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const text = document.getText();
  const lines = text.split(/\r?\n/);
  const line = lines[params.position.line];
  if (!line) {
    return null;
  }

  // Get word at position
  const wordRange = getWordRangeAtPosition(line, params.position.character);
  if (!wordRange) {
    return null;
  }

  const word = line.substring(wordRange.start, wordRange.end).toUpperCase();

  // Check if it's an instruction
  const instruction = INSTRUCTIONS.find((i) => i.name === word);
  if (instruction) {
    const flagsStr = instruction.flags.length > 0 ? instruction.flags.join(", ") : "None";
    const hover: Hover = {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${instruction.name}** - ${instruction.description}\n\n**Syntax:** \`${instruction.syntax}\`\n\n**Cycles:** ${instruction.cycles}\n\n**Flags affected:** ${flagsStr}\n\n**Example:**\n\`\`\`asm\n${instruction.example}\n\`\`\``,
      },
    };
    return hover;
  }

  // Check if it's a register
  const register = REGISTERS.find((r) => r.name === word);
  if (register) {
    const hover: Hover = {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${register.name}** - ${register.description}`,
      },
    };
    return hover;
  }

  // Check if it's a flag
  const flag = FLAGS.find((f) => f.name === word);
  if (flag) {
    const hover: Hover = {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${flag.name} Flag** - ${flag.description}`,
      },
    };
    return hover;
  }

  return null;
});

// Helper function to get word range at position
function getWordRangeAtPosition(
  line: string,
  character: number,
): { start: number; end: number } | null {
  // Find word boundaries
  let start = character;
  let end = character;

  // Move start backward to find word start
  while (start > 0 && /[A-Za-z0-9_]/.test(line[start - 1])) {
    start--;
  }

  // Move end forward to find word end
  while (end < line.length && /[A-Za-z0-9_]/.test(line[end])) {
    end++;
  }

  if (start === end) {
    return null;
  }

  return { start, end };
}

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();

// Export for testing (optional)
export { INSTRUCTIONS, REGISTERS, FLAGS };
