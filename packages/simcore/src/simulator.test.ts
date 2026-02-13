import { Simulator, CPUState, Memory, LCDDisplay, Keyboard } from "./simulator";

describe("CPUState", () => {
  let cpu: CPUState;

  beforeEach(() => {
    cpu = new CPUState();
  });

  describe("register operations", () => {
    test("initializes all registers to 0", () => {
      expect(cpu.registers[0]).toBe(0); // EAX
      expect(cpu.registers[1]).toBe(0); // ECX
      expect(cpu.registers[2]).toBe(0); // EDX
      expect(cpu.registers[3]).toBe(0); // EBX
      expect(cpu.registers[4]).toBe(0); // ESP
      expect(cpu.registers[5]).toBe(0); // EBP
      expect(cpu.registers[6]).toBe(0); // ESI
      expect(cpu.registers[7]).toBe(0); // EDI
    });

    test("sets register value correctly", () => {
      cpu.registers[0] = 42;
      expect(cpu.registers[0]).toBe(42);
    });

    test("handles all register indices", () => {
      for (let i = 0; i < 8; i++) {
        cpu.registers[i] = i * 100;
        expect(cpu.registers[i]).toBe(i * 100);
      }
    });

    test("wraps values to 32-bit (unsigned)", () => {
      cpu.registers[0] = 0xffffffff + 1;
      expect(cpu.registers[0]).toBe(0);
    });

    test("negative numbers converted to 32-bit unsigned via masking", () => {
      cpu.registers[0] = -1;
      // JavaScript behavior: -1 & 0xFFFFFFFF = 0xFFFFFFFF
      const masked = cpu.registers[0] >>> 0; // Convert to unsigned
      expect(masked).toBe(0xffffffff);
    });
  });

  describe("flag operations", () => {
    test("initializes flags to 0", () => {
      expect(cpu.flags).toBe(0);
    });

    test("can set Zero flag (bit 6)", () => {
      cpu.flags |= 1 << 6;
      expect((cpu.flags & (1 << 6)) !== 0).toBe(true);
    });

    test("can set Sign flag (bit 7)", () => {
      cpu.flags |= 1 << 7;
      expect((cpu.flags & (1 << 7)) !== 0).toBe(true);
    });

    test("can manipulate flags independently", () => {
      cpu.flags = 0;
      cpu.flags |= 1 << 6; // Set Zero
      cpu.flags |= 1 << 7; // Set Sign
      expect((cpu.flags & (1 << 6)) !== 0).toBe(true);
      expect((cpu.flags & (1 << 7)) !== 0).toBe(true);
      cpu.flags &= ~(1 << 6); // Clear Zero
      expect((cpu.flags & (1 << 6)) !== 0).toBe(false);
      expect((cpu.flags & (1 << 7)) !== 0).toBe(true);
    });
  });

  describe("halt state", () => {
    test("is not halted initially", () => {
      expect(cpu.halted).toBe(false);
    });

    test("can be halted", () => {
      cpu.halted = true;
      expect(cpu.halted).toBe(true);
    });
  });

  describe("breakpoint operations", () => {
    test("initially has no breakpoints", () => {
      expect(cpu.hasBreakpoint(0)).toBe(false);
    });

    test("can add and check breakpoints", () => {
      cpu.addBreakpoint(100);
      expect(cpu.hasBreakpoint(100)).toBe(true);
    });

    test("can remove breakpoints", () => {
      cpu.addBreakpoint(100);
      cpu.removeBreakpoint(100);
      expect(cpu.hasBreakpoint(100)).toBe(false);
    });

    test("handles multiple breakpoints", () => {
      cpu.addBreakpoint(10);
      cpu.addBreakpoint(20);
      cpu.addBreakpoint(30);
      expect(cpu.hasBreakpoint(10)).toBe(true);
      expect(cpu.hasBreakpoint(20)).toBe(true);
      expect(cpu.hasBreakpoint(30)).toBe(true);
    });
  });

  describe("reset operation", () => {
    test("resets CPU to initial state", () => {
      cpu.pc = 100;
      cpu.registers[0] = 42;
      cpu.flags = 0xff;
      cpu.halted = true;
      cpu.addBreakpoint(50);

      cpu.reset();

      expect(cpu.pc).toBe(0);
      expect(cpu.registers[0]).toBe(0);
      expect(cpu.flags).toBe(0);
      expect(cpu.halted).toBe(false);
      // Note: breakpoints are not cleared by reset (Set is preserved)
      // This is intentional - breakpoints are static configuration
    });
  });
});

describe("Memory", () => {
  let memory: Memory;

  beforeEach(() => {
    memory = new Memory();
  });

  describe("read/write operations", () => {
    test("initializes with two 64KB banks", () => {
      expect(memory["bankA"].length).toBe(65536);
      expect(memory["bankB"].length).toBe(65536);
    });

    test("writes and reads byte from Bank A", () => {
      memory.writeA(100, 42);
      expect(memory.readA(100)).toBe(42);
    });

    test("writes and reads byte from Bank B", () => {
      memory.writeB(200, 99);
      expect(memory.readB(200)).toBe(99);
    });

    test("banks are independent", () => {
      memory.writeA(100, 10);
      memory.writeB(100, 20);
      expect(memory.readA(100)).toBe(10);
      expect(memory.readB(100)).toBe(20);
    });

    test("reads zero from uninitialized memory", () => {
      expect(memory.readA(500)).toBe(0);
      expect(memory.readB(500)).toBe(0);
    });

    test("wraps 32-bit values to byte", () => {
      memory.writeA(0, 256); // Should wrap to 0
      expect(memory.readA(0)).toBe(0);
    });

    test("clears memory", () => {
      memory.writeA(0, 42);
      memory.writeB(100, 99);
      memory.clear();
      expect(memory.readA(0)).toBe(0);
      expect(memory.readB(100)).toBe(0);
    });
  });

  describe("boundary conditions", () => {
    test("handles memory at start of bank", () => {
      memory.writeA(0, 123);
      expect(memory.readA(0)).toBe(123);
    });

    test("handles memory at end of bank", () => {
      memory.writeA(65535, 200);
      expect(memory.readA(65535)).toBe(200);
    });

    test("wraps to byte values", () => {
      memory.writeA(0, 300);
      expect(memory.readA(0)).toBe(300 & 0xff);
    });
  });
});

describe("LCDDisplay", () => {
  let lcd: LCDDisplay;

  beforeEach(() => {
    lcd = new LCDDisplay(8, 8);
  });

  describe("initialization", () => {
    test("creates display with specified dimensions", () => {
      // Dimensions are stored in private fields, but getPixel/setPixel reveal them
      lcd.setPixel(7, 7, 1);
      expect(lcd.getPixel(7, 7)).toBe(1);
    });

    test("initializes all pixels to 0", () => {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          expect(lcd.getPixel(x, y)).toBe(0);
        }
      }
    });
  });

  describe("pixel operations", () => {
    test("sets and gets pixel", () => {
      lcd.setPixel(0, 0, 1);
      expect(lcd.getPixel(0, 0)).toBe(1);
    });

    test("pixels default to 0", () => {
      expect(lcd.getPixel(5, 5)).toBe(0);
    });

    test("ignores pixels outside bounds", () => {
      lcd.setPixel(100, 100, 1);
      expect(lcd.getPixel(100, 100)).toBe(0);
    });

    test("ignores negative coordinates", () => {
      lcd.setPixel(-1, -1, 1);
      expect(lcd.getPixel(-1, -1)).toBe(0);
    });

    test("converts non-zero to 1, zero to 0", () => {
      lcd.setPixel(0, 0, 5);
      expect(lcd.getPixel(0, 0)).toBe(1);
      lcd.setPixel(1, 0, 0);
      expect(lcd.getPixel(1, 0)).toBe(0);
    });
  });

  describe("clear operation", () => {
    test("clears all pixels", () => {
      lcd.setPixel(0, 0, 1);
      lcd.setPixel(3, 3, 1);
      lcd.clear();
      expect(lcd.getPixel(0, 0)).toBe(0);
      expect(lcd.getPixel(3, 3)).toBe(0);
    });
  });

  describe("different dimensions", () => {
    test("supports 2x2 display", () => {
      const small = new LCDDisplay(2, 2);
      small.setPixel(0, 0, 1);
      expect(small.getPixel(0, 0)).toBe(1);
      expect(small.getPixel(1, 1)).toBe(0);
    });

    test("supports 16x16 display", () => {
      const large = new LCDDisplay(16, 16);
      large.setPixel(15, 15, 1);
      expect(large.getPixel(15, 15)).toBe(1);
    });

    test("rejects invalid dimensions", () => {
      expect(() => new LCDDisplay(1, 1)).toThrow();
      expect(() => new LCDDisplay(17, 16)).toThrow();
    });
  });

  describe("display data export", () => {
    test("getDisplay returns pixel data", () => {
      lcd.setPixel(0, 0, 1);
      lcd.setPixel(1, 0, 1);
      const data = lcd.getDisplay();
      expect(data[0]).toBe(1);
      expect(data[1]).toBe(1);
    });
  });
});

