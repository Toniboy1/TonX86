import { Memory } from "./memory";

describe("Memory", () => {
  let memory: Memory;

  beforeEach(() => {
    memory = new Memory();
  });

  describe("Bank A operations", () => {
    test("reads 0 from uninitialized memory", () => {
      expect(memory.readA(0)).toBe(0);
      expect(memory.readA(100)).toBe(0);
    });

    test("writes and reads single byte", () => {
      memory.writeA(100, 42);
      expect(memory.readA(100)).toBe(42);
    });

    test("masks to 8-bit on write", () => {
      memory.writeA(100, 0x1ff); // 9-bit value
      expect(memory.readA(100)).toBe(0xff); // Masked to 8-bit
    });

    test("writes to different addresses independently", () => {
      memory.writeA(100, 1);
      memory.writeA(200, 2);
      memory.writeA(300, 3);
      expect(memory.readA(100)).toBe(1);
      expect(memory.readA(200)).toBe(2);
      expect(memory.readA(300)).toBe(3);
    });
  });

  describe("Bank B operations", () => {
    test("reads 0 from uninitialized memory", () => {
      expect(memory.readB(0)).toBe(0);
      expect(memory.readB(100)).toBe(0);
    });

    test("writes and reads single byte", () => {
      memory.writeB(100, 42);
      expect(memory.readB(100)).toBe(42);
    });

    test("masks to 8-bit on write", () => {
      memory.writeB(100, 0x1ff);
      expect(memory.readB(100)).toBe(0xff);
    });
  });

  describe("Bank independence", () => {
    test("banks A and B are independent", () => {
      memory.writeA(100, 42);
      memory.writeB(100, 99);
      expect(memory.readA(100)).toBe(42);
      expect(memory.readB(100)).toBe(99);
    });
  });

  describe("clear", () => {
    test("clears all memory in both banks", () => {
      memory.writeA(100, 42);
      memory.writeA(200, 84);
      memory.writeB(100, 99);
      memory.writeB(200, 55);

      memory.clear();

      expect(memory.readA(100)).toBe(0);
      expect(memory.readA(200)).toBe(0);
      expect(memory.readB(100)).toBe(0);
      expect(memory.readB(200)).toBe(0);
    });
  });

  describe("custom size", () => {
    test("supports custom memory size", () => {
      const small = new Memory(256);
      small.writeA(0, 1);
      small.writeA(255, 2);
      expect(small.readA(0)).toBe(1);
      expect(small.readA(255)).toBe(2);
    });
  });
});
