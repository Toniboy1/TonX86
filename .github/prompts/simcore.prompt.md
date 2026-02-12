# TonX86 — SIMCORE PROMPT

Core CPU simulator for TonX86 assembly execution.

## CPU Architecture
- **Registers**: 8x 32-bit (EAX, ECX, EDX, EBX, ESP, EBP, ESI, EDI)
- **8-bit Registers**: AL, AH, CL, CH, DL, DH, BL, BH (low/high bytes of EAX-EBX)
- **Flags**: Z (Zero), C (Carry), O (Overflow), S (Sign)
- **Memory**: 64KB dual banks (Memory A, Memory B)
- **I/O**: Memory-mapped (0xF000-0xFFFF, 0x10100-0x10102)
- **EIP**: Instruction pointer (index into instructions array)
- **Call Stack**: Internal call stack for CALL/RET tracking

## Control Flow (NEW in v0.5.0)

Simcore now owns all control flow logic, including:
- **EIP (Instruction Pointer)**: Tracks current instruction index
- **Instructions Array**: Loaded via `loadInstructions(instructions, labels)`
- **Labels Map**: Maps label names to instruction indices
- **Jump Evaluation**: Evaluates conditional jumps based on CPU flags
- **CALL/RET Handling**: Manages call stack and return addresses

### Control Flow API
```typescript
// Load program
loadInstructions(instructions: Instruction[], labels: Map<string, number>): void

// Execute one instruction and update EIP
step(): number  // Returns line number of executed instruction, or -1 if program ended

// Get/Set EIP
getEIP(): number
setEIP(value: number): void

// Get current instruction
getCurrentInstruction(): Instruction | null

// Get all instructions and labels
getInstructions(): Instruction[]
getLabels(): Map<string, number>
```

### step() Method
The `step()` method:
1. Executes the instruction at EIP
2. Evaluates control flow (JMP, CALL, RET, conditional jumps)
3. Updates EIP automatically based on instruction type
4. Returns the line number of the executed instruction
5. Returns -1 if program has ended
6. Throws error if instruction execution fails

### Jump Instructions Handled by step()
- **JMP label**: Unconditional jump
- **JE/JZ label**: Jump if Zero flag set
- **JNE/JNZ label**: Jump if Zero flag clear
- **JG label**: Jump if Greater (signed)
- **JGE label**: Jump if Greater or Equal (signed)
- **JL label**: Jump if Less (signed)
- **JLE label**: Jump if Less or Equal (signed)
- **JS label**: Jump if Sign flag set
- **JNS label**: Jump if Sign flag clear
- **JA label**: Jump if Above (unsigned)
- **JAE label**: Jump if Above or Equal (unsigned)
- **JB label**: Jump if Below (unsigned)
- **JBE label**: Jump if Below or Equal (unsigned)
- **CALL label**: Push return address and jump
- **RET**: Pop return address and jump

## Instruction Execution
`executeInstruction(mnemonic: string, operands: string[])`

### Data Movement
- **MOV dest, src** - Move data (register, immediate, memory-mapped I/O, 8-bit registers)
  - If src >= 0xF000: call `readIO(address)`
  - If dest >= 0xF000: call `writeIO(address, value)`
  - Supports 8-bit registers: MOV AL, 'H', MOV AH, 0x0E
- **XCHG dest, src** - Exchange register values
- **LEA dest, addr** - Load effective address
- **MOVZX dest, src** - Move with zero extend (8-bit to 32-bit)
- **MOVSX dest, src** - Move with sign extend (8-bit to 32-bit)

### Arithmetic
- **ADD dest, src** - Add (sets Z, C, O, S flags)
- **SUB dest, src** - Subtract (sets Z, C, O, S flags)
- **INC dest** - Increment by 1 (sets Z, O, S flags)
- **DEC dest** - Decrement by 1 (sets Z, O, S flags)
- **MUL src** - Unsigned multiply (EAX * src → EDX:EAX, sets Z, S)
- **IMUL src** - Signed multiply (EAX * src → EAX, sets Z, S)
- **DIV src** - Unsigned divide (EAX / src → quotient in EAX, remainder in EDX)
- **IDIV src** - Signed divide (EAX / src → quotient in EAX, remainder in EDX)
- **MOD dest, src** - Modulo (dest % src, sets Z, S)
- **CMP op1, op2** - Compare without storing (SUB flags only)
- **NEG dest** - Two's complement negation (sets Z, C, O, S)

### Logical
- **AND dest, src** - Bitwise AND (sets Z, S flags)
- **OR dest, src** - Bitwise OR (sets Z, S flags)
- **XOR dest, src** - Bitwise XOR (sets Z, S flags)
- **NOT dest** - Bitwise NOT (no flags)
- **TEST op1, op2** - Logical AND (flags only, sets Z, S)

