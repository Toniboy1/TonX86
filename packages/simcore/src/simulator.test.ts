import {
  Simulator,
  CPUState,
  Memory,
  LCDDisplay,
  Keyboard,
  REGISTER_MAP,
  REGISTER8_MAP,
} from "./simulator";
import type { Instruction, CompatibilityMode } from "./simulator";

/**
 * Tests for Simulator orchestrator (simulator.ts)
 * Covers: lifecycle, state accessors, control flow (step/JMP/CALL/RET),
 * keyboard/LCD integration, compatibility mode switching, loadProgram,
 * and barrel re-exports.
 */

describe("Simulator - re-exports", () => {
  test("re-exports CPUState class", () => {
    const cpu = new CPUState();
    expect(cpu).toBeInstanceOf(CPUState);
    cpu.reset();
    expect(cpu.registers[0]).toBe(0);
  });

  test("re-exports Memory class", () => {
    const mem = new Memory();
    mem.writeA(0, 42);
    expect(mem.readA(0)).toBe(42);
  });

  test("re-exports LCDDisplay class", () => {
    const lcd = new LCDDisplay(8, 8);
    lcd.setPixel(0, 0, 1);
    expect(lcd.getPixel(0, 0)).toBe(1);
  });

  test("re-exports Keyboard class", () => {
    const kb = new Keyboard();
    kb.pushKey(65, true);
    expect(kb.getKeyCode()).toBe(65);
  });

  test("re-exports REGISTER_MAP", () => {
    expect(REGISTER_MAP).toBeDefined();
    expect(REGISTER_MAP["EAX"]).toBe(0);
  });

  test("re-exports REGISTER8_MAP", () => {
    expect(REGISTER8_MAP).toBeDefined();
    expect(REGISTER8_MAP["AL"]).toBeDefined();
  });

  test("re-exports type aliases compile correctly", () => {
    // Type-level check - if these compile, the re-exports work
    const mode: CompatibilityMode = "educational";
    const instr: Instruction = {
      mnemonic: "NOP",
      operands: [],
      line: 0,
      raw: "NOP",
    };
    expect(mode).toBe("educational");
    expect(instr.mnemonic).toBe("NOP");
  });
});

describe("Simulator - Lifecycle", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("constructor initializes clean state", () => {
    const state = sim.getState();
    expect(state.pc).toBe(0);
    expect(state.halted).toBe(false);
    expect(state.running).toBe(false);
  });

  test("constructor initializes ESP", () => {
    expect(sim.getRegisters().ESP).toBe(0xffff);
  });

  test("run() sets running", () => {
    sim.run();
    expect(sim.getState().running).toBe(true);
  });

  test("pause() clears running", () => {
    sim.run();
    sim.pause();
    expect(sim.getState().running).toBe(false);
  });

  test("halt() halts and stops running", () => {
    sim.halt();
    const state = sim.getState();
    expect(state.halted).toBe(true);
    expect(state.running).toBe(false);
  });

  test("reset() clears all state", () => {
    sim.executeInstruction("MOV", ["EAX", "100"]);
    sim.executeInstruction("MOV", ["EBX", "200"]);
    sim.run();

    sim.reset();

    const state = sim.getState();
    expect(state.pc).toBe(0);
    expect(state.eip).toBe(0);
    expect(state.halted).toBe(false);
    expect(state.running).toBe(false);
    expect(state.registers[0]).toBe(0); // EAX
  });

  test("reset clears console output", () => {
    sim.executeInstruction("MOV", ["EAX", "0x0E48"]);
    sim.executeInstruction("INT", ["0x10"]);
    expect(sim.getConsoleOutput()).toBe("H");

    sim.reset();
    expect(sim.getConsoleOutput()).toBe("");
  });

  test("clearConsoleOutput clears the buffer", () => {
    sim.executeInstruction("MOV", ["EAX", "0x0E48"]);
    sim.executeInstruction("INT", ["0x10"]);
    expect(sim.getConsoleOutput()).toBe("H");

    sim.clearConsoleOutput();
    expect(sim.getConsoleOutput()).toBe("");
  });
});

