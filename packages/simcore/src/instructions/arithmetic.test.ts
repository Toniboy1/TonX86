import { Simulator } from "../simulator/index";

describe("executeInstruction - ADD", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("ADD two registers", () => {
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("MOV", ["EBX", "20"]);
    sim.executeInstruction("ADD", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(30);
  });

  test("ADD immediate to register", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("ADD", ["EAX", "3"]);
    expect(sim.getRegisters().EAX).toBe(8);
  });

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

  test("ADD sets overflow on positive + positive = negative", () => {
    sim.executeInstruction("MOV", ["EAX", "0x7FFFFFFF"]);
    sim.executeInstruction("ADD", ["EAX", "1"]);
    expect(sim.isOverflowFlagSet()).toBe(true);
    expect(sim.isSignFlagSet()).toBe(true);
  });

  test("ADD clears overflow on no signed overflow", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("ADD", ["EAX", "3"]);
    expect(sim.isOverflowFlagSet()).toBe(false);
  });

  test("ADD with memory source", () => {
    sim.executeInstruction("MOV", ["EBX", "1000"]);
    sim.executeInstruction("MOV", ["[EBX]", "5"]);
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("ADD", ["EAX", "[EBX]"]);
    expect(sim.getRegisters().EAX).toBe(15);
  });

  test("ADD operand guard (wrong arg count)", () => {
    expect(() => sim.executeInstruction("ADD", ["EAX"])).not.toThrow();
  });

  test("SUB operand guard", () => {
    expect(() => sim.executeInstruction("SUB", ["EAX"])).not.toThrow();
  });
});

describe("executeInstruction - SUB", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("SUB two registers", () => {
    sim.executeInstruction("MOV", ["EAX", "20"]);
    sim.executeInstruction("MOV", ["EBX", "5"]);
    sim.executeInstruction("SUB", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(15);
  });

  test("SUB immediate from register", () => {
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("SUB", ["EAX", "3"]);
    expect(sim.getRegisters().EAX).toBe(7);
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

  test("SUB sets overflow on signed overflow", () => {
    sim.executeInstruction("MOV", ["EAX", "0x7FFFFFFF"]);
    sim.executeInstruction("MOV", ["ECX", "0xFFFFFFFF"]);
    sim.executeInstruction("SUB", ["EAX", "ECX"]);
    expect(sim.isOverflowFlagSet()).toBe(true);
  });

  test("SUB with memory source", () => {
    sim.executeInstruction("MOV", ["EBX", "1000"]);
    sim.executeInstruction("MOV", ["[EBX]", "5"]);
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("SUB", ["EAX", "[EBX]"]);
    expect(sim.getRegisters().EAX).toBe(5);
  });
});

describe("executeInstruction - INC/DEC", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("INC increments register", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("INC", ["EAX"]);
    expect(sim.getRegisters().EAX).toBe(6);
  });

  test("DEC decrements register", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("DEC", ["EAX"]);
    expect(sim.getRegisters().EAX).toBe(4);
  });

  test("INC preserves carry flag when set", () => {
    sim.executeInstruction("MOV", ["EAX", "0xFFFFFFFF"]);
    sim.executeInstruction("ADD", ["EAX", "1"]);
    expect(sim.isCarryFlagSet()).toBe(true);

    sim.executeInstruction("MOV", ["EBX", "5"]);
    sim.executeInstruction("INC", ["EBX"]);
    expect(sim.isCarryFlagSet()).toBe(true);
    expect(sim.getRegisters().EBX).toBe(6);
  });

  test("DEC preserves carry flag when set", () => {
    sim.executeInstruction("MOV", ["EAX", "0xFFFFFFFF"]);
    sim.executeInstruction("ADD", ["EAX", "1"]);
    expect(sim.isCarryFlagSet()).toBe(true);

    sim.executeInstruction("MOV", ["EBX", "5"]);
    sim.executeInstruction("DEC", ["EBX"]);
    expect(sim.isCarryFlagSet()).toBe(true);
    expect(sim.getRegisters().EBX).toBe(4);
  });

  test("INC preserves carry flag when clear", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("ADD", ["EAX", "3"]);
    expect(sim.isCarryFlagSet()).toBe(false);

    sim.executeInstruction("INC", ["EAX"]);
    expect(sim.isCarryFlagSet()).toBe(false);
  });

  test("INC operand guard", () => {
    expect(() => sim.executeInstruction("INC", [])).not.toThrow();
  });

  test("DEC operand guard", () => {
    expect(() => sim.executeInstruction("DEC", [])).not.toThrow();
  });
});

