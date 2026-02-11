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
    this.registers[4] = 0xffff; // Initialize ESP to top of stack
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
 * TonX86 LCD Display - supports 2x2 to 256x256 grids
 */
export class LCDDisplay {
  private width: number;
  private height: number;
  private pixels: Uint8Array;

  constructor(width: number = 8, height: number = 8) {
    if (width < 2 || width > 256 || height < 2 || height > 256) {
      throw new Error("LCD dimensions must be between 2x2 and 256x256");
    }
    // Check if width and height are powers of 2
    const isPowerOf2 = (n: number) => n > 0 && (n & (n - 1)) === 0;
    if (!isPowerOf2(width) || !isPowerOf2(height)) {
      throw new Error("LCD dimensions must be powers of 2");
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

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  clear(): void {
    this.pixels.fill(0);
  }

  getDisplay(): Uint8Array {
    return new Uint8Array(this.pixels);
  }
}

/**
 * Keyboard event interface
 */
export interface KeyboardEvent {
  keyCode: number;
  pressed: boolean;
}

/**
 * TonX86 Keyboard Input - memory-mapped keyboard support
 *
 * Key Codes:
 * - Letters: A-Z = 65-90 (uppercase), a-z = 97-122 (lowercase)
 * - Numbers: 0-9 = 48-57
 * - Symbols: Standard ASCII codes
 * - Arrow Keys: Up=128, Down=129, Left=130, Right=131
 * - Space: 32
 * - Enter: 13
 * - Escape: 27
 * - Tab: 9
 * - Backspace: 8
 */
export class Keyboard {
  private keyQueue: KeyboardEvent[] = [];
  private lastKeyCode: number = 0;
  private lastKeyState: number = 0; // 0 = released, 1 = pressed

  /**
   * Push a key event to the queue
   */
  pushKey(keyCode: number, pressed: boolean): void {
    this.keyQueue.push({ keyCode, pressed });
    this.lastKeyCode = keyCode;
    this.lastKeyState = pressed ? 1 : 0;
  }

  /**
   * Get keyboard status register
   * Bit 0: Key available in queue (1 = yes, 0 = no)
   */
  getStatus(): number {
    return this.keyQueue.length > 0 ? 1 : 0;
  }

  /**
   * Get last key code
   */
  getKeyCode(): number {
    return this.lastKeyCode;
  }

  /**
   * Get last key state (1 = pressed, 0 = released)
   */
  getKeyState(): number {
    return this.lastKeyState;
  }

  /**
   * Pop the oldest key event from queue and update registers to that key
   * Returns true if a key was popped
   */
  popKey(): boolean {
    const event = this.keyQueue.shift();
    if (event) {
      // Update registers to show the popped key
      this.lastKeyCode = event.keyCode;
      this.lastKeyState = event.pressed ? 1 : 0;
      return true;
    }
    return false;
  }

  /**
   * Clear keyboard queue and state
   */
  clear(): void {
    this.keyQueue = [];
    this.lastKeyCode = 0;
    this.lastKeyState = 0;
  }
}

/**
 * Compatibility mode for x86 behavior
 */
export type CompatibilityMode = "educational" | "strict-x86";

/**
 * TonX86 Simulator - main execution engine
 */
export class Simulator {
  private cpu: CPUState;
  private memory: Memory;
  private lcd: LCDDisplay;
  private keyboard: Keyboard;
  private code: Uint8Array = new Uint8Array();
  private consoleOutput: string = ""; // Buffer for console output from INT 0x10 and INT 0x21
  private compatibilityMode: CompatibilityMode = "educational";

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
    // Initialize ESP to top of stack
    this.cpu.registers[4] = 0xffff;
  }

  /**
   * Read from memory-mapped I/O addresses
   * 0xF000-0xFFFF: LCD display (write-only, returns 0)
   * 0x10100: Keyboard status register
   * 0x10101: Keyboard key code register
   * 0x10102: Keyboard key state register
   */
  private readIO(address: number): number {
    const IO_LCD_BASE = 0xf000;
    const IO_LCD_LIMIT = 0x10000;
    const IO_KEYBOARD_STATUS = 0x10100;
    const IO_KEYBOARD_KEYCODE = 0x10101;
    const IO_KEYBOARD_KEYSTATE = 0x10102;

    // LCD is write-only, return 0 if read
    if (address >= IO_LCD_BASE && address < IO_LCD_LIMIT) {
      return 0;
    } else if (address === IO_KEYBOARD_STATUS) {
      return this.keyboard.getStatus();
    } else if (address === IO_KEYBOARD_KEYCODE) {
      // Pop the key first, then return the keycode that was just popped
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
   * 0xF000-0xFFFF: LCD display (4096 pixels for 64x64)
   * 0x10100-0x101FF: Keyboard (read-only, writes ignored)
   */
  private writeIO(address: number, value: number): void {
    const IO_LCD_BASE = 0xf000;
    const IO_LCD_LIMIT = 0x10000;
    const IO_KEYBOARD_BASE = 0x10100;
    const IO_KEYBOARD_LIMIT = 0x10200;
    const lcdSize = this.lcd.getWidth() * this.lcd.getHeight();

    if (address >= IO_LCD_BASE && address < IO_LCD_LIMIT) {
      // LCD pixel write (0xF000-0xFFFF)
      const pixelIndex = address - IO_LCD_BASE;
      const width = this.lcd.getWidth();
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);

      // Allow the write even if slightly out of bounds (graceful degradation)
      if (pixelIndex < lcdSize) {
        this.lcd.setPixel(x, y, value);
      }
      // Silently ignore out-of-bounds writes instead of throwing
    } else if (address >= IO_KEYBOARD_BASE && address < IO_KEYBOARD_LIMIT) {
      // Keyboard registers are read-only, ignore writes
      return;
    } else {
      throw new Error(`Unknown I/O address: 0x${address.toString(16)}`);
    }
  }

  /**
   * Read a 32-bit value from memory (little-endian)
   */
  private readMemory32(address: number): number {
    const byte0 = this.memory.readA(address);
    const byte1 = this.memory.readA(address + 1);
    const byte2 = this.memory.readA(address + 2);
    const byte3 = this.memory.readA(address + 3);
    return (byte0 | (byte1 << 8) | (byte2 << 16) | (byte3 << 24)) >>> 0;
  }

  /**
   * Write a 32-bit value to memory (little-endian)
   */
  private writeMemory32(address: number, value: number): void {
    this.memory.writeA(address, value & 0xff);
    this.memory.writeA(address + 1, (value >> 8) & 0xff);
    this.memory.writeA(address + 2, (value >> 16) & 0xff);
    this.memory.writeA(address + 3, (value >> 24) & 0xff);
  }

  /**
   * Push a 32-bit value onto the stack
   */
  pushStack(value: number): void {
    // Decrement ESP by 4 (32-bit)
    this.cpu.registers[4] = (this.cpu.registers[4] - 4) & 0xffff;
    // Write value to stack
    this.writeMemory32(this.cpu.registers[4], value);
  }

  /**
   * Pop a 32-bit value from the stack
   */
  popStack(): number {
    // Read value from stack
    const value = this.readMemory32(this.cpu.registers[4]);
    // Increment ESP by 4 (32-bit)
    this.cpu.registers[4] = (this.cpu.registers[4] + 4) & 0xffff;
    return value;
  }

  /**
   * Parse a register name, immediate value, or memory address
   */
  private parseOperand(operand: string): {
    type: "register" | "register8" | "immediate" | "memory";
    value: number;
    base?: number;
    offset?: number;
    byteOffset?: number;
  } {
    const rawOperand = operand.trim();

    // Preserve case for character literals (e.g., 'e')
    if (
      rawOperand.startsWith("'") &&
      rawOperand.endsWith("'") &&
      rawOperand.length === 3
    ) {
      return {
        type: "immediate",
        value: rawOperand.charCodeAt(1),
      };
    }

    operand = rawOperand.toUpperCase();

    // Check for memory addressing [REG] or [REG+offset] or [REG+REG]
    if (operand.startsWith("[") && operand.endsWith("]")) {
      const memExpr = operand.slice(1, -1).trim();

      // Handle [REG+offset] or [REG-offset]
      const plusMatch = memExpr.match(/^([A-Z]+)\s*\+\s*(.+)$/);
      const minusMatch = memExpr.match(/^([A-Z]+)\s*-\s*(.+)$/);

      if (plusMatch) {
        const baseReg = plusMatch[1];
        const offsetStr = plusMatch[2];

        if (Object.prototype.hasOwnProperty.call(this.registerMap, baseReg)) {
          // Parse offset (could be number or another register)
          let offset = 0;
          if (
            Object.prototype.hasOwnProperty.call(this.registerMap, offsetStr)
          ) {
            // [REG+REG] - use register value as offset
            offset = this.cpu.registers[this.registerMap[offsetStr]];
          } else {
            // [REG+immediate]
            offset = parseInt(offsetStr, 10);
          }

          return {
            type: "memory",
            value: 0,
            base: this.registerMap[baseReg],
            offset: offset,
          };
        }
      } else if (minusMatch) {
        const baseReg = minusMatch[1];
        const offsetStr = minusMatch[2];

        if (Object.prototype.hasOwnProperty.call(this.registerMap, baseReg)) {
          const offset = parseInt(offsetStr, 10);
          return {
            type: "memory",
            value: 0,
            base: this.registerMap[baseReg],
            offset: -offset,
          };
        }
      } else {
        // Handle simple [REG]
        if (Object.prototype.hasOwnProperty.call(this.registerMap, memExpr)) {
          return {
            type: "memory",
            value: 0,
            base: this.registerMap[memExpr],
            offset: 0,
          };
        }

        // Handle [immediate] like [0xF000]
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
          base: -1, // Special marker for absolute address
          offset: addr,
        };
      }
    }

    // Check if it's an 8-bit register alias (AL, AH, BL, BH, CL, CH, DL, DH)
    const register8Map: { [key: string]: { reg: number; byteOffset: number } } =
      {
        AL: { reg: 0, byteOffset: 0 },
        AH: { reg: 0, byteOffset: 8 },
        CL: { reg: 1, byteOffset: 0 },
        CH: { reg: 1, byteOffset: 8 },
        DL: { reg: 2, byteOffset: 0 },
        DH: { reg: 2, byteOffset: 8 },
        BL: { reg: 3, byteOffset: 0 },
        BH: { reg: 3, byteOffset: 8 },
      };

    if (Object.prototype.hasOwnProperty.call(register8Map, operand)) {
      return {
        type: "register8",
        value: register8Map[operand].reg,
        byteOffset: register8Map[operand].byteOffset,
      };
    }

    // Check if it's a register
    if (Object.prototype.hasOwnProperty.call(this.registerMap, operand)) {
      return {
        type: "register",
        value: this.registerMap[operand],
      };
    }

    // Parse as immediate value (decimal, hex 0x, binary 0b, or character literal)
    let value = 0;

    if (operand.startsWith("0X")) {
      const hexPart = operand.substring(2);
      // Validate hex digits
      if (!/^[0-9A-F]+$/.test(hexPart)) {
        throw new Error(`Invalid hexadecimal value: ${operand}`);
      }
      value = parseInt(hexPart, 16);
    } else if (operand.startsWith("0B")) {
      const binPart = operand.substring(2);
      // Validate binary digits
      if (!/^[01]+$/.test(binPart)) {
        throw new Error(`Invalid binary value: ${operand}`);
      }
      value = parseInt(binPart, 2);
    } else {
      // Validate decimal number (allow optional minus sign)
      if (!/^-?\d+$/.test(operand)) {
        throw new Error(
          `Invalid operand: ${rawOperand}. Expected register, immediate value, or memory address`,
        );
      }
      value = parseInt(operand, 10);
    }

    return {
      type: "immediate",
      value: value & 0xffffffff,
    };
  }

  private readRegisterValue(operand: {
    type: "register" | "register8";
    value: number;
    byteOffset?: number;
  }): number {
    const regValue = this.cpu.registers[operand.value];

    if (operand.type === "register8") {
      const shift = operand.byteOffset ?? 0;
      return (regValue >> shift) & 0xff;
    }

    return regValue;
  }

  private writeRegisterValue(
    operand: {
      type: "register" | "register8";
      value: number;
      byteOffset?: number;
    },
    value: number,
  ): void {
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

        // In strict-x86 mode, memory-to-memory MOV is not allowed
        if (this.compatibilityMode === "strict-x86") {
          const isDestMemory =
            dest.type === "immediate" || dest.type === "memory";
          const isSrcMemory =
            src.type === "memory" ||
            (src.type === "immediate" &&
              ((src.value >= 0xf000 && src.value <= 0xffff) ||
                (src.value >= 0x10100 && src.value <= 0x101ff)));

          if (isDestMemory && isSrcMemory) {
            throw new Error(
              "Memory-to-memory MOV not allowed in strict-x86 mode. Use a register as intermediate.",
            );
          }
        }

        // Get source value
        let srcValue: number;
        if (src.type === "register" || src.type === "register8") {
          srcValue = this.readRegisterValue(src as any);
        } else if (src.type === "memory") {
          // Read from memory address [base+offset]
          // Special case: base = -1 means absolute I/O address stored in offset
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
            srcValue = this.readIO(addr);
          } else {
            srcValue = this.readMemory32(addr);
          }
        } else {
          // src.type === "immediate"
          // Immediate values are literal values, not I/O reads
          // Use [address] syntax for I/O reads
          srcValue = src.value;
        }

        // Handle destination
        if (dest.type === "register" || dest.type === "register8") {
          this.writeRegisterValue(dest as any, srcValue);
        } else if (dest.type === "memory") {
          // Write to memory address [base+offset]
          // Special case: base = -1 means absolute I/O address stored in offset
          let addr: number;
          if (dest.base === -1) {
            addr = dest.offset || 0;
          } else {
            addr =
              (this.cpu.registers[dest.base!] + (dest.offset || 0)) & 0xffff;
          }

          if (
            (addr >= 0xf000 && addr <= 0xffff) ||
            (addr >= 0x10100 && addr <= 0x101ff)
          ) {
            this.writeIO(addr, srcValue);
          } else {
            this.writeMemory32(addr, srcValue);
          }
        } else if (dest.type === "immediate") {
          // Destination is a memory address (I/O write)
          this.writeIO(dest.value, srcValue);
        }
        break;
      }