describe("Simulator - State Accessors", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("getRegisters returns named registers", () => {
    sim.executeInstruction("MOV", ["EAX", "1"]);
    sim.executeInstruction("MOV", ["ECX", "2"]);
    sim.executeInstruction("MOV", ["EDX", "3"]);
    sim.executeInstruction("MOV", ["EBX", "4"]);
    const regs = sim.getRegisters();
    expect(regs.EAX).toBe(1);
    expect(regs.ECX).toBe(2);
    expect(regs.EDX).toBe(3);
    expect(regs.EBX).toBe(4);
  });

  test("getState() with full CPU state", () => {
    sim.executeInstruction("MOV", ["EAX", "100"]);
    sim.executeInstruction("MOV", ["EBX", "200"]);
    const state = sim.getState();
    expect(state.pc).toBe(0);
    expect(state.registers[0]).toBe(100);
    expect(state.registers[3]).toBe(200);
    expect(state.halted).toBe(false);
  });

  test("getState() includes EIP and call stack depth", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "10"], raw: "MOV EAX, 10" },
      { line: 2, mnemonic: "CALL", operands: ["func"], raw: "CALL func" },
      { line: 3, mnemonic: "ADD", operands: ["EAX", "1"], raw: "ADD EAX, 1" },
    ];
    const labels = new Map([["func", 2]]);
    sim.loadInstructions(instructions, labels);

    sim.step();
    let state = sim.getState();
    expect(state.eip).toBe(1);
    expect(state.callStackDepth).toBe(0);

    sim.step();
    state = sim.getState();
    expect(state.eip).toBe(2);
    expect(state.callStackDepth).toBe(1);
  });

  test("getMemoryA reads memory bank A", () => {
    sim.executeInstruction("MOV", ["[100]", "42"]);
    const data = sim.getMemoryA(100, 4);
    expect(data[0]).toBe(42);
  });

  test("getMemoryB reads memory bank B", () => {
    // Bank B is not directly written by instructions, but the accessor should work
    const data = sim.getMemoryB(0, 4);
    expect(data.length).toBe(4);
    expect(data[0]).toBe(0);
  });

  test("getLCDDisplay() returns display data", () => {
    const data = sim.getLCDDisplay();
    expect(data.length).toBeGreaterThan(0);
  });

  test("addBreakpoint / removeBreakpoint", () => {
    // Breakpoints are delegated to CPUState; verify the wiring
    sim.addBreakpoint(100);
    sim.removeBreakpoint(100);
    // No assertion needed - just ensure no throw
  });

  test("pushStack / popStack wiring", () => {
    sim.pushStack(42);
    expect(sim.popStack()).toBe(42);
  });
});

describe("Simulator - loadProgram", () => {
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

describe("Simulator - Control Flow (loadInstructions, step)", () => {
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

  test("step() returns -1 when past end of instructions", () => {
    sim.loadInstructions([], new Map());
    const line = sim.step();
    expect(line).toBe(-1);
    expect(sim.getState().halted).toBe(true);
  });

  test("getCurrentInstruction returns current instruction at EIP", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "10"], raw: "MOV EAX, 10" },
      { line: 2, mnemonic: "ADD", operands: ["EAX", "5"], raw: "ADD EAX, 5" },
    ];
    sim.loadInstructions(instructions, new Map());

    expect(sim.getCurrentInstruction()).toEqual(instructions[0]);
    sim.step();
    expect(sim.getCurrentInstruction()).toEqual(instructions[1]);
  });

  test("getCurrentInstruction returns null when EIP out of range", () => {
    sim.setEIP(1000);
    expect(sim.getCurrentInstruction()).toBeNull();
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
    expect(sim.getState().halted).toBe(true);
    expect(sim.getEIP()).toBe(1); // EIP doesn't advance after HLT
  });
});