describe("executeInstruction - CMP", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("CMP sets zero flag when equal", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("CMP", ["EAX", "5"]);
    expect(sim.isZeroFlagSet()).toBe(true);
  });

  test("CMP clears zero flag when not equal", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("CMP", ["EAX", "10"]);
    expect(sim.isZeroFlagSet()).toBe(false);
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

  test("CMP operand guard", () => {
    expect(() => sim.executeInstruction("CMP", ["EAX"])).not.toThrow();
  });
});

describe("executeInstruction - MUL/IMUL", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("MUL multiplies EAX by register", () => {
    sim.executeInstruction("MOV", ["EAX", "6"]);
    sim.executeInstruction("MOV", ["ECX", "7"]);
    sim.executeInstruction("MUL", ["ECX"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("IMUL single-operand form", () => {
    sim.executeInstruction("MOV", ["EAX", "6"]);
    sim.executeInstruction("MOV", ["ECX", "7"]);
    sim.executeInstruction("IMUL", ["ECX"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("IMUL two-operand: dest = dest * src", () => {
    sim.executeInstruction("MOV", ["EAX", "7"]);
    sim.executeInstruction("IMUL", ["EAX", "6"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("IMUL two-operand with registers", () => {
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("MOV", ["ECX", "3"]);
    sim.executeInstruction("IMUL", ["EAX", "ECX"]);
    expect(sim.getRegisters().EAX).toBe(30);
  });

  test("IMUL three-operand: dest = src * imm", () => {
    sim.executeInstruction("MOV", ["ECX", "8"]);
    sim.executeInstruction("IMUL", ["EAX", "ECX", "5"]);
    expect(sim.getRegisters().EAX).toBe(40);
  });

  test("IMUL three-operand with negative multiplier", () => {
    sim.executeInstruction("MOV", ["ECX", "10"]);
    sim.executeInstruction("IMUL", ["EAX", "ECX", "-3"]);
    expect(sim.getRegisters().EAX).toBe(0xffffffe2);
  });

  test("IMUL two-operand with memory source", () => {
    sim.executeInstruction("MOV", ["EBX", "1000"]);
    sim.executeInstruction("MOV", ["[EBX]", "5"]);
    sim.executeInstruction("MOV", ["EAX", "3"]);
    sim.executeInstruction("IMUL", ["EAX", "[EBX]"]);
    expect(sim.getRegisters().EAX).toBe(15);
  });

  test("IMUL three-operand with memory source", () => {
    sim.executeInstruction("MOV", ["EBX", "1000"]);
    sim.executeInstruction("MOV", ["[EBX]", "4"]);
    sim.executeInstruction("IMUL", ["EAX", "[EBX]", "5"]);
    expect(sim.getRegisters().EAX).toBe(20);
  });

  test("MUL operand guard", () => {
    expect(() => sim.executeInstruction("MUL", [])).not.toThrow();
  });

  test("IMUL operand guards", () => {
    expect(() => sim.executeInstruction("IMUL", ["5", "EAX"])).not.toThrow();
    expect(() =>
      sim.executeInstruction("IMUL", ["5", "EAX", "2"]),
    ).not.toThrow();
  });

  test("MUL/IMUL in strict-x86 mode clears ZF and SF", () => {
    const strictSim = new Simulator(8, 8, "strict-x86");
    strictSim.executeInstruction("MOV", ["EAX", "0"]);
    strictSim.executeInstruction("SUB", ["EAX", "1"]);

    strictSim.executeInstruction("MOV", ["EAX", "5"]);
    strictSim.executeInstruction("MOV", ["ECX", "3"]);
    strictSim.executeInstruction("MUL", ["ECX"]);
    const flags = strictSim.getState().flags;
    expect(flags & 0x40).toBe(0); // ZF cleared
    expect(flags & 0x80).toBe(0); // SF cleared
  });

  test("IMUL in strict-x86 mode clears ZF and SF", () => {
    const strictSim = new Simulator(8, 8, "strict-x86");
    strictSim.executeInstruction("MOV", ["EAX", "0"]);
    strictSim.executeInstruction("SUB", ["EAX", "1"]);

    strictSim.executeInstruction("MOV", ["EAX", "5"]);
    strictSim.executeInstruction("MOV", ["ECX", "3"]);
    strictSim.executeInstruction("IMUL", ["ECX"]);
    const flags = strictSim.getState().flags;
    expect(flags & 0x40).toBe(0);
    expect(flags & 0x80).toBe(0);
  });
});

describe("executeInstruction - DIV/IDIV", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("DIV divides EAX by register", () => {
    sim.executeInstruction("MOV", ["EAX", "42"]);
    sim.executeInstruction("MOV", ["ECX", "7"]);
    sim.executeInstruction("DIV", ["ECX"]);
    expect(sim.getRegisters().EAX).toBe(6);
  });

  test("DIV stores remainder in EDX", () => {
    sim.executeInstruction("MOV", ["EAX", "43"]);
    sim.executeInstruction("MOV", ["ECX", "7"]);
    sim.executeInstruction("DIV", ["ECX"]);
    expect(sim.getRegisters().EAX).toBe(6);
    expect(sim.getRegisters().EDX).toBe(1);
  });

  test("IDIV performs signed division", () => {
    sim.executeInstruction("MOV", ["EAX", "42"]);
    sim.executeInstruction("MOV", ["ECX", "7"]);
    sim.executeInstruction("IDIV", ["ECX"]);
    expect(sim.getRegisters().EAX).toBe(6);
  });

  test("DIV/IDIV in strict-x86 mode clears CF and OF", () => {
    const strictSim = new Simulator(8, 8, "strict-x86");
    strictSim.executeInstruction("MOV", ["EAX", "0x80000000"]);
    strictSim.executeInstruction("ADD", ["EAX", "0x80000000"]);

    strictSim.executeInstruction("MOV", ["EAX", "100"]);
    strictSim.executeInstruction("MOV", ["EDX", "0"]);
    strictSim.executeInstruction("MOV", ["ECX", "10"]);
    strictSim.executeInstruction("DIV", ["ECX"]);
    const flags = strictSim.getState().flags;
    expect(flags & 0x01).toBe(0); // CF cleared
    expect(flags & 0x800).toBe(0); // OF cleared
  });

  test("IDIV in strict-x86 mode clears CF and OF", () => {
    const strictSim = new Simulator(8, 8, "strict-x86");
    strictSim.executeInstruction("MOV", ["EAX", "10"]);
    strictSim.executeInstruction("MOV", ["EBX", "2"]);
    strictSim.executeInstruction("IDIV", ["EBX"]);
    const flags = strictSim.getState().flags;
    expect(flags & 0x01).toBe(0);
    expect(flags & 0x800).toBe(0);
  });

  test("DIV operand guard", () => {
    expect(() => sim.executeInstruction("DIV", [])).not.toThrow();
  });

  test("IDIV with zero divisor sets EAX and EDX to 0", () => {
    sim.executeInstruction("MOV", ["EAX", "100"]);
    sim.executeInstruction("MOV", ["ECX", "0"]);
    sim.executeInstruction("IDIV", ["ECX"]);
    expect(sim.getRegisters().EAX).toBe(0);
    expect(sim.getRegisters().EDX).toBe(0);
  });

  test("IDIV operand guard", () => {
    expect(() => sim.executeInstruction("IDIV", [])).not.toThrow();
  });
});

describe("executeInstruction - MOD", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("MOD instruction with register source", () => {
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("MOV", ["EBX", "3"]);
    sim.executeInstruction("MOD", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(1);
  });

  test("MOD instruction with immediate source", () => {
    sim.executeInstruction("MOV", ["EAX", "17"]);
    sim.executeInstruction("MOD", ["EAX", "5"]);
    expect(sim.getRegisters().EAX).toBe(2);
  });

  test("MOD instruction with zero divisor sets result to 0", () => {
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("MOD", ["EAX", "0"]);
    expect(sim.getRegisters().EAX).toBe(0);
  });

  test("MOD instruction with invalid operands does nothing", () => {
    sim.executeInstruction("MOV", ["EAX", "10"]);
    sim.executeInstruction("MOD", ["EAX"]);
    expect(sim.getRegisters().EAX).toBe(10);
  });

  test("MOD operand guard", () => {
    expect(() => sim.executeInstruction("MOD", ["5", "2"])).not.toThrow();
  });
});
