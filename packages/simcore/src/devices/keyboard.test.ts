import { Keyboard } from "./keyboard";

describe("Keyboard", () => {
  let keyboard: Keyboard;

  beforeEach(() => {
    keyboard = new Keyboard();
  });

  describe("key event queue", () => {
    test("initializes with empty queue", () => {
      expect(keyboard.getStatus()).toBe(0);
      expect(keyboard.getKeyCode()).toBe(0);
      expect(keyboard.getKeyState()).toBe(0);
    });

    test("pushKey() adds key to queue and updates state", () => {
      keyboard.pushKey(65, true); // 'A' pressed
      expect(keyboard.getStatus()).toBe(1);
      expect(keyboard.getKeyCode()).toBe(65);
      expect(keyboard.getKeyState()).toBe(1);
    });

    test("popKey() removes oldest key from queue", () => {
      keyboard.pushKey(65, true); // 'A' pressed
      keyboard.pushKey(66, false); // 'B' released

      expect(keyboard.getStatus()).toBe(1); // 2 keys in queue

      const popped = keyboard.popKey();
      expect(popped).toBe(true);
      expect(keyboard.getKeyCode()).toBe(65);
      expect(keyboard.getKeyState()).toBe(1);

      expect(keyboard.getStatus()).toBe(1); // 1 key left
    });

    test("multiple pops work correctly", () => {
      keyboard.pushKey(65, true); // 'A' pressed
      keyboard.pushKey(66, true); // 'B' pressed
      keyboard.pushKey(67, false); // 'C' released

      // Pop first key
      keyboard.popKey();
      expect(keyboard.getKeyCode()).toBe(65);
      expect(keyboard.getKeyState()).toBe(1);

      // Pop second key
      keyboard.popKey();
      expect(keyboard.getKeyCode()).toBe(66);
      expect(keyboard.getKeyState()).toBe(1);

      // Pop third key
      keyboard.popKey();
      expect(keyboard.getKeyCode()).toBe(67);
      expect(keyboard.getKeyState()).toBe(0);
    });

    test("popKey() returns false when queue is empty", () => {
      const popped = keyboard.popKey();
      expect(popped).toBe(false);
    });

    test("status reflects queue state", () => {
      expect(keyboard.getStatus()).toBe(0); // empty

      keyboard.pushKey(65, true);
      expect(keyboard.getStatus()).toBe(1); // has keys

      keyboard.popKey();
      expect(keyboard.getStatus()).toBe(0); // empty again
    });

    test("clear() resets all state", () => {
      keyboard.pushKey(65, true);
      keyboard.pushKey(66, true);
      keyboard.pushKey(67, false);

      keyboard.clear();

      expect(keyboard.getStatus()).toBe(0);
      expect(keyboard.getKeyCode()).toBe(0);
      expect(keyboard.getKeyState()).toBe(0);
    });
  });

  describe("key code handling", () => {
    test("handles letter key codes (A-Z)", () => {
      keyboard.pushKey(65, true); // 'A'
      expect(keyboard.getKeyCode()).toBe(65);

      keyboard.pushKey(90, true); // 'Z'
      expect(keyboard.getKeyCode()).toBe(90);
    });

    test("handles number key codes (0-9)", () => {
      keyboard.pushKey(48, true); // '0'
      expect(keyboard.getKeyCode()).toBe(48);

      keyboard.pushKey(57, true); // '9'
      expect(keyboard.getKeyCode()).toBe(57);
    });

    test("handles arrow key codes", () => {
      keyboard.pushKey(128, true); // Up
      expect(keyboard.getKeyCode()).toBe(128);

      keyboard.pushKey(129, true); // Down
      expect(keyboard.getKeyCode()).toBe(129);

      keyboard.pushKey(130, true); // Left
      expect(keyboard.getKeyCode()).toBe(130);

      keyboard.pushKey(131, true); // Right
      expect(keyboard.getKeyCode()).toBe(131);
    });

    test("handles special key codes", () => {
      keyboard.pushKey(13, true); // Enter
      expect(keyboard.getKeyCode()).toBe(13);

      keyboard.pushKey(27, true); // Escape
      expect(keyboard.getKeyCode()).toBe(27);

      keyboard.pushKey(32, true); // Space
      expect(keyboard.getKeyCode()).toBe(32);
    });

    test("handles key press and release states", () => {
      keyboard.pushKey(65, true); // pressed
      expect(keyboard.getKeyState()).toBe(1);

      keyboard.pushKey(65, false); // released
      expect(keyboard.getKeyState()).toBe(0);
    });
  });
});
