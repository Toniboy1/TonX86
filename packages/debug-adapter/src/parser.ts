/**
 * Assembly Parser for TonX86 Debug Adapter
 * Parses assembly files into instructions and labels
 */

import { Instruction } from "@tonx86/simcore";

/**
 * Data item in data section (db, dw, dd)
 */
export interface DataItem {
  address: number; // Memory address where data starts
  size: 1 | 2 | 4; // 1=byte, 2=word, 4=dword
  values: number[]; // Values to write
  label?: string; // Optional label for this data
  line: number; // Source line number
}

/**
 * Data segment containing data items
 */
export interface DataSegment {
  items: DataItem[];
  startAddress: number; // Start address of data segment (from ORG)
}

export interface ParseResult {
  instructions: Instruction[];
  labels: Map<string, number>; // label name -> instruction index (for .text) or memory address (for .data)
  constants: Map<string, number>; // constant name -> value (from EQU)
  dataSegment: DataSegment; // data section items
  codeStartAddress: number; // Start address of code section (default 0)
}

/**
 * Parse a value literal (decimal, hex, binary, or character)
 */
function parseValue(valueStr: string): number {
  const trimmed = valueStr.trim();

  // Character literal: 'A'
  if (
    trimmed.startsWith("'") &&
    trimmed.endsWith("'") &&
    trimmed.length === 3
  ) {
    return trimmed.charCodeAt(1);
  }

  // Hexadecimal: 0x10 or 0X10
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
    return parseInt(trimmed.substring(2), 16);
  }

  // Binary: 0b1010 or 0B1010
  if (trimmed.startsWith("0b") || trimmed.startsWith("0B")) {
    return parseInt(trimmed.substring(2), 2);
  }

  // Decimal
  return parseInt(trimmed, 10);
}

/**
 * Parse assembly file into instructions and labels
 */