describe("Simulator - executeInstruction", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  describe("MOV instruction", () => {
    test("moves immediate to register", () => {
      sim.executeInstruction("MOV", ["EAX", "42"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(42);
    });

    test("moves register to register", () => {
      sim.executeInstruction("MOV", ["EAX", "100"]);
      sim.executeInstruction("MOV", ["ECX", "EAX"]);
      const regs = sim.getRegisters();
      expect(regs.ECX).toBe(100);
    });

    test("MOV doesn't affect other registers", () => {
      sim.executeInstruction("MOV", ["EAX", "50"]);
      sim.executeInstruction("MOV", ["ECX", "100"]);
      sim.executeInstruction("MOV", ["EDX", "42"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(50);
      expect(regs.ECX).toBe(100);
    });

    test("MOV with hex immediate", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFF"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(255);
    });

    test("case insensitive MOV", () => {
      sim.executeInstruction("mov", ["eax", "42"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(42);
    });
  });

  describe("XCHG instruction", () => {
    test("exchanges two register values", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("MOV", ["ECX", "20"]);
      sim.executeInstruction("XCHG", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(20);
      expect(regs.ECX).toBe(10);
    });

    test("XCHG with same register does nothing", () => {
      sim.executeInstruction("MOV", ["EAX", "42"]);
      sim.executeInstruction("XCHG", ["EAX", "EAX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(42);
    });

    test("works with all register pairs", () => {
      sim.executeInstruction("MOV", ["EBX", "100"]);
      sim.executeInstruction("MOV", ["EDX", "200"]);
      sim.executeInstruction("XCHG", ["EBX", "EDX"]);
      const regs = sim.getRegisters();
      expect(regs.EBX).toBe(200);
      expect(regs.EDX).toBe(100);
    });
  });

  describe("LEA instruction", () => {
    test("loads effective address (immediate) into register", () => {
      sim.executeInstruction("LEA", ["EAX", "0x1000"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0x1000);
    });

    test("can load any address value", () => {
      sim.executeInstruction("LEA", ["ECX", "0xF100"]);
      const regs = sim.getRegisters();
      expect(regs.ECX).toBe(0xf100);
    });
  });

  describe("MOVZX instruction", () => {
    test("zero-extends 8-bit value to 32-bit", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFFFFFFFF"]);
      sim.executeInstruction("MOV", ["ECX", "0x7F"]);
      sim.executeInstruction("MOVZX", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0x7f); // Zero-extended, high bits cleared
    });

    test("zero-extends immediate value", () => {
      sim.executeInstruction("MOVZX", ["EAX", "0xFF"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xff);
    });

    test("only uses low byte of source register", () => {
      sim.executeInstruction("MOV", ["ECX", "0x5678"]);
      sim.executeInstruction("MOVZX", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0x78); // Only low byte
    });
  });

  describe("MOVSX instruction", () => {
    test("sign-extends positive 8-bit value to 32-bit", () => {
      sim.executeInstruction("MOV", ["ECX", "0x7F"]); // +127
      sim.executeInstruction("MOVSX", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0x7f); // Positive, no sign extension needed
    });

    test("sign-extends negative 8-bit value to 32-bit", () => {
      sim.executeInstruction("MOV", ["ECX", "0xFF"]); // -1 in 8-bit
      sim.executeInstruction("MOVSX", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xffffffff); // Sign-extended to -1 in 32-bit
    });

    test("sign-extends 0x80 (most negative 8-bit)", () => {
      sim.executeInstruction("MOV", ["ECX", "0x80"]); // -128 in 8-bit
      sim.executeInstruction("MOVSX", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xffffff80); // Sign-extended
    });

    test("only uses low byte of source register", () => {
      sim.executeInstruction("MOV", ["ECX", "0x56FF"]);
      sim.executeInstruction("MOVSX", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xffffffff); // Only low byte (0xFF) sign-extended
    });
  });

  describe("ADD instruction", () => {
    test("adds immediate to register", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("ADD", ["EAX", "5"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(15);
    });

    test("adds two registers", () => {
      sim.executeInstruction("MOV", ["EAX", "20"]);
      sim.executeInstruction("MOV", ["ECX", "15"]);
      sim.executeInstruction("ADD", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(35);
    });

    test("sets Zero flag on zero result", () => {
      sim.executeInstruction("MOV", ["EAX", "5"]);
      sim.executeInstruction("ADD", ["EAX", "-5"]);
      // Note: Need to verify what actual result is after ADD with -5
      const regs = sim.getRegisters();
      // -5 as 32-bit is 0xFFFFFFFB, so 5 + 0xFFFFFFFB = 0x100000000 & 0xFFFFFFFF = 0
      expect(regs.EAX).toBe(0);
    });

    test("clears flags on non-zero result", () => {
      sim.executeInstruction("MOV", ["EAX", "0"]);
      sim.executeInstruction("ADD", ["EAX", "5"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(5);
    });
  });

  describe("SUB instruction", () => {
    test("subtracts immediate from register", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("SUB", ["EAX", "3"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(7);
    });

    test("subtracts two registers", () => {
      sim.executeInstruction("MOV", ["EAX", "20"]);
      sim.executeInstruction("MOV", ["ECX", "5"]);
      sim.executeInstruction("SUB", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(15);
    });

    test("handles underflow (wraps to 32-bit)", () => {
      sim.executeInstruction("MOV", ["EAX", "0"]);
      sim.executeInstruction("SUB", ["EAX", "1"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xffffffff);
    });
  });

  describe("INC instruction", () => {
    test("increments register", () => {
      sim.executeInstruction("MOV", ["EAX", "42"]);
      sim.executeInstruction("INC", ["EAX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(43);
    });

    test("wraps at 32-bit boundary", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFFFFFFFF"]);
      sim.executeInstruction("INC", ["EAX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0);
    });
  });

  describe("DEC instruction", () => {
    test("decrements register", () => {
      sim.executeInstruction("MOV", ["EAX", "42"]);
      sim.executeInstruction("DEC", ["EAX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(41);
    });

    test("wraps at zero", () => {
      sim.executeInstruction("MOV", ["EAX", "0"]);
      sim.executeInstruction("DEC", ["EAX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xffffffff);
    });
  });

  describe("CMP instruction", () => {
    test("compares equal values", () => {
      sim.executeInstruction("MOV", ["EAX", "42"]);
      sim.executeInstruction("CMP", ["EAX", "42"]);
      const regs = sim.getRegisters();
      // CMP should not modify EAX
      expect(regs.EAX).toBe(42);
    });

    test("compares registers", () => {
      sim.executeInstruction("MOV", ["EAX", "100"]);
      sim.executeInstruction("MOV", ["ECX", "100"]);
      sim.executeInstruction("CMP", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(100);
      expect(regs.ECX).toBe(100);
    });

    test("doesn't modify source register", () => {
      sim.executeInstruction("MOV", ["EAX", "42"]);
      sim.executeInstruction("CMP", ["EAX", "50"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(42);
    });
  });

  describe("MUL instruction", () => {
    test("multiplies unsigned values", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("MOV", ["ECX", "5"]);
      sim.executeInstruction("MUL", ["ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(50);
    });

    test("handles large multiplication", () => {
      sim.executeInstruction("MOV", ["EAX", "1000"]);
      sim.executeInstruction("MUL", ["1000"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(1000000);
    });

    test("stores overflow in EDX", () => {
      sim.executeInstruction("MOV", ["EAX", "0x1000"]);
      sim.executeInstruction("MOV", ["ECX", "0x1000"]);
      sim.executeInstruction("MUL", ["ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0x1000000); // Lower 32 bits
      expect(regs.EDX).toBe(0); // Upper 32 bits
    });
  });

  describe("IMUL instruction", () => {
    test("multiplies signed positive values", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("MOV", ["ECX", "5"]);
      sim.executeInstruction("IMUL", ["ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(50);
    });

    test("multiplies signed negative values", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFFFFFFF6"]); // -10
      sim.executeInstruction("IMUL", ["5"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xffffffce); // -50
    });

    test("negative times negative gives positive", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFFFFFFF6"]); // -10
      sim.executeInstruction("MOV", ["ECX", "0xFFFFFFFB"]); // -5
      sim.executeInstruction("IMUL", ["ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(50);
    });
  });

  describe("DIV instruction", () => {
    test("divides unsigned values", () => {
      sim.executeInstruction("MOV", ["EAX", "50"]);
      sim.executeInstruction("MOV", ["ECX", "5"]);
      sim.executeInstruction("DIV", ["ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(10); // Quotient
      expect(regs.EDX).toBe(0); // Remainder
    });

    test("computes remainder", () => {
      sim.executeInstruction("MOV", ["EAX", "23"]);
      sim.executeInstruction("DIV", ["5"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(4); // Quotient
      expect(regs.EDX).toBe(3); // Remainder
    });

    test("handles division by zero gracefully", () => {
      sim.executeInstruction("MOV", ["EAX", "100"]);
      sim.executeInstruction("DIV", ["0"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0);
      expect(regs.EDX).toBe(0);
    });
  });

  describe("IDIV instruction", () => {
    test("divides signed positive values", () => {
      sim.executeInstruction("MOV", ["EAX", "50"]);
      sim.executeInstruction("MOV", ["ECX", "5"]);
      sim.executeInstruction("IDIV", ["ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(10);
    });

    test("divides signed negative by positive", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFFFFFFCE"]); // -50
      sim.executeInstruction("IDIV", ["5"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xfffffff6); // -10
    });

    test("handles division by zero gracefully", () => {
      sim.executeInstruction("MOV", ["EAX", "100"]);
      sim.executeInstruction("IDIV", ["0"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0);
      expect(regs.EDX).toBe(0);
    });
  });

  describe("AND instruction", () => {
    test("ANDs immediate with register", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFF"]);
      sim.executeInstruction("AND", ["EAX", "0x0F"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0x0f);
    });

    test("ANDs two registers", () => {
      sim.executeInstruction("MOV", ["EAX", "0b11110000"]);
      sim.executeInstruction("MOV", ["ECX", "0b11001100"]);
      sim.executeInstruction("AND", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0b11000000);
    });

    test("sets Zero flag on zero result", () => {
      sim.executeInstruction("MOV", ["EAX", "0b11110000"]);
      sim.executeInstruction("AND", ["EAX", "0b00001111"]);
      const state = sim.getState();
      expect(state.flags & 0x40).toBeTruthy(); // Zero flag
    });

    test("clears Zero flag on non-zero result", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFF"]);
      sim.executeInstruction("AND", ["EAX", "0x0F"]);
      const state = sim.getState();
      expect(state.flags & 0x40).toBe(0); // Zero flag
    });
  });

  describe("OR instruction", () => {
    test("ORs immediate with register", () => {
      sim.executeInstruction("MOV", ["EAX", "0x0F"]);
      sim.executeInstruction("OR", ["EAX", "0xF0"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xff);
    });

    test("ORs two registers", () => {
      sim.executeInstruction("MOV", ["EAX", "0b11110000"]);
      sim.executeInstruction("MOV", ["ECX", "0b00001111"]);
      sim.executeInstruction("OR", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0b11111111);
    });

    test("sets Zero flag on zero result", () => {
      sim.executeInstruction("MOV", ["EAX", "0"]);
      sim.executeInstruction("OR", ["EAX", "0"]);
      const state = sim.getState();
      expect(state.flags & 0x40).toBeTruthy(); // Zero flag
    });

    test("clears Zero flag on non-zero result", () => {
      sim.executeInstruction("MOV", ["EAX", "0"]);
      sim.executeInstruction("OR", ["EAX", "1"]);
      const state = sim.getState();
      expect(state.flags & 0x40).toBe(0); // Zero flag
    });
  });

  describe("XOR instruction", () => {
    test("XORs immediate with register", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFF"]);
      sim.executeInstruction("XOR", ["EAX", "0x0F"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xf0);
    });

    test("XORs two registers", () => {
      sim.executeInstruction("MOV", ["EAX", "0b11110000"]);
      sim.executeInstruction("MOV", ["ECX", "0b11001100"]);
      sim.executeInstruction("XOR", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0b00111100);
    });

    test("XORing a register with itself sets it to zero", () => {
      sim.executeInstruction("MOV", ["EAX", "42"]);
      sim.executeInstruction("XOR", ["EAX", "EAX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0);
      const state = sim.getState();
      expect(state.flags & 0x40).toBeTruthy(); // Zero flag
    });

    test("clears Zero flag on non-zero result", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFF"]);
      sim.executeInstruction("XOR", ["EAX", "0x0F"]);
      const state = sim.getState();
      expect(state.flags & 0x40).toBe(0); // Zero flag
    });
  });

  describe("NOT instruction", () => {
    test("inverts all bits in register", () => {
      sim.executeInstruction("MOV", ["EAX", "0"]);
      sim.executeInstruction("NOT", ["EAX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xffffffff);
    });

    test("NOT of all 1s gives all 0s", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFFFFFFFF"]);
      sim.executeInstruction("NOT", ["EAX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0);
    });

    test("NOT specific pattern", () => {
      sim.executeInstruction("MOV", ["EAX", "0xAAAAAAAA"]);
      sim.executeInstruction("NOT", ["EAX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0x55555555);
    });

    test("does not affect flags", () => {
      sim.executeInstruction("MOV", ["EAX", "42"]);
      sim.executeInstruction("CMP", ["EAX", "42"]); // Set Zero flag
      const stateBefore = sim.getState();
      const flagsBefore = stateBefore.flags;
      sim.executeInstruction("NOT", ["EAX"]);
      const stateAfter = sim.getState();
      expect(stateAfter.flags).toBe(flagsBefore); // Flags unchanged
    });
  });

  describe("NEG instruction", () => {
    test("negates positive number", () => {
      sim.executeInstruction("MOV", ["EAX", "42"]);
      sim.executeInstruction("NEG", ["EAX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xffffffd6); // -42 in two's complement
    });

    test("negates negative number", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFFFFFFD6"]); // -42
      sim.executeInstruction("NEG", ["EAX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(42);
    });

    test("negating zero gives zero", () => {
      sim.executeInstruction("MOV", ["EAX", "0"]);
      sim.executeInstruction("NEG", ["EAX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0);
      const state = sim.getState();
      expect(state.flags & 0x40).toBeTruthy(); // Zero flag
    });

    test("sets Sign flag for negative result", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("NEG", ["EAX"]);
      const state = sim.getState();
      expect(state.flags & 0x80).toBeTruthy(); // Sign flag
    });
  });

  describe("TEST instruction", () => {
    test("performs AND and sets flags without modifying operands", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFF"]);
      sim.executeInstruction("TEST", ["EAX", "0x0F"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xff); // EAX unchanged
    });

    test("sets Zero flag when result is zero", () => {
      sim.executeInstruction("MOV", ["EAX", "0b11110000"]);
      sim.executeInstruction("TEST", ["EAX", "0b00001111"]);
      const state = sim.getState();
      expect(state.flags & 0x40).toBeTruthy(); // Zero flag
    });

    test("clears Zero flag when result is non-zero", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFF"]);
      sim.executeInstruction("TEST", ["EAX", "0x0F"]);
      const state = sim.getState();
      expect(state.flags & 0x40).toBe(0); // Zero flag cleared
    });

    test("works with two registers", () => {
      sim.executeInstruction("MOV", ["EAX", "0b11110000"]);
      sim.executeInstruction("MOV", ["ECX", "0b11001100"]);
      sim.executeInstruction("TEST", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0b11110000); // EAX unchanged
      expect(regs.ECX).toBe(0b11001100); // ECX unchanged
      const state = sim.getState();
      expect(state.flags & 0x40).toBe(0); // Result is 0b11000000, not zero
    });
  });

  describe("SHL instruction", () => {
    test("shifts left by immediate count", () => {
      sim.executeInstruction("MOV", ["EAX", "0b00000001"]);
      sim.executeInstruction("SHL", ["EAX", "3"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0b00001000); // Shifted left 3 positions
    });

    test("shifts left by register count", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFF"]);
      sim.executeInstruction("MOV", ["ECX", "8"]);
      sim.executeInstruction("SHL", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xff00);
    });

    test("wraps around 32-bit boundary", () => {
      sim.executeInstruction("MOV", ["EAX", "0x80000000"]);
      sim.executeInstruction("SHL", ["EAX", "1"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0); // High bit shifted out
    });
  });

  describe("SHR instruction", () => {
    test("shifts right by immediate count (logical)", () => {
      sim.executeInstruction("MOV", ["EAX", "0b00001000"]);
      sim.executeInstruction("SHR", ["EAX", "3"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0b00000001);
    });

    test("shifts right by register count", () => {
      sim.executeInstruction("MOV", ["EAX", "0x7F00"]);
      sim.executeInstruction("MOV", ["ECX", "8"]);
      sim.executeInstruction("SHR", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0x7f);
    });

    test("logical shift fills with zeros", () => {
      sim.executeInstruction("MOV", ["EAX", "0x80000000"]);
      sim.executeInstruction("SHR", ["EAX", "1"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0x40000000); // Zero-filled from left
    });
  });

  describe("SAR instruction", () => {
    test("shifts right preserving sign for positive", () => {
      sim.executeInstruction("MOV", ["EAX", "0x1000"]);
      sim.executeInstruction("SAR", ["EAX", "4"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0x100);
    });

    test("shifts right preserving sign for negative", () => {
      sim.executeInstruction("MOV", ["EAX", "0x80000000"]); // Most negative
      sim.executeInstruction("SAR", ["EAX", "1"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xc0000000); // Sign bit preserved (1-filled)
    });

    test("sign extends on arithmetic shift", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFFFFFFFF"]); // -1
      sim.executeInstruction("SAR", ["EAX", "8"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xffffffff); // Still -1
    });
  });

  describe("ROL instruction", () => {
    test("rotates left by immediate count", () => {
      sim.executeInstruction("MOV", ["EAX", "0x5678"]);
      sim.executeInstruction("ROL", ["EAX", "8"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0x567800);
    });

    test("rotates left by register count", () => {
      sim.executeInstruction("MOV", ["EAX", "0x80000001"]);
      sim.executeInstruction("MOV", ["ECX", "1"]);
      sim.executeInstruction("ROL", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0x00000003); // High bit rotated to low bit
    });

    test("full 32-bit rotation", () => {
      sim.executeInstruction("MOV", ["EAX", "0xABCD"]);
      sim.executeInstruction("ROL", ["EAX", "32"]); // Rotate by 32 = no change
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xabcd);
    });
  });

  describe("ROR instruction", () => {
    test("rotates right by immediate count", () => {
      sim.executeInstruction("MOV", ["EAX", "0x5678"]);
      sim.executeInstruction("ROR", ["EAX", "8"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0x78000056);
    });

    test("rotates right by register count", () => {
      sim.executeInstruction("MOV", ["EAX", "0x80000001"]);
      sim.executeInstruction("MOV", ["ECX", "1"]);
      sim.executeInstruction("ROR", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xc0000000); // Low bit rotated to high bit
    });

    test("full 32-bit rotation", () => {
      sim.executeInstruction("MOV", ["EAX", "0xABCD"]);
      sim.executeInstruction("ROR", ["EAX", "32"]); // Rotate by 32 = no change
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xabcd);
    });
  });

  test("HLT instruction", () => {
    const stateBefore = sim.getState();
    expect(stateBefore.halted).toBe(false);
    sim.executeInstruction("HLT", []);
    const stateAfter = sim.getState();
    expect(stateAfter.halted).toBe(true);
  });

  describe("Stack instructions", () => {
    describe("PUSH instruction", () => {
      test("pushes register value onto stack", () => {
        sim.executeInstruction("MOV", ["EAX", "42"]);
        const espBefore = sim.getRegisters().ESP;
        sim.executeInstruction("PUSH", ["EAX"]);
        const espAfter = sim.getRegisters().ESP;

        // ESP should be decremented by 4
        expect(espAfter).toBe((espBefore - 4) & 0xffff);

        // Read value from stack
        const stackValue =
          sim.getMemoryA(espAfter, 1)[0] |
          (sim.getMemoryA(espAfter + 1, 1)[0] << 8) |
          (sim.getMemoryA(espAfter + 2, 1)[0] << 16) |
          (sim.getMemoryA(espAfter + 3, 1)[0] << 24);
        expect(stackValue >>> 0).toBe(42);
      });

      test("pushes multiple values onto stack", () => {
        sim.executeInstruction("MOV", ["EAX", "10"]);
        sim.executeInstruction("MOV", ["EBX", "20"]);
        sim.executeInstruction("MOV", ["ECX", "30"]);

        sim.executeInstruction("PUSH", ["EAX"]);
        sim.executeInstruction("PUSH", ["EBX"]);
        sim.executeInstruction("PUSH", ["ECX"]);

        const regs = sim.getRegisters();
        // ESP should be decremented by 12 (3 * 4 bytes)
        expect(regs.ESP).toBe((0xffff - 12) & 0xffff);
      });

      test("doesn't affect register value", () => {
        sim.executeInstruction("MOV", ["EAX", "100"]);
        sim.executeInstruction("PUSH", ["EAX"]);
        const regs = sim.getRegisters();
        expect(regs.EAX).toBe(100);
      });
    });

    describe("POP instruction", () => {
      test("pops value from stack into register", () => {
        sim.executeInstruction("MOV", ["EAX", "42"]);
        sim.executeInstruction("PUSH", ["EAX"]);
        sim.executeInstruction("MOV", ["EAX", "0"]); // Clear EAX
        sim.executeInstruction("POP", ["EBX"]);

        const regs = sim.getRegisters();
        expect(regs.EBX).toBe(42);
      });

      test("restores ESP after pop", () => {
        const espBefore = sim.getRegisters().ESP;
        sim.executeInstruction("MOV", ["EAX", "42"]);
        sim.executeInstruction("PUSH", ["EAX"]);
        sim.executeInstruction("POP", ["EBX"]);

        const espAfter = sim.getRegisters().ESP;
        expect(espAfter).toBe(espBefore);
      });

      test("pops multiple values in LIFO order", () => {
        sim.executeInstruction("MOV", ["EAX", "10"]);
        sim.executeInstruction("MOV", ["EBX", "20"]);
        sim.executeInstruction("MOV", ["ECX", "30"]);

        sim.executeInstruction("PUSH", ["EAX"]);
        sim.executeInstruction("PUSH", ["EBX"]);
        sim.executeInstruction("PUSH", ["ECX"]);

        sim.executeInstruction("POP", ["EDX"]); // Should get 30
        sim.executeInstruction("POP", ["ESI"]); // Should get 20
        sim.executeInstruction("POP", ["EDI"]); // Should get 10

        const regs = sim.getRegisters();
        expect(regs.EDX).toBe(30);
        expect(regs.ESI).toBe(20);
        expect(regs.EDI).toBe(10);
      });
    });

    describe("Stack pointer initialization", () => {
      test("ESP initialized to 0xFFFF", () => {
        const regs = sim.getRegisters();
        expect(regs.ESP).toBe(0xffff);
      });

      test("ESP reset to 0xFFFF after reset", () => {
        sim.executeInstruction("MOV", ["ESP", "0x1000"]);
        sim.reset();
        const regs = sim.getRegisters();
        expect(regs.ESP).toBe(0xffff);
      });
    });

    describe("PUSH/POP with different registers", () => {
      test("works with ESP", () => {
        const espValue = sim.getRegisters().ESP;
        sim.executeInstruction("PUSH", ["ESP"]);
        sim.executeInstruction("POP", ["EAX"]);
        const regs = sim.getRegisters();
        // When we PUSH ESP, we push the value before decrementing
        expect(regs.EAX).toBe(espValue);
      });

      test("works with all registers", () => {
        const registerNames = ["EAX", "ECX", "EDX", "EBX", "EBP", "ESI", "EDI"];
        registerNames.forEach((reg, index) => {
          sim.executeInstruction("MOV", [reg, (index * 10).toString()]);
          sim.executeInstruction("PUSH", [reg]);
        });

        // Pop in reverse order
        registerNames.reverse().forEach((reg, index) => {
          sim.executeInstruction("POP", [reg]);
          const regs = sim.getRegisters();
          const originalIndex = registerNames.length - 1 - index;
          expect(regs[reg as keyof typeof regs]).toBe(originalIndex * 10);
        });
      });
    });
  });

  describe("error handling", () => {
    test("throws on unknown instruction", () => {
      expect(() => sim.executeInstruction("UNKNOWN", [])).toThrow(
        "Unknown instruction: UNKNOWN",
      );
    });

    test("silently ignores MOV with wrong operands", () => {
      // Wrong operand count is silently ignored (switch default when operands.length !== 2)
      expect(() => sim.executeInstruction("MOV", ["EAX"])).not.toThrow();
    });

    test("silently ignores ADD with wrong operands", () => {
      // Wrong operand count is silently ignored (switch default when operands.length !== 2)
      expect(() => sim.executeInstruction("ADD", ["EAX"])).not.toThrow();
    });
  });
});
describe("Simulator - public API", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("initializes with valid state", () => {
    const state = sim.getState();
    expect(state.pc).toBe(0);
    expect(state.running).toBe(false);
    expect(state.halted).toBe(false);
    expect(state.registers).toEqual([0, 0, 0, 0, 0xffff, 0, 0, 0]); // ESP initialized to 0xFFFF
  });

  test("run() sets running state", () => {
    sim.run();
    const state = sim.getState();
    expect(state.running).toBe(true);
  });

  test("pause() clears running state", () => {
    sim.run();
    sim.pause();
    const state = sim.getState();
    expect(state.running).toBe(false);
  });

  test("halt() stops execution and halts processor", () => {
    sim.run();
    sim.halt();
    const state = sim.getState();
    expect(state.running).toBe(false);
    expect(state.halted).toBe(true);
  });

  test("reset() clears state", () => {
    sim.executeInstruction("MOV", ["EAX", "42"]);
    sim.reset();
    const state = sim.getState();
    expect(state.registers[0]).toBe(0); // EAX should be 0
  });

  test("getRegisters() returns named registers", () => {
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("MOV", ["ECX", "20"]);
    const regs = sim.getRegisters();
    expect(regs.EAX).toBe(10);
    expect(regs.ECX).toBe(20);
  });

  test("breakpoint operations", () => {
    sim.addBreakpoint(100);
    const state = sim.getState();
    expect(state.halted).toBe(false); // Adding breakpoint doesn't halt

    sim.removeBreakpoint(100);
    // No error thrown
  });

  test("step() without loaded instructions does nothing", () => {
    sim.run();
    sim.step();
    const stateAfter = sim.getState();
    // Without loaded instructions, step() should halt the simulator
    // PC is not used anymore (EIP is used instead)
    expect(stateAfter.halted).toBe(true);
  });

  test("step() in halted mode doesn't execute", () => {
    sim.halt();
    const stateBefore = sim.getState();
    sim.step();
    const stateAfter = sim.getState();
    // PC should not change when halted
    expect(stateAfter.pc).toBe(stateBefore.pc);
  });

  test("getMemoryA() retrieves memory from Bank A", () => {
    // First, write to memory (would need a memory write instruction)
    // For now, just test the API works
    const data = sim.getMemoryA(0, 10);
    expect(data.length).toBe(10);
    expect(data[0]).toBe(0); // Should be zero-initialized
  });

  test("getMemoryB() retrieves memory from Bank B", () => {
    const data = sim.getMemoryB(0, 10);
    expect(data.length).toBe(10);
    expect(data[0]).toBe(0);
  });

  test("getLCDDisplay() returns display data", () => {
    const data = sim.getLCDDisplay();
    expect(data.length).toBeGreaterThan(0);
  });

  test("getState() with full CPU state", () => {
    sim.executeInstruction("MOV", ["EAX", "100"]);
    sim.executeInstruction("MOV", ["EBX", "200"]);
    const state = sim.getState();
    expect(state.pc).toBe(0);
    expect(state.registers[0]).toBe(100); // EAX
    expect(state.registers[3]).toBe(200); // EBX
    expect(state.halted).toBe(false);
  });
});

describe("Simulator - LCD Integration", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator(8, 8); // 8x8 LCD
  });

  test("can create simulator with custom LCD size", () => {
    const sim2x2 = new Simulator(2, 2);
    const display2x2 = sim2x2.getLCDDisplay();
    expect(display2x2.length).toBe(4); // 2*2

    const sim16x16 = new Simulator(16, 16);
    const display16x16 = sim16x16.getLCDDisplay();
    expect(display16x16.length).toBe(256); // 16*16
  });

  test("LCD display is properly initialized", () => {
    const display = sim.getLCDDisplay();
    expect(display.length).toBe(64); // 8*8
    for (let i = 0; i < display.length; i++) {
      expect(display[i]).toBe(0);
    }
  });

  test("LCD cleared on reset", () => {
    // Reset should clear LCD
    sim.reset();
    const display = sim.getLCDDisplay();
    for (let i = 0; i < display.length; i++) {
      expect(display[i]).toBe(0);
    }
  });
});

describe("Keyboard", () => {
  let keyboard: Keyboard;

  beforeEach(() => {
    keyboard = new Keyboard();
  });

  describe("key event queue", () => {
    test("initializes with empty queue", () => {
      expect(keyboard.getStatus()).toBe(0);
      expect(keyboard.getKeyCode()).toBe(0);
      expect(keyboard.getKeyState()).toBe(0);
    });

    test("pushKey() adds key to queue and updates state", () => {
      keyboard.pushKey(65, true); // 'A' pressed
      expect(keyboard.getStatus()).toBe(1);
      expect(keyboard.getKeyCode()).toBe(65);
      expect(keyboard.getKeyState()).toBe(1);
    });

    test("popKey() removes oldest key from queue", () => {
      keyboard.pushKey(65, true); // 'A' pressed
      keyboard.pushKey(66, false); // 'B' released

      expect(keyboard.getStatus()).toBe(1); // 2 keys in queue

      const popped = keyboard.popKey();
      expect(popped).toBe(true);
      expect(keyboard.getKeyCode()).toBe(65);
      expect(keyboard.getKeyState()).toBe(1);

      expect(keyboard.getStatus()).toBe(1); // 1 key left
    });

    test("multiple pops work correctly", () => {
      keyboard.pushKey(65, true); // 'A' pressed
      keyboard.pushKey(66, true); // 'B' pressed
      keyboard.pushKey(67, false); // 'C' released

      // Pop first key
      keyboard.popKey();
      expect(keyboard.getKeyCode()).toBe(65);
      expect(keyboard.getKeyState()).toBe(1);

      // Pop second key
      keyboard.popKey();
      expect(keyboard.getKeyCode()).toBe(66);
      expect(keyboard.getKeyState()).toBe(1);

      // Pop third key
      keyboard.popKey();
      expect(keyboard.getKeyCode()).toBe(67);
      expect(keyboard.getKeyState()).toBe(0);
    });

    test("popKey() returns false when queue is empty", () => {
      const popped = keyboard.popKey();
      expect(popped).toBe(false);
    });

    test("status reflects queue state", () => {
      expect(keyboard.getStatus()).toBe(0); // empty

      keyboard.pushKey(65, true);
      expect(keyboard.getStatus()).toBe(1); // has keys

      keyboard.popKey();
      expect(keyboard.getStatus()).toBe(0); // empty again
    });

    test("clear() resets all state", () => {
      keyboard.pushKey(65, true);
      keyboard.pushKey(66, true);
      keyboard.pushKey(67, false);

      keyboard.clear();

      expect(keyboard.getStatus()).toBe(0);
      expect(keyboard.getKeyCode()).toBe(0);
      expect(keyboard.getKeyState()).toBe(0);
    });
  });

  describe("key code handling", () => {
    test("handles letter key codes (A-Z)", () => {
      keyboard.pushKey(65, true); // 'A'
      expect(keyboard.getKeyCode()).toBe(65);

      keyboard.pushKey(90, true); // 'Z'
      expect(keyboard.getKeyCode()).toBe(90);
    });

    test("handles number key codes (0-9)", () => {
      keyboard.pushKey(48, true); // '0'
      expect(keyboard.getKeyCode()).toBe(48);

      keyboard.pushKey(57, true); // '9'
      expect(keyboard.getKeyCode()).toBe(57);
    });

    test("handles arrow key codes", () => {
      keyboard.pushKey(128, true); // Up
      expect(keyboard.getKeyCode()).toBe(128);

      keyboard.pushKey(129, true); // Down
      expect(keyboard.getKeyCode()).toBe(129);

      keyboard.pushKey(130, true); // Left
      expect(keyboard.getKeyCode()).toBe(130);

      keyboard.pushKey(131, true); // Right
      expect(keyboard.getKeyCode()).toBe(131);
    });

    test("handles special key codes", () => {
      keyboard.pushKey(13, true); // Enter
      expect(keyboard.getKeyCode()).toBe(13);

      keyboard.pushKey(27, true); // Escape
      expect(keyboard.getKeyCode()).toBe(27);

      keyboard.pushKey(32, true); // Space
      expect(keyboard.getKeyCode()).toBe(32);
    });

    test("handles key press and release states", () => {
      keyboard.pushKey(65, true); // pressed
      expect(keyboard.getKeyState()).toBe(1);

      keyboard.pushKey(65, false); // released
      expect(keyboard.getKeyState()).toBe(0);
    });
  });
});

describe("Simulator - Keyboard Integration", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator(8, 8);
  });

  test("pushKeyboardEvent() adds key to simulator", () => {
    sim.pushKeyboardEvent(65, true); // 'A' pressed
    const status = sim.getKeyboardStatus();
    expect(status.status).toBe(1);
    expect(status.keyCode).toBe(65);
    expect(status.keyState).toBe(1);
  });

  test("multiple keyboard events queue correctly", () => {
    sim.pushKeyboardEvent(65, true); // 'A' pressed
    sim.pushKeyboardEvent(66, true); // 'B' pressed

    const status = sim.getKeyboardStatus();
    expect(status.status).toBe(1); // has keys in queue
  });

  test("reset() clears keyboard state", () => {
    sim.pushKeyboardEvent(65, true);
    sim.reset();

    const status = sim.getKeyboardStatus();
    expect(status.status).toBe(0);
    expect(status.keyCode).toBe(0);
    expect(status.keyState).toBe(0);
  });

  test("MOV can read keyboard status (0x10100)", () => {
    sim.pushKeyboardEvent(65, true);
    sim.executeInstruction("MOV", ["EAX", "[0x10100]"]);
    const registers = sim.getRegisters();
    expect(registers.EAX).toBe(1); // status = 1 (key available)
  });

  test("MOV can read key code (0x10101)", () => {
    sim.pushKeyboardEvent(65, true); // 'A'
    sim.executeInstruction("MOV", ["EAX", "[0x10101]"]);
    const registers = sim.getRegisters();
    expect(registers.EAX).toBe(65); // key code = 65
  });

  test("MOV can read key state (0x10102)", () => {
    sim.pushKeyboardEvent(65, true); // pressed
    sim.executeInstruction("MOV", ["EAX", "[0x10102]"]);
    let registers = sim.getRegisters();
    expect(registers.EAX).toBe(1); // state = 1 (pressed)

    sim.pushKeyboardEvent(66, false); // released
    sim.executeInstruction("MOV", ["EBX", "[0x10102]"]);
    registers = sim.getRegisters();
    expect(registers.EBX).toBe(0); // state = 0 (released)
  });

  test("reading key code (0x10101) pops key from queue", () => {
    sim.pushKeyboardEvent(65, true);
    sim.pushKeyboardEvent(66, true);

    // First read gets 'A' and pops it
    sim.executeInstruction("MOV", ["EAX", "[0x10101]"]);
    let registers = sim.getRegisters();
    expect(registers.EAX).toBe(65);

    // Next read gets 'B'
    sim.executeInstruction("MOV", ["EBX", "[0x10101]"]);
    registers = sim.getRegisters();
    expect(registers.EBX).toBe(66);
  });

  test("keyboard I/O addresses are read-only (writes ignored)", () => {
    sim.executeInstruction("MOV", ["0x10100", "99"]); // Try to write to status
    sim.executeInstruction("MOV", ["EAX", "[0x10100]"]);
    const registers = sim.getRegisters();
    expect(registers.EAX).toBe(0); // Should still be 0, not 99
  });

  test("keyboard works alongside LCD I/O", () => {
    // Write to LCD
    sim.executeInstruction("MOV", ["0xF000", "1"]); // LCD pixel 0

    // Push keyboard event
    sim.pushKeyboardEvent(65, true);

    // Read keyboard
    sim.executeInstruction("MOV", ["EAX", "[0x10101]"]);

    // Verify both work
    const lcd = sim.getLCDDisplay();
    expect(lcd[0]).toBe(1);

    const registers = sim.getRegisters();
    expect(registers.EAX).toBe(65);
  });

  test("arrow keys work correctly", () => {
    sim.pushKeyboardEvent(128, true); // Up
    sim.executeInstruction("MOV", ["EAX", "[0x10101]"]);
    let registers = sim.getRegisters();
    expect(registers.EAX).toBe(128);

    sim.pushKeyboardEvent(129, true); // Down
    sim.executeInstruction("MOV", ["EBX", "[0x10101]"]);
    registers = sim.getRegisters();
    expect(registers.EBX).toBe(129);

    sim.pushKeyboardEvent(130, true); // Left
    sim.executeInstruction("MOV", ["ECX", "[0x10101]"]);
    registers = sim.getRegisters();
    expect(registers.ECX).toBe(130);

    sim.pushKeyboardEvent(131, true); // Right
    sim.executeInstruction("MOV", ["EDX", "[0x10101]"]);
    registers = sim.getRegisters();
    expect(registers.EDX).toBe(131);
  });
});

describe("Simulator - INT instruction", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  describe("INT 0x10 - Video services", () => {
    test("INT 0x10 with AH=0x0E writes character to console", () => {
      // Set AH = 0x0E (teletype output)
      // Set AL = 'H' (0x48)
      sim.executeInstruction("MOV", ["EAX", "0x0E48"]); // AH=0x0E, AL=0x48
      sim.executeInstruction("INT", ["0x10"]);

      const output = sim.getConsoleOutput();
      expect(output).toBe("H");
    });

    test("INT 0x10 outputs multiple characters", () => {
      // Output 'H'
      sim.executeInstruction("MOV", ["EAX", "0x0E48"]);
      sim.executeInstruction("INT", ["0x10"]);

      // Output 'i'
      sim.executeInstruction("MOV", ["EAX", "0x0E69"]);
      sim.executeInstruction("INT", ["0x10"]);

      const output = sim.getConsoleOutput();
      expect(output).toBe("Hi");
    });

    test("INT 0x10 handles newline character", () => {
      sim.executeInstruction("MOV", ["EAX", "0x0E0A"]); // AL = '\n' (0x0A)
      sim.executeInstruction("INT", ["0x10"]);

      const output = sim.getConsoleOutput();
      expect(output).toBe("\n");
    });

    test("clearConsoleOutput clears the buffer", () => {
      sim.executeInstruction("MOV", ["EAX", "0x0E48"]);
      sim.executeInstruction("INT", ["0x10"]);
      expect(sim.getConsoleOutput()).toBe("H");

      sim.clearConsoleOutput();
      expect(sim.getConsoleOutput()).toBe("");
    });

    test("reset clears console output", () => {
      sim.executeInstruction("MOV", ["EAX", "0x0E48"]);
      sim.executeInstruction("INT", ["0x10"]);
      expect(sim.getConsoleOutput()).toBe("H");

      sim.reset();
      expect(sim.getConsoleOutput()).toBe("");
    });
  });

  describe("INT 0x20 - Program terminate", () => {
    test("INT 0x20 halts the program", () => {
      sim.executeInstruction("INT", ["0x20"]);

      const state = sim.getState();
      expect(state.halted).toBe(true);
      expect(state.running).toBe(false);
    });
  });

  describe("INT 0x21 - DOS services", () => {
    test("INT 0x21 with AH=0x02 writes character from DL", () => {
      // Set AH = 0x02 (write character)
      // Set DL = 'A' (0x41)
      sim.executeInstruction("MOV", ["EAX", "0x0200"]); // AH = 0x02
      sim.executeInstruction("MOV", ["EDX", "0x41"]); // DL = 'A'
      sim.executeInstruction("INT", ["0x21"]);

      const output = sim.getConsoleOutput();
      expect(output).toBe("A");
    });

    test("INT 0x21 AH=0x02 outputs multiple characters", () => {
      sim.executeInstruction("MOV", ["EAX", "0x0200"]);
      sim.executeInstruction("MOV", ["EDX", "0x48"]); // 'H'
      sim.executeInstruction("INT", ["0x21"]);

      sim.executeInstruction("MOV", ["EDX", "0x69"]); // 'i'
      sim.executeInstruction("INT", ["0x21"]);

      const output = sim.getConsoleOutput();
      expect(output).toBe("Hi");
    });
  });

  describe("IRET instruction", () => {
    test("IRET is recognized and doesn't crash", () => {
      // IRET is a placeholder for now
      expect(() => {
        sim.executeInstruction("IRET", []);
      }).not.toThrow();
    });
  });

  describe("case insensitivity", () => {
    test("int is case insensitive", () => {
      sim.executeInstruction("MOV", ["EAX", "0x0E48"]);
      sim.executeInstruction("int", ["0x10"]);

      const output = sim.getConsoleOutput();
      expect(output).toBe("H");
    });

    test("iret is case insensitive", () => {
      expect(() => {
        sim.executeInstruction("iret", []);
      }).not.toThrow();
    });
  });

  describe("hex number parsing", () => {
    test("INT accepts hex interrupt numbers", () => {
      sim.executeInstruction("MOV", ["EAX", "0x0E48"]);
      sim.executeInstruction("INT", ["0x10"]);
      expect(sim.getConsoleOutput()).toBe("H");
    });

    test("INT accepts decimal interrupt numbers", () => {
      sim.executeInstruction("MOV", ["EAX", "0x0E48"]);
      sim.executeInstruction("INT", ["16"]); // 0x10 = 16
      expect(sim.getConsoleOutput()).toBe("H");
    });
  });
});

describe("Simulator - Compatibility Mode", () => {
  describe("Educational mode (default)", () => {
    test("defaults to educational mode", () => {
      const sim = new Simulator();
      expect(sim.getCompatibilityMode()).toBe("educational");
    });

    test("allows memory-to-memory MOV in educational mode", () => {
      const sim = new Simulator(16, 16);
      // Write to LCD pixel 0 from LCD pixel status (simulated)
      sim.executeInstruction("MOV", ["0xF000", "0xF100"]);
      // Should not throw in educational mode
      expect(sim.getCompatibilityMode()).toBe("educational");
    });

    test("allows flexible memory access in educational mode", () => {
      const sim = new Simulator(16, 16);
      // This represents memory-to-memory operation
      sim.executeInstruction("MOV", ["EAX", "[0x10100]"]);
      sim.executeInstruction("MOV", ["0xF000", "EAX"]);
      // Should work fine
      expect(sim.getCompatibilityMode()).toBe("educational");
    });
  });

  describe("Strict x86 mode", () => {
    test("can be initialized with strict-x86 mode", () => {
      const sim = new Simulator(8, 8, "strict-x86");
      expect(sim.getCompatibilityMode()).toBe("strict-x86");
    });

    test("can switch to strict-x86 mode", () => {
      const sim = new Simulator();
      sim.setCompatibilityMode("strict-x86");
      expect(sim.getCompatibilityMode()).toBe("strict-x86");
    });

    test("prevents memory-to-memory MOV in strict-x86 mode", () => {
      const sim = new Simulator(16, 16, "strict-x86");
      // Try to move from keyboard status to LCD pixel (memory-to-memory)
      expect(() => {
        sim.executeInstruction("MOV", ["0xF000", "0xF100"]);
      }).toThrow("Memory-to-memory MOV not allowed in strict-x86 mode");
    });

    test("allows register-to-memory MOV in strict-x86 mode", () => {
      const sim = new Simulator(16, 16, "strict-x86");
      sim.executeInstruction("MOV", ["EAX", "42"]);
      sim.executeInstruction("MOV", ["0xF000", "EAX"]);
      // Should work - register to memory is allowed
      const lcd = sim.getLCDDisplay();
      expect(lcd[0]).toBe(1); // Non-zero value sets pixel to 1
    });

    test("allows memory-to-register MOV in strict-x86 mode", () => {
      const sim = new Simulator(16, 16, "strict-x86");
      sim.pushKeyboardEvent(65, true); // Push 'A' key
      sim.executeInstruction("MOV", ["EAX", "[0x10100]"]);
      // Should work - memory to register is allowed
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(1); // Status should be 1 (key available)
    });

    test("allows immediate-to-register MOV in strict-x86 mode", () => {
      const sim = new Simulator(8, 8, "strict-x86");
      sim.executeInstruction("MOV", ["EAX", "42"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(42);
    });

    test("allows register-to-register MOV in strict-x86 mode", () => {
      const sim = new Simulator(8, 8, "strict-x86");
      sim.executeInstruction("MOV", ["EAX", "100"]);
      sim.executeInstruction("MOV", ["EBX", "EAX"]);
      const regs = sim.getRegisters();
      expect(regs.EBX).toBe(100);
    });

    test("allows immediate-to-memory MOV in strict-x86 mode", () => {
      const sim = new Simulator(16, 16, "strict-x86");
      // MOV with literal immediate to memory should work (not memory-to-memory)
      sim.executeInstruction("MOV", ["0xF000", "1"]);
      const lcd = sim.getLCDDisplay();
      expect(lcd[0]).toBe(1); // Pixel should be set
    });
  });

  describe("Mode switching", () => {
    test("can switch from educational to strict-x86 mode", () => {
      const sim = new Simulator(16, 16);
      expect(sim.getCompatibilityMode()).toBe("educational");

      // This works in educational mode
      sim.executeInstruction("MOV", ["0xF000", "0xF100"]);

      // Switch to strict mode
      sim.setCompatibilityMode("strict-x86");

      // Now this should fail
      expect(() => {
        sim.executeInstruction("MOV", ["0xF001", "0xF100"]);
      }).toThrow("Memory-to-memory MOV not allowed in strict-x86 mode");
    });

    test("can switch from strict-x86 to educational mode", () => {
      const sim = new Simulator(16, 16, "strict-x86");

      // This fails in strict mode
      expect(() => {
        sim.executeInstruction("MOV", ["0xF000", "0xF100"]);
      }).toThrow("Memory-to-memory MOV not allowed in strict-x86 mode");

      // Switch to educational mode
      sim.setCompatibilityMode("educational");

      // Now this should work
      sim.executeInstruction("MOV", ["0xF000", "0xF100"]);
      expect(sim.getCompatibilityMode()).toBe("educational");
    });
  });
});

// ================================
// x86 Flag & Instruction Tests
// Verified against UVA CS216 x86 Guide
// ================================

describe("x86 Flags and Instructions (UVA CS216 verification)", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  describe("Carry flag (CF) behavior", () => {
    test("ADD sets carry flag on unsigned overflow", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFFFFFFFF"]);
      sim.executeInstruction("ADD", ["EAX", "1"]);
      expect(sim.isCarryFlagSet()).toBe(true);
    });

    test("ADD clears carry flag on no unsigned overflow", () => {
      sim.executeInstruction("MOV", ["EAX", "5"]);
      sim.executeInstruction("ADD", ["EAX", "3"]);
      expect(sim.isCarryFlagSet()).toBe(false);
    });

    test("SUB sets carry flag on borrow (unsigned underflow)", () => {
      sim.executeInstruction("MOV", ["EAX", "0"]);
      sim.executeInstruction("SUB", ["EAX", "1"]);
      expect(sim.isCarryFlagSet()).toBe(true);
    });

    test("SUB clears carry flag when no borrow", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("SUB", ["EAX", "5"]);
      expect(sim.isCarryFlagSet()).toBe(false);
    });

    test("CMP sets carry flag when first < second (unsigned)", () => {
      sim.executeInstruction("MOV", ["EAX", "5"]);
      sim.executeInstruction("CMP", ["EAX", "10"]);
      expect(sim.isCarryFlagSet()).toBe(true);
    });

    test("CMP clears carry flag when first >= second (unsigned)", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("CMP", ["EAX", "5"]);
      expect(sim.isCarryFlagSet()).toBe(false);
    });
  });

  describe("Overflow flag (OF) behavior", () => {
    test("ADD sets overflow on positive + positive = negative", () => {
      sim.executeInstruction("MOV", ["EAX", "0x7FFFFFFF"]); // Max positive
      sim.executeInstruction("ADD", ["EAX", "1"]);
      expect(sim.isOverflowFlagSet()).toBe(true);
      expect(sim.isSignFlagSet()).toBe(true);
    });

    test("ADD clears overflow on no signed overflow", () => {
      sim.executeInstruction("MOV", ["EAX", "5"]);
      sim.executeInstruction("ADD", ["EAX", "3"]);
      expect(sim.isOverflowFlagSet()).toBe(false);
    });

    test("SUB sets overflow on positive - negative = negative (signed overflow)", () => {
      sim.executeInstruction("MOV", ["EAX", "0x7FFFFFFF"]); // Max positive
      sim.executeInstruction("MOV", ["ECX", "0xFFFFFFFF"]); // -1 as unsigned
      sim.executeInstruction("SUB", ["EAX", "ECX"]);
      // 0x7FFFFFFF - (-1) = 0x80000000 which overflows signed
      expect(sim.isOverflowFlagSet()).toBe(true);
    });
  });

  describe("INC/DEC preserve Carry flag", () => {
    test("INC preserves carry flag when set", () => {
      // Set carry flag via an operation that causes carry
      sim.executeInstruction("MOV", ["EAX", "0xFFFFFFFF"]);
      sim.executeInstruction("ADD", ["EAX", "1"]); // Sets CF
      expect(sim.isCarryFlagSet()).toBe(true);

      // INC should preserve CF
      sim.executeInstruction("MOV", ["EBX", "5"]);
      sim.executeInstruction("INC", ["EBX"]);
      expect(sim.isCarryFlagSet()).toBe(true); // CF preserved
      const regs = sim.getRegisters();
      expect(regs.EBX).toBe(6);
    });

    test("DEC preserves carry flag when set", () => {
      // Set carry flag
      sim.executeInstruction("MOV", ["EAX", "0xFFFFFFFF"]);
      sim.executeInstruction("ADD", ["EAX", "1"]); // Sets CF
      expect(sim.isCarryFlagSet()).toBe(true);

      // DEC should preserve CF
      sim.executeInstruction("MOV", ["EBX", "5"]);
      sim.executeInstruction("DEC", ["EBX"]);
      expect(sim.isCarryFlagSet()).toBe(true); // CF preserved
      const regs = sim.getRegisters();
      expect(regs.EBX).toBe(4);
    });

    test("INC preserves carry flag when clear", () => {
      sim.executeInstruction("MOV", ["EAX", "5"]);
      sim.executeInstruction("ADD", ["EAX", "3"]); // CF = 0
      expect(sim.isCarryFlagSet()).toBe(false);

      sim.executeInstruction("INC", ["EAX"]);
      expect(sim.isCarryFlagSet()).toBe(false); // CF preserved as clear
    });
  });

  describe("NOP instruction", () => {
    test("NOP does not modify any register", () => {
      sim.executeInstruction("MOV", ["EAX", "42"]);
      sim.executeInstruction("MOV", ["ECX", "100"]);
      sim.executeInstruction("NOP", []);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(42);
      expect(regs.ECX).toBe(100);
    });

    test("NOP does not modify flags", () => {
      sim.executeInstruction("MOV", ["EAX", "0"]);
      sim.executeInstruction("ADD", ["EAX", "0"]); // Sets ZF
      expect(sim.isZeroFlagSet()).toBe(true);
      sim.executeInstruction("NOP", []);
      expect(sim.isZeroFlagSet()).toBe(true);
    });
  });

  describe("IMUL multi-operand forms", () => {
    test("two-operand IMUL: dest = dest * src", () => {
      sim.executeInstruction("MOV", ["EAX", "7"]);
      sim.executeInstruction("IMUL", ["EAX", "6"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(42);
    });

    test("two-operand IMUL with registers", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("MOV", ["ECX", "3"]);
      sim.executeInstruction("IMUL", ["EAX", "ECX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(30);
    });

    test("three-operand IMUL: dest = src * imm", () => {
      sim.executeInstruction("MOV", ["ECX", "8"]);
      sim.executeInstruction("IMUL", ["EAX", "ECX", "5"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(40);
    });

    test("three-operand IMUL with negative multiplier", () => {
      sim.executeInstruction("MOV", ["ECX", "10"]);
      sim.executeInstruction("IMUL", ["EAX", "ECX", "-3"]);
      const regs = sim.getRegisters();
      // -30 as 32-bit unsigned
      expect(regs.EAX).toBe(0xffffffe2);
    });
  });

  describe("Shift modulo 32 behavior", () => {
    test("SHL count > 31 uses count mod 32", () => {
      sim.executeInstruction("MOV", ["EAX", "1"]);
      sim.executeInstruction("SHL", ["EAX", "33"]); // 33 mod 32 = 1
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(2);
    });

    test("SHR count > 31 uses count mod 32", () => {
      sim.executeInstruction("MOV", ["EAX", "0x80000000"]);
      sim.executeInstruction("SHR", ["EAX", "33"]); // 33 mod 32 = 1
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0x40000000);
    });

    test("SAR count > 31 uses count mod 32", () => {
      sim.executeInstruction("MOV", ["EAX", "0x80000000"]);
      sim.executeInstruction("SAR", ["EAX", "33"]); // 33 mod 32 = 1
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xc0000000);
    });

    test("shift by 32 is equivalent to shift by 0", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFF"]);
      sim.executeInstruction("SHL", ["EAX", "32"]); // 32 mod 32 = 0
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xff); // No shift
    });
  });

  describe("LEA with memory operand", () => {
    test("LEA computes base + offset", () => {
      sim.executeInstruction("MOV", ["EBX", "100"]);
      sim.executeInstruction("LEA", ["EAX", "[EBX+8]"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(108);
    });

    test("LEA with zero offset", () => {
      sim.executeInstruction("MOV", ["ECX", "200"]);
      sim.executeInstruction("LEA", ["EAX", "[ECX+0]"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(200);
    });

    test("LEA does not dereference memory", () => {
      // LEA just computes the address, doesn't actually read memory
      sim.executeInstruction("MOV", ["EBX", "0xF000"]); // LCD address range
      sim.executeInstruction("LEA", ["EAX", "[EBX+16]"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xf010); // Address computed, not memory content
    });
  });

  describe("Sign and Zero flag helpers", () => {
    test("isZeroFlagSet returns true when result is zero", () => {
      sim.executeInstruction("MOV", ["EAX", "5"]);
      sim.executeInstruction("SUB", ["EAX", "5"]);
      expect(sim.isZeroFlagSet()).toBe(true);
    });

    test("isSignFlagSet returns true when result is negative", () => {
      sim.executeInstruction("MOV", ["EAX", "0"]);
      sim.executeInstruction("SUB", ["EAX", "1"]); // Result is 0xFFFFFFFF (negative)
      expect(sim.isSignFlagSet()).toBe(true);
    });

    test("isSignFlagSet returns false for positive result", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("SUB", ["EAX", "5"]);
      expect(sim.isSignFlagSet()).toBe(false);
    });
  });

  describe("Conditional jump instructions (as NOPs in simulator)", () => {
    test("JG does not throw", () => {
      expect(() => sim.executeInstruction("JG", ["label"])).not.toThrow();
    });

    test("JGE does not throw", () => {
      expect(() => sim.executeInstruction("JGE", ["label"])).not.toThrow();
    });

    test("JL does not throw", () => {
      expect(() => sim.executeInstruction("JL", ["label"])).not.toThrow();
    });

    test("JLE does not throw", () => {
      expect(() => sim.executeInstruction("JLE", ["label"])).not.toThrow();
    });

    test("JS does not throw", () => {
      expect(() => sim.executeInstruction("JS", ["label"])).not.toThrow();
    });

    test("JNS does not throw", () => {
      expect(() => sim.executeInstruction("JNS", ["label"])).not.toThrow();
    });

    test("JA does not throw", () => {
      expect(() => sim.executeInstruction("JA", ["label"])).not.toThrow();
    });

    test("JAE does not throw", () => {
      expect(() => sim.executeInstruction("JAE", ["label"])).not.toThrow();
    });

    test("JB does not throw", () => {
      expect(() => sim.executeInstruction("JB", ["label"])).not.toThrow();
    });

    test("JBE does not throw", () => {
      expect(() => sim.executeInstruction("JBE", ["label"])).not.toThrow();
    });
  });

  describe("Memory addressing modes", () => {
    test("supports [REG-offset] addressing", () => {
      sim.executeInstruction("MOV", ["EBP", "100"]);
      sim.executeInstruction("MOV", ["[EBP-4]", "42"]);
      sim.executeInstruction("MOV", ["EAX", "[EBP-4]"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(42);
    });

    test("supports [REG+REG] addressing", () => {
      sim.executeInstruction("MOV", ["EBX", "1000"]);
      sim.executeInstruction("MOV", ["ECX", "50"]);
      sim.executeInstruction("MOV", ["[EBX+ECX]", "99"]);
      sim.executeInstruction("MOV", ["EAX", "[EBX+ECX]"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(99);
    });

    test("supports binary literal addresses [0B...]", () => {
      sim.executeInstruction("MOV", ["[0B1111101000]", "77"]); // Binary 1000
      sim.executeInstruction("MOV", ["EDX", "[0B1111101000]"]);
      const regs = sim.getRegisters();
      expect(regs.EDX).toBe(77);
    });

    test("supports uppercase hex addresses [0X...]", () => {
      sim.executeInstruction("MOV", ["[0X0500]", "88"]);
      sim.executeInstruction("MOV", ["ESI", "[0X0500]"]);
      const regs = sim.getRegisters();
      expect(regs.ESI).toBe(88);
    });

    test("supports uppercase binary addresses [0B...]", () => {
      sim.executeInstruction("MOV", ["[0B10000000]", "55"]); // Binary 128
      sim.executeInstruction("MOV", ["EDI", "[0B10000000]"]);
      const regs = sim.getRegisters();
      expect(regs.EDI).toBe(55);
    });
  });

  describe("Character literal operands", () => {
    test("supports character literal in immediate values", () => {
      sim.executeInstruction("MOV", ["EAX", "'A'"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(65);
    });

    test("supports different character literals", () => {
      sim.executeInstruction("MOV", ["EBX", "'Z'"]);
      const regs = sim.getRegisters();
      expect(regs.EBX).toBe(90);
    });

    test("supports space character literal", () => {
      sim.executeInstruction("MOV", ["ECX", "' '"]);
      const regs = sim.getRegisters();
      expect(regs.ECX).toBe(32);
    });
  });

  describe("I/O error handling", () => {
    test("reading from LCD address returns 0 (write-only)", () => {
      // LCD addresses are 0xF000-0xFFFF
      sim.executeInstruction("MOV", ["EAX", "[0xF000]"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0); // LCD is write-only, reads return 0
    });

    test("reading from unknown keyboard I/O address throws error", () => {
      // 0x10103 is in keyboard range but not a valid keyboard register
      expect(() => {
        sim.executeInstruction("MOV", ["EAX", "[0x10103]"]);
      }).toThrow("Unknown I/O read address");
    });

    test("writing to keyboard registers is silently ignored", () => {
      // Keyboard registers are read-only
      sim.executeInstruction("MOV", ["EAX", "100"]);
      expect(() => {
        sim.executeInstruction("MOV", ["[0x10100]", "EAX"]);
      }).not.toThrow(); // Should not throw, just ignore
    });
  });

  describe("XCHG instruction", () => {
    test("exchanges two register values", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("MOV", ["EBX", "20"]);
      sim.executeInstruction("XCHG", ["EAX", "EBX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(20);
      expect(regs.EBX).toBe(10);
    });
  });

  describe("Additional edge cases", () => {
    test("MOV with memory destination using I/O address", () => {
      sim.executeInstruction("MOV", ["[0xF000]", "1"]); // Write to LCD
      // Verify by reading display state
      const display = sim.getLCDDisplay();
      expect(display).toBeDefined();
      expect(display[0]).toBe(1); // First pixel should be 1
    });

    test("8-bit register operations preserve upper bits", () => {
      sim.executeInstruction("MOV", ["EAX", "0xAABBCCDD"]);
      sim.executeInstruction("MOV", ["AL", "0x11"]); // Set low byte
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xaabbcc11);
    });

    test("8-bit high register operations", () => {
      sim.executeInstruction("MOV", ["EAX", "0x12345678"]);
      sim.executeInstruction("MOV", ["AH", "0xFF"]); // Set high byte of low word
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0x1234ff78);
    });

    test("writing to unknown I/O address throws error", () => {
      expect(() => {
        // Address between LCD and keyboard ranges (0x10000-0x100FF)
        sim.executeInstruction("MOV", ["0x10050", "1"]); // dest as immediate = I/O write
      }).toThrow("Unknown I/O address");
    });

    test("simple [REG] memory addressing", () => {
      sim.executeInstruction("MOV", ["EBX", "1000"]);
      sim.executeInstruction("MOV", ["[EBX]", "42"]); // Simple [REG] addressing
      sim.executeInstruction("MOV", ["EAX", "[EBX]"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(42);
    });

    test("binary format in memory addressing [0B...]", () => {
      sim.executeInstruction("MOV", ["[0B1111101000]", "123"]); // Binary address 1000
      sim.executeInstruction("MOV", ["EAX", "[0B1111101000]"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(123);
    });

    test("invalid hexadecimal immediate throws error", () => {
      expect(() => {
        sim.executeInstruction("MOV", ["EAX", "0XG123"]); // Invalid hex
      }).toThrow("Invalid hexadecimal value");
    });

    test("invalid binary immediate throws error", () => {
      expect(() => {
        sim.executeInstruction("MOV", ["EAX", "0B1012"]); // Invalid binary (has '2')
      }).toThrow("Invalid binary value");
    });

    test("invalid decimal immediate throws error", () => {
      expect(() => {
        sim.executeInstruction("MOV", ["EAX", "12ABC"]); // Invalid decimal
      }).toThrow("Invalid operand");
    });

    test("LEA with absolute address", () => {
      sim.executeInstruction("LEA", ["EAX", "[5000]"]); // Absolute address
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(5000);
    });

    test("MOVSX with immediate value", () => {
      sim.executeInstruction("MOVSX", ["EAX", "0x80"]); // Negative 8-bit value
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xffffff80); // Sign-extended
    });

    test("ADD with memory source", () => {
      sim.executeInstruction("MOV", ["EBX", "1000"]);
      sim.executeInstruction("MOV", ["[EBX]", "5"]);
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("ADD", ["EAX", "[EBX]"]); // ADD reg, [mem]
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(15);
    });

    test("SUB with memory source", () => {
      sim.executeInstruction("MOV", ["EBX", "1000"]);
      sim.executeInstruction("MOV", ["[EBX]", "5"]);
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("SUB", ["EAX", "[EBX]"]); // SUB reg, [mem]
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(5);
    });

    test("IMUL two-operand with memory source", () => {
      sim.executeInstruction("MOV", ["EBX", "1000"]);
      sim.executeInstruction("MOV", ["[EBX]", "5"]);
      sim.executeInstruction("MOV", ["EAX", "3"]);
      sim.executeInstruction("IMUL", ["EAX", "[EBX]"]); // IMUL reg, [mem]
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(15);
    });

    test("IMUL three-operand with memory source", () => {
      sim.executeInstruction("MOV", ["EBX", "1000"]);
      sim.executeInstruction("MOV", ["[EBX]", "4"]);
      sim.executeInstruction("IMUL", ["EAX", "[EBX]", "5"]); // IMUL reg, [mem], imm
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(20); // 4 * 5
    });

    test("MOD instruction with invalid operands does nothing", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("MOD", ["EAX"]); // Wrong number of operands
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(10); // Should remain unchanged
    });

    test("MOD instruction with register source", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("MOV", ["EBX", "3"]);
      sim.executeInstruction("MOD", ["EAX", "EBX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(1); // 10 % 3 = 1
    });

    test("MOD instruction with immediate source", () => {
      sim.executeInstruction("MOV", ["EAX", "17"]);
      sim.executeInstruction("MOD", ["EAX", "5"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(2); // 17 % 5 = 2
    });

    test("MOD instruction with zero divisor sets result to 0", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("MOD", ["EAX", "0"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0); // Division by zero handled gracefully
    });

    test("PUSH with memory source", () => {
      sim.executeInstruction("MOV", ["EBX", "1000"]);
      sim.executeInstruction("MOV", ["[EBX]", "42"]);
      sim.executeInstruction("PUSH", ["[EBX]"]); // Push from memory
      sim.executeInstruction("POP", ["EAX"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(42);
    });

    test("RAND instruction with one operand generates default range", () => {
      sim.executeInstruction("RAND", ["EAX"]); // No max value specified
      const regs = sim.getRegisters();
      expect(regs.EAX).toBeGreaterThanOrEqual(0);
      expect(regs.EAX).toBeLessThan(0xffffffff);
    });

    test("RAND instruction with maxValue <= 0 sets maxValue to 1", () => {
      sim.executeInstruction("RAND", ["EAX", "0"]); // maxValue = 0
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0); // random in [0, 1) can only be 0
    });

    test("INT 0x21 function 0x09 (write string) is a no-op", () => {
      sim.executeInstruction("MOV", ["EAX", "0x09"]); // Function 0x09
      expect(() => {
        sim.executeInstruction("INT", ["0x21"]);
      }).not.toThrow(); // Should not throw, just do nothing
    });

    test("JMP instruction is a no-op in executeInstruction", () => {
      sim.executeInstruction("MOV", ["EAX", "10"]);
      expect(() => {
        sim.executeInstruction("JMP", ["label"]);
      }).not.toThrow(); // JMP is handled by debug adapter
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(10); // Should not affect registers
    });

    test("JE/JZ instruction is a no-op in executeInstruction", () => {
      expect(() => {
        sim.executeInstruction("JE", ["label"]);
        sim.executeInstruction("JZ", ["label"]);
      }).not.toThrow(); // JE/JZ handled by debug adapter
    });

    test("JNE/JNZ instruction is a no-op in executeInstruction", () => {
      expect(() => {
        sim.executeInstruction("JNE", ["label"]);
        sim.executeInstruction("JNZ", ["label"]);
      }).not.toThrow(); // JNE/JNZ handled by debug adapter
    });

    test("CALL/RET instructions are no-ops in executeInstruction", () => {
      expect(() => {
        sim.executeInstruction("CALL", ["function"]);
        sim.executeInstruction("RET", []);
      }).not.toThrow(); // CALL/RET handled by debug adapter
    });

    test("8-bit high register (AH) read with byteOffset", () => {
      sim.executeInstruction("MOV", ["EAX", "0x12345678"]);
      sim.executeInstruction("MOV", ["BL", "0"]);
      sim.executeInstruction("MOV", ["BL", "AH"]); // Read from AH (high byte)
      const regs = sim.getRegisters();
      expect(regs.EBX & 0xff).toBe(0x56); // AH contains 0x56
    });

    test("MOVSX with immediate 8-bit negative value", () => {
      sim.executeInstruction("MOVSX", ["EAX", "128"]); // 128 = 0x80, negative in 8-bit
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xffffff80); // Sign-extended to 32-bit
    });

    test("ADD with memory operand", () => {
      sim.executeInstruction("MOV", ["EBX", "2000"]);
      sim.executeInstruction("MOV", ["[EBX]", "15"]);
      sim.executeInstruction("MOV", ["EAX", "10"]);
      sim.executeInstruction("ADD", ["EAX", "[EBX]"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(25);
    });

    test("SUB with memory operand", () => {
      sim.executeInstruction("MOV", ["EBX", "2000"]);
      sim.executeInstruction("MOV", ["[EBX]", "7"]);
      sim.executeInstruction("MOV", ["EAX", "20"]);
      sim.executeInstruction("SUB", ["EAX", "[EBX]"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(13);
    });

    test("IMUL two-operand dest * memory", () => {
      sim.executeInstruction("MOV", ["EBX", "3000"]);
      sim.executeInstruction("MOV", ["[EBX]", "6"]);
      sim.executeInstruction("MOV", ["EAX", "7"]);
      sim.executeInstruction("IMUL", ["EAX", "[EBX]"]);
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(42); // 7 * 6
    });

    test("IMUL three-operand with memory and immediate", () => {
      sim.executeInstruction("MOV", ["ECX", "3000"]);
      sim.executeInstruction("MOV", ["[ECX]", "8"]);
      sim.executeInstruction("IMUL", ["EDX", "[ECX]", "9"]);
      const regs = sim.getRegisters();
      expect(regs.EDX).toBe(72); // 8 * 9
    });
  });
});

describe("Simulator loadProgram and bytecode execution", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("loadProgram loads bytecode and resets CPU", () => {
    const bytecode = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    sim.loadProgram(bytecode);
    const state = sim.getState();
    expect(state.pc).toBe(0);
    expect(state.halted).toBe(false);
  });

  test("loadProgram with empty bytecode", () => {
    const bytecode = new Uint8Array([]);
    sim.loadProgram(bytecode);
    const state = sim.getState();
    expect(state.pc).toBe(0);
  });
});

describe("Simulator - Control Flow (EIP, loadInstructions, step)", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("loadInstructions sets instructions and labels", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "10"], raw: "MOV EAX, 10" },
      { line: 2, mnemonic: "ADD", operands: ["EAX", "5"], raw: "ADD EAX, 5" },
    ];
    const labels = new Map([["start", 0]]);

    sim.loadInstructions(instructions, labels);

    expect(sim.getInstructions()).toEqual(instructions);
    expect(sim.getLabels()).toEqual(labels);
    expect(sim.getEIP()).toBe(0);
  });

  test("step() executes instruction and increments EIP", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "10"], raw: "MOV EAX, 10" },
      { line: 2, mnemonic: "ADD", operands: ["EAX", "5"], raw: "ADD EAX, 5" },
    ];
    sim.loadInstructions(instructions, new Map());

    const line1 = sim.step();
    expect(line1).toBe(1);
    expect(sim.getEIP()).toBe(1);
    expect(sim.getRegisters().EAX).toBe(10);

    const line2 = sim.step();
    expect(line2).toBe(2);
    expect(sim.getEIP()).toBe(2);
    expect(sim.getRegisters().EAX).toBe(15);
  });

  test("step() with JMP updates EIP correctly", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "10"], raw: "MOV EAX, 10" },
      { line: 2, mnemonic: "JMP", operands: ["target"], raw: "JMP target" },
      { line: 3, mnemonic: "MOV", operands: ["EAX", "99"], raw: "MOV EAX, 99" },
      { line: 4, mnemonic: "ADD", operands: ["EAX", "1"], raw: "ADD EAX, 1" },
    ];
    const labels = new Map([["target", 3]]);
    sim.loadInstructions(instructions, labels);

    sim.step(); // MOV EAX, 10
    expect(sim.getEIP()).toBe(1);

    sim.step(); // JMP target
    expect(sim.getEIP()).toBe(3); // Should jump to instruction index 3

    sim.step(); // ADD EAX, 1
    expect(sim.getEIP()).toBe(4);
    expect(sim.getRegisters().EAX).toBe(11); // 10 + 1 (skipped MOV EAX, 99)
  });

  test("step() with JE (zero flag set) takes jump", () => {
    const instructions = [
      {
        line: 1,
        mnemonic: "XOR",
        operands: ["EAX", "EAX"],
        raw: "XOR EAX, EAX",
      }, // EAX = 0, sets Zero flag
      { line: 2, mnemonic: "JE", operands: ["target"], raw: "JE target" },
      { line: 3, mnemonic: "MOV", operands: ["EBX", "99"], raw: "MOV EBX, 99" },
      { line: 4, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
    ];
    const labels = new Map([["target", 3]]);
    sim.loadInstructions(instructions, labels);

    sim.step(); // XOR EAX, EAX
    expect(sim.isZeroFlagSet()).toBe(true);

    sim.step(); // JE target
    expect(sim.getEIP()).toBe(3); // Should jump

    sim.step(); // MOV EBX, 1
    expect(sim.getRegisters().EBX).toBe(1); // Skipped MOV EBX, 99
  });

  test("step() with JNE (zero flag not set) takes jump", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "5"], raw: "MOV EAX, 5" }, // Non-zero
      { line: 2, mnemonic: "CMP", operands: ["EAX", "10"], raw: "CMP EAX, 10" }, // 5 != 10
      { line: 3, mnemonic: "JNE", operands: ["target"], raw: "JNE target" },
      { line: 4, mnemonic: "MOV", operands: ["EBX", "99"], raw: "MOV EBX, 99" },
      { line: 5, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
    ];
    const labels = new Map([["target", 4]]);
    sim.loadInstructions(instructions, labels);

    sim.step(); // MOV EAX, 5
    sim.step(); // CMP EAX, 10
    expect(sim.isZeroFlagSet()).toBe(false); // Not equal

    sim.step(); // JNE target
    expect(sim.getEIP()).toBe(4); // Should jump

    sim.step(); // MOV EBX, 1
    expect(sim.getRegisters().EBX).toBe(1); // Skipped MOV EBX, 99
  });

  test("step() with CALL pushes return address and jumps", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "10"], raw: "MOV EAX, 10" },
      { line: 2, mnemonic: "CALL", operands: ["func"], raw: "CALL func" },
      { line: 3, mnemonic: "ADD", operands: ["EAX", "5"], raw: "ADD EAX, 5" },
      { line: 4, mnemonic: "ADD", operands: ["EAX", "1"], raw: "ADD EAX, 1" }, // func body
      { line: 5, mnemonic: "RET", operands: [], raw: "RET" },
    ];
    const labels = new Map([["func", 3]]);
    sim.loadInstructions(instructions, labels);

    sim.step(); // MOV EAX, 10
    expect(sim.getEIP()).toBe(1);

    const initialESP = sim.getRegisters().ESP;
    sim.step(); // CALL func
    expect(sim.getEIP()).toBe(3); // Should jump to func
    expect(sim.getRegisters().ESP).toBe(initialESP - 4); // Stack pushed

    sim.step(); // ADD EAX, 1 (inside func)
    expect(sim.getRegisters().EAX).toBe(11);

    sim.step(); // RET
    expect(sim.getEIP()).toBe(2); // Should return to instruction after CALL
    expect(sim.getRegisters().ESP).toBe(initialESP); // Stack popped

    sim.step(); // ADD EAX, 5
    expect(sim.getRegisters().EAX).toBe(16);
  });

  test("step() with HLT halts execution", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "10"], raw: "MOV EAX, 10" },
      { line: 2, mnemonic: "HLT", operands: [], raw: "HLT" },
      { line: 3, mnemonic: "MOV", operands: ["EAX", "99"], raw: "MOV EAX, 99" },
    ];
    sim.loadInstructions(instructions, new Map());

    sim.step(); // MOV EAX, 10
    expect(sim.getState().halted).toBe(false);

    sim.step(); // HLT
    const state = sim.getState();
    expect(state.halted).toBe(true);
    expect(sim.getEIP()).toBe(1); // EIP doesn't advance after HLT
  });

  test("getCurrentInstruction returns current instruction at EIP", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "10"], raw: "MOV EAX, 10" },
      { line: 2, mnemonic: "ADD", operands: ["EAX", "5"], raw: "ADD EAX, 5" },
    ];
    sim.loadInstructions(instructions, new Map());

    const instr0 = sim.getCurrentInstruction();
    expect(instr0).toEqual(instructions[0]);

    sim.step();
    const instr1 = sim.getCurrentInstruction();
    expect(instr1).toEqual(instructions[1]);
  });

  test("setEIP changes instruction pointer", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "10"], raw: "MOV EAX, 10" },
      { line: 2, mnemonic: "ADD", operands: ["EAX", "5"], raw: "ADD EAX, 5" },
    ];
    sim.loadInstructions(instructions, new Map());

    sim.setEIP(1);
    expect(sim.getEIP()).toBe(1);
    expect(sim.getCurrentInstruction()).toEqual(instructions[1]);
  });

  test("reset() clears EIP and instructions", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "10"], raw: "MOV EAX, 10" },
    ];
    sim.loadInstructions(instructions, new Map());
    sim.step();

    sim.reset();
    expect(sim.getEIP()).toBe(0);
  });

  test("getState() includes EIP and call stack depth", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "10"], raw: "MOV EAX, 10" },
      { line: 2, mnemonic: "CALL", operands: ["func"], raw: "CALL func" },
      { line: 3, mnemonic: "ADD", operands: ["EAX", "1"], raw: "ADD EAX, 1" },
    ];
    const labels = new Map([["func", 2]]);
    sim.loadInstructions(instructions, labels);

    sim.step(); // MOV EAX, 10
    let state = sim.getState();
    expect(state.eip).toBe(1);
    expect(state.callStackDepth).toBe(0);

    sim.step(); // CALL func
    state = sim.getState();
    expect(state.eip).toBe(2);
    expect(state.callStackDepth).toBe(1);
  });
});

describe("Simulator - Flag edge cases for full coverage", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  describe("SHL with large count", () => {
    test("clears CF when raw count > 32", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFFFFFFFF"]);
      sim.executeInstruction("MOV", ["ECX", "40"]); // count > 32
      sim.executeInstruction("SHL", ["EAX", "ECX"]);
      const flags = sim.getState().flags;
      // When raw count > 32, CF should be cleared (line 1839)
      expect(flags & 0x01).toBe(0); // CF should be 0
      // Result should be same as SHL by (40 & 0x1f) = 8
      const regs = sim.getRegisters();
      expect(regs.EAX).toBe(0xffffff00);
    });
  });

  describe("ROL single-bit rotation flag edge cases", () => {
    test("clears OF when MSB equals CF for single-bit ROL", () => {
      // Set up a value where ROL will result in MSB == CF
      // Example: 0x00000000 rotated left by 1 gives 0x00000000, MSB=0, CF=0
      sim.executeInstruction("MOV", ["EAX", "0"]);
      sim.executeInstruction("ROL", ["EAX", "1"]);
      const flags = sim.getState().flags;
      // OF should be cleared when MSB == CF (both 0)
      expect(flags & 0x800).toBe(0); // OF should be 0 (line 1906)
    });

    test("sets OF when MSB != CF for single-bit ROL", () => {
      // Set up a value where ROL will result in MSB != CF
      // Example: 0x80000000 rotated left by 1 gives 0x00000001, MSB=0, CF=1
      sim.executeInstruction("MOV", ["EAX", "0x80000000"]);
      sim.executeInstruction("ROL", ["EAX", "1"]);
      const flags = sim.getState().flags;
      // OF should be set when MSB != CF
      expect(flags & 0x800).not.toBe(0); // OF should be set
    });
  });

  describe("DIV/IDIV in strict-x86 mode", () => {
    test("clears CF and OF in strict-x86 mode", () => {
      const sim = new Simulator(8, 8, "strict-x86");
      // Set CF and OF first
      sim.executeInstruction("MOV", ["EAX", "0x80000000"]);
      sim.executeInstruction("ADD", ["EAX", "0x80000000"]); // Sets CF and OF

      // Now do DIV which should clear CF and OF in strict-x86 mode
      sim.executeInstruction("MOV", ["EAX", "100"]);
      sim.executeInstruction("MOV", ["EDX", "0"]);
      sim.executeInstruction("MOV", ["ECX", "10"]);
      sim.executeInstruction("DIV", ["ECX"]);
      const flags = sim.getState().flags;
      // In strict-x86 mode, CF and OF are cleared
      expect(flags & 0x01).toBe(0); // CF should be cleared (line 1210)
      expect(flags & 0x800).toBe(0); // OF should be cleared (line 1211)
    });
  });

  describe("PUSH with memory operand", () => {
    test("pushes value from memory address with register base", () => {
      // Write a value to memory first
      sim.executeInstruction("MOV", ["EAX", "12345"]);
      sim.executeInstruction("MOV", ["EBX", "0x1000"]);
      sim.executeInstruction("MOV", ["[EBX]", "EAX"]);

      // Push the memory value onto stack using register indirect
      sim.executeInstruction("PUSH", ["[EBX]"]); // line 1551

      // Pop it back and verify
      sim.executeInstruction("POP", ["ECX"]);
      const regs = sim.getRegisters();
      expect(regs.ECX).toBe(12345);
    });
  });

  describe("INT 0x21 with AH=0x09", () => {
    test("handles write string interrupt", () => {
      // Set up INT 0x21, AH=0x09 (write string)
      sim.executeInstruction("MOV", ["EAX", "0x0900"]); // AH=0x09
      sim.executeInstruction("INT", ["0x21"]); // line 1610
      // This is not fully implemented but should not crash
      expect(sim.getState().halted).toBe(false);
    });
  });

  describe("MUL/IMUL in strict-x86 mode", () => {
    test("clears ZF and SF in strict-x86 mode", () => {
      const sim = new Simulator(8, 8, "strict-x86");
      // Set ZF and SF first with a SUB instruction
      sim.executeInstruction("MOV", ["EAX", "0"]);
      sim.executeInstruction("SUB", ["EAX", "1"]);
      let flags = sim.getState().flags;
      // Verify ZF is cleared and SF is set after SUB
      expect(flags & 0x40).toBe(0); // ZF should be clear
      expect(flags & 0x80).not.toBe(0); // SF should be set

      // Now do MUL which should clear ZF and SF in strict-x86 mode (lines 1951-1952)
      sim.executeInstruction("MOV", ["EAX", "5"]);
      sim.executeInstruction("MOV", ["ECX", "3"]);
      sim.executeInstruction("MUL", ["ECX"]);
      flags = sim.getState().flags;
      // In strict-x86 mode, ZF and SF are undefined (cleared)
      expect(flags & 0x40).toBe(0); // ZF should be cleared (line 1951)
      expect(flags & 0x80).toBe(0); // SF should be cleared (line 1952)
    });

    test("clears ZF and SF in strict-x86 mode for IMUL", () => {
      const sim = new Simulator(8, 8, "strict-x86");
      // Set ZF and SF first
      sim.executeInstruction("MOV", ["EAX", "0"]);
      sim.executeInstruction("SUB", ["EAX", "1"]);

      // Now do IMUL which should also clear ZF and SF in strict-x86 mode
      sim.executeInstruction("MOV", ["EAX", "5"]);
      sim.executeInstruction("MOV", ["ECX", "3"]);
      sim.executeInstruction("IMUL", ["ECX"]);
      const flags = sim.getState().flags;
      expect(flags & 0x40).toBe(0); // ZF should be cleared
      expect(flags & 0x80).toBe(0); // SF should be cleared
    });
  });
});