describe("Simulator - JMP/Conditional Jumps via step()", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
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
    sim.step(); // JMP target
    expect(sim.getEIP()).toBe(3);

    sim.step(); // ADD EAX, 1
    expect(sim.getRegisters().EAX).toBe(11);
  });

  test("step() with JE (zero flag set) takes jump", () => {
    const instructions = [
      {
        line: 1,
        mnemonic: "XOR",
        operands: ["EAX", "EAX"],
        raw: "XOR EAX, EAX",
      },
      { line: 2, mnemonic: "JE", operands: ["target"], raw: "JE target" },
      { line: 3, mnemonic: "MOV", operands: ["EBX", "99"], raw: "MOV EBX, 99" },
      { line: 4, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
    ];
    const labels = new Map([["target", 3]]);
    sim.loadInstructions(instructions, labels);

    sim.step();
    expect(sim.isZeroFlagSet()).toBe(true);
    sim.step(); // JE target
    expect(sim.getEIP()).toBe(3);
    sim.step();
    expect(sim.getRegisters().EBX).toBe(1);
  });

  test("JE does NOT jump when ZF == 0", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "5"], raw: "MOV EAX, 5" },
      { line: 2, mnemonic: "CMP", operands: ["EAX", "10"], raw: "CMP EAX, 10" },
      { line: 3, mnemonic: "JE", operands: ["target"], raw: "JE target" },
      { line: 4, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
      { line: 5, mnemonic: "MOV", operands: ["EBX", "2"], raw: "MOV EBX, 2" },
    ];
    const labels = new Map([["target", 4]]);
    sim.loadInstructions(instructions, labels);
    sim.step();
    sim.step();
    expect(sim.isZeroFlagSet()).toBe(false);
    sim.step();
    expect(sim.getEIP()).toBe(3);
    sim.step();
    expect(sim.getRegisters().EBX).toBe(1);
  });

  test("step() with JNE (zero flag not set) takes jump", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "5"], raw: "MOV EAX, 5" },
      { line: 2, mnemonic: "CMP", operands: ["EAX", "10"], raw: "CMP EAX, 10" },
      { line: 3, mnemonic: "JNE", operands: ["target"], raw: "JNE target" },
      { line: 4, mnemonic: "MOV", operands: ["EBX", "99"], raw: "MOV EBX, 99" },
      { line: 5, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
    ];
    const labels = new Map([["target", 4]]);
    sim.loadInstructions(instructions, labels);
    sim.step();
    sim.step();
    sim.step(); // JNE target
    expect(sim.getEIP()).toBe(4);
    sim.step();
    expect(sim.getRegisters().EBX).toBe(1);
  });

  test("JNE does NOT jump when ZF == 1", () => {
    const instructions = [
      {
        line: 1,
        mnemonic: "XOR",
        operands: ["EAX", "EAX"],
        raw: "XOR EAX, EAX",
      },
      { line: 2, mnemonic: "JNE", operands: ["target"], raw: "JNE target" },
      { line: 3, mnemonic: "MOV", operands: ["EBX", "7"], raw: "MOV EBX, 7" },
      { line: 4, mnemonic: "MOV", operands: ["EBX", "9"], raw: "MOV EBX, 9" },
    ];
    const labels = new Map([["target", 3]]);
    sim.loadInstructions(instructions, labels);
    sim.step();
    sim.step();
    expect(sim.getEIP()).toBe(2);
    sim.step();
    expect(sim.getRegisters().EBX).toBe(7);
  });

  test("JG does NOT jump when ZF == 1", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "5"], raw: "MOV EAX, 5" },
      { line: 2, mnemonic: "CMP", operands: ["EAX", "5"], raw: "CMP EAX, 5" },
      { line: 3, mnemonic: "JG", operands: ["target"], raw: "JG target" },
      { line: 4, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
      { line: 5, mnemonic: "MOV", operands: ["EBX", "2"], raw: "MOV EBX, 2" },
    ];
    const labels = new Map([["target", 4]]);
    sim.loadInstructions(instructions, labels);
    sim.step();
    sim.step();
    sim.step();
    expect(sim.getEIP()).toBe(3);
    sim.step();
    expect(sim.getRegisters().EBX).toBe(1);
  });

  test("JL does NOT jump when SF == OF", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "5"], raw: "MOV EAX, 5" },
      { line: 2, mnemonic: "CMP", operands: ["EAX", "3"], raw: "CMP EAX, 3" },
      { line: 3, mnemonic: "JL", operands: ["target"], raw: "JL target" },
      { line: 4, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
      { line: 5, mnemonic: "MOV", operands: ["EBX", "2"], raw: "MOV EBX, 2" },
    ];
    const labels = new Map([["target", 4]]);
    sim.loadInstructions(instructions, labels);
    sim.step();
    sim.step();
    sim.step();
    expect(sim.getEIP()).toBe(3);
    sim.step();
    expect(sim.getRegisters().EBX).toBe(1);
  });

  test("JLE does NOT jump when ZF == 0 and SF == OF", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "6"], raw: "MOV EAX, 6" },
      { line: 2, mnemonic: "CMP", operands: ["EAX", "3"], raw: "CMP EAX, 3" },
      { line: 3, mnemonic: "JLE", operands: ["target"], raw: "JLE target" },
      { line: 4, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
      { line: 5, mnemonic: "MOV", operands: ["EBX", "2"], raw: "MOV EBX, 2" },
    ];
    const labels = new Map([["target", 4]]);
    sim.loadInstructions(instructions, labels);
    sim.step();
    sim.step();
    sim.step();
    expect(sim.getEIP()).toBe(3);
    sim.step();
    expect(sim.getRegisters().EBX).toBe(1);
  });

  test("JGE does NOT jump when SF != OF", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "3"], raw: "MOV EAX, 3" },
      { line: 2, mnemonic: "CMP", operands: ["EAX", "5"], raw: "CMP EAX, 5" },
      { line: 3, mnemonic: "JGE", operands: ["target"], raw: "JGE target" },
      { line: 4, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
      { line: 5, mnemonic: "MOV", operands: ["EBX", "2"], raw: "MOV EBX, 2" },
    ];
    const labels = new Map([["target", 4]]);
    sim.loadInstructions(instructions, labels);
    sim.step();
    sim.step();
    sim.step();
    expect(sim.getEIP()).toBe(3);
    sim.step();
    expect(sim.getRegisters().EBX).toBe(1);
  });

  test("JS does NOT jump when SF == 0", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "1"], raw: "MOV EAX, 1" },
      {
        line: 2,
        mnemonic: "TEST",
        operands: ["EAX", "EAX"],
        raw: "TEST EAX, EAX",
      },
      { line: 3, mnemonic: "JS", operands: ["target"], raw: "JS target" },
      { line: 4, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
      { line: 5, mnemonic: "MOV", operands: ["EBX", "2"], raw: "MOV EBX, 2" },
    ];
    const labels = new Map([["target", 4]]);
    sim.loadInstructions(instructions, labels);
    sim.step();
    sim.step();
    sim.step();
    expect(sim.getEIP()).toBe(3);
    sim.step();
    expect(sim.getRegisters().EBX).toBe(1);
  });

  test("JNS does NOT jump when SF == 1", () => {
    const instructions = [
      {
        line: 1,
        mnemonic: "MOV",
        operands: ["EAX", "0xFFFFFFFF"],
        raw: "MOV EAX, -1",
      },
      {
        line: 2,
        mnemonic: "TEST",
        operands: ["EAX", "EAX"],
        raw: "TEST EAX, EAX",
      },
      { line: 3, mnemonic: "JNS", operands: ["target"], raw: "JNS target" },
      { line: 4, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
      { line: 5, mnemonic: "MOV", operands: ["EBX", "2"], raw: "MOV EBX, 2" },
    ];
    const labels = new Map([["target", 4]]);
    sim.loadInstructions(instructions, labels);
    sim.step();
    sim.step();
    sim.step();
    expect(sim.getEIP()).toBe(3);
    sim.step();
    expect(sim.getRegisters().EBX).toBe(1);
  });

  test("JA does NOT jump when CF == 1", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "3"], raw: "MOV EAX, 3" },
      { line: 2, mnemonic: "CMP", operands: ["EAX", "5"], raw: "CMP EAX, 5" },
      { line: 3, mnemonic: "JA", operands: ["target"], raw: "JA target" },
      { line: 4, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
      { line: 5, mnemonic: "MOV", operands: ["EBX", "2"], raw: "MOV EBX, 2" },
    ];
    const labels = new Map([["target", 4]]);
    sim.loadInstructions(instructions, labels);
    sim.step();
    sim.step();
    sim.step();
    expect(sim.getEIP()).toBe(3);
    sim.step();
    expect(sim.getRegisters().EBX).toBe(1);
  });

  test("JA jumps when CF == 0 and ZF == 0", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "5"], raw: "MOV EAX, 5" },
      { line: 2, mnemonic: "CMP", operands: ["EAX", "3"], raw: "CMP EAX, 3" },
      { line: 3, mnemonic: "JA", operands: ["target"], raw: "JA target" },
      { line: 4, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
      { line: 5, mnemonic: "MOV", operands: ["EBX", "2"], raw: "MOV EBX, 2" },
    ];
    const labels = new Map([["target", 4]]);
    sim.loadInstructions(instructions, labels);
    sim.step();
    sim.step();
    sim.step();
    expect(sim.getEIP()).toBe(4);
    sim.step();
    expect(sim.getRegisters().EBX).toBe(2);
  });

  test("JAE does NOT jump when CF == 1", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "3"], raw: "MOV EAX, 3" },
      { line: 2, mnemonic: "CMP", operands: ["EAX", "5"], raw: "CMP EAX, 5" },
      { line: 3, mnemonic: "JAE", operands: ["target"], raw: "JAE target" },
      { line: 4, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
      { line: 5, mnemonic: "MOV", operands: ["EBX", "2"], raw: "MOV EBX, 2" },
    ];
    const labels = new Map([["target", 4]]);
    sim.loadInstructions(instructions, labels);
    sim.step();
    sim.step();
    sim.step();
    expect(sim.getEIP()).toBe(3);
    sim.step();
    expect(sim.getRegisters().EBX).toBe(1);
  });

  test("JB does NOT jump when CF == 0", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "5"], raw: "MOV EAX, 5" },
      { line: 2, mnemonic: "CMP", operands: ["EAX", "3"], raw: "CMP EAX, 3" },
      { line: 3, mnemonic: "JB", operands: ["target"], raw: "JB target" },
      { line: 4, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
      { line: 5, mnemonic: "MOV", operands: ["EBX", "2"], raw: "MOV EBX, 2" },
    ];
    const labels = new Map([["target", 4]]);
    sim.loadInstructions(instructions, labels);
    sim.step();
    sim.step();
    sim.step();
    expect(sim.getEIP()).toBe(3);
    sim.step();
    expect(sim.getRegisters().EBX).toBe(1);
  });

  test("JBE does NOT jump when CF == 0 and ZF == 0", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "5"], raw: "MOV EAX, 5" },
      { line: 2, mnemonic: "CMP", operands: ["EAX", "3"], raw: "CMP EAX, 3" },
      { line: 3, mnemonic: "JBE", operands: ["target"], raw: "JBE target" },
      { line: 4, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
      { line: 5, mnemonic: "MOV", operands: ["EBX", "2"], raw: "MOV EBX, 2" },
    ];
    const labels = new Map([["target", 4]]);
    sim.loadInstructions(instructions, labels);
    sim.step();
    sim.step();
    sim.step();
    expect(sim.getEIP()).toBe(3);
    sim.step();
    expect(sim.getRegisters().EBX).toBe(1);
  });

  test("JBE jumps when CF == 1", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "3"], raw: "MOV EAX, 3" },
      { line: 2, mnemonic: "CMP", operands: ["EAX", "5"], raw: "CMP EAX, 5" },
      { line: 3, mnemonic: "JBE", operands: ["target"], raw: "JBE target" },
      { line: 4, mnemonic: "MOV", operands: ["EBX", "1"], raw: "MOV EBX, 1" },
      { line: 5, mnemonic: "MOV", operands: ["EBX", "2"], raw: "MOV EBX, 2" },
    ];
    const labels = new Map([["target", 4]]);
    sim.loadInstructions(instructions, labels);
    sim.step();
    sim.step();
    sim.step();
    expect(sim.getEIP()).toBe(4);
    sim.step();
    expect(sim.getRegisters().EBX).toBe(2);
  });

  test("shouldTakeJump returns false for unknown mnemonic", () => {
    const shouldJump = (
      sim as unknown as { shouldTakeJump: (mnemonic: string) => boolean }
    ).shouldTakeJump("JXX");
    expect(shouldJump).toBe(false);
  });
});

