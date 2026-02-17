import { LCDDisplay } from "./lcd";
import { Simulator } from "../simulator/index";

describe("LCDDisplay class", () => {
  test("default constructor creates 8x8 display", () => {
    const lcd = new LCDDisplay();
    expect(lcd.getWidth()).toBe(8);
    expect(lcd.getHeight()).toBe(8);
    expect(lcd.getDisplay().length).toBe(64);
  });

  test("custom size constructor", () => {
    const lcd = new LCDDisplay(16, 32);
    expect(lcd.getWidth()).toBe(16);
    expect(lcd.getHeight()).toBe(32);
    expect(lcd.getDisplay().length).toBe(512);
  });

  test("constructor validates dimensions (too small)", () => {
    expect(() => new LCDDisplay(1, 8)).toThrow("LCD dimensions must be between 2x2 and 256x256");
  });

  test("constructor validates dimensions (not power of 2)", () => {
    expect(() => new LCDDisplay(3, 8)).toThrow("LCD dimensions must be powers of 2");
  });

  test("getPixel returns 0 for unset pixel", () => {
    const lcd = new LCDDisplay(8, 8);
    expect(lcd.getPixel(0, 0)).toBe(0);
  });

  test("setPixel / getPixel round-trip", () => {
    const lcd = new LCDDisplay(8, 8);
    lcd.setPixel(3, 4, 1);
    expect(lcd.getPixel(3, 4)).toBe(1);
  });

  test("setPixel with value 0 clears pixel", () => {
    const lcd = new LCDDisplay(8, 8);
    lcd.setPixel(3, 4, 1);
    expect(lcd.getPixel(3, 4)).toBe(1);
    lcd.setPixel(3, 4, 0);
    expect(lcd.getPixel(3, 4)).toBe(0);
  });

  test("getPixel returns 0 for out-of-bounds", () => {
    const lcd = new LCDDisplay(8, 8);
    expect(lcd.getPixel(-1, 0)).toBe(0);
    expect(lcd.getPixel(0, -1)).toBe(0);
    expect(lcd.getPixel(8, 0)).toBe(0);
    expect(lcd.getPixel(0, 8)).toBe(0);
  });

  test("setPixel ignores out-of-bounds", () => {
    const lcd = new LCDDisplay(8, 8);
    lcd.setPixel(-1, 0, 1); // Should not throw
    lcd.setPixel(8, 0, 1);
    expect(lcd.getPixel(0, 0)).toBe(0); // Unaffected
  });

  test("clear resets all pixels", () => {
    const lcd = new LCDDisplay(4, 4);
    lcd.setPixel(0, 0, 1);
    lcd.setPixel(1, 1, 1);
    lcd.clear();
    expect(lcd.getPixel(0, 0)).toBe(0);
    expect(lcd.getPixel(1, 1)).toBe(0);
  });

  test("getDisplay returns a copy", () => {
    const lcd = new LCDDisplay(4, 4);
    lcd.setPixel(0, 0, 1);
    const display = lcd.getDisplay();
    display[0] = 99; // mutate the copy
    expect(lcd.getPixel(0, 0)).toBe(1); // original unaffected
  });
});

describe("LCD Memory-mapped I/O", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator(8, 8);
  });

  test("writes a single pixel via MOV to IO address", () => {
    sim.executeInstruction("MOV", ["0xF000", "1"]);
    const display = sim.getLCDDisplay();
    expect(display[0]).toBe(1);
  });

  test("writes multiple pixels via MOV to IO addresses", () => {
    sim.executeInstruction("MOV", ["0xF001", "1"]);
    sim.executeInstruction("MOV", ["0xF008", "1"]);
    const display = sim.getLCDDisplay();
    expect(display[1]).toBe(1);
    expect(display[8]).toBe(1);
  });

  test("out of bounds LCD write is silently ignored", () => {
    const outOfBoundsAddr = (0xf000 + 8 * 8).toString(16);
    expect(() => {
      sim.executeInstruction("MOV", [`0x${outOfBoundsAddr}`, "1"]);
    }).not.toThrow();
  });
});
