import { Simulator } from "../simulator/index";

describe("executeInstruction - Jump instructions now execute", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("jump instructions throw when label not found", () => {
    const jumpMnemonics = [
      "JMP",
      "JE",
      "JZ",
      "JNE",
      "JNZ",
      "JG",
      "JGE",
      "JL",
      "JLE",
      "JS",
      "JNS",
      "JA",
      "JAE",
      "JB",
      "JBE",
    ];
    for (const mnemonic of jumpMnemonics) {
      expect(() => sim.executeInstruction(mnemonic, ["label"])).toThrow(
        /Jump target "label" not found/,
      );
    }
  });

  test("CALL throws when target not found", () => {
    expect(() => sim.executeInstruction("CALL", ["function"])).toThrow(
      'CALL target "function" not found in labels',
    );
  });

  test("RET increments EIP when call stack is empty", () => {
    const initialEIP = sim.getEIP();
    sim.executeInstruction("RET", []);
    expect(sim.getEIP()).toBe(initialEIP + 1);
  });

  test("jump instructions with wrong operand count are ignored", () => {
    const jumpMnemonics = [
      "JMP",
      "JE",
      "JNE",
      "JG",
      "JGE",
      "JL",
      "JLE",
      "JS",
      "JNS",
      "JA",
      "JAE",
      "JB",
      "JBE",
    ];
    for (const mnemonic of jumpMnemonics) {
      const initialEIP = sim.getEIP();
      sim.executeInstruction(mnemonic, []); // No operands
      expect(sim.getEIP()).toBe(initialEIP); // EIP unchanged
      sim.executeInstruction(mnemonic, ["label1", "label2"]); // Too many operands
      expect(sim.getEIP()).toBe(initialEIP); // EIP unchanged
    }
  });

  test("CALL with wrong operand count is ignored", () => {
    const initialEIP = sim.getEIP();
    sim.executeInstruction("CALL", []); // No operands
    expect(sim.getEIP()).toBe(initialEIP); // EIP unchanged
  });
});

describe("executeInstruction - CMOVxx (Conditional Move)", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("CMOVE moves when ZF is set", () => {
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("CMP", ["EAX", "0"]); // ZF=1
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVE", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("CMOVE does not move when ZF is clear", () => {
    sim.executeInstruction("MOV", ["EAX", "1"]);
    sim.executeInstruction("CMP", ["EAX", "0"]); // ZF=0
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVE", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(1);
  });

  test("CMOVZ is alias for CMOVE", () => {
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("CMP", ["EAX", "0"]); // ZF=1
    sim.executeInstruction("MOV", ["EBX", "99"]);
    sim.executeInstruction("CMOVZ", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(99);
  });

  test("CMOVNE moves when ZF is clear", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("CMP", ["EAX", "3"]); // ZF=0
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVNE", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("CMOVNE does not move when ZF is set", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("CMP", ["EAX", "5"]); // ZF=1
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVNE", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(5);
  });

  test("CMOVNZ is alias for CMOVNE", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("CMP", ["EAX", "3"]); // ZF=0
    sim.executeInstruction("MOV", ["EBX", "77"]);
    sim.executeInstruction("CMOVNZ", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(77);
  });

  test("CMOVL moves when SF != OF", () => {
    sim.executeInstruction("MOV", ["EAX", "1"]);
    sim.executeInstruction("CMP", ["EAX", "2"]); // 1-2 < 0 => SF=1, OF=0
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVL", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("CMOVL does not move when SF == OF", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("CMP", ["EAX", "3"]); // 5-3 > 0 => SF=0, OF=0
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVL", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(5);
  });

  test("CMOVLE moves when SF != OF or ZF set", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("CMP", ["EAX", "5"]); // ZF=1
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVLE", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("CMOVG moves when SF == OF and ZF clear", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("CMP", ["EAX", "3"]); // 5>3 => SF=0, OF=0, ZF=0
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVG", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("CMOVG does not move when ZF is set", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("CMP", ["EAX", "5"]); // ZF=1
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVG", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(5);
  });

  test("CMOVGE moves when SF == OF", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("CMP", ["EAX", "5"]); // SF=0, OF=0
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVGE", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("CMOVA moves when CF=0 and ZF=0 (unsigned above)", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("CMP", ["EAX", "3"]); // CF=0, ZF=0
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVA", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("CMOVA does not move when CF set", () => {
    sim.executeInstruction("MOV", ["EAX", "1"]);
    sim.executeInstruction("CMP", ["EAX", "5"]); // CF=1
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVA", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(1);
  });

  test("CMOVAE moves when CF=0", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("CMP", ["EAX", "5"]); // CF=0, ZF=1
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVAE", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("CMOVB moves when CF=1", () => {
    sim.executeInstruction("MOV", ["EAX", "1"]);
    sim.executeInstruction("CMP", ["EAX", "5"]); // CF=1
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVB", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("CMOVBE moves when CF=1 or ZF=1", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("CMP", ["EAX", "5"]); // ZF=1
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVBE", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("CMOVS moves when SF=1", () => {
    sim.executeInstruction("MOV", ["EAX", "1"]);
    sim.executeInstruction("CMP", ["EAX", "2"]); // result negative => SF=1
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVS", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("CMOVS does not move when SF=0", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("CMP", ["EAX", "3"]); // SF=0
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVS", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(5);
  });

  test("CMOVNS moves when SF=0", () => {
    sim.executeInstruction("MOV", ["EAX", "5"]);
    sim.executeInstruction("CMP", ["EAX", "3"]); // SF=0
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVNS", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(42);
  });

  test("CMOVNS does not move when SF=1", () => {
    sim.executeInstruction("MOV", ["EAX", "1"]);
    sim.executeInstruction("CMP", ["EAX", "2"]); // SF=1
    sim.executeInstruction("MOV", ["EBX", "42"]);
    sim.executeInstruction("CMOVNS", ["EAX", "EBX"]);
    expect(sim.getRegisters().EAX).toBe(1);
  });

  test("CMOVxx with wrong operand count is ignored", () => {
    expect(() => sim.executeInstruction("CMOVE", ["EAX"])).not.toThrow();
  });

  test("CMOVxx with non-register dest is ignored", () => {
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("CMP", ["EAX", "0"]); // ZF=1
    expect(() => sim.executeInstruction("CMOVE", ["42", "EAX"])).not.toThrow();
  });

  test("CMOVxx resolves immediate source", () => {
    sim.executeInstruction("MOV", ["EAX", "0"]);
    sim.executeInstruction("CMP", ["EAX", "0"]); // ZF=1
    sim.executeInstruction("CMOVE", ["EAX", "99"]);
    expect(sim.getRegisters().EAX).toBe(99);
  });
});

