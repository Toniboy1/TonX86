/**
 * TonX86 Simulator - main execution engine
 *
 * This is the slim orchestrator that wires together the extracted modules:
 *   - types.ts       - shared interfaces, operand types, register maps
 *   - cpu.ts         - CPUState class
 *   - memory.ts      - Memory class (dual-bank)
 *   - lcd.ts         - LCDDisplay class
 *   - keyboard.ts    - Keyboard class
 *   - flags.ts       - pure-function flag computation
 *   - instructions.ts - per-instruction execution logic
 */

// Re-export peripheral classes & types so existing consumers keep working
// (e.g. `import { CPUState, Memory, ... } from "./simulator"`)
export { CPUState } from "./cpu";
export { Memory } from "./memory";
export { LCDDisplay } from "./lcd";
export { Keyboard } from "./keyboard";
export type {
  Instruction,
  ParsedOperand,
  RegisterOperand,
  KeyboardEvent,
  CompatibilityMode,
  ExecutionContext,
} from "./types";
export { REGISTER_MAP, REGISTER8_MAP } from "./types";

// Internal imports
import { CPUState } from "./cpu";
import { Memory } from "./memory";
import { LCDDisplay } from "./lcd";
import { Keyboard } from "./keyboard";
import type {
  Instruction,
  ParsedOperand,
  RegisterOperand,
  CompatibilityMode,
  ExecutionContext,
} from "./types";
import { REGISTER_MAP, REGISTER8_MAP } from "./types";
import {
  isZeroFlagSet,
  isSignFlagSet,
  isCarryFlagSet,
  isOverflowFlagSet,
} from "./flags";
import { executeInstruction } from "./instructions";

/**
 * TonX86 Simulator - main execution engine
 */
export class Simulator {
  private cpu: CPUState;
  private memory: Memory;
  private lcd: LCDDisplay;
  private keyboard: Keyboard;
  private code: Uint8Array = new Uint8Array();
  private consoleOutput: string = "";
  private compatibilityMode: CompatibilityMode = "educational";

  // Control flow state
  private eip: number = 0;
  private instructions: Instruction[] = [];
  private labels: Map<string, number> = new Map();
  private callStack: number[] = [];

  constructor(
    lcdWidth: number = 8,
    lcdHeight: number = 8,
    compatibilityMode: CompatibilityMode = "educational",
  ) {
    this.cpu = new CPUState();
    this.memory = new Memory();
    this.lcd = new LCDDisplay(lcdWidth, lcdHeight);
    this.keyboard = new Keyboard();
    this.compatibilityMode = compatibilityMode;
    this.cpu.registers[4] = 0xffff; // Initialize ESP
  }

  // ---------------------------------------------------------------------------
  // I/O helpers
  // ---------------------------------------------------------------------------

  /**
   * Read from memory-mapped I/O addresses
   */
  private readIO(address: number): number {
    const IO_LCD_BASE = 0xf000;
    const IO_LCD_LIMIT = 0x10000;
    const IO_KEYBOARD_STATUS = 0x10100;
    const IO_KEYBOARD_KEYCODE = 0x10101;
    const IO_KEYBOARD_KEYSTATE = 0x10102;

    if (address >= IO_LCD_BASE && address < IO_LCD_LIMIT) {
      return 0;
    } else if (address === IO_KEYBOARD_STATUS) {
      return this.keyboard.getStatus();
    } else if (address === IO_KEYBOARD_KEYCODE) {
      this.keyboard.popKey();
      return this.keyboard.getKeyCode();
    } else if (address === IO_KEYBOARD_KEYSTATE) {
      return this.keyboard.getKeyState();
    } else {
      throw new Error(`Unknown I/O read address: 0x${address.toString(16)}`);
    }
  }