describe("Simulator - CALL/RET via step()", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
  });

  test("CALL pushes return address and jumps", () => {
    const instructions = [
      { line: 1, mnemonic: "MOV", operands: ["EAX", "10"], raw: "MOV EAX, 10" },
      { line: 2, mnemonic: "CALL", operands: ["func"], raw: "CALL func" },
      { line: 3, mnemonic: "ADD", operands: ["EAX", "5"], raw: "ADD EAX, 5" },
      { line: 4, mnemonic: "ADD", operands: ["EAX", "1"], raw: "ADD EAX, 1" },
      { line: 5, mnemonic: "RET", operands: [], raw: "RET" },
    ];
    const labels = new Map([["func", 3]]);
    sim.loadInstructions(instructions, labels);

    sim.step(); // MOV
    const initialESP = sim.getRegisters().ESP;
    sim.step(); // CALL func
    expect(sim.getEIP()).toBe(3);
    expect(sim.getRegisters().ESP).toBe(initialESP - 4);

    sim.step(); // ADD EAX, 1
    expect(sim.getRegisters().EAX).toBe(11);

    sim.step(); // RET
    expect(sim.getEIP()).toBe(2);
    expect(sim.getRegisters().ESP).toBe(initialESP);

    sim.step(); // ADD EAX, 5
    expect(sim.getRegisters().EAX).toBe(16);
  });

  test("CALL throws when target label is missing", () => {
    const instructions = [
      { line: 1, mnemonic: "CALL", operands: ["missing"], raw: "CALL missing" },
    ];
    sim.loadInstructions(instructions, new Map());
    expect(() => sim.step()).toThrow('CALL target "missing" not found');
  });

  test("Jump throws when target label is missing", () => {
    const instructions = [
      { line: 1, mnemonic: "JE", operands: ["missing"], raw: "JE missing" },
    ];
    sim.loadInstructions(instructions, new Map());
    expect(() => sim.step()).toThrow('Jump target "missing" not found');
  });

  test("RET with empty call stack increments EIP", () => {
    const instructions = [
      { line: 1, mnemonic: "RET", operands: [], raw: "RET" },
      { line: 2, mnemonic: "MOV", operands: ["EBX", "7"], raw: "MOV EBX, 7" },
    ];
    sim.loadInstructions(instructions, new Map());
    sim.step();
    expect(sim.getEIP()).toBe(1);
    sim.step();
    expect(sim.getRegisters().EBX).toBe(7);
  });
});