describe("executeInstruction - LOOP/LOOPE/LOOPNE (via step)", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("LOOP decrements ECX and branches when ECX != 0", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["ECX", "3"], raw: "MOV ECX, 3" },
      { line: 2, mnemonic: "INC", operands: ["EAX"], raw: "INC EAX" },
      { line: 3, mnemonic: "LOOP", operands: ["body"], raw: "LOOP body" },
      { line: 4, mnemonic: "HLT", operands: [], raw: "HLT" },
    ];
    const labels = new Map([["body", 1]]);
    sim.loadInstructions(instructions, labels);
    // Run until halted
    for (let i = 0; i < 20 && !sim.getState().halted; i++) {
      sim.step();
    }
    expect(sim.getRegisters().EAX).toBe(3); // 3 iterations
    expect(sim.getRegisters().ECX).toBe(0);
  });

  test("LOOP with ECX=1 falls through after decrement", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["ECX", "1"], raw: "MOV ECX, 1" },
      { line: 2, mnemonic: "LOOP", operands: ["body"], raw: "LOOP body" },
      { line: 3, mnemonic: "HLT", operands: [], raw: "HLT" },
    ];
    const labels = new Map([["body", 1]]);
    sim.loadInstructions(instructions, labels);
    sim.step(); // MOV ECX, 1
    sim.step(); // LOOP: ECX becomes 0, falls through
    expect(sim.getRegisters().ECX).toBe(0);
    expect(sim.getEIP()).toBe(2); // at HLT
  });

  test("LOOPE branches when ECX != 0 AND ZF set", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["ECX", "3"], raw: "MOV ECX, 3" },
      {
        line: 2,
        mnemonic: "CMP",
        operands: ["EAX", "EAX"],
        raw: "CMP EAX, EAX",
      },
      { line: 3, mnemonic: "LOOPE", operands: ["body"], raw: "LOOPE body" },
      { line: 4, mnemonic: "HLT", operands: [], raw: "HLT" },
    ];
    const labels = new Map([["body", 1]]);
    sim.loadInstructions(instructions, labels);
    for (let i = 0; i < 20 && !sim.getState().halted; i++) {
      sim.step();
    }
    expect(sim.getRegisters().ECX).toBe(0);
  });

  test("LOOPZ is alias for LOOPE", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["ECX", "2"], raw: "MOV ECX, 2" },
      {
        line: 2,
        mnemonic: "CMP",
        operands: ["EAX", "EAX"],
        raw: "CMP EAX, EAX",
      },
      { line: 3, mnemonic: "LOOPZ", operands: ["body"], raw: "LOOPZ body" },
      { line: 4, mnemonic: "HLT", operands: [], raw: "HLT" },
    ];
    const labels = new Map([["body", 1]]);
    sim.loadInstructions(instructions, labels);
    for (let i = 0; i < 20 && !sim.getState().halted; i++) {
      sim.step();
    }
    expect(sim.getRegisters().ECX).toBe(0);
  });

  test("LOOPNE branches when ECX != 0 AND ZF clear", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["ECX", "3"], raw: "MOV ECX, 3" },
      {
        line: 2,
        mnemonic: "CMP",
        operands: ["EAX", "EBX"],
        raw: "CMP EAX, EBX",
      },
      { line: 3, mnemonic: "LOOPNE", operands: ["body"], raw: "LOOPNE body" },
      { line: 4, mnemonic: "HLT", operands: [], raw: "HLT" },
    ];
    const labels = new Map([["body", 1]]);
    sim.loadInstructions(instructions, labels);
    sim.executeInstruction("MOV", ["EAX", "1"]); // set EAX != 0 so CMP != 0
    for (let i = 0; i < 20 && !sim.getState().halted; i++) {
      sim.step();
    }
    expect(sim.getRegisters().ECX).toBe(0);
  });

  test("LOOPNZ is alias for LOOPNE", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["ECX", "2"], raw: "MOV ECX, 2" },
      {
        line: 2,
        mnemonic: "CMP",
        operands: ["EAX", "EBX"],
        raw: "CMP EAX, EBX",
      },
      { line: 3, mnemonic: "LOOPNZ", operands: ["body"], raw: "LOOPNZ body" },
      { line: 4, mnemonic: "HLT", operands: [], raw: "HLT" },
    ];
    const labels = new Map([["body", 1]]);
    sim.loadInstructions(instructions, labels);
    sim.executeInstruction("MOV", ["EAX", "5"]);
    for (let i = 0; i < 20 && !sim.getState().halted; i++) {
      sim.step();
    }
    expect(sim.getRegisters().ECX).toBe(0);
  });

  test("LOOPE falls through when ZF is clear", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["ECX", "3"], raw: "MOV ECX, 3" },
      { line: 2, mnemonic: "MOV", operands: ["EAX", "1"], raw: "MOV EAX, 1" },
      { line: 3, mnemonic: "CMP", operands: ["EAX", "0"], raw: "CMP EAX, 0" },
      { line: 4, mnemonic: "LOOPE", operands: ["body"], raw: "LOOPE body" },
      { line: 5, mnemonic: "HLT", operands: [], raw: "HLT" },
    ];
    const labels = new Map([["body", 1]]);
    sim.loadInstructions(instructions, labels);
    // Step through: MOV ECX,3; MOV EAX,1; CMP EAX,0 (ZF=0); LOOPE falls through
    sim.step(); // MOV ECX,3
    sim.step(); // MOV EAX,1
    sim.step(); // CMP EAX,0 => ZF=0
    sim.step(); // LOOPE: ECX=2, but ZF=0 so falls through
    expect(sim.getEIP()).toBe(4); // at HLT
    expect(sim.getRegisters().ECX).toBe(2);
  });

  test("LOOPNE falls through when ZF is set", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["ECX", "3"], raw: "MOV ECX, 3" },
      {
        line: 2,
        mnemonic: "CMP",
        operands: ["EAX", "EAX"],
        raw: "CMP EAX, EAX",
      },
      { line: 3, mnemonic: "LOOPNE", operands: ["body"], raw: "LOOPNE body" },
      { line: 4, mnemonic: "HLT", operands: [], raw: "HLT" },
    ];
    const labels = new Map([["body", 1]]);
    sim.loadInstructions(instructions, labels);
    sim.step(); // MOV ECX,3
    sim.step(); // CMP EAX,EAX => ZF=1
    sim.step(); // LOOPNE: ECX=2, but ZF=1 so falls through
    expect(sim.getEIP()).toBe(3); // at HLT
    expect(sim.getRegisters().ECX).toBe(2);
  });

  test("LOOP with unknown label throws error", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["ECX", "1"], raw: "MOV ECX, 1" },
      { line: 2, mnemonic: "LOOP", operands: ["unknown"], raw: "LOOP unknown" },
    ];
    const labels = new Map<string, number>();
    sim.loadInstructions(instructions, labels);
    sim.step(); // MOV
    expect(() => sim.step()).toThrow('LOOP target "unknown" not found in labels');
  });

  test("LOOP/LOOPE/LOOPNE are no-ops in executeInstruction (only decrement ECX)", () => {
    sim.executeInstruction("MOV", ["ECX", "5"]);
    sim.executeInstruction("LOOP", ["label"]);
    expect(sim.getRegisters().ECX).toBe(4);
    sim.executeInstruction("LOOPE", ["label"]);
    expect(sim.getRegisters().ECX).toBe(3);
    sim.executeInstruction("LOOPNE", ["label"]);
    expect(sim.getRegisters().ECX).toBe(2);
    sim.executeInstruction("LOOPZ", ["label"]);
    expect(sim.getRegisters().ECX).toBe(1);
    sim.executeInstruction("LOOPNZ", ["label"]);
    expect(sim.getRegisters().ECX).toBe(0);
  });
});
