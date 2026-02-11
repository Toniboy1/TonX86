/**
 * Assembly Parser for TonX86 Debug Adapter
 * Parses assembly files into instructions and labels
 */

export interface Instruction {
  line: number;
  mnemonic: string;
  operands: string[];
  raw: string;
}

export interface ParseResult {
  instructions: Instruction[];
  labels: Map<string, number>; // label name -> instruction index
  constants: Map<string, number>; // constant name -> value
}

/**
 * Parse assembly file into instructions and labels
 */
export function parseAssembly(lines: string[]): ParseResult {
  const instructions: Instruction[] = [];
  const labels = new Map<string, number>();
  const constants = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith(";")) {
      continue;
    }

    // Handle EQU directive (constant definition)
    // Format: NAME: EQU value or NAME EQU value
    const equMatch = trimmed.match(/^(\w+):?\s+EQU\s+(.+)$/i);
    if (equMatch) {
      const constName = equMatch[1];
      const valueStr = equMatch[2].trim();
      // Parse value (supports decimal, hex, binary)
      let value = 0;
      if (valueStr.startsWith("0x") || valueStr.startsWith("0X")) {
        value = parseInt(valueStr.substring(2), 16);
      } else if (valueStr.startsWith("0b") || valueStr.startsWith("0B")) {
        value = parseInt(valueStr.substring(2), 2);
      } else {
        value = parseInt(valueStr, 10);
      }
      constants.set(constName, value);
      continue;
    }

    // Handle labels (lines ending with :)
    if (trimmed.endsWith(":")) {
      const labelName = trimmed.slice(0, -1).trim(); // Remove the colon
      // Label points to the next instruction index
      labels.set(labelName, instructions.length);
      continue;
    }

    // Parse instruction: MNEMONIC operand1, operand2, ...
    const parts = trimmed.split(/\s+/);
    if (parts.length === 0) continue;

    const mnemonic = parts[0].toUpperCase();
    const operandString = parts.slice(1).join(" ");
    // Strip comments before parsing operands (comments start with ;)
    const operandStringWithoutComment = operandString.split(";")[0];

    // Replace constants in operand string
    let processedOperands = operandStringWithoutComment;
    constants.forEach((value, name) => {
      const regex = new RegExp(`\\b${name}\\b`, "g");
      processedOperands = processedOperands.replace(regex, value.toString());
    });

    const operands = processedOperands
      .split(",")
      .map((op) => op.trim())
      .filter((op) => op.length > 0);

    instructions.push({
      line: i + 1, // 1-indexed
      mnemonic,
      operands,
      raw: trimmed,
    });
  }

  return { instructions, labels, constants };
}
