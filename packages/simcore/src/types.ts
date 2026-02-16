import type { CPUState } from "./cpu";

/**
 * Instruction interface - represents a parsed assembly instruction
 */
export interface Instruction {
  line: number;
  mnemonic: string;
  operands: string[];
  raw: string;
}

/**
 * Operand types used by parseOperand
 */
export type ParsedOperand = {
  type: "register" | "register8" | "immediate" | "memory";
  value: number;
  base?: number;
  offset?: number;
  byteOffset?: number;
};

export type RegisterOperand = {
  type: "register" | "register8";
  value: number;
  byteOffset?: number;
};

/**
 * Keyboard event interface
 */
export interface KeyboardEvent {
  keyCode: number;
  pressed: boolean;
}

/**
 * Compatibility mode for x86 behavior
 */
export type CompatibilityMode = "educational" | "strict-x86";

/**
 * Map of 32-bit register names to indices
 */
export const REGISTER_MAP: { [key: string]: number } = {
  EAX: 0,
  ECX: 1,
  EDX: 2,
  EBX: 3,
  ESP: 4,
  EBP: 5,
  ESI: 6,
  EDI: 7,
};

/**
 * Map of 8-bit register aliases to their parent register index and byte offset
 */
export const REGISTER8_MAP: {
  [key: string]: { reg: number; byteOffset: number };
} = {
  AL: { reg: 0, byteOffset: 0 },
  AH: { reg: 0, byteOffset: 8 },
  CL: { reg: 1, byteOffset: 0 },
  CH: { reg: 1, byteOffset: 8 },
  DL: { reg: 2, byteOffset: 0 },
  DH: { reg: 2, byteOffset: 8 },
  BL: { reg: 3, byteOffset: 0 },
  BH: { reg: 3, byteOffset: 8 },
};

/**
 * Execution context interface - provides instruction handlers access to
 * simulator internals without coupling to the Simulator class directly.
 */
export interface ExecutionContext {
  cpu: CPUState;
  compatibilityMode: CompatibilityMode;

  // Operand helpers
  parseOperand(operand: string): ParsedOperand;
  readRegisterValue(operand: RegisterOperand): number;
  writeRegisterValue(operand: RegisterOperand, value: number): void;
  resolveSourceValue(src: {
    type: string;
    value: number;
    base?: number;
    offset?: number;
    byteOffset?: number;
  }): number;

  // I/O and memory
  readIO(address: number): number;
  writeIO(address: number, value: number): void;
  readMemory32(address: number): number;
  writeMemory32(address: number, value: number): void;

  // Stack
  pushStack(value: number): void;
  popStack(): number;

  // Console output
  appendConsoleOutput(text: string): void;

  // Control flow - for jump/call/ret instructions
  resolveLabel(label: string): number | undefined;
  getEIP(): number;
  setEIP(value: number): void;
  pushCallStack(returnAddress: number): void;
  popCallStack(): number | undefined;
}
