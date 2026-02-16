import type { KeyboardEvent } from "../types";

/**
 * TonX86 Keyboard Input - memory-mapped keyboard support
 *
 * Key Codes:
 * - Letters: A-Z = 65-90 (uppercase), a-z = 97-122 (lowercase)
 * - Numbers: 0-9 = 48-57
 * - Symbols: Standard ASCII codes
 * - Arrow Keys: Up=128, Down=129, Left=130, Right=131
 * - Space: 32
 * - Enter: 13
 * - Escape: 27
 * - Tab: 9
 * - Backspace: 8
 */
export class Keyboard {
  private keyQueue: KeyboardEvent[] = [];
  private lastKeyCode: number = 0;
  private lastKeyState: number = 0; // 0 = released, 1 = pressed

  /**
   * Push a key event to the queue
   */
  pushKey(keyCode: number, pressed: boolean): void {
    this.keyQueue.push({ keyCode, pressed });
    this.lastKeyCode = keyCode;
    this.lastKeyState = pressed ? 1 : 0;
  }

  /**
   * Get keyboard status register
   * Bit 0: Key available in queue (1 = yes, 0 = no)
   */
  getStatus(): number {
    return this.keyQueue.length > 0 ? 1 : 0;
  }

  /**
   * Get last key code
   */
  getKeyCode(): number {
    return this.lastKeyCode;
  }

  /**
   * Get last key state (1 = pressed, 0 = released)
   */
  getKeyState(): number {
    return this.lastKeyState;
  }

  /**
   * Pop the oldest key event from queue and update registers to that key
   * Returns true if a key was popped
   */
  popKey(): boolean {
    const event = this.keyQueue.shift();
    if (event) {
      // Update registers to show the popped key
      this.lastKeyCode = event.keyCode;
      this.lastKeyState = event.pressed ? 1 : 0;
      return true;
    }
    return false;
  }

  /**
   * Clear keyboard queue and state
   */
  clear(): void {
    this.keyQueue = [];
    this.lastKeyCode = 0;
    this.lastKeyState = 0;
  }
}
