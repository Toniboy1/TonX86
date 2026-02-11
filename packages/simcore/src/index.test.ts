import { Simulator, CompatibilityMode } from "./index";

describe("index exports", () => {
  test("exports Simulator", () => {
    expect(Simulator).toBeDefined();
    const sim = new Simulator();
    expect(sim).toBeInstanceOf(Simulator);
  });

  test("can create Simulator with different compatibility modes", () => {
    const sim1 = new Simulator(8, 8, "default" as CompatibilityMode);
    expect(sim1).toBeInstanceOf(Simulator);

    const sim2 = new Simulator(8, 8, "compatibility" as CompatibilityMode);
    expect(sim2).toBeInstanceOf(Simulator);
  });
});