  /**
   * Write to memory-mapped I/O addresses
   */
  private writeIO(address: number, value: number): void {
    const IO_LCD_BASE = 0xf000;
    const IO_LCD_LIMIT = 0x10000;
    const IO_KEYBOARD_BASE = 0x10100;
    const IO_KEYBOARD_LIMIT = 0x10200;
    const lcdSize = this.lcd.getWidth() * this.lcd.getHeight();

    if (address >= IO_LCD_BASE && address < IO_LCD_LIMIT) {
      const pixelIndex = address - IO_LCD_BASE;
      const width = this.lcd.getWidth();
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      if (pixelIndex < lcdSize) {
        this.lcd.setPixel(x, y, value);
      }
    } else if (address >= IO_KEYBOARD_BASE && address < IO_KEYBOARD_LIMIT) {
      return;
    } else {
      throw new Error(`Unknown I/O address: 0x${address.toString(16)}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Memory helpers
  // ---------------------------------------------------------------------------

  private readMemory32(address: number): number {
    const byte0 = this.memory.readA(address);
    const byte1 = this.memory.readA(address + 1);
    const byte2 = this.memory.readA(address + 2);
    const byte3 = this.memory.readA(address + 3);
    return (byte0 | (byte1 << 8) | (byte2 << 16) | (byte3 << 24)) >>> 0;
  }

  private writeMemory32(address: number, value: number): void {
    this.memory.writeA(address, value & 0xff);
    this.memory.writeA(address + 1, (value >> 8) & 0xff);
    this.memory.writeA(address + 2, (value >> 16) & 0xff);
    this.memory.writeA(address + 3, (value >> 24) & 0xff);
  }

  // ---------------------------------------------------------------------------
  // Stack helpers
  // ---------------------------------------------------------------------------

  pushStack(value: number): void {
    this.cpu.registers[4] = (this.cpu.registers[4] - 4) & 0xffff;
    this.writeMemory32(this.cpu.registers[4], value);
  }

  popStack(): number {
    const value = this.readMemory32(this.cpu.registers[4]);
    this.cpu.registers[4] = (this.cpu.registers[4] + 4) & 0xffff;
    return value;
  }

  // ---------------------------------------------------------------------------
  // Operand parsing
  // ---------------------------------------------------------------------------

  private parseOperand(operand: string): ParsedOperand {
    const rawOperand = operand.trim();

    // Preserve case for character literals (e.g., 'e')
    if (
      rawOperand.startsWith("'") &&
      rawOperand.endsWith("'") &&
      rawOperand.length === 3
    ) {
      return { type: "immediate", value: rawOperand.charCodeAt(1) };
    }

    operand = rawOperand.toUpperCase();

    // Memory addressing [REG] or [REG+offset] or [REG+REG]
    if (operand.startsWith("[") && operand.endsWith("]")) {
      const memExpr = operand.slice(1, -1).trim();
      const plusMatch = memExpr.match(/^([A-Z]+)\s*\+\s*(.+)$/);
      const minusMatch = memExpr.match(/^([A-Z]+)\s*-\s*(.+)$/);

      if (plusMatch) {
        const baseReg = plusMatch[1];
        const offsetStr = plusMatch[2];

        if (Object.prototype.hasOwnProperty.call(REGISTER_MAP, baseReg)) {
          let offset = 0;
          if (Object.prototype.hasOwnProperty.call(REGISTER_MAP, offsetStr)) {
            offset = this.cpu.registers[REGISTER_MAP[offsetStr]];
          } else {
            offset = parseInt(offsetStr, 10);
          }
          return {
            type: "memory",
            value: 0,
            base: REGISTER_MAP[baseReg],
            offset: offset,
          };
        }
      } else if (minusMatch) {
        const baseReg = minusMatch[1];
        const offsetStr = minusMatch[2];

        if (Object.prototype.hasOwnProperty.call(REGISTER_MAP, baseReg)) {
          const offset = parseInt(offsetStr, 10);
          return {
            type: "memory",
            value: 0,
            base: REGISTER_MAP[baseReg],
            offset: -offset,
          };
        }
      } else {
        if (Object.prototype.hasOwnProperty.call(REGISTER_MAP, memExpr)) {
          return {
            type: "memory",
            value: 0,
            base: REGISTER_MAP[memExpr],
            offset: 0,
          };
        }

        let addr = 0;
        if (memExpr.startsWith("0X")) {
          addr = parseInt(memExpr.substring(2), 16);
        } else if (memExpr.startsWith("0B")) {
          addr = parseInt(memExpr.substring(2), 2);
        } else {
          addr = parseInt(memExpr, 10);
        }

        return {
          type: "memory",
          value: 0,
          base: -1,
          offset: addr,
        };
      }
    }

    // 8-bit register aliases
    if (Object.prototype.hasOwnProperty.call(REGISTER8_MAP, operand)) {
      return {
        type: "register8",
        value: REGISTER8_MAP[operand].reg,
        byteOffset: REGISTER8_MAP[operand].byteOffset,
      };
    }

    // 32-bit registers
    if (Object.prototype.hasOwnProperty.call(REGISTER_MAP, operand)) {
      return { type: "register", value: REGISTER_MAP[operand] };
    }

    // Immediate value
    let value = 0;
    if (operand.startsWith("0X")) {
      const hexPart = operand.substring(2);
      if (!/^[0-9A-F]+$/.test(hexPart)) {
        throw new Error(`Invalid hexadecimal value: ${operand}`);
      }
      value = parseInt(hexPart, 16);
    } else if (operand.startsWith("0B")) {
      const binPart = operand.substring(2);
      if (!/^[01]+$/.test(binPart)) {
        throw new Error(`Invalid binary value: ${operand}`);
      }
      value = parseInt(binPart, 2);
    } else {
      if (!/^-?\d+$/.test(operand)) {
        throw new Error(
          `Invalid operand: ${rawOperand}. Expected register, immediate value, or memory address`,
        );
      }
      value = parseInt(operand, 10);
    }

    return { type: "immediate", value: value & 0xffffffff };
  }

  private readRegisterValue(operand: RegisterOperand): number {
    const regValue = this.cpu.registers[operand.value];
    if (operand.type === "register8") {
      const shift = operand.byteOffset ?? 0;
      return (regValue >> shift) & 0xff;
    }
    return regValue;
  }

  private writeRegisterValue(operand: RegisterOperand, value: number): void {
    if (operand.type === "register8") {
      const shift = operand.byteOffset ?? 0;
      const mask = ~(0xff << shift);
      const updated =
        (this.cpu.registers[operand.value] & mask) | ((value & 0xff) << shift);
      this.cpu.registers[operand.value] = updated >>> 0;
      return;
    }
    this.cpu.registers[operand.value] = value >>> 0;
  }

  private resolveSourceValue(src: {
    type: string;
    value: number;
    base?: number;
    offset?: number;
    byteOffset?: number;
  }): number {
    if (src.type === "register") {
      return this.cpu.registers[src.value];
    } else if (src.type === "register8") {
      return this.readRegisterValue(src as RegisterOperand);
    } else if (src.type === "memory") {
      let addr: number;
      if (src.base === -1) {
        addr = src.offset || 0;
      } else {
        addr = (this.cpu.registers[src.base!] + (src.offset || 0)) & 0xffff;
      }
      if (
        (addr >= 0xf000 && addr <= 0xffff) ||
        (addr >= 0x10100 && addr <= 0x101ff)
      ) {
        return this.readIO(addr);
      }
      return this.readMemory32(addr);
    }
    return src.value;
  }

  // ---------------------------------------------------------------------------
  // Build the ExecutionContext that instruction handlers use
  // ---------------------------------------------------------------------------

  private getExecutionContext(): ExecutionContext {
    return {
      cpu: this.cpu,
      compatibilityMode: this.compatibilityMode,
      parseOperand: (op) => this.parseOperand(op),
      readRegisterValue: (op) => this.readRegisterValue(op),
      writeRegisterValue: (op, v) => this.writeRegisterValue(op, v),
      resolveSourceValue: (src) => this.resolveSourceValue(src),
      readIO: (addr) => this.readIO(addr),
      writeIO: (addr, v) => this.writeIO(addr, v),
      readMemory32: (addr) => this.readMemory32(addr),
      writeMemory32: (addr, v) => this.writeMemory32(addr, v),
      pushStack: (v) => this.pushStack(v),
      popStack: () => this.popStack(),
      appendConsoleOutput: (text) => {
        this.consoleOutput += text;
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Program loading
  // ---------------------------------------------------------------------------

  loadInstructions(
    instructions: Instruction[],
    labels: Map<string, number>,
  ): void {
    this.instructions = instructions;
    this.labels = labels;
    this.eip = 0;
    this.callStack = [];
    this.cpu.halted = false;
    this.cpu.running = false;
  }

  loadData(
    dataItems: Array<{
      address: number;
      size: 1 | 2 | 4;
      values: number[];
    }>,
  ): void {
    for (const item of dataItems) {
      let address = item.address;
      for (const value of item.values) {
        if (item.size === 1) {
          this.memory.writeA(address, value & 0xff);
          address += 1;
        } else if (item.size === 2) {
          this.memory.writeA(address, value & 0xff);
          this.memory.writeA(address + 1, (value >> 8) & 0xff);
          address += 2;
        } else if (item.size === 4) {
          this.writeMemory32(address, value);
          address += 4;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // EIP / instruction access
  // ---------------------------------------------------------------------------

  getEIP(): number {
    return this.eip;
  }

  setEIP(value: number): void {
    this.eip = value;
  }

  getCurrentInstruction(): Instruction | null {
    if (this.eip >= 0 && this.eip < this.instructions.length) {
      return this.instructions[this.eip];
    }
    return null;
  }

  getInstructions(): Instruction[] {
    return this.instructions;
  }

  getLabels(): Map<string, number> {
    return this.labels;
  }

  // ---------------------------------------------------------------------------
  // Control flow
  // ---------------------------------------------------------------------------

  /**
   * Evaluate whether a conditional jump should be taken.
   */
  private shouldTakeJump(mnemonic: string): boolean {
    const flags = this.cpu.flags;
    switch (mnemonic) {
      case "JMP":
        return true;
      case "JE":
      case "JZ":
        return isZeroFlagSet(flags);
      case "JNE":
      case "JNZ":
        return !isZeroFlagSet(flags);
      case "JG":
        return (
          isSignFlagSet(flags) === isOverflowFlagSet(flags) &&
          !isZeroFlagSet(flags)
        );
      case "JGE":
        return isSignFlagSet(flags) === isOverflowFlagSet(flags);
      case "JL":
        return isSignFlagSet(flags) !== isOverflowFlagSet(flags);
      case "JLE":
        return (
          isSignFlagSet(flags) !== isOverflowFlagSet(flags) ||
          isZeroFlagSet(flags)
        );
      case "JS":
        return isSignFlagSet(flags);
      case "JNS":
        return !isSignFlagSet(flags);
      case "JA":
        return !isCarryFlagSet(flags) && !isZeroFlagSet(flags);
      case "JAE":
        return !isCarryFlagSet(flags);
      case "JB":
        return isCarryFlagSet(flags);
      case "JBE":
        return isCarryFlagSet(flags) || isZeroFlagSet(flags);
      default:
        return false;
    }
  }

  /**
   * Step to the next instruction based on control flow.
   * Returns the line number of the executed instruction, or -1 if program ended.
   */
  step(): number {
    if (this.eip < 0 || this.eip >= this.instructions.length) {
      this.cpu.halted = true;
      this.cpu.running = false;
      return -1;
    }

    const instr = this.instructions[this.eip];
    const currentLine = instr.line;

    // Execute via the instruction module
    this.executeInstruction(instr.mnemonic, instr.operands);

    if (this.cpu.halted) {
      return currentLine;
    }

    const mnemonic = instr.mnemonic.toUpperCase();
    if (
      [
        "JMP",
        "JE",
        "JZ",
        "JNE",
        "JNZ",
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
        "RET",
        "LOOP",
        "LOOPE",
        "LOOPZ",
        "LOOPNE",
        "LOOPNZ",
      ].includes(mnemonic)
    ) {
      if (mnemonic === "CALL") {
        const targetLabel = instr.operands[0];
        const targetIndex = this.labels.get(targetLabel);

        if (targetIndex !== undefined) {
          const returnAddress = this.eip + 1;
          this.callStack.push(returnAddress);
          this.pushStack(returnAddress);
          this.eip = targetIndex;
        } else {
          throw new Error(`CALL target "${targetLabel}" not found in labels`);
        }
      } else if (mnemonic === "RET") {
        if (this.callStack.length > 0) {
          const returnAddress = this.callStack.pop()!;
          this.popStack();
          this.eip = returnAddress;
        } else {
          this.eip++;
        }
      } else if (
        mnemonic === "LOOP" ||
        mnemonic === "LOOPE" ||
        mnemonic === "LOOPZ" ||
        mnemonic === "LOOPNE" ||
        mnemonic === "LOOPNZ"
      ) {
        // ECX was already decremented in executeInstruction
        const targetLabel = instr.operands[0];
        const targetIndex = this.labels.get(targetLabel);

        if (targetIndex !== undefined) {
          const ecx = this.cpu.registers[1];
          let shouldBranch = false;
          if (mnemonic === "LOOP") {
            shouldBranch = ecx !== 0;
          } else if (mnemonic === "LOOPE" || mnemonic === "LOOPZ") {
            shouldBranch = ecx !== 0 && isZeroFlagSet(this.cpu.flags);
          } else {
            // LOOPNE / LOOPNZ
            shouldBranch = ecx !== 0 && !isZeroFlagSet(this.cpu.flags);
          }

          if (shouldBranch) {
            this.eip = targetIndex;
          } else {
            this.eip++;
          }
        } else {
          throw new Error(`LOOP target "${targetLabel}" not found in labels`);
        }
      } else {
        const targetLabel = instr.operands[0];
        const targetIndex = this.labels.get(targetLabel);

        if (targetIndex !== undefined) {
          if (this.shouldTakeJump(mnemonic)) {
            this.eip = targetIndex;
          } else {
            this.eip++;
          }
        } else {
          throw new Error(`Jump target "${targetLabel}" not found in labels`);
        }
      }
    } else {
      this.eip++;
    }

    return currentLine;
  }

  // ---------------------------------------------------------------------------
  // Instruction execution (delegates to instructions.ts)
  // ---------------------------------------------------------------------------

  executeInstruction(mnemonic: string, operands: string[]): void {
    executeInstruction(this.getExecutionContext(), mnemonic, operands);
  }

  // ---------------------------------------------------------------------------
  // Flag accessors (delegate to flags.ts pure functions)
  // ---------------------------------------------------------------------------

  isZeroFlagSet(): boolean {
    return isZeroFlagSet(this.cpu.flags);
  }

  isSignFlagSet(): boolean {
    return isSignFlagSet(this.cpu.flags);
  }

  isCarryFlagSet(): boolean {
    return isCarryFlagSet(this.cpu.flags);
  }

  isOverflowFlagSet(): boolean {
    return isOverflowFlagSet(this.cpu.flags);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  loadProgram(bytecode: Uint8Array): void {
    this.code = new Uint8Array(bytecode);
    this.cpu.reset();
  }

  run(): void {
    this.cpu.running = true;
  }

  pause(): void {
    this.cpu.running = false;
  }

  halt(): void {
    this.cpu.halted = true;
    this.cpu.running = false;
  }

  reset(): void {
    this.cpu.reset();
    this.memory.clear();
    this.lcd.clear();
    this.keyboard.clear();
    this.consoleOutput = "";
    this.eip = 0;
    this.callStack = [];
  }

  // ---------------------------------------------------------------------------
  // State accessors
  // ---------------------------------------------------------------------------

  getState() {
    return {
      pc: this.cpu.pc,
      eip: this.eip,
      registers: Array.from(this.cpu.registers),
      flags: this.cpu.flags,
      running: this.cpu.running,
      halted: this.cpu.halted,
      callStackDepth: this.callStack.length,
    };
  }

  getRegisters() {
    return {
      EAX: this.cpu.registers[0],
      ECX: this.cpu.registers[1],
      EDX: this.cpu.registers[2],
      EBX: this.cpu.registers[3],
      ESP: this.cpu.registers[4],
      EBP: this.cpu.registers[5],
      ESI: this.cpu.registers[6],
      EDI: this.cpu.registers[7],
    };
  }

  getMemoryA(start: number, length: number): Uint8Array {
    const result = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.memory.readA(start + i);
    }
    return result;
  }

  getMemoryB(start: number, length: number): Uint8Array {
    const result = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.memory.readB(start + i);
    }
    return result;
  }

  getLCDDisplay(): Uint8Array {
    return this.lcd.getDisplay();
  }

  pushKeyboardEvent(keyCode: number, pressed: boolean): void {
    this.keyboard.pushKey(keyCode, pressed);
  }

  getKeyboardStatus(): { status: number; keyCode: number; keyState: number } {
    return {
      status: this.keyboard.getStatus(),
      keyCode: this.keyboard.getKeyCode(),
      keyState: this.keyboard.getKeyState(),
    };
  }

  getConsoleOutput(): string {
    return this.consoleOutput;
  }

  clearConsoleOutput(): void {
    this.consoleOutput = "";
  }

  addBreakpoint(address: number): void {
    this.cpu.addBreakpoint(address);
  }

  removeBreakpoint(address: number): void {
    this.cpu.removeBreakpoint(address);
  }

  getCompatibilityMode(): CompatibilityMode {
    return this.compatibilityMode;
  }

  setCompatibilityMode(mode: CompatibilityMode): void {
    this.compatibilityMode = mode;
  }
}