describe("Simulator - Keyboard Integration", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator(8, 8);
  });

  test("pushKeyboardEvent() adds key to simulator", () => {
    sim.pushKeyboardEvent(65, true);
    const status = sim.getKeyboardStatus();
    expect(status.status).toBe(1);
    expect(status.keyCode).toBe(65);
    expect(status.keyState).toBe(1);
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
    expect(sim.getRegisters().EAX).toBe(1);
  });

  test("MOV can read key code (0x10101)", () => {
    sim.pushKeyboardEvent(65, true);
    sim.executeInstruction("MOV", ["EAX", "[0x10101]"]);
    expect(sim.getRegisters().EAX).toBe(65);
  });

  test("MOV can read key state (0x10102)", () => {
    sim.pushKeyboardEvent(65, true);
    sim.executeInstruction("MOV", ["EAX", "[0x10102]"]);
    expect(sim.getRegisters().EAX).toBe(1);
  });

  test("reading key code pops key from queue", () => {
    sim.pushKeyboardEvent(65, true);
    sim.pushKeyboardEvent(66, true);
    sim.executeInstruction("MOV", ["EAX", "[0x10101]"]);
    expect(sim.getRegisters().EAX).toBe(65);
    sim.executeInstruction("MOV", ["EBX", "[0x10101]"]);
    expect(sim.getRegisters().EBX).toBe(66);
  });

  test("keyboard I/O addresses are read-only", () => {
    sim.executeInstruction("MOV", ["0x10100", "99"]);
    sim.executeInstruction("MOV", ["EAX", "[0x10100]"]);
    expect(sim.getRegisters().EAX).toBe(0);
  });

  test("keyboard works alongside LCD I/O", () => {
    sim.executeInstruction("MOV", ["0xF000", "1"]);
    sim.pushKeyboardEvent(65, true);
    sim.executeInstruction("MOV", ["EAX", "[0x10101]"]);
    expect(sim.getLCDDisplay()[0]).toBe(1);
    expect(sim.getRegisters().EAX).toBe(65);
  });

  test("arrow keys work correctly", () => {
    sim.pushKeyboardEvent(128, true);
    sim.executeInstruction("MOV", ["EAX", "[0x10101]"]);
    expect(sim.getRegisters().EAX).toBe(128);

    sim.pushKeyboardEvent(129, true);
    sim.executeInstruction("MOV", ["EBX", "[0x10101]"]);
    expect(sim.getRegisters().EBX).toBe(129);
  });
});

