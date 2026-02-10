import { Simulator } from "./simulator";

describe("LCD Memory-mapped I/O", () => {
  let sim: Simulator;

  beforeEach(() => {
    // default LCD is 8x8
    sim = new Simulator(8, 8);
  });

  test("writes a single pixel via MOV to IO address", () => {
    // Address 0xF000 maps to (0,0)
    sim.executeInstruction("MOV", ["0xF000", "1"]);
    const display = sim.getLCDDisplay();
    expect(display[0]).toBe(1);
  });

  test("writes multiple pixels via MOV to IO addresses", () => {
    // (1,0) -> 0xF000 + 1
    // (0,1) -> 0xF000 + 8 (width=8)
    sim.executeInstruction("MOV", ["0xF001", "1"]);
    sim.executeInstruction("MOV", ["0xF008", "1"]);
    const display = sim.getLCDDisplay();
    expect(display[1]).toBe(1);
    expect(display[8]).toBe(1);
  });

  test("out of bounds LCD write is silently ignored (graceful degradation)", () => {
    // For 8x8 LCD, valid addresses are 0xF000 .. 0xF000+63
    const outOfBoundsAddr = (0xf000 + 8 * 8).toString(16); // 0xf040
    // Should not throw - graceful degradation
    expect(() => {
      sim.executeInstruction("MOV", [`0x${outOfBoundsAddr}`, "1"]);
    }).not.toThrow();
  });
});