### Shifts and Rotates
- **SHL dest, count** - Shift left (sets Z, S)
- **SHR dest, count** - Shift right logical (sets Z, S)
- **SAR dest, count** - Shift arithmetic right (sets Z, S)
- **ROL dest, count** - Rotate left (sets Z, S)
- **ROR dest, count** - Rotate right (sets Z, S)

### Stack Operations
- **PUSH src** - Push register/immediate onto stack (ESP -= 4)
- **POP dest** - Pop from stack into register (ESP += 4)
- **CALL label** - Call subroutine (handled by step() method, pushes return address)
- **RET** - Return from subroutine (handled by step() method, pops return address)

### Interrupts
- **INT num** - Software interrupt (executes handler based on number)
  - 0x10: Video services (AH=0x0E: teletype output from AL)
  - 0x20: Program terminate
  - 0x21: DOS services (AH=0x02: write character from DL)
- **IRET** - Return from interrupt (restore flags from stack)

### Control Flow Instructions
- **JMP**, **JE/JZ**, **JNE/JNZ**, **HLT** - Handled by step() method
- **JG**, **JGE**, **JL**, **JLE**, **JS**, **JNS** - Conditional jumps (handled by step())
- **JA**, **JAE**, **JB**, **JBE** - Unsigned conditional jumps (handled by step())
- **CALL**, **RET** - Subroutine calls (handled by step())

### Special Instructions
- **RAND dest, max** - Random number 0 to max-1 (educational instruction)

## Memory-Mapped I/O

### LCD Display (0xF000-0xFFFF)
```typescript
writeIO(address: number, value: number): void {
  const offset = address - 0xF000;
  if (offset >= 0 && offset < 0x10000) { // Up to 64x64 = 4096 pixels
    this.lcd[offset] = value;
  }
}

getLCDDisplay(): Uint8Array {
  return this.lcd;
}
```

### Keyboard (0x10100-0x10102)
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
  if (address === 0x10100) return this.keyboard.getStatus();
  if (address === 0x10101) {
    this.keyboard.popKey();
    return this.keyboard.getKeyCode();
  }
  if (address === 0x10102) return this.keyboard.getKeyState();
}
```

## Flag Calculation
- **Zero Flag**: Result == 0
- **Carry Flag**: Unsigned overflow (result > MAX_UINT32)
- **Overflow Flag**: Signed overflow (opposite signs)
- **Sign Flag**: Result < 0 (bit 31 set)

### Compatibility Mode Flag Behavior
- **Educational Mode** (default): All instructions update flags for learning purposes
  - DIV/IDIV: Set ZF and SF based on quotient
  - MUL/IMUL: Set ZF and SF based on lower 32 bits
  - Rotates: Set ZF and SF based on result
- **Strict-x86 Mode**: Matches real x86 processor behavior
  - DIV/IDIV: All flags undefined (CF/OF cleared)
  - MUL/IMUL: ZF/SF undefined (cleared), CF/OF set if upper bits non-zero
  - Rotates: ZF/SF not modified (per x86 spec)

## Flag Checking Methods
```typescript
isZeroFlagSet(): boolean     // Zero flag (bit 6)
isSignFlagSet(): boolean     // Sign flag (bit 7)
isOverflowFlagSet(): boolean // Overflow flag (bit 11)
isCarryFlagSet(): boolean    // Carry flag (bit 0)
```

## Public API
- `loadInstructions(instructions, labels)` - Load program with instructions and labels
- `step()` - Execute one instruction and handle control flow
- `getEIP()` / `setEIP(value)` - Get/set instruction pointer
- `getCurrentInstruction()` - Get instruction at EIP
- `getInstructions()` / `getLabels()` - Get loaded program data
- `executeInstruction(mnemonic, operands)` - Execute single instruction (no control flow)
- `getState()` - Returns {registers, memory, flags, eip, callStackDepth}
- `getRegisters()` - Returns register object (includes 8-bit aliases)
- `getLCDDisplay()` - Returns LCD pixel array
- `pushKeyboardEvent(keyCode, pressed)` - Add keyboard event
- `getKeyboardStatus()` - Check keyboard queue status
- `reset()` - Clear all state (including EIP and call stack)

## Testing
Comprehensive test suite in `simulator.test.ts`:
- All instruction execution (30+ instruction types)
- Flag operations
- LCD display writes (64x64 support)
- Keyboard event queue
- Memory-mapped I/O reads/writes
- Stack operations
- Interrupt handlers