      case "XCHG": {
        // XCHG destination, source - Exchange values
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (
          (dest.type === "register" || dest.type === "register8") &&
          (src.type === "register" || src.type === "register8")
        ) {
          const temp = this.readRegisterValue(dest as any);
          this.writeRegisterValue(
            dest as any,
            this.readRegisterValue(src as any),
          );
          this.writeRegisterValue(src as any, temp);
        }
        break;
      }

      case "LEA": {
        // LEA destination, source - Load effective address
        // Per x86 spec: computes the effective address of src and stores in dest
        // Supports both LEA reg, imm and LEA reg, [base+offset]
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register") {
          if (src.type === "memory") {
            // LEA reg, [base+offset] - compute effective address without dereferencing
            let addr: number;
            if (src.base === -1) {
              addr = src.offset || 0;
            } else {
              addr =
                (this.cpu.registers[src.base!] + (src.offset || 0)) &
                0xffffffff;
            }
            this.cpu.registers[dest.value] = addr >>> 0;
          } else if (src.type === "immediate") {
            this.cpu.registers[dest.value] = src.value;
          }
        }
        break;
      }

      case "MOVZX": {
        // MOVZX destination, source - Move with zero extension
        // Moves 8 or 16-bit value into 32-bit register, zero-extending
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register") {
          let srcValue: number;
          if (src.type === "register" || src.type === "register8") {
            // Treat source as 8-bit (low byte)
            srcValue = this.readRegisterValue(src as any) & 0xff;
          } else {
            srcValue = src.value & 0xff;
          }
          this.cpu.registers[dest.value] = srcValue; // Already zero-extended
        }
        break;
      }

      case "MOVSX": {
        // MOVSX destination, source - Move with sign extension
        // Moves 8 or 16-bit value into 32-bit register, sign-extending
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register") {
          let srcValue: number;
          if (src.type === "register" || src.type === "register8") {
            // Treat source as 8-bit (low byte)
            srcValue = this.readRegisterValue(src as any) & 0xff;
          } else {
            srcValue = src.value & 0xff;
          }
          // Sign extend from 8-bit to 32-bit
          if (srcValue & 0x80) {
            // Negative (bit 7 set)
            this.cpu.registers[dest.value] = srcValue | 0xffffff00;
          } else {
            // Positive
            this.cpu.registers[dest.value] = srcValue;
          }
        }
        break;
      }

      case "ADD": {
        // ADD destination, source
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register") {
          let srcValue: number;
          if (src.type === "register") {
            srcValue = this.cpu.registers[src.value];
          } else if (src.type === "memory") {
            const addr =
              (this.cpu.registers[src.base!] + (src.offset || 0)) & 0xffff;
            srcValue = this.readMemory32(addr);
          } else {
            srcValue = src.value;
          }
          const destVal = this.cpu.registers[dest.value];
          const result = (destVal + srcValue) & 0xffffffff;
          this.cpu.registers[dest.value] = result;
          this.updateFlagsArith(result, destVal, srcValue, false);
        }
        break;
      }

      case "SUB": {
        // SUB destination, source
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register") {
          let srcValue: number;
          if (src.type === "register") {
            srcValue = this.cpu.registers[src.value];
          } else if (src.type === "memory") {
            const addr =
              (this.cpu.registers[src.base!] + (src.offset || 0)) & 0xffff;
            srcValue = this.readMemory32(addr);
          } else {
            srcValue = src.value;
          }
          const destVal = this.cpu.registers[dest.value];
          const result = (destVal - srcValue) & 0xffffffff;
          this.cpu.registers[dest.value] = result;
          this.updateFlagsArith(result, destVal, srcValue, true);
        }
        break;
      }

      case "INC": {
        // INC destination - per x86, INC preserves CF
        if (operands.length !== 1) break;
        const dest = this.parseOperand(operands[0]);

        if (dest.type === "register") {
          const destVal = this.cpu.registers[dest.value];
          const result = (destVal + 1) & 0xffffffff;
          this.cpu.registers[dest.value] = result;
          // INC preserves carry flag per x86 spec
          const savedCarry = this.cpu.flags & 0x01;
          this.updateFlagsArith(result, destVal, 1, false);
          this.cpu.flags = (this.cpu.flags & ~0x01) | savedCarry;
        }
        break;
      }

      case "DEC": {
        // DEC destination - per x86, DEC preserves CF
        if (operands.length !== 1) break;
        const dest = this.parseOperand(operands[0]);

        if (dest.type === "register") {
          const destVal = this.cpu.registers[dest.value];
          const result = (destVal - 1) & 0xffffffff;
          this.cpu.registers[dest.value] = result;
          // DEC preserves carry flag per x86 spec
          const savedCarry = this.cpu.flags & 0x01;
          this.updateFlagsArith(result, destVal, 1, true);
          this.cpu.flags = (this.cpu.flags & ~0x01) | savedCarry;
        }
        break;
      }

      case "MUL": {
        // MUL source - Unsigned multiply (EAX * source -> EDX:EAX)
        // Simplified: result in EAX only (lower 32 bits)
        if (operands.length !== 1) break;
        const src = this.parseOperand(operands[0]);

        const srcValue =
          src.type === "register" ? this.cpu.registers[src.value] : src.value;
        const result = (this.cpu.registers[0] >>> 0) * (srcValue >>> 0);
        // Store lower 32 bits in EAX, upper 32 bits in EDX
        this.cpu.registers[0] = (result & 0xffffffff) >>> 0;
        this.cpu.registers[2] = ((result / 0x100000000) & 0xffffffff) >>> 0; // EDX
        this.updateFlags(this.cpu.registers[0]);
        break;
      }

      case "IMUL": {
        // IMUL - Signed multiply (supports 1, 2, and 3 operand forms per x86 spec)
        if (operands.length === 1) {
          // Single operand: EAX * src -> EDX:EAX
          const src = this.parseOperand(operands[0]);
          const srcValue =
            src.type === "register" ? this.cpu.registers[src.value] : src.value;
          const eaxSigned = this.cpu.registers[0] | 0;
          const srcSigned = srcValue | 0;
          const result = eaxSigned * srcSigned;
          this.cpu.registers[0] = (result & 0xffffffff) >>> 0;
          this.cpu.registers[2] = ((result / 0x100000000) | 0) >>> 0; // EDX
          this.updateFlags(this.cpu.registers[0]);
        } else if (operands.length === 2) {
          // Two operand: dest = dest * src (result in dest register)
          const dest = this.parseOperand(operands[0]);
          const src = this.parseOperand(operands[1]);
          if (dest.type !== "register") break;
          const destSigned = this.cpu.registers[dest.value] | 0;
          let srcValue: number;
          if (src.type === "register") {
            srcValue = this.cpu.registers[src.value] | 0;
          } else if (src.type === "memory") {
            const addr =
              (this.cpu.registers[src.base!] + (src.offset || 0)) & 0xffff;
            srcValue = this.readMemory32(addr) | 0;
          } else {
            srcValue = src.value | 0;
          }
          const result = destSigned * srcValue;
          this.cpu.registers[dest.value] = (result & 0xffffffff) >>> 0;
          this.updateFlags(this.cpu.registers[dest.value]);
        } else if (operands.length === 3) {
          // Three operand: dest = src * constant
          const dest = this.parseOperand(operands[0]);
          const src = this.parseOperand(operands[1]);
          const con = this.parseOperand(operands[2]);
          if (dest.type !== "register") break;
          let srcValue: number;
          if (src.type === "register") {
            srcValue = this.cpu.registers[src.value] | 0;
          } else if (src.type === "memory") {
            const addr =
              (this.cpu.registers[src.base!] + (src.offset || 0)) & 0xffff;
            srcValue = this.readMemory32(addr) | 0;
          } else {
            srcValue = src.value | 0;
          }
          const constValue = con.value | 0;
          const result = srcValue * constValue;
          this.cpu.registers[dest.value] = (result & 0xffffffff) >>> 0;
          this.updateFlags(this.cpu.registers[dest.value]);
        }
        break;
      }

      case "DIV": {
        // DIV source - Unsigned divide (EDX:EAX / source -> quotient in EAX, remainder in EDX)
        // Simplified: EAX / source -> quotient in EAX, remainder in EDX
        if (operands.length !== 1) break;
        const src = this.parseOperand(operands[0]);

        const srcValue =
          src.type === "register" ? this.cpu.registers[src.value] : src.value;
        if (srcValue === 0) {
          // Division by zero - in real x86 this would trigger an exception
          // For simplicity, we'll just set result to 0
          this.cpu.registers[0] = 0;
          this.cpu.registers[2] = 0;
        } else {
          const dividend = this.cpu.registers[0] >>> 0;
          const divisor = srcValue >>> 0;
          this.cpu.registers[0] = Math.floor(dividend / divisor) >>> 0; // Quotient
          this.cpu.registers[2] = (dividend % divisor) >>> 0; // Remainder
        }
        this.updateFlags(this.cpu.registers[0]);
        break;
      }

      case "IDIV": {
        // IDIV source - Signed divide
        if (operands.length !== 1) break;
        const src = this.parseOperand(operands[0]);

        const srcValue =
          src.type === "register" ? this.cpu.registers[src.value] : src.value;
        const divisor = srcValue | 0;

        if (divisor === 0) {
          // Division by zero
          this.cpu.registers[0] = 0;
          this.cpu.registers[2] = 0;
        } else {
          const dividend = this.cpu.registers[0] | 0;
          this.cpu.registers[0] = Math.trunc(dividend / divisor) >>> 0; // Quotient
          this.cpu.registers[2] = (dividend % divisor) >>> 0; // Remainder
        }
        this.updateFlags(this.cpu.registers[0]);
        break;
      }

      case "MOD": {
        // MOD dest, src - Modulo operation (dest = dest % src)
        // Educational instruction for easier modulo calculations
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type !== "register") break;

        const srcValue =
          src.type === "register" ? this.cpu.registers[src.value] : src.value;

        if (srcValue === 0) {
          // Modulo by zero - set to 0
          this.cpu.registers[dest.value] = 0;
        } else {
          const destValue = this.cpu.registers[dest.value] >>> 0;
          const modValue = srcValue >>> 0;
          this.cpu.registers[dest.value] = (destValue % modValue) >>> 0;
        }
        this.updateFlags(this.cpu.registers[dest.value]);
        break;
      }

      case "CMP": {
        // CMP destination, source - SUB without storing result, per x86 spec
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register") {
          const destValue = this.cpu.registers[dest.value];
          const srcValue =
            src.type === "register" ? this.cpu.registers[src.value] : src.value;
          const result = (destValue - srcValue) & 0xffffffff;
          this.updateFlagsArith(result, destValue, srcValue, true);
        }
        break;
      }

      case "AND": {
        // AND destination, source
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register") {
          const srcValue =
            src.type === "register" ? this.cpu.registers[src.value] : src.value;
          this.cpu.registers[dest.value] =
            this.cpu.registers[dest.value] & srcValue & 0xffffffff;
          this.updateFlags(this.cpu.registers[dest.value]);
        }
        break;
      }

      case "OR": {
        // OR destination, source
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register") {
          const srcValue =
            src.type === "register" ? this.cpu.registers[src.value] : src.value;
          this.cpu.registers[dest.value] =
            (this.cpu.registers[dest.value] | srcValue) & 0xffffffff;
          this.updateFlags(this.cpu.registers[dest.value]);
        }
        break;
      }

      case "XOR": {
        // XOR destination, source
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register") {
          const srcValue =
            src.type === "register" ? this.cpu.registers[src.value] : src.value;
          this.cpu.registers[dest.value] =
            (this.cpu.registers[dest.value] ^ srcValue) & 0xffffffff;
          this.updateFlags(this.cpu.registers[dest.value]);
        }
        break;
      }

      case "NOT": {
        // NOT destination - Bitwise NOT (one's complement)
        if (operands.length !== 1) break;
        const dest = this.parseOperand(operands[0]);

        if (dest.type === "register") {
          this.cpu.registers[dest.value] =
            ~this.cpu.registers[dest.value] & 0xffffffff;
          // NOT does not affect flags in x86
        }
        break;
      }

      case "NEG": {
        // NEG destination - Two's complement negation
        // Per x86: CF set unless operand is 0; OF set if operand is 0x80000000
        if (operands.length !== 1) break;
        const dest = this.parseOperand(operands[0]);

        if (dest.type === "register") {
          const destVal = this.cpu.registers[dest.value];
          const result = -destVal & 0xffffffff;
          this.cpu.registers[dest.value] = result;
          this.updateFlagsArith(result, 0, destVal, true);
        }
        break;
      }

      case "TEST": {
        // TEST destination, source - Logical AND (affects flags only)
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register") {
          const destValue = this.cpu.registers[dest.value];
          const srcValue =
            src.type === "register" ? this.cpu.registers[src.value] : src.value;
          const result = destValue & srcValue & 0xffffffff;
          this.updateFlags(result);
        }
        break;
      }

      case "SHL": {
        // SHL destination, count - Shift left
        // Per x86 spec: shift counts > 31 are performed modulo 32
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register") {
          const count =
            (src.type === "register"
              ? this.cpu.registers[src.value]
              : src.value) & 0x1f;
          this.cpu.registers[dest.value] =
            (this.cpu.registers[dest.value] << count) & 0xffffffff;
          this.updateFlags(this.cpu.registers[dest.value]);
        }
        break;
      }

      case "SHR": {
        // SHR destination, count - Shift right (logical)
        // Per x86 spec: shift counts > 31 are performed modulo 32
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register") {
          const count =
            (src.type === "register"
              ? this.cpu.registers[src.value]
              : src.value) & 0x1f;
          this.cpu.registers[dest.value] =
            (this.cpu.registers[dest.value] >>> count) & 0xffffffff;
          this.updateFlags(this.cpu.registers[dest.value]);
        }
        break;
      }

      case "SAR": {
        // SAR destination, count - Shift arithmetic right (preserves sign)
        // Per x86 spec: shift counts > 31 are performed modulo 32
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register") {
          const count =
            (src.type === "register"
              ? this.cpu.registers[src.value]
              : src.value) & 0x1f;
          // Convert to signed, shift, then back to unsigned
          this.cpu.registers[dest.value] =
            ((this.cpu.registers[dest.value] | 0) >> count) >>> 0;
          this.updateFlags(this.cpu.registers[dest.value]);
        }
        break;
      }

      case "ROL": {
        // ROL destination, count - Rotate left
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register") {
          const count =
            (src.type === "register"
              ? this.cpu.registers[src.value]
              : src.value) & 0x1f;
          const value = this.cpu.registers[dest.value];
          this.cpu.registers[dest.value] =
            ((value << count) | (value >>> (32 - count))) & 0xffffffff;
          this.updateFlags(this.cpu.registers[dest.value]);
        }
        break;
      }

      case "ROR": {
        // ROR destination, count - Rotate right
        if (operands.length !== 2) break;
        const dest = this.parseOperand(operands[0]);
        const src = this.parseOperand(operands[1]);

        if (dest.type === "register") {
          const count =
            (src.type === "register"
              ? this.cpu.registers[src.value]
              : src.value) & 0x1f;
          const value = this.cpu.registers[dest.value];
          this.cpu.registers[dest.value] =
            ((value >>> count) | (value << (32 - count))) & 0xffffffff;
          this.updateFlags(this.cpu.registers[dest.value]);
        }
        break;
      }

      case "NOP": {
        // NOP - No operation, does nothing
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

      case "JG": {
        // JG label - Jump if greater (signed): SF == OF and ZF == 0
        break;
      }

      case "JGE": {
        // JGE label - Jump if greater or equal (signed): SF == OF
        break;
      }

      case "JL": {
        // JL label - Jump if less (signed): SF != OF
        break;
      }

      case "JLE": {
        // JLE label - Jump if less or equal (signed): SF != OF or ZF == 1
        break;
      }

      case "JS": {
        // JS label - Jump if sign flag set
        break;
      }

      case "JNS": {
        // JNS label - Jump if sign flag not set
        break;
      }

      case "JA": {
        // JA label - Jump if above (unsigned): CF == 0 and ZF == 0
        break;
      }

      case "JAE": {
        // JAE label - Jump if above or equal (unsigned): CF == 0
        break;
      }

      case "JB": {
        // JB label - Jump if below (unsigned): CF == 1
        break;
      }

      case "JBE": {
        // JBE label - Jump if below or equal (unsigned): CF == 1 or ZF == 1
        break;
      }

      case "PUSH": {
        // PUSH reg/imm - Push register or immediate value onto stack
        if (operands.length !== 1) break;
        const src = this.parseOperand(operands[0]);

        let value: number;
        if (src.type === "register" || src.type === "register8") {
          value = this.readRegisterValue(src as any);
        } else if (src.type === "immediate") {
          value = src.value;
        } else if (src.type === "memory") {
          const addr =
            (this.cpu.registers[src.base!] + (src.offset || 0)) & 0xffff;
          value = this.readMemory32(addr);
        } else {
          break;
        }

        this.pushStack(value);
        break;
      }

      case "POP": {
        // POP reg - Pop from stack into register
        if (operands.length !== 1) break;
        const dest = this.parseOperand(operands[0]);

        if (dest.type === "register" || dest.type === "register8") {
          const value = this.popStack();
          this.writeRegisterValue(dest as any, value);
        }
        break;
      }

      case "CALL":
      case "RET": {
        // CALL/RET are handled by the debug adapter
        // The debug adapter manages both control flow (jumping to labels/return addresses)
        // and stack operations (via pushStack/popStack methods)
        // These cases are intentionally no-ops in executeInstruction
        break;
      }

      case "INT": {
        // INT num - Software interrupt: Handle software interrupt by executing the appropriate interrupt handler
        if (operands.length !== 1) break;
        const intNum = this.parseOperand(operands[0]);

        if (intNum.type === "immediate") {
          switch (intNum.value) {
            case 0x10: {
              // Video services - write character to console
              // AH = 0x0E: Write character in AL to console
              const ah = (this.cpu.registers[0] >> 8) & 0xff; // High byte of EAX
              const al = this.cpu.registers[0] & 0xff; // Low byte of EAX

              if (ah === 0x0e) {
                // Teletype output - write character
                this.consoleOutput += String.fromCharCode(al);
              }
              break;
            }

            case 0x20: {
              // Program terminate
              this.cpu.halted = true;
              this.cpu.running = false;
              break;
            }

            case 0x21: {
              // DOS-style services
              const ah = (this.cpu.registers[0] >> 8) & 0xff;

              switch (ah) {
                case 0x02: {
                  // Write character to stdout (DL contains character)
                  const dl = this.cpu.registers[2] & 0xff; // Low byte of EDX
                  this.consoleOutput += String.fromCharCode(dl);
                  break;
                }
                case 0x09: {
                  // Write string to stdout (would need pointer in EDX)
                  // Not fully implemented for now
                  break;
                }
              }
              break;
            }
          }
        }
        break;
      }

      case "IRET": {
        // IRET - Return from interrupt
        // In a full implementation, this would pop flags and return address
        // For now, this is a placeholder
        // The debug adapter may handle control flow
        break;
      }

      case "RAND": {
        // RAND dest, max - Generate random number from 0 to max-1, store in dest
        // Educational instruction for easier random number generation
        if (operands.length < 1) break;

        const dest = this.parseOperand(operands[0]);
        if (dest.type !== "register") break;

        let maxValue = 0xffffffff; // Default to full 32-bit range

        if (operands.length === 2) {
          const maxOp = this.parseOperand(operands[1]);
          maxValue =
            maxOp.type === "register"
              ? this.cpu.registers[maxOp.value]
              : maxOp.value;
        }

        if (maxValue <= 0) maxValue = 1; // Ensure positive max

        // Generate random number in range [0, maxValue)
        const randomValue = Math.floor(Math.random() * maxValue) >>> 0;
        this.cpu.registers[dest.value] = randomValue;
        this.updateFlags(randomValue);
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
   * Update CPU flags based on result (Zero and Sign only)
   * Used for logical operations that clear C and O flags.
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

    // Clear Carry and Overflow for logical operations
    this.cpu.flags &= ~0x01; // Clear Carry flag (bit 0)
    this.cpu.flags &= ~0x800; // Clear Overflow flag (bit 11)
  }

  /**
   * Update CPU flags based on arithmetic result with Carry and Overflow.
   * Per x86 specification (ref: UVA CS216 x86 Guide).
   * @param result - the masked 32-bit result
   * @param destVal - original destination value (unsigned)
   * @param srcVal - source value (unsigned)
   * @param isSubtraction - true for SUB/CMP/DEC/NEG operations
   */
  private updateFlagsArith(
    result: number,
    destVal: number,
    srcVal: number,
    isSubtraction: boolean,
  ): void {
    const result32 = result >>> 0;
    const dest32 = destVal >>> 0;
    const src32 = srcVal >>> 0;

    // Zero flag (bit 6)
    if (result32 === 0) {
      this.cpu.flags |= 0x40;
    } else {
      this.cpu.flags &= ~0x40;
    }

    // Sign flag (bit 7)
    if ((result32 & 0x80000000) !== 0) {
      this.cpu.flags |= 0x80;
    } else {
      this.cpu.flags &= ~0x80;
    }

    // Carry flag (bit 0) - unsigned overflow/borrow
    if (isSubtraction) {
      // CF set if borrow: unsigned src > unsigned dest
      if (src32 > dest32) {
        this.cpu.flags |= 0x01;
      } else {
        this.cpu.flags &= ~0x01;
      }
    } else {
      // CF set if result wrapped (unsigned overflow)
      if (result32 < dest32) {
        this.cpu.flags |= 0x01;
      } else {
        this.cpu.flags &= ~0x01;
      }
    }

    // Overflow flag (bit 11) - signed overflow
    const destSign = (dest32 & 0x80000000) !== 0;
    const srcSign = (src32 & 0x80000000) !== 0;
    const resultSign = (result32 & 0x80000000) !== 0;
    if (isSubtraction) {
      // Overflow if: positive - negative = negative, or negative - positive = positive
      if (destSign !== srcSign && resultSign !== destSign) {
        this.cpu.flags |= 0x800;
      } else {
        this.cpu.flags &= ~0x800;
      }
    } else {
      // Overflow if: positive + positive = negative, or negative + negative = positive
      if (destSign === srcSign && resultSign !== destSign) {
        this.cpu.flags |= 0x800;
      } else {
        this.cpu.flags &= ~0x800;
      }
    }
  }

  /**
   * Check if the Carry flag (CF, bit 0) is set
   */
  isCarryFlagSet(): boolean {
    return (this.cpu.flags & 0x01) !== 0;
  }

  /**
   * Check if the Zero flag (ZF, bit 6) is set
   */
  isZeroFlagSet(): boolean {
    return (this.cpu.flags & 0x40) !== 0;
  }

  /**
   * Check if the Sign flag (SF, bit 7) is set
   */
  isSignFlagSet(): boolean {
    return (this.cpu.flags & 0x80) !== 0;
  }

  /**
   * Check if the Overflow flag (OF, bit 11) is set
   */
  isOverflowFlagSet(): boolean {
    return (this.cpu.flags & 0x800) !== 0;
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
    this.keyboard.clear();
    this.consoleOutput = "";
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

  /**
   * Push a keyboard event
   */
  pushKeyboardEvent(keyCode: number, pressed: boolean): void {
    this.keyboard.pushKey(keyCode, pressed);
  }

  /**
   * Get keyboard status
   */
  getKeyboardStatus(): { status: number; keyCode: number; keyState: number } {
    return {
      status: this.keyboard.getStatus(),
      keyCode: this.keyboard.getKeyCode(),
      keyState: this.keyboard.getKeyState(),
    };
  }

  /**
   * Get console output (from INT 0x10 and INT 0x21)
   */
  getConsoleOutput(): string {
    return this.consoleOutput;
  }

  /**
   * Clear console output buffer
   */
  clearConsoleOutput(): void {
    this.consoleOutput = "";
  }

  addBreakpoint(address: number): void {
    this.cpu.addBreakpoint(address);
  }

  removeBreakpoint(address: number): void {
    this.cpu.removeBreakpoint(address);
  }

  /**
   * Get the current compatibility mode
   */
  getCompatibilityMode(): CompatibilityMode {
    return this.compatibilityMode;
  }

  /**
   * Set the compatibility mode
   */
  setCompatibilityMode(mode: CompatibilityMode): void {
    this.compatibilityMode = mode;
  }
}