describe("Simulator - LCD Integration", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator(8, 8);
  });

  test("can create simulator with custom LCD size", () => {
    const sim2x2 = new Simulator(2, 2);
    expect(sim2x2.getLCDDisplay().length).toBe(4);

    const sim16x16 = new Simulator(16, 16);
    expect(sim16x16.getLCDDisplay().length).toBe(256);
  });

  test("LCD display is properly initialized", () => {
    const display = sim.getLCDDisplay();
    expect(display.length).toBe(64);
    for (let i = 0; i < display.length; i++) {
      expect(display[i]).toBe(0);
    }
  });

  test("LCD cleared on reset", () => {
    sim.reset();
    const display = sim.getLCDDisplay();
    for (let i = 0; i < display.length; i++) {
      expect(display[i]).toBe(0);
    }
  });
});

describe("Simulator - Compatibility Mode", () => {
  test("defaults to educational mode", () => {
    const sim = new Simulator();
    expect(sim.getCompatibilityMode()).toBe("educational");
  });

  test("can be initialized with strict-x86 mode", () => {
    const sim = new Simulator(8, 8, "strict-x86");
    expect(sim.getCompatibilityMode()).toBe("strict-x86");
  });

  test("can switch to strict-x86 mode", () => {
    const sim = new Simulator();
    sim.setCompatibilityMode("strict-x86");
    expect(sim.getCompatibilityMode()).toBe("strict-x86");
  });

  test("can switch from educational to strict-x86 mode", () => {
    const sim = new Simulator(16, 16);
    expect(sim.getCompatibilityMode()).toBe("educational");
    sim.executeInstruction("MOV", ["0xF000", "0xF100"]);
    sim.setCompatibilityMode("strict-x86");
    expect(() => {
      sim.executeInstruction("MOV", ["0xF001", "0xF100"]);
    }).toThrow("Memory-to-memory MOV not allowed in strict-x86 mode");
  });

  test("can switch from strict-x86 to educational mode", () => {
    const sim = new Simulator(16, 16, "strict-x86");
    expect(() => {
      sim.executeInstruction("MOV", ["0xF000", "0xF100"]);
    }).toThrow("Memory-to-memory MOV not allowed in strict-x86 mode");
    sim.setCompatibilityMode("educational");
    sim.executeInstruction("MOV", ["0xF000", "0xF100"]);
    expect(sim.getCompatibilityMode()).toBe("educational");
  });
});
