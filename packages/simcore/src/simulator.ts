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
 * TonX86 Simulator - main execution engine
 */
export class Simulator {
  private cpu: CPUState;
  private memory: Memory;
  private lcd: LCDDisplay;
  private keyboard: Keyboard;
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
    this.keyboard = new Keyboard();
    // Initialize ESP to top of stack
    this.cpu.registers[4] = 0xffff;
  }

  /**
   * Read from memory-mapped I/O addresses
   * 0xF100: Keyboard status register
   * 0xF101: Keyboard key code register
   * 0xF102: Keyboard key state register
   */
  private readIO(address: number): number {
    const IO_KEYBOARD_STATUS = 0xf100;
    const IO_KEYBOARD_KEYCODE = 0xf101;
    const IO_KEYBOARD_KEYSTATE = 0xf102;

    if (address === IO_KEYBOARD_STATUS) {
      return this.keyboard.getStatus();
    } else if (address === IO_KEYBOARD_KEYCODE) {
      // Reading key code pops the key from queue
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
   * 0xF000-0xF0FF: LCD display
   * 0xF100-0xF1FF: Keyboard (read-only, writes ignored)
   */
  private writeIO(address: number, value: number): void {
    const IO_LCD_BASE = 0xf000;
    const IO_KEYBOARD_BASE = 0xf100;
    const lcdSize = this.lcd["width"] * this.lcd["height"];

    if (address >= IO_LCD_BASE && address < IO_LCD_BASE + lcdSize) {
      // LCD pixel write
      const pixelIndex = address - IO_LCD_BASE;
      const width = this.lcd["width"];
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);

      if (x >= width || y >= this.lcd["height"]) {
        throw new Error(
          `LCD write overflow: address 0x${address.toString(16)} out of bounds (${width}x${this.lcd["height"]})`,
        );
      }

      this.lcd.setPixel(x, y, value);
    } else if (
      address >= IO_KEYBOARD_BASE &&
      address < IO_KEYBOARD_BASE + 0x100
    ) {
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
   * Parse a register name or immediate value
   */
  private parseOperand(operand: string): {
    type: "register" | "immediate";
    value: number;
  } {
    operand = operand.trim().toUpperCase();

    // Check if it's a register
    if (Object.prototype.hasOwnProperty.call(this.registerMap, operand)) {
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

        // Get source value
        let srcValue: number;
        if (src.type === "register") {
          srcValue = this.cpu.registers[src.value];
        } else {
          // Check if source is an I/O address (0xF000+)
          if (src.value >= 0xf000) {
            srcValue = this.readIO(src.value);
          } else {
            srcValue = src.value;
          }
        }

        // Handle destination
        if (dest.type === "register") {
          this.cpu.registers[dest.value] = srcValue;
        } else if (dest.type === "immediate") {
          // destination is an I/O address
          this.writeIO(dest.value, srcValue);
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

      case "PUSH": {
        // PUSH reg - Push register onto stack
        if (operands.length !== 1) break;
        const src = this.parseOperand(operands[0]);

        if (src.type === "register") {
          const value = this.cpu.registers[src.value];
          this.pushStack(value);
        }
        break;
      }

      case "POP": {
        // POP reg - Pop from stack into register
        if (operands.length !== 1) break;
        const dest = this.parseOperand(operands[0]);

        if (dest.type === "register") {
          const value = this.popStack();
          this.cpu.registers[dest.value] = value;
        }
        break;
      }

      case "CALL": {
        // CALL label - Push return address, jump to label
        // Note: The actual jump is handled by the debug adapter for label resolution
        // The simulator only manages the stack operation
        if (operands.length !== 1) break;
        
        // CALL is typically followed by pushing a return address
        // However, since the debug adapter handles the control flow,
        // this is a no-op in the simulator. The debug adapter will
        // directly call pushStack() when needed.
        break;
      }

      case "RET": {
        // RET - Pop return address, jump to it
        // Note: The actual jump is handled by the debug adapter
        // The simulator only manages the stack operation
        // The debug adapter will directly call popStack() when needed.
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
    this.keyboard.clear();
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

  addBreakpoint(address: number): void {
    this.cpu.addBreakpoint(address);
  }

  removeBreakpoint(address: number): void {
    this.cpu.removeBreakpoint(address);
  }
}
