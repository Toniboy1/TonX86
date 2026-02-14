import { CPUState } from "./cpu";

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
      cpu.addBreakpoint(100);
      cpu.addBreakpoint(200);
      cpu.addBreakpoint(300);
      expect(cpu.hasBreakpoint(100)).toBe(true);
      expect(cpu.hasBreakpoint(200)).toBe(true);
      expect(cpu.hasBreakpoint(300)).toBe(true);
      expect(cpu.hasBreakpoint(400)).toBe(false);
    });
  });

  test("reset clears all state", () => {
    cpu.registers[0] = 42;
    cpu.flags = 0xff;
    cpu.halted = true;
    cpu.running = true;

    cpu.reset();

    expect(cpu.registers[0]).toBe(0);
    expect(cpu.flags).toBe(0);
    expect(cpu.halted).toBe(false);
    expect(cpu.running).toBe(false);
    expect(cpu.registers[4]).toBe(0xffff); // ESP initialized
  });
});
