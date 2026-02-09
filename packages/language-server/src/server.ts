/**
 * TonX86 Language Server Protocol implementation
 * Provides syntax highlighting, completion, and diagnostics for assembly code
 */

export class LanguageServer {
  private version: string = "0.0.1";

  constructor() {
    console.log("TonX86 Language Server initialized");
  }

  async start(): Promise<void> {
    console.log(`Language Server ${this.version} started`);
  }

  async stop(): Promise<void> {
    console.log("Language Server stopped");
  }

  analyzeDocument(content: string): string[] {
    const diagnostics: string[] = [];
    const lines = content.split(/\r?\n/);

    lines.forEach((_: string, index: number) => {
      // Check for line length
      if (_.length > 80) {
        diagnostics.push(
          `Line ${index + 1}: Line too long (${_.length} > 80 characters)`,
        );
      }

      // Check for invalid instructions (placeholder)
      const validInstructions = [
        "MOV",
        "ADD",
        "SUB",
        "AND",
        "OR",
        "JMP",
        "JZ",
        "HLT",
      ];
      const tokens = _.trim().split(/\s+/);
      if (tokens.length > 0) {
        const instruction = tokens[0].toUpperCase();
        if (
          instruction &&
          !validInstructions.includes(instruction) &&
          instruction !== "" &&
          !instruction.startsWith(";")
        ) {
          // Could be a label or comment
          if (!instruction.endsWith(":") && !instruction.startsWith(";")) {
            // diagnostics.push(`Line ${index + 1}: Unknown instruction '${instruction}'`);
          }
        }
      }
    });

    return diagnostics;
  }

  getCompletions(): string[] {
    const validInstructions = [
      "MOV",
      "ADD",
      "SUB",
      "AND",
      "OR",
      "JMP",
      "JZ",
      "HLT",
    ];
    const registers = ["EAX", "ECX", "EDX", "EBX", "ESP", "EBP", "ESI", "EDI"];

    return [...validInstructions, ...registers];
  }

  getHoverInfo(word: string): string | null {
    const docs: { [key: string]: string } = {
      MOV: "Move data between registers (1 cycle)",
      ADD: "Add two values (1 cycle, affects Z, C, O, S flags)",
      SUB: "Subtract two values (1 cycle, affects Z, C, O, S flags)",
      AND: "Bitwise AND (1 cycle, affects Z, S flags)",
      OR: "Bitwise OR (1 cycle, affects Z, S flags)",
      JMP: "Unconditional jump (1 cycle)",
      JZ: "Jump if zero flag set (1 cycle)",
      HLT: "Halt execution (1 cycle)",
      EAX: "Accumulator register",
      ECX: "Counter register",
      EDX: "Data register",
      EBX: "Base register",
      ESP: "Stack Pointer register",
      EBP: "Base Pointer register",
      ESI: "Source Index register",
      EDI: "Destination Index register",
    };

    return docs[word.toUpperCase()] || null;
  }
}

// Export for use in extension
export default LanguageServer;
