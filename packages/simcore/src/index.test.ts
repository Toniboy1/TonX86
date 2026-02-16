import { Simulator, CPUState, Memory, LCDDisplay, Keyboard } from ".";
import type { CompatibilityMode, Instruction } from ".";

describe("index exports", () => {
  test("exports Simulator class", () => {
    expect(Simulator).toBeDefined();
    const sim = new Simulator();
    expect(sim).toBeInstanceOf(Simulator);
  });

  test("exports CPUState class", () => {
    expect(CPUState).toBeDefined();
    const cpu = new CPUState();
    expect(cpu.registers.length).toBe(8);
    cpu.reset();
    expect(cpu.pc).toBe(0);
  });

  test("exports Memory class", () => {
    expect(Memory).toBeDefined();
    const mem = new Memory();
    mem.writeA(0, 42);
    expect(mem.readA(0)).toBe(42);
    mem.writeB(0, 99);
    expect(mem.readB(0)).toBe(99);
    mem.clear();
    expect(mem.readA(0)).toBe(0);
  });

  test("exports LCDDisplay class", () => {
    expect(LCDDisplay).toBeDefined();
    const lcd = new LCDDisplay(4, 4);
    lcd.setPixel(0, 0, 1);
    expect(lcd.getPixel(0, 0)).toBe(1);
    expect(lcd.getWidth()).toBe(4);
    expect(lcd.getHeight()).toBe(4);
    lcd.clear();
    expect(lcd.getPixel(0, 0)).toBe(0);
    expect(lcd.getDisplay().length).toBe(16);
  });

  test("exports Keyboard class", () => {
    expect(Keyboard).toBeDefined();
    const kb = new Keyboard();
    kb.pushKey(65, true);
    expect(kb.getStatus()).toBe(1);
    expect(kb.getKeyCode()).toBe(65);
    expect(kb.getKeyState()).toBe(1);
    expect(kb.popKey()).toBe(true);
    kb.clear();
    expect(kb.getStatus()).toBe(0);
  });

  test("CompatibilityMode type works correctly", () => {
    const mode: CompatibilityMode = "educational";
    expect(mode).toBe("educational");

    const strict: CompatibilityMode = "strict-x86";
    expect(strict).toBe("strict-x86");
  });

  test("Instruction type is usable", () => {
    const instr: Instruction = {
      line: 1,
      mnemonic: "MOV",
      operands: ["EAX", "42"],
      raw: "MOV EAX, 42",
    };
    expect(instr.mnemonic).toBe("MOV");
  });
});
