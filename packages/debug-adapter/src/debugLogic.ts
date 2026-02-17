/**
 * Testable business logic extracted from debugAdapter.ts
 * This module contains pure functions that can be easily unit tested
 */

import { Instruction } from "@tonx86/simcore";

/**
 * Detect required LCD dimensions by scanning EQU constants and instructions.
 * Strategy:
 *   1. Check EQU constants for LCD_BASE (0xF000) and GRID_SIZE to determine dimensions
 *   2. Fall back to scanning instructions for hardcoded LCD addresses
 *   3. Default to 8x8 if no LCD access detected
 *
 * @param instructions - Array of parsed assembly instructions
 * @param constants - Map of EQU constant names to values
 * @returns Tuple of [width, height] for LCD dimensions
 */
export function detectLCDDimensions(
  instructions: Instruction[],
  constants: Map<string, number>,
): [number, number] {
  // Strategy 1: Use EQU constants for reliable detection
  let hasLCDBase = false;
  let gridSize = 0;

  for (const [name, value] of constants) {
    const upperName = name.toUpperCase();
    // Detect LCD base address constant (e.g., LCD_BASE EQU 0xF000)
    if (value >= 0xf000 && value <= 0xffff) {
      hasLCDBase = true;
    }
    // Detect grid size constant (e.g., GRID_SIZE EQU 64)
    if (
      upperName.includes("GRID") ||
      upperName.includes("LCD_W") ||
      upperName.includes("LCD_H") ||
      upperName.includes("SCREEN") ||
      upperName.includes("DISPLAY_SIZE")
    ) {
      gridSize = Math.max(gridSize, value);
    }
  }

  if (hasLCDBase && gridSize > 0) {
    // Use the grid size from constants
    return [gridSize, gridSize];
  }

  // Strategy 2: Scan instructions for LCD I/O addresses
  let maxAddress = 0;
  let foundLCDAccess = false;

  for (const instr of instructions) {
    for (const operand of instr.operands) {
      if (typeof operand === "string") {
        const opUpper = operand.toUpperCase();

        // Check for direct memory access [0xFxxx]
        if (opUpper.startsWith("[") && opUpper.includes("0XF")) {
          const addressStr = opUpper.slice(1, -1).replace(/[[\]]/g, "");
          if (addressStr.startsWith("0XF")) {
            const address = parseInt(addressStr, 16);
            if (address >= 0xf000 && address <= 0xffff) {
              maxAddress = Math.max(maxAddress, address);
              foundLCDAccess = true;
            }
          }
        }

        // Check for LCD base as immediate operand (after EQU substitution: 61440 = 0xF000)
        const numMatch = operand.match(/\b(\d+)\b/);
        if (numMatch) {
          const num = parseInt(numMatch[1], 10);
          if (num >= 0xf000 && num <= 0xffff) {
            foundLCDAccess = true;
          }
        }

        // Check for hex LCD references
        if (opUpper.includes("0XF")) {
          const match = opUpper.match(/0X(F[0-9A-F]{3})/);
          if (match) {
            // Regex guarantees address is 0xF000..0xFFFF
            const address = parseInt(match[0], 16);
            maxAddress = Math.max(maxAddress, address);
            foundLCDAccess = true;
          }
        }
      }
    }
  }

  if (foundLCDAccess) {
    const offset = maxAddress - 0xf000;
    // Maximum offset is 4095 (0xFFFF - 0xF000)
    if (offset >= 256) {
      return [64, 64]; // Large offset likely needs 64x64 display
    } else if (offset >= 64) {
      return [16, 16];
    }
    // Default to 16x16 when LCD is used
    return [16, 16];
  }

  // No LCD access detected, use 8x8
  return [8, 8];
}

/**
 * Get the next instruction line number from current EIP
 *
 * @param eip - Current instruction pointer (0-based index)
 * @param instructions - Array of parsed assembly instructions
 * @returns Line number of the next instruction, or 1 if not found
 */
export function getNextInstructionLine(
  eip: number,
  instructions: Instruction[],
): number {
  if (eip >= 0 && eip < instructions.length) {
    return instructions[eip].line;
  }
  return 1;
}

/**
 * Format a register value for display in the variables view
 *
 * @param value - The register value
 * @returns Formatted string showing decimal, hex, and binary representations
 */
export function formatRegisterValue(value: number): string {
  const hex = "0x" + value.toString(16).toUpperCase().padStart(8, "0");
  const binary = "0b" + value.toString(2).padStart(32, "0");
  return `${value} (${hex}, ${binary})`;
}

/**
 * Format a flag value for display (0 or 1)
 *
 * @param value - The flag value (boolean or number)
 * @returns "1" or "0"
 */
export function formatFlagValue(value: boolean | number): string {
  return value ? "1" : "0";
}

/**
 * Validate CPU speed parameter
 *
 * @param speed - The requested CPU speed
 * @returns Clamped speed between 1 and 200
 */
export function validateCPUSpeed(speed: number | undefined): number {
  if (speed === undefined) {
    return 100; // Default speed
  }
  // Clamp between 1 and 200
  return Math.max(1, Math.min(200, speed));
}

/**
 * Check if a line number has executable code
 *
 * @param line - The line number to check
 * @param instructions - Array of parsed assembly instructions
 * @returns True if the line has an instruction
 */
export function isExecutableLine(
  line: number,
  instructions: Instruction[],
): boolean {
  return instructions.some((instr) => instr.line === line);
}

/**
 * Find instruction index by line number
 *
 * @param line - The source line number
 * @param instructions - Array of parsed assembly instructions
 * @returns The instruction index (EIP), or -1 if not found
 */
export function findInstructionByLine(
  line: number,
  instructions: Instruction[],
): number {
  return instructions.findIndex((instr) => instr.line === line);
}

/**
 * Parse interrupt number from OUT instruction operands
 *
 * @param operands - The instruction operands
 * @returns The interrupt number, or -1 if not an interrupt
 */
export function parseInterruptNumber(operands: string[]): number {
  if (operands.length >= 2) {
    const port = operands[0];
    if (port === "0x20" || port === "32") {
      return parseInt(operands[1], 10);
    }
  }
  return -1;
}
