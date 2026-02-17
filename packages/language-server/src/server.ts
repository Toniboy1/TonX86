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
  Hover,
  MarkupKind,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

import { validateDocumentText } from "./validator";

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
    name: "XCHG",
    description: "Exchange values between two registers",
    syntax: "XCHG register1, register2",
    cycles: 1,
    flags: [],
    example: "XCHG EAX, EBX  ; Swap EAX and EBX",
  },
  {
    name: "LEA",
    description: "Load effective address",
    syntax: "LEA destination, source",
    cycles: 1,
    flags: [],
    example: "LEA EAX, [EBX+4]  ; EAX = EBX + 4",
  },
  {
    name: "MOVZX",
    description: "Move with zero extension",
    syntax: "MOVZX destination, source",
    cycles: 1,
    flags: [],
    example: "MOVZX EAX, AL  ; Zero-extend AL to EAX",
  },
  {
    name: "MOVSX",
    description: "Move with sign extension",
    syntax: "MOVSX destination, source",
    cycles: 1,
    flags: [],
    example: "MOVSX EAX, AL  ; Sign-extend AL to EAX",
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
    name: "XOR",
    description: "Bitwise XOR two registers",
    syntax: "XOR destination, source",
    cycles: 1,
    flags: ["Z", "S"],
    example: "XOR EAX, EBX  ; EAX = EAX ^ EBX",
  },
  {
    name: "NOT",
    description: "Bitwise NOT (one's complement) of register",
    syntax: "NOT register",
    cycles: 1,
    flags: [],
    example: "NOT EAX  ; EAX = ~EAX",
  },
  {
    name: "SHL",
    description: "Logical shift left",
    syntax: "SHL destination, count",
    cycles: 1,
    flags: ["Z", "C", "O", "S"],
    example: "SHL EAX, 1  ; EAX <<= 1",
  },
  {
    name: "SHR",
    description: "Logical shift right",
    syntax: "SHR destination, count",
    cycles: 1,
    flags: ["Z", "C", "O", "S"],
    example: "SHR EAX, 1  ; EAX >>= 1",
  },
  {
    name: "SAR",
    description: "Arithmetic shift right",
    syntax: "SAR destination, count",
    cycles: 1,
    flags: ["Z", "C", "O", "S"],
    example: "SAR EAX, 1  ; EAX >>= 1 (arith)",
  },
  {
    name: "ROL",
    description: "Rotate left",
    syntax: "ROL destination, count",
    cycles: 1,
    flags: ["C", "O"],
    example: "ROL EAX, 1  ; rotate left",
  },
  {
    name: "ROR",
    description: "Rotate right",
    syntax: "ROR destination, count",
    cycles: 1,
    flags: ["C", "O"],
    example: "ROR EAX, 1  ; rotate right",
  },
  {
    name: "MUL",
    description: "Unsigned multiply (EAX *= source)",
    syntax: "MUL source",
    cycles: 2,
    flags: ["Z", "C", "O", "S"],
    example: "MUL EBX  ; EAX = EAX * EBX",
  },
  {
    name: "IMUL",
    description: "Signed multiply (supports 1, 2, and 3 operand forms per x86 spec)",
    syntax: "IMUL source | IMUL dest, src | IMUL dest, src, const",
    cycles: 2,
    flags: ["Z", "C", "O", "S"],
    example: "IMUL EBX  ; EAX = EAX * EBX (signed)",
  },
  {
    name: "DIV",
    description: "Unsigned divide (EAX /= source)",
    syntax: "DIV source",
    cycles: 2,
    flags: ["Z", "C", "O", "S"],
    example: "DIV EBX  ; EAX = EAX / EBX",
  },
  {
    name: "IDIV",
    description: "Signed divide (EAX /= source)",
    syntax: "IDIV source",
    cycles: 2,
    flags: ["Z", "C", "O", "S"],
    example: "IDIV EBX  ; EAX = EAX / EBX (signed)",
  },
  {
    name: "MOD",
    description: "Modulo operation (dest = dest % src)",
    syntax: "MOD destination, source",
    cycles: 1,
    flags: ["Z", "S"],
    example: "MOD EAX, 64  ; EAX = EAX % 64",
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
    name: "TEST",
    description: "Logical AND without storing result (sets flags only)",
    syntax: "TEST destination, source",
    cycles: 1,
    flags: ["Z", "S"],
    example: "TEST EAX, EAX  ; Check if EAX is zero",
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
    name: "NEG",
    description: "Two's complement negation",
    syntax: "NEG register",
    cycles: 1,
    flags: ["Z", "C", "O", "S"],
    example: "NEG EAX  ; EAX = -EAX",
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
    name: "JG",
    description: "Jump if greater (signed): SF == OF and ZF == 0",
    syntax: "JG label",
    cycles: 1,
    flags: [],
    example: "JG greater  ; Jump if dest > src (signed)",
  },
  {
    name: "JGE",
    description: "Jump if greater or equal (signed): SF == OF",
    syntax: "JGE label",
    cycles: 1,
    flags: [],
    example: "JGE ge_handler  ; Jump if dest >= src (signed)",
  },
  {
    name: "JL",
    description: "Jump if less (signed): SF != OF",
    syntax: "JL label",
    cycles: 1,
    flags: [],
    example: "JL less  ; Jump if dest < src (signed)",
  },
  {
    name: "JLE",
    description: "Jump if less or equal (signed): SF != OF or ZF == 1",
    syntax: "JLE label",
    cycles: 1,
    flags: [],
    example: "JLE le_handler  ; Jump if dest <= src (signed)",
  },
  {
    name: "JS",
    description: "Jump if sign flag set (result is negative)",
    syntax: "JS label",
    cycles: 1,
    flags: [],
    example: "JS negative  ; Jump if SF=1",
  },
  {
    name: "JNS",
    description: "Jump if sign flag not set (result is non-negative)",
    syntax: "JNS label",
    cycles: 1,
    flags: [],
    example: "JNS positive  ; Jump if SF=0",
  },
  {
    name: "JA",
    description: "Jump if above (unsigned): CF == 0 and ZF == 0",
    syntax: "JA label",
    cycles: 1,
    flags: [],
    example: "JA above  ; Jump if dest > src (unsigned)",
  },
  {
    name: "JAE",
    description: "Jump if above or equal (unsigned): CF == 0",
    syntax: "JAE label",
    cycles: 1,
    flags: [],
    example: "JAE ae_handler  ; Jump if dest >= src (unsigned)",
  },
  {
    name: "JB",
    description: "Jump if below (unsigned): CF == 1",
    syntax: "JB label",
    cycles: 1,
    flags: [],
    example: "JB below  ; Jump if dest < src (unsigned)",
  },
  {
    name: "JBE",
    description: "Jump if below or equal (unsigned): CF == 1 or ZF == 1",
    syntax: "JBE label",
    cycles: 1,
    flags: [],
    example: "JBE be_handler  ; Jump if dest <= src (unsigned)",
  },
  {
    name: "NOP",
    description: "No operation - does nothing",
    syntax: "NOP",
    cycles: 1,
    flags: [],
    example: "NOP  ; Do nothing",
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
    name: "RAND",
    description: "Generate random number from 0 to max-1",
    syntax: "RAND destination, max",
    cycles: 1,
    flags: ["Z", "S"],
    example: "RAND EAX, 64  ; EAX = random(0..63)",
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
  {
    name: "LOOP",
    description: "Loop with ECX counter - decrement ECX and jump if ECX != 0",
    syntax: "LOOP label",
    cycles: 1,
    flags: [],
    example: "LOOP my_loop  ; Decrement ECX, jump if ECX != 0",
  },
  {
    name: "LOOPE",
    description: "Loop while equal - decrement ECX, jump if ECX != 0 AND ZF set",
    syntax: "LOOPE label",
    cycles: 1,
    flags: [],
    example: "LOOPE my_loop  ; Loop while equal and ECX != 0",
  },
  {
    name: "LOOPZ",
    description: "Loop while zero (alias for LOOPE)",
    syntax: "LOOPZ label",
    cycles: 1,
    flags: [],
    example: "LOOPZ my_loop  ; Loop while zero and ECX != 0",
  },
  {
    name: "LOOPNE",
    description: "Loop while not equal - decrement ECX, jump if ECX != 0 AND ZF clear",
    syntax: "LOOPNE label",
    cycles: 1,
    flags: [],
    example: "LOOPNE my_loop  ; Loop while not equal and ECX != 0",
  },
  {
    name: "LOOPNZ",
    description: "Loop while not zero (alias for LOOPNE)",
    syntax: "LOOPNZ label",
    cycles: 1,
    flags: [],
    example: "LOOPNZ my_loop  ; Loop while not zero and ECX != 0",
  },
  {
    name: "RCL",
    description: "Rotate left through carry flag",
    syntax: "RCL destination, count",
    cycles: 1,
    flags: ["C", "O"],
    example: "RCL EAX, 1  ; Rotate EAX left through CF",
  },
  {
    name: "RCR",
    description: "Rotate right through carry flag",
    syntax: "RCR destination, count",
    cycles: 1,
    flags: ["C", "O"],
    example: "RCR EAX, 1  ; Rotate EAX right through CF",
  },
  {
    name: "LAHF",
    description: "Load flags (SF, ZF, CF) into AH register",
    syntax: "LAHF",
    cycles: 1,
    flags: [],
    example: "LAHF  ; AH = flags",
  },
  {
    name: "SAHF",
    description: "Store AH register into flags (SF, ZF, CF)",
    syntax: "SAHF",
    cycles: 1,
    flags: ["Z", "C", "S"],
    example: "SAHF  ; flags = AH",
  },
  {
    name: "CMOVE",
    description: "Conditional move if equal (ZF=1)",
    syntax: "CMOVE destination, source",
    cycles: 1,
    flags: [],
    example: "CMOVE EAX, EBX  ; Move EBX to EAX if ZF=1",
  },
  {
    name: "CMOVZ",
    description: "Conditional move if zero (alias for CMOVE)",
    syntax: "CMOVZ destination, source",
    cycles: 1,
    flags: [],
    example: "CMOVZ EAX, EBX  ; Move if ZF=1",
  },
  {
    name: "CMOVNE",
    description: "Conditional move if not equal (ZF=0)",
    syntax: "CMOVNE destination, source",
    cycles: 1,
    flags: [],
    example: "CMOVNE EAX, EBX  ; Move if ZF=0",
  },
  {
    name: "CMOVNZ",
    description: "Conditional move if not zero (alias for CMOVNE)",
    syntax: "CMOVNZ destination, source",
    cycles: 1,
    flags: [],
    example: "CMOVNZ EAX, EBX  ; Move if ZF=0",
  },
  {
    name: "CMOVL",
    description: "Conditional move if less (SF!=OF)",
    syntax: "CMOVL destination, source",
    cycles: 1,
    flags: [],
    example: "CMOVL EAX, EBX  ; Move if signed less",
  },
  {
    name: "CMOVLE",
    description: "Conditional move if less or equal (SF!=OF or ZF=1)",
    syntax: "CMOVLE destination, source",
    cycles: 1,
    flags: [],
    example: "CMOVLE EAX, EBX  ; Move if signed less or equal",
  },
  {
    name: "CMOVG",
    description: "Conditional move if greater (SF==OF and ZF=0)",
    syntax: "CMOVG destination, source",
    cycles: 1,
    flags: [],
    example: "CMOVG EAX, EBX  ; Move if signed greater",
  },
  {
    name: "CMOVGE",
    description: "Conditional move if greater or equal (SF==OF)",
    syntax: "CMOVGE destination, source",
    cycles: 1,
    flags: [],
    example: "CMOVGE EAX, EBX  ; Move if signed greater or equal",
  },
  {
    name: "CMOVA",
    description: "Conditional move if above (CF=0 and ZF=0)",
    syntax: "CMOVA destination, source",
    cycles: 1,
    flags: [],
    example: "CMOVA EAX, EBX  ; Move if unsigned above",
  },
  {
    name: "CMOVAE",
    description: "Conditional move if above or equal (CF=0)",
    syntax: "CMOVAE destination, source",
    cycles: 1,
    flags: [],
    example: "CMOVAE EAX, EBX  ; Move if unsigned above or equal",
  },
  {
    name: "CMOVB",
    description: "Conditional move if below (CF=1)",
    syntax: "CMOVB destination, source",
    cycles: 1,
    flags: [],
    example: "CMOVB EAX, EBX  ; Move if unsigned below",
  },
  {
    name: "CMOVBE",
    description: "Conditional move if below or equal (CF=1 or ZF=1)",
    syntax: "CMOVBE destination, source",
    cycles: 1,
    flags: [],
    example: "CMOVBE EAX, EBX  ; Move if unsigned below or equal",
  },
  {
    name: "CMOVS",
    description: "Conditional move if sign (SF=1)",
    syntax: "CMOVS destination, source",
    cycles: 1,
    flags: [],
    example: "CMOVS EAX, EBX  ; Move if sign flag set",
  },
  {
    name: "CMOVNS",
    description: "Conditional move if not sign (SF=0)",
    syntax: "CMOVNS destination, source",
    cycles: 1,
    flags: [],
    example: "CMOVNS EAX, EBX  ; Move if sign flag clear",
  },
  {
    name: "XADD",
    description: "Exchange and add - adds source to dest, loads old dest into source",
    syntax: "XADD destination, source",
    cycles: 1,
    flags: ["Z", "C", "O", "S"],
    example: "XADD EAX, EBX  ; Temp=EAX; EAX=EAX+EBX; EBX=Temp",
  },
  {
    name: "BSF",
    description: "Bit scan forward - find least significant set bit",
    syntax: "BSF destination, source",
    cycles: 1,
    flags: ["Z"],
    example: "BSF EAX, EBX  ; EAX = index of first set bit in EBX",
  },
  {
    name: "BSR",
    description: "Bit scan reverse - find most significant set bit",
    syntax: "BSR destination, source",
    cycles: 1,
    flags: ["Z"],
    example: "BSR EAX, EBX  ; EAX = index of last set bit in EBX",
  },
  {
    name: "BSWAP",
    description: "Byte swap - reverse byte order (endianness conversion)",
    syntax: "BSWAP register",
    cycles: 1,
    flags: [],
    example: "BSWAP EAX  ; Reverse byte order of EAX",
  },
  {
    name: "LODSB",
    description: "Load string byte - load byte from [ESI] into AL, increment ESI",
    syntax: "LODSB",
    cycles: 1,
    flags: [],
    example: "LODSB  ; AL = [ESI]; ESI++",
  },
  {
    name: "LODS",
    description: "Load string (alias for LODSB)",
    syntax: "LODS",
    cycles: 1,
    flags: [],
    example: "LODS  ; AL = [ESI]; ESI++",
  },
  {
    name: "STOSB",
    description: "Store string byte - store AL to [EDI], increment EDI",
    syntax: "STOSB",
    cycles: 1,
    flags: [],
    example: "STOSB  ; [EDI] = AL; EDI++",
  },
  {
    name: "STOS",
    description: "Store string (alias for STOSB)",
    syntax: "STOS",
    cycles: 1,
    flags: [],
    example: "STOS  ; [EDI] = AL; EDI++",
  },
  {
    name: "MOVSB",
    description: "Move string byte - copy byte from [ESI] to [EDI], increment both",
    syntax: "MOVSB",
    cycles: 1,
    flags: [],
    example: "MOVSB  ; [EDI] = [ESI]; ESI++; EDI++",
  },
  {
    name: "MOVS",
    description: "Move string (alias for MOVSB)",
    syntax: "MOVS",
    cycles: 1,
    flags: [],
    example: "MOVS  ; [EDI] = [ESI]; ESI++; EDI++",
  },
  {
    name: "SCASB",
    description: "Scan string byte - compare AL with [EDI], set flags, increment EDI",
    syntax: "SCASB",
    cycles: 1,
    flags: ["Z", "C", "O", "S"],
    example: "SCASB  ; Compare AL with [EDI]; EDI++",
  },
  {
    name: "SCAS",
    description: "Scan string (alias for SCASB)",
    syntax: "SCAS",
    cycles: 1,
    flags: ["Z", "C", "O", "S"],
    example: "SCAS  ; Compare AL with [EDI]; EDI++",
  },
  {
    name: "CMPSB",
    description: "Compare string bytes - compare [ESI] with [EDI], set flags, increment both",
    syntax: "CMPSB",
    cycles: 1,
    flags: ["Z", "C", "O", "S"],
    example: "CMPSB  ; Compare [ESI] with [EDI]; ESI++; EDI++",
  },
  {
    name: "CMPS",
    description: "Compare string (alias for CMPSB)",
    syntax: "CMPS",
    cycles: 1,
    flags: ["Z", "C", "O", "S"],
    example: "CMPS  ; Compare [ESI] with [EDI]; ESI++; EDI++",
  },
  {
    name: "INT3",
    description: "Breakpoint interrupt - triggers a debugger breakpoint",
    syntax: "INT3",
    cycles: 1,
    flags: [],
    example: "INT3  ; Trigger breakpoint",
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
  {
    name: "EDI",
    description: "Destination Index register (string operations)",
  },
  { name: "AL", description: "Low byte of EAX (bits 0-7) - 8-bit register" },
  { name: "AH", description: "High byte of EAX (bits 8-15) - 8-bit register" },
  { name: "BL", description: "Low byte of EBX (bits 0-7) - 8-bit register" },
  { name: "BH", description: "High byte of EBX (bits 8-15) - 8-bit register" },
  { name: "CL", description: "Low byte of ECX (bits 0-7) - 8-bit register" },
  { name: "CH", description: "High byte of ECX (bits 8-15) - 8-bit register" },
  { name: "DL", description: "Low byte of EDX (bits 0-7) - 8-bit register" },
  { name: "DH", description: "High byte of EDX (bits 8-15) - 8-bit register" },
];

// Flag definitions
const FLAGS = [
  { name: "Z", description: "Zero flag - Set when result is zero" },
  {
    name: "C",
    description: "Carry flag - Set when arithmetic carry/borrow occurs",
  },
  { name: "O", description: "Overflow flag - Set when signed overflow occurs" },
  { name: "S", description: "Sign flag - Set when result is negative" },
];

connection.onInitialize((_params: InitializeParams) => {
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
  const text = document.getText();
  const validInstructionNames = INSTRUCTIONS.map((i) => i.name);
  const diagnostics = validateDocumentText(text, validInstructionNames);
  connection.sendDiagnostics({ uri: document.uri, diagnostics });
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
