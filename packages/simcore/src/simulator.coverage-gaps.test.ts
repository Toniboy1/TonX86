import { LCDDisplay, Simulator } from "./simulator";

describe("Coverage gap tests - jumps and edge cases", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator(8, 8, "educational");
  });

  describe("Conditional jump branches via step()", () => {
    test("JE does NOT jump when ZF == 0", () => {
      const instructions = [
        { line: 1, mnemonic: "MOV", operands: ["EAX", "5"], raw: "MOV EAX, 5" },
        {
          line: 2,
          mnemonic: "CMP",
          operands: ["EAX", "10"],
          raw: "CMP EAX, 10",
        },
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
      expect(sim.isZeroFlagSet()).toBe(true);

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
      expect(sim.isZeroFlagSet()).toBe(true);

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
      expect(sim.isZeroFlagSet()).toBe(false);

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
      expect(sim.isZeroFlagSet()).toBe(false);

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
  });

  describe("Control flow error paths", () => {
    test("CALL throws when target label is missing", () => {
      const instructions = [
        {
          line: 1,
          mnemonic: "CALL",
          operands: ["missing"],
          raw: "CALL missing",
        },
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

  describe("Edge cases for coverage", () => {
    test("getCurrentInstruction returns null when EIP out of range", () => {
      const state = sim.getState();
      state.eip = 1000;
      const instruction = sim.getCurrentInstruction();
      expect(instruction).toBeNull();
    });

    test("PUSH with memory operand", () => {
      sim.executeInstruction("MOV", ["EBX", "100"]);
      sim.executeInstruction("MOV", ["[EBX]", "42"]);
      sim.executeInstruction("PUSH", ["[EBX]"]);
      const stackValue = sim.popStack();
      expect(stackValue).toBe(42);
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

    test("RET with empty call stack", () => {
      expect(() => sim.executeInstruction("RET", [])).not.toThrow();
    });

    test("MOV with memory addressing", () => {
      sim.executeInstruction("MOV", ["EBP", "200"]);
      sim.executeInstruction("MOV", ["[EBP]", "99"]);
      sim.executeInstruction("MOV", ["EDX", "[EBP]"]);
      expect(sim.getRegisters().EDX).toBe(99);
    });

    test("MOV to absolute memory address", () => {
      sim.executeInstruction("MOV", ["[100]", "25"]);
      sim.executeInstruction("MOV", ["EAX", "[100]"]);
      expect(sim.getRegisters().EAX).toBe(25);
    });

    test("MOV memory addressing covers base and absolute", () => {
      sim.executeInstruction("MOV", ["EBP", "200"]);
      sim.executeInstruction("MOV", ["[EBP]", "77"]);
      sim.executeInstruction("MOV", ["EAX", "[EBP]"]);
      expect(sim.getRegisters().EAX).toBe(77);

      sim.executeInstruction("MOV", ["[150]", "88"]);
      sim.executeInstruction("MOV", ["ECX", "[150]"]);
      expect(sim.getRegisters().ECX).toBe(88);
    });

    test("MOV handles register8 read/write", () => {
      sim.executeInstruction("MOV", ["EAX", "0x1234"]);
      sim.executeInstruction("MOV", ["AL", "0x56"]);
      expect(sim.getRegisters().EAX & 0xff).toBe(0x56);

      sim.executeInstruction("MOV", ["EBX", "AL"]);
      expect(sim.getRegisters().EBX).toBe(0x56);
    });

    test("Various immediate operand formats", () => {
      sim.executeInstruction("MOV", ["EAX", "255"]);
      expect(sim.getRegisters().EAX).toBe(255);

      sim.executeInstruction("MOV", ["EBX", "0xFF"]);
      expect(sim.getRegisters().EBX).toBe(255);

      sim.executeInstruction("MOV", ["ECX", "0B11111111"]);
      expect(sim.getRegisters().ECX).toBe(255);
    });

    test("resolveSourceValue handles absolute memory and IO", () => {
      sim.executeInstruction("MOV", ["[100]", "25"]);
      sim.executeInstruction("MOV", ["EAX", "1"]);
      sim.executeInstruction("ADD", ["EAX", "[100]"]);
      expect(sim.getRegisters().EAX).toBe(26);

      sim.executeInstruction("ADD", ["EAX", "[0xF000]"]);
      expect(sim.getRegisters().EAX).toBe(26);
    });

    test("resolveSourceValue covers IO keyboard range and zero offset", () => {
      sim.executeInstruction("MOV", ["EAX", "5"]);
      sim.executeInstruction("ADD", ["EAX", "[0]"]);
      expect(sim.getRegisters().EAX).toBe(5);

      sim.executeInstruction("ADD", ["EAX", "[0x10100]"]);
      expect(sim.getRegisters().EAX).toBe(5);
    });

    test("resolveSourceValue reads register8 sources", () => {
      sim.executeInstruction("MOV", ["EAX", "0xFF"]);
      sim.executeInstruction("ADD", ["EAX", "AL"]);
      expect(sim.getRegisters().EAX).toBe(0x1fe);
    });

    test("read/write register8 handle missing byteOffset", () => {
      const helpers = sim as unknown as {
        readRegisterValue: (op: {
          type: string;
          value: number;
          byteOffset?: number;
        }) => number;
        writeRegisterValue: (
          op: { type: string; value: number; byteOffset?: number },
          value: number,
        ) => void;
      };

      sim.executeInstruction("MOV", ["EAX", "0x12345678"]);
      const low = helpers.readRegisterValue({ type: "register8", value: 0 });
      const high = helpers.readRegisterValue({
        type: "register8",
        value: 0,
        byteOffset: 8,
      });
      expect(low).toBe(0x78);
      expect(high).toBe(0x56);

      helpers.writeRegisterValue({ type: "register8", value: 1 }, 0xaa);
      helpers.writeRegisterValue(
        { type: "register8", value: 1, byteOffset: 8 },
        0xbb,
      );
      expect(sim.getRegisters().ECX & 0xff).toBe(0xaa);
      expect((sim.getRegisters().ECX >> 8) & 0xff).toBe(0xbb);
    });

    test("shouldTakeJump returns false for unknown mnemonic", () => {
      const shouldJump = (
        sim as unknown as { shouldTakeJump: (mnemonic: string) => boolean }
      ).shouldTakeJump("JXX");
      expect(shouldJump).toBe(false);
    });

    test("INT with missing operand is a no-op", () => {
      expect(() => sim.executeInstruction("INT", [])).not.toThrow();
    });

    test("RAND ignores invalid or missing operands", () => {
      expect(() => sim.executeInstruction("RAND", [])).not.toThrow();
      expect(() => sim.executeInstruction("RAND", ["10"])).not.toThrow();
    });

    test("RAND supports register max operand", () => {
      sim.executeInstruction("MOV", ["EBX", "10"]);
      sim.executeInstruction("RAND", ["EAX", "EBX"]);
      const value = sim.getRegisters().EAX;
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(10);
    });

    test("ROR with missing operands is a no-op", () => {
      expect(() => sim.executeInstruction("ROR", ["EAX"])).not.toThrow();
    });

    test("SAR handles register count and missing operands", () => {
      expect(() => sim.executeInstruction("SAR", ["EAX"])).not.toThrow();

      sim.executeInstruction("MOV", ["EAX", "0x80000000"]);
      sim.executeInstruction("MOV", ["ECX", "1"]);
      sim.executeInstruction("SAR", ["EAX", "ECX"]);
      expect(sim.getRegisters().EAX).toBe(0xc0000000);
    });

    test("ROL with missing operands is a no-op", () => {
      expect(() => sim.executeInstruction("ROL", ["EAX"])).not.toThrow();
    });

    test("NEG/TEST/SHL/SHR operand guards", () => {
      expect(() => sim.executeInstruction("NEG", [])).not.toThrow();
      expect(() => sim.executeInstruction("TEST", ["EAX"])).not.toThrow();
      expect(() => sim.executeInstruction("SHL", ["EAX"])).not.toThrow();
      expect(() => sim.executeInstruction("SHR", ["EAX"])).not.toThrow();
    });

    test("AND/OR/XOR/NOT operand guards", () => {
      expect(() => sim.executeInstruction("AND", ["EAX"])).not.toThrow();
      expect(() => sim.executeInstruction("OR", ["EAX"])).not.toThrow();
      expect(() => sim.executeInstruction("XOR", ["EAX"])).not.toThrow();
      expect(() => sim.executeInstruction("NOT", [])).not.toThrow();
    });

    test("DIV/IDIV/MOD/CMP operand guards", () => {
      expect(() => sim.executeInstruction("DIV", [])).not.toThrow();
      expect(() => sim.executeInstruction("IDIV", [])).not.toThrow();
      expect(() => sim.executeInstruction("MOD", ["5", "2"])).not.toThrow();
      expect(() => sim.executeInstruction("CMP", ["EAX"])).not.toThrow();
    });

    test("DEC/MUL/IMUL operand guards", () => {
      expect(() => sim.executeInstruction("DEC", [])).not.toThrow();
      expect(() => sim.executeInstruction("MUL", [])).not.toThrow();
      expect(() => sim.executeInstruction("IMUL", ["5", "EAX"])).not.toThrow();
      expect(() =>
        sim.executeInstruction("IMUL", ["5", "EAX", "2"]),
      ).not.toThrow();
    });

    test("MOVZX/MOVSX/SUB/INC operand guards", () => {
      expect(() => sim.executeInstruction("MOVZX", ["EAX"])).not.toThrow();
      expect(() => sim.executeInstruction("MOVSX", ["EAX"])).not.toThrow();
      expect(() => sim.executeInstruction("SUB", ["EAX"])).not.toThrow();
      expect(() => sim.executeInstruction("INC", [])).not.toThrow();
    });

    test("XCHG and LEA operand guards", () => {
      expect(() => sim.executeInstruction("XCHG", ["EAX"])).not.toThrow();
      expect(() => sim.executeInstruction("LEA", ["EAX"])).not.toThrow();
    });

    test("XCHG swaps register values", () => {
      sim.executeInstruction("MOV", ["EAX", "1"]);
      sim.executeInstruction("MOV", ["EBX", "2"]);
      sim.executeInstruction("XCHG", ["EAX", "EBX"]);
      expect(sim.getRegisters().EAX).toBe(2);
      expect(sim.getRegisters().EBX).toBe(1);
    });

    test("XCHG ignores non-register operands", () => {
      expect(() => sim.executeInstruction("XCHG", ["EAX", "5"])).not.toThrow();
    });

    test("LEA handles absolute memory operand", () => {
      sim.executeInstruction("LEA", ["EAX", "[0]"]);
      expect(sim.getRegisters().EAX).toBe(0);
    });

    test("LEA handles base register memory operand", () => {
      sim.executeInstruction("MOV", ["EBP", "400"]);
      sim.executeInstruction("LEA", ["EAX", "[EBP+4]"]);
      expect(sim.getRegisters().EAX).toBe(404);
    });

    test("Strict-x86 MOV rejects memory-to-memory and IO immediates", () => {
      const strictSim = new Simulator(8, 8, "strict-x86");
      expect(() =>
        strictSim.executeInstruction("MOV", ["[100]", "[200]"]),
      ).toThrow("Memory-to-memory MOV not allowed");

      expect(() =>
        strictSim.executeInstruction("MOV", ["[100]", "0xF000"]),
      ).toThrow("Memory-to-memory MOV not allowed");

      expect(() =>
        strictSim.executeInstruction("MOV", ["[100]", "0x10100"]),
      ).toThrow("Memory-to-memory MOV not allowed");

      strictSim.executeInstruction("MOV", ["[120]", "0x200"]);
      strictSim.executeInstruction("MOV", ["EAX", "[120]"]);
      expect(strictSim.getRegisters().EAX).toBe(0x200);
    });

    test("LCDDisplay constructor validates dimensions", () => {
      expect(() => new LCDDisplay(1, 8)).toThrow(
        "LCD dimensions must be between 2x2 and 256x256",
      );
      expect(() => new LCDDisplay(3, 8)).toThrow(
        "LCD dimensions must be powers of 2",
      );
      expect(() => new LCDDisplay()).not.toThrow();
      expect(() => new LCDDisplay(8, 8)).not.toThrow();
    });

    test("MOV and LEA cover zero offsets", () => {
      sim.executeInstruction("MOV", ["[0]", "55"]);
      sim.executeInstruction("MOV", ["EAX", "[0]"]);
      expect(sim.getRegisters().EAX).toBe(55);

      sim.executeInstruction("LEA", ["EBX", "[0]"]);
      expect(sim.getRegisters().EBX).toBe(0);
    });

    test("XCHG handles register8 operands", () => {
      sim.executeInstruction("MOV", ["EAX", "0x11"]);
      sim.executeInstruction("MOV", ["EBX", "0x22"]);
      sim.executeInstruction("XCHG", ["AL", "BL"]);
      expect(sim.getRegisters().EAX & 0xff).toBe(0x22);
      expect(sim.getRegisters().EBX & 0xff).toBe(0x11);
    });

    test("PUSH and POP ignore invalid operand counts", () => {
      expect(() => sim.executeInstruction("PUSH", [])).not.toThrow();
      expect(() => sim.executeInstruction("POP", [])).not.toThrow();
    });

    test("POP reads register destination", () => {
      sim.executeInstruction("PUSH", ["123"]);
      sim.executeInstruction("POP", ["EAX"]);
      expect(sim.getRegisters().EAX).toBe(123);
    });

    test("POP reads register8 destination", () => {
      sim.executeInstruction("MOV", ["EAX", "0"]);
      sim.executeInstruction("PUSH", ["0xAB"]);
      sim.executeInstruction("POP", ["AL"]);
      expect(sim.getRegisters().EAX & 0xff).toBe(0xab);
    });
  });
});
