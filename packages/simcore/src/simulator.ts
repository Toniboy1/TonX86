/**
 * TonX86 Memory - supports two separate memory banks (A and B)
 */
export class Memory {
  private bankA: Uint8Array;
  private bankB: Uint8Array;

  constructor(size = 65536) {
    this.bankA = new Uint8Array(size);
    this.bankB = new Uint8Array(size);
  }

  readA(address: number): number {
    return this.bankA[address] || 0;
  }

  writeA(address: number, value: number): void {
    this.bankA[address] = value & 0xff;
  }

  readB(address: number): number {
    return this.bankB[address] || 0;
  }

  writeB(address: number, value: number): void {
    this.bankB[address] = value & 0xff;
  }

  clear(): void {
    this.bankA.fill(0);
    this.bankB.fill(0);
  }
}

/**
 * TonX86 CPU State - single-threaded execution
 */
export class CPUState {
  pc: number = 0; // Program counter
  registers: Uint32Array = new Uint32Array(8); // EAX, ECX, EDX, EBX, ESP, EBP, ESI, EDI
  flags: number = 0;
  running: boolean = false;
  halted: boolean = false;
  breakpoints: Set<number> = new Set();

  reset(): void {
    this.pc = 0;
    this.registers.fill(0);
    this.flags = 0;
    this.running = false;
    this.halted = false;
  }

  addBreakpoint(address: number): void {
    this.breakpoints.add(address);
  }

  removeBreakpoint(address: number): void {
    this.breakpoints.delete(address);
  }

  hasBreakpoint(address: number): boolean {
    return this.breakpoints.has(address);
  }
}

/**
 * TonX86 LCD Display - supports 2x4 to 16x16 grids
 */
export class LCDDisplay {
  private width: number;
  private height: number;
  private pixels: Uint8Array;

  constructor(width: number = 8, height: number = 8) {
    if (width < 2 || width > 16 || height < 2 || height > 16) {
      throw new Error("LCD dimensions must be between 2x2 and 16x16");
    }
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height);
  }

  getPixel(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return 0;
    }
    return this.pixels[y * this.width + x];
  }

  setPixel(x: number, y: number, value: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    this.pixels[y * this.width + x] = value ? 1 : 0;
  }

  clear(): void {
    this.pixels.fill(0);
  }

  getDisplay(): Uint8Array {
    return new Uint8Array(this.pixels);
  }
}

/**
 * TonX86 Simulator - main execution engine
 */
export class Simulator {
  private cpu: CPUState;
  private memory: Memory;
  private lcd: LCDDisplay;
  private code: Uint8Array = new Uint8Array();

  // Map of mnemonics to register names
  private registerMap: { [key: string]: number } = {
    EAX: 0,
    ECX: 1,
    EDX: 2,
    EBX: 3,
    ESP: 4,
    EBP: 5,
    ESI: 6,
    EDI: 7,
  };

  constructor(lcdWidth: number = 8, lcdHeight: number = 8) {
    this.cpu = new CPUState();
    this.memory = new Memory();
    this.lcd = new LCDDisplay(lcdWidth, lcdHeight);
  }

  /**
   * Parse a register name or immediate value
   */
  private parseOperand(operand: string): {
    type: "register" | "immediate";
    value: number;
  } {
    operand = operand.trim().toUpperCase();

    // Check if it's a register
    if (this.registerMap.hasOwnProperty(operand)) {
      return {
        type: "register",
        value: this.registerMap[operand],
      };
    }

    // Parse as immediate value (decimal, hex 0x, or binary 0b)
    let value = 0;
    if (operand.startsWith("0X")) {
      value = parseInt(operand.substring(2), 16);
    } else if (operand.startsWith("0B")) {
      value = parseInt(operand.substring(2), 2);
    } else {
      value = parseInt(operand, 10);
    }

    return {
      type: "immediate",
      value: value & 0xffffffff,
    };
  }