export function parseAssembly(lines: string[]): ParseResult {
  const instructions: Instruction[] = [];
  const labels = new Map<string, number>();
  const constants = new Map<string, number>();
  const dataItems: DataItem[] = [];

  let currentSection: "text" | "data" = "text"; // Current section (.text or .data)
  let currentDataAddress = 0x2000; // Default start address for data section
  let codeStartAddress = 0; // Start address for code (can be changed with ORG in .text)
  let pendingLabel: string | undefined; // Label waiting for next data/instruction

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith(";")) {
      continue;
    }

    // Handle section directives (.text, .data)
    if (trimmed.toLowerCase() === ".text") {
      currentSection = "text";
      pendingLabel = undefined;
      continue;
    }

    if (trimmed.toLowerCase() === ".data") {
      currentSection = "data";
      pendingLabel = undefined;
      continue;
    }

    // Handle ORG directive (set origin address)
    const orgMatch = trimmed.match(/^ORG\s+(.+)$/i);
    if (orgMatch) {
      const address = parseValue(orgMatch[1].split(";")[0].trim());
      if (currentSection === "data") {
        currentDataAddress = address;
      } else {
        codeStartAddress = address;
      }
      continue;
    }

    // Handle EQU directive (constant definition)
    // Format: NAME: EQU value or NAME EQU value
    const equMatch = trimmed.match(/^(\w+):?\s+EQU\s+(.+)$/i);
    if (equMatch) {
      const constName = equMatch[1];
      const valueStr = equMatch[2].split(";")[0].trim();
      const value = parseValue(valueStr);
      constants.set(constName, value);
      continue;
    }

    // Handle labels (lines ending with :)
    // But check if it's a label with an instruction/directive on the same line
    const labelWithCode = trimmed.match(/^(\w+):\s+(.+)$/);
    if (labelWithCode) {
      const labelName = labelWithCode[1];
      const rest = labelWithCode[2].trim();

      // Check if rest is a data directive
      const dataMatch = rest.match(/^(DB|DW|DD)\s+(.+)$/i);
      if (dataMatch && currentSection === "data") {
        // Process the data directive with label
        const directive = dataMatch[1].toUpperCase();
        const valuesStr = dataMatch[2].split(";")[0].trim();
        const size = directive === "DB" ? 1 : directive === "DW" ? 2 : 4;
        const values: number[] = [];
        const valueTokens = valuesStr.split(",");

        for (const token of valueTokens) {
          const tokenTrimmed = token.trim();

          // String literal: "Hello"
          if (tokenTrimmed.startsWith('"') && tokenTrimmed.endsWith('"')) {
            const str = tokenTrimmed.slice(1, -1);
            for (let j = 0; j < str.length; j++) {
              values.push(str.charCodeAt(j));
            }
          } else {
            let processed = tokenTrimmed;
            constants.forEach((value, name) => {
              const regex = new RegExp(`\\b${name}\\b`, "g");
              processed = processed.replace(regex, value.toString());
            });
            values.push(parseValue(processed));
          }
        }

        const dataItem: DataItem = {
          address: currentDataAddress,
          size: size as 1 | 2 | 4,
          values,
          label: labelName,
          line: i + 1,
        };

        labels.set(labelName, currentDataAddress);
        dataItems.push(dataItem);
        currentDataAddress += values.length * size;
        continue;
      }

      // Otherwise, handle as a regular label + instruction
      if (currentSection === "text") {
        labels.set(labelName, instructions.length);
        // Parse the instruction part (rest is guaranteed non-empty by labelWithCode regex)
        const parts = rest.split(/\s+/).filter((p) => p.length > 0);
        const mnemonic = parts[0].toUpperCase();
        const operandString = parts.slice(1).join(" ");
        const operandStringWithoutComment = operandString.split(";")[0];
        let processedOperands = operandStringWithoutComment;
        constants.forEach((value, name) => {
          const regex = new RegExp(`\\b${name}\\b`, "g");
          processedOperands = processedOperands.replace(
            regex,
            value.toString(),
          );
        });
        const operands = processedOperands
          .split(",")
          .map((op) => op.trim())
          .filter((op) => op.length > 0);
        instructions.push({
          line: i + 1,
          mnemonic,
          operands,
          raw: trimmed,
        });
        continue;
      } else {
        // In data section, save label for next line
        pendingLabel = labelName;
        continue;
      }
    }

    if (trimmed.endsWith(":")) {
      const labelName = trimmed.slice(0, -1).trim(); // Remove the colon

      if (currentSection === "text") {
        // Label points to the next instruction index
        labels.set(labelName, instructions.length);
      } else {
        // Label in data section - will be assigned to next data item
        pendingLabel = labelName;
      }
      continue;
    }

    // Handle data directives (DB, DW, DD)
    const dataMatch = trimmed.match(/^(DB|DW|DD)\s+(.+)$/i);
    if (dataMatch) {
      const directive = dataMatch[1].toUpperCase();
      const valuesStr = dataMatch[2].split(";")[0].trim(); // Remove inline comments

      // Parse size
      const size = directive === "DB" ? 1 : directive === "DW" ? 2 : 4;

      // Parse values (comma-separated)
      const values: number[] = [];
      const valueTokens = valuesStr.split(",");

      for (const token of valueTokens) {
        const tokenTrimmed = token.trim();

        // String literal: "Hello"
        if (tokenTrimmed.startsWith('"') && tokenTrimmed.endsWith('"')) {
          const str = tokenTrimmed.slice(1, -1); // Remove quotes
          for (let j = 0; j < str.length; j++) {
            values.push(str.charCodeAt(j));
          }
        } else {
          // Replace constants before parsing
          let processed = tokenTrimmed;
          constants.forEach((value, name) => {
            const regex = new RegExp(`\\b${name}\\b`, "g");
            processed = processed.replace(regex, value.toString());
          });
          values.push(parseValue(processed));
        }
      }

      // Create data item
      const dataItem: DataItem = {
        address: currentDataAddress,
        size: size as 1 | 2 | 4,
        values,
        label: pendingLabel,
        line: i + 1,
      };

      // If there was a pending label, map it to this address
      if (pendingLabel) {
        labels.set(pendingLabel, currentDataAddress);
        pendingLabel = undefined;
      }

      dataItems.push(dataItem);

      // Advance address by total size
      currentDataAddress += values.length * size;
      continue;
    }

    // If in data section and not a data directive, it's an error
    if (currentSection === "data") {
      throw new Error(
        `Line ${i + 1}: Expected data directive (DB, DW, DD) in .data section: ${trimmed}`,
      );
    }

    // Parse instruction: MNEMONIC operand1, operand2, ...
    const parts = trimmed.split(/\s+/);

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

  return {
    instructions,
    labels,
    constants,
    dataSegment: {
      items: dataItems,
      startAddress: dataItems.length > 0 ? dataItems[0].address : 0x2000,
    },
    codeStartAddress,
  };
}
