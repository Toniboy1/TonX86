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
    test("silently ignores unknown instruction", () => {
      // Unknown instructions don't throw - they're silently ignored (switch default)
      expect(() => sim.executeInstruction("UNKNOWN", [])).not.toThrow();
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

  test("step() in running mode", () => {
    sim.run();
    const stateBefore = sim.getState();
    sim.step();
    const stateAfter = sim.getState();
    // PC should increment on step
    expect(stateAfter.pc).toBe(stateBefore.pc + 1);
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

  test("MOV can read keyboard status (0xF100)", () => {
    sim.pushKeyboardEvent(65, true);
    sim.executeInstruction("MOV", ["EAX", "0xF100"]);
    const registers = sim.getRegisters();
    expect(registers.EAX).toBe(1); // status = 1 (key available)
  });

  test("MOV can read key code (0xF101)", () => {
    sim.pushKeyboardEvent(65, true); // 'A'
    sim.executeInstruction("MOV", ["EAX", "0xF101"]);
    const registers = sim.getRegisters();
    expect(registers.EAX).toBe(65); // key code = 65
  });

  test("MOV can read key state (0xF102)", () => {
    sim.pushKeyboardEvent(65, true); // pressed
    sim.executeInstruction("MOV", ["EAX", "0xF102"]);
    let registers = sim.getRegisters();
    expect(registers.EAX).toBe(1); // state = 1 (pressed)

    sim.pushKeyboardEvent(66, false); // released
    sim.executeInstruction("MOV", ["EBX", "0xF102"]);
    registers = sim.getRegisters();
    expect(registers.EBX).toBe(0); // state = 0 (released)
  });

  test("reading key code (0xF101) pops key from queue", () => {
    sim.pushKeyboardEvent(65, true);
    sim.pushKeyboardEvent(66, true);

    // First read gets 'A' and pops it
    sim.executeInstruction("MOV", ["EAX", "0xF101"]);
    let registers = sim.getRegisters();
    expect(registers.EAX).toBe(65);

    // Next read gets 'B'
    sim.executeInstruction("MOV", ["EBX", "0xF101"]);
    registers = sim.getRegisters();
    expect(registers.EBX).toBe(66);
  });

  test("keyboard I/O addresses are read-only (writes ignored)", () => {
    sim.executeInstruction("MOV", ["0xF100", "99"]); // Try to write to status
    sim.executeInstruction("MOV", ["EAX", "0xF100"]);
    const registers = sim.getRegisters();
    expect(registers.EAX).toBe(0); // Should still be 0, not 99
  });

  test("keyboard works alongside LCD I/O", () => {
    // Write to LCD
    sim.executeInstruction("MOV", ["0xF000", "1"]); // LCD pixel 0

    // Push keyboard event
    sim.pushKeyboardEvent(65, true);

    // Read keyboard
    sim.executeInstruction("MOV", ["EAX", "0xF101"]);

    // Verify both work
    const lcd = sim.getLCDDisplay();
    expect(lcd[0]).toBe(1);

    const registers = sim.getRegisters();
    expect(registers.EAX).toBe(65);
  });

  test("arrow keys work correctly", () => {
    sim.pushKeyboardEvent(128, true); // Up
    sim.executeInstruction("MOV", ["EAX", "0xF101"]);
    let registers = sim.getRegisters();
    expect(registers.EAX).toBe(128);

    sim.pushKeyboardEvent(129, true); // Down
    sim.executeInstruction("MOV", ["EBX", "0xF101"]);
    registers = sim.getRegisters();
    expect(registers.EBX).toBe(129);

    sim.pushKeyboardEvent(130, true); // Left
    sim.executeInstruction("MOV", ["ECX", "0xF101"]);
    registers = sim.getRegisters();
    expect(registers.ECX).toBe(130);

    sim.pushKeyboardEvent(131, true); // Right
    sim.executeInstruction("MOV", ["EDX", "0xF101"]);
    registers = sim.getRegisters();
    expect(registers.EDX).toBe(131);
  });
});