  /**
   * Execute a single instruction
   */
  executeInstruction(mnemonic: string, operands: string[]): void {
    mnemonic = mnemonic.toUpperCase();

    switch (mnemonic) {
      case "MOV": {
        // MOV destination, source
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register" && src.type === "immediate") {
          this.cpu.registers[dest.value] = src.value;
        } else if (dest.type === "register" && src.type === "register") {
          this.cpu.registers[dest.value] = this.cpu.registers[src.value];
        }
        break;
      }

      case "ADD": {
        // ADD destination, source
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register") {
          const srcValue =
            src.type === "register" ? this.cpu.registers[src.value] : src.value;
          this.cpu.registers[dest.value] =
            (this.cpu.registers[dest.value] + srcValue) & 0xffffffff;
          this.updateFlags(this.cpu.registers[dest.value]);
        }
        break;
      }

      case "SUB": {
        // SUB destination, source
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register") {
          const srcValue =
            src.type === "register" ? this.cpu.registers[src.value] : src.value;
          this.cpu.registers[dest.value] =
            (this.cpu.registers[dest.value] - srcValue) & 0xffffffff;
          this.updateFlags(this.cpu.registers[dest.value]);
        }
        break;
      }

      case "INC": {
        // INC destination
        if (operands.length !== 1) break;
        const dest = this.parseOperand(operands[0]);

        if (dest.type === "register") {
          this.cpu.registers[dest.value] =
            (this.cpu.registers[dest.value] + 1) & 0xffffffff;
          this.updateFlags(this.cpu.registers[dest.value]);
        }
        break;
      }

      case "DEC": {
        // DEC destination
        if (operands.length !== 1) break;
        const dest = this.parseOperand(operands[0]);

        if (dest.type === "register") {
          this.cpu.registers[dest.value] =
            (this.cpu.registers[dest.value] - 1) & 0xffffffff;
          this.updateFlags(this.cpu.registers[dest.value]);
        }
        break;
      }

      case "CMP": {
        // CMP destination, source
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register") {
          const destValue = this.cpu.registers[dest.value];
          const srcValue =
            src.type === "register" ? this.cpu.registers[src.value] : src.value;
          const result = (destValue - srcValue) & 0xffffffff;
          this.updateFlags(result);
        }
        break;
      }

      case "JMP": {
        // JMP label (not implemented - labels need symbol table)
        break;
      }

      case "JE":
      case "JZ": {
        // JE/JZ label (jump if equal/zero)
        // Requires symbol table - skip for now
        break;
      }

      case "JNE":
      case "JNZ": {
        // JNE/JNZ label (jump if not equal/not zero)
        // Requires symbol table - skip for now
        break;
      }

      case "HLT": {
        // HLT - halt processor
        this.cpu.halted = true;
        this.cpu.running = false;
        break;
      }
    }
  }

  /**
   * Update CPU flags based on result
   */
  private updateFlags(result: number): void {
    // Set Zero flag if result is zero
    if (result === 0) {
      this.cpu.flags |= 0x40; // Zero flag (bit 6)
    } else {
      this.cpu.flags &= ~0x40;
    }

    // Set Sign flag if result is negative (bit 31 set)
    if ((result & 0x80000000) !== 0) {
      this.cpu.flags |= 0x80; // Sign flag (bit 7)
    } else {
      this.cpu.flags &= ~0x80;
    }
  }

  loadProgram(bytecode: Uint8Array): void {
    this.code = new Uint8Array(bytecode);
    this.cpu.reset();
  }

  step(): void {
    if (!this.cpu.running || this.cpu.halted) {
      return;
    }

    // Check breakpoint
    if (this.cpu.hasBreakpoint(this.cpu.pc)) {
      this.cpu.running = false;
      return;
    }

    // Execute instruction (placeholder)
    this.cpu.pc++;
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
  }

  getState() {
    return {
      pc: this.cpu.pc,
      registers: Array.from(this.cpu.registers),
      flags: this.cpu.flags,
      running: this.cpu.running,
      halted: this.cpu.halted,
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

  addBreakpoint(address: number): void {
    this.cpu.addBreakpoint(address);
  }

  removeBreakpoint(address: number): void {
    this.cpu.removeBreakpoint(address);
  }
}
