# TonX86 — SIMCORE PROMPT

Core CPU simulator for TonX86 assembly execution.

## CPU Architecture
- **Registers**: 8x 32-bit (EAX, ECX, EDX, EBX, ESP, EBP, ESI, EDI)
- **Flags**: Z (Zero), C (Carry), O (Overflow), S (Sign)
- **Memory**: 64KB dual banks (Memory A, Memory B)
- **I/O**: Memory-mapped (0xF000-0xF1FF)

## Instruction Execution
`executeInstruction(mnemonic: string, operands: string[])`

### Data Movement
- **MOV dest, src** - Move data (register, immediate, memory-mapped I/O)
  - If src >= 0xF000: call `readIO(address)`
  - If dest >= 0xF000: call `writeIO(address, value)`

### Arithmetic
- **ADD dest, src** - Add (sets Z, C, O, S flags)
- **SUB dest, src** - Subtract (sets Z, C, O, S flags)
- **CMP op1, op2** - Compare without storing (SUB flags only)

### Logical
- **AND dest, src** - Bitwise AND (sets Z, S flags)
- **OR dest, src** - Bitwise OR (sets Z, S flags)

### Control Flow (handled by debug adapter)
- **JMP**, **JE/JZ**, **JNE/JNZ**, **HLT** - Parsed but not executed in simulator

## Memory-Mapped I/O

### LCD Display (0xF000-0xF0FF)
```typescript
writeIO(address: number, value: number): void {
  const offset = address - 0xF000;
  if (offset >= 0 && offset < this.lcd.length) {
    this.lcd[offset] = value;
  }
}

getLCDDisplay(): Uint8Array {
  return this.lcd;
}
```

### Keyboard (0xF100-0xF102)
```typescript
class Keyboard {
  private keyQueue: KeyboardEvent[] = [];
  private lastKeyCode: number = 0;
  private lastKeyState: number = 0;

  pushKey(keyCode: number, pressed: boolean): void;
  popKey(): boolean; // Returns true if popped
  getStatus(): number; // 1 = key available, 0 = empty
  getKeyCode(): number; // Returns last key code
  getKeyState(): number; // 1 = pressed, 0 = released
}

readIO(address: number): number {
  if (address === 0xF100) return this.keyboard.getStatus();
  if (address === 0xF101) {
    this.keyboard.popKey();
    return this.keyboard.getKeyCode();
  }
  if (address === 0xF102) return this.keyboard.getKeyState();
}
```

## Flag Calculation
- **Zero Flag**: Result == 0
- **Carry Flag**: Unsigned overflow (result > MAX_UINT32)
- **Overflow Flag**: Signed overflow (opposite signs)
- **Sign Flag**: Result < 0 (bit 31 set)

## Public API
- `executeInstruction(mnemonic, operands)` - Execute one instruction
- `getState()` - Returns {registers, memory, flags}
- `getRegisters()` - Returns register object
- `getLCDDisplay()` - Returns LCD pixel array
- `pushKeyboardEvent(keyCode, pressed)` - Add keyboard event
- `getKeyboardStatus()` - Check keyboard queue status
- `reset()` - Clear all state

## Testing
Comprehensive test suite in `simulator.test.ts`:
- Instruction execution (MOV, ADD, SUB, AND, OR, CMP)
- Flag operations
- LCD display writes
- Keyboard event queue (17 tests)
- Memory-mapped I/O reads/writes
