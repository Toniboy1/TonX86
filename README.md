# TonX86

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/visual-studio-marketplace/v/Toniboy1.tonx86)](https://marketplace.visualstudio.com/items?itemName=Toniboy1.tonx86)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/Toniboy1.tonx86)](https://marketplace.visualstudio.com/items?itemName=Toniboy1.tonx86)

Educational x86-like assembly environment for VS Code with integrated debugging, memory visualization, LCD display, and keyboard input.

## Features

- **Assembly Debugging** - Full DAP support with breakpoints, stepping, pause/continue
- **CPU Simulator** - 8 general-purpose 32-bit registers with flags (Z, C, O, S)
- **Memory-Mapped I/O** - LCD display (0xF000-0xFFFF, up to 64x64) and keyboard input (0x10100-0x10102)
- **LCD Display** - Configurable 2x2 to 256x256 pixel grid with pop-out support
- **Keyboard Input** - Real-time key press/release capture with event queue
- **Register/Memory Views** - Live inspection of CPU state
- **CPU Speed Control** - 1-200% execution speed for debugging/visualization
- **Output Panel** - Mirrors Debug Console output to VS Code Output (TonX86)
- **Language Server** - Syntax highlighting, diagnostics, code completion

## Architecture

```
Extension (UI/LCD/Keyboard) ←→ Debug Adapter (DAP) ←→ Simulator Core
                                       ↓
                               Language Server (LSP)
```

**Packages:**
- `extension/` - VS Code UI, LCD webview, keyboard capture
- `debug-adapter/` - DAP server, execution control, breakpoints
- `language-server/` - LSP for syntax support
- `simcore/` - CPU emulation, memory, I/O
- `docs/` - ISA reference

## Getting Started

### For Users (Extension)

1. **Install from VS Code Marketplace** (when published):
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "TonX86"
   - Click Install

2. **Try the Examples**:
   - Create a new `.asm` file or explore the `examples/` folder
   - Examples include:
     - [01-basic-instructions.asm](examples/01-basic-instructions.asm) - MOV, ADD, SUB operations
     - [02-jumps.asm](examples/02-jumps.asm) - Conditional and unconditional jumps
     - [03-call-ret.asm](examples/03-call-ret.asm) - Function calls and returns
     - [04-stack.asm](examples/04-stack.asm) - Stack operations (PUSH/POP)
     - [08-lcd.asm](examples/08-lcd.asm) - LCD display programming
     - [14-keyboard.asm](examples/14-keyboard.asm) - Keyboard input handling
     - [20-flags.asm](examples/20-flags.asm) - Flag register operations
     - [21-snake.asm](examples/21-snake.asm) - Snake game on 64x64 LCD
     - ...and more! See the `examples/` folder for all 27 examples

3. **Start Debugging**:
   - Open any `.asm` file
   - Press F5 or click "Run and Debug" in the sidebar
   - Set breakpoints, step through code, and watch registers/memory update in real-time

### For Contributors (From GitHub)

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Toniboy1/TonX86.git
   cd TonX86
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Build the Project**:
   ```bash
   npm run build
   ```

4. **Launch Extension Development Host**:
   - Press F5 in VS Code to open a new window with the extension loaded
   - Open any file from the `examples/` folder to start experimenting

5. **Run Tests**:
   ```bash
   npm test
   ```

## Configuration

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| **LCD Display** | | |
| `tonx86.lcd.enabled` | `true` | Enable LCD display |
| `tonx86.lcd.width` | `16` | LCD width (2-256 pixels) |
| `tonx86.lcd.height` | `16` | LCD height (2-256 pixels) |
| `tonx86.lcd.pixelSize` | `5` | Pixel size in pixels (1-50) |
| **Keyboard** | | |
| `tonx86.keyboard.enabled` | `true` | Enable keyboard input capture |
| `tonx86.keyboard.memoryAddress` | `0x10100` | Keyboard buffer memory address |
| **CPU** | | |
| `tonx86.cpu.speed` | `100` | CPU speed percentage (1-200%, 100=normal) |
| **Debugging** | | |
| `tonx86.debug.stopOnEntry` | `true` | Pause at first instruction when debugging |
| `tonx86.debug.enableLogging` | `false` | Enable debug adapter logging |
| **Language** | | |
| `tonx86.assemblyLanguage.diagnostics.undefinedLabels` | `true` | Show warnings for undefined labels |
| `tonx86.assemblyLanguage.diagnostics.callingConventions` | `false` | Enable calling convention checks |
| **Compatibility** | | |
| `tonx86.compatibility.mode` | `"educational"` | Compatibility mode: "educational" or "strict-x86" |

### Compatibility Modes

**Educational Mode** (default):
- Simplified instruction behavior for learning
- Flexible memory access (memory-to-memory operations allowed)
- Memory-mapped I/O support
- Ideal for beginners learning assembly concepts

**Strict x86 Mode**:
- Enforces realistic x86 constraints
- No memory-to-memory MOV instructions (use register as intermediate)
- More realistic flag behavior (planned)
- Segment register requirements (planned)
- Proper instruction constraints matching real x86 architecture
- Recommended for students transitioning to real x86 assembly

Students should start in **educational mode** to learn core concepts, then switch to **strict-x86 mode** when ready to practice real x86 assembly patterns.

### Launch Configuration

```json
{
  "type": "tonx86",
  "request": "launch",
  "name": "Debug Assembly",
  "program": "${workspaceFolder}/program.asm"
}
```

**Note**: All settings are configured via **VS Code Settings UI**:
- Go to **File > Preferences > Settings** (or **Code > Settings** on macOS)
- Search for "tonx86" to see all available options
- All settings (CPU speed, logging, LCD dimensions, stop-on-entry, etc.) are applied automatically on each debug session
- No launch.json configuration needed for these settings

## Instruction Set

### Registers
`EAX` `ECX` `EDX` `EBX` `ESP` `EBP` `ESI` `EDI`

8-bit aliases: `AL`/`AH`, `BL`/`BH`, `CL`/`CH`, `DL`/`DH` (low/high bytes of EAX, EBX, ECX, EDX)

### Architecture Note (v0.5.0+)

**Control Flow Ownership:** As of v0.5.0, the simulator core (simcore) owns all instruction execution including control flow (JMP, conditional jumps, CALL, RET), instruction pointer (EIP), label resolution, and call stack management. The debug adapter delegates execution to simcore's `step()` method, which handles all instruction execution and control flow decisions. This enables simcore to run independently from VS Code for testing and other use cases.

**Previous Architecture (v0.4.x and earlier):** Control flow was handled by the debug adapter, which required the simulator to operate within a DAP context.

### Instructions

| Mnemonic | Operands | Flags | Description |
|----------|----------|-------|-------------|
| `MOV` | reg/mem, reg/imm | - | Move data |
| `XCHG` | reg, reg | - | Exchange values |
| `LEA` | reg, imm | - | Load effective address |
| `MOVZX` | reg, reg/imm | - | Move with zero extend |
| `MOVSX` | reg, reg/imm | - | Move with sign extend |
| `ADD` | reg, reg/imm/mem | ZCOS | Add |
| `SUB` | reg, reg/imm/mem | ZCOS | Subtract |
| `INC` | reg | ZCOS | Increment |
| `DEC` | reg | ZCOS | Decrement |
| `NEG` | reg | ZCOS | Two's complement negation |
| `MUL` | reg/imm | ZS | Unsigned multiply |
| `IMUL` | reg/imm | ZS | Signed multiply |
| `DIV` | reg/imm | ZS | Unsigned divide |
| `IDIV` | reg/imm | ZS | Signed divide |
| `CMP` | reg, reg/imm | ZCOS | Compare (SUB without storing) |
| `AND` | reg, reg/imm | ZS | Bitwise AND |
| `OR` | reg, reg/imm | ZS | Bitwise OR |
| `XOR` | reg, reg/imm | ZS | Bitwise XOR |
| `NOT` | reg | - | Bitwise NOT (one's complement) |
| `TEST` | reg, reg/imm | ZS | Logical AND (flags only) |
| `SHL` | reg, imm/reg | ZS | Shift left |
| `SHR` | reg, imm/reg | ZS | Shift right (logical) |
| `SAR` | reg, imm/reg | ZS | Shift arithmetic right |
| `ROL` | reg, imm/reg | ZS | Rotate left |
| `ROR` | reg, imm/reg | ZS | Rotate right |
| `JMP` | label | - | Unconditional jump |
| `JE/JZ` | label | - | Jump if zero |
| `JNE/JNZ` | label | - | Jump if not zero |
| `CALL` | label | - | Push return address, jump to label |
| `RET` | - | - | Pop return address, jump to it |
| `PUSH` | reg/imm/mem | - | Push register/immediate/memory onto stack |
| `POP` | reg | - | Pop from stack into register |
| `INT` | imm8 | - | Software interrupt (syscall) |
| `IRET` | - | All | Return from interrupt |
| `HLT` | - | - | Halt execution |

### Stack Operations

**Stack Pointer:** `ESP` is initialized to `0xFFFF` (top of memory)  
**Stack Growth:** Downward (from high to low memory addresses)  
**Stack Width:** 32-bit (4 bytes per push/pop)

- `PUSH reg/imm` - Decrements ESP by 4, writes value to memory
- `POP reg` - Reads value from memory, increments ESP by 4
- `CALL label` - Pushes return address, jumps to label
- `RET` - Pops return address, jumps to it

### Memory Addressing

Supports indirect memory access with register-based addressing:
- `[REG]` - Direct memory access via register (e.g., `MOV EAX, [ESP]`)
- `[REG+offset]` - Register with positive offset (e.g., `MOV EAX, [EBP+8]`)
- `[REG-offset]` - Register with negative offset (e.g., `MOV EAX, [EBP-4]`)
- `[REG+REG]` - Register with register offset (e.g., `MOV EAX, [EBX+ECX]`)

Examples:
```asm
MOV EAX, [EBP+8]      ; Load from stack (parameter access)
MOV [ESP], EBX        ; Store to stack
PUSH [EBP+12]         ; Push memory value onto stack
ADD EAX, [ESI+4]      ; Add memory value to register
```

### Calling Conventions

TonX86 supports standard x86 calling conventions with LSP diagnostics:
- **cdecl** - C declaration (caller cleans stack, parameters right-to-left)
- **stdcall** - Standard call (callee cleans stack, Windows API style)
- **fastcall** - Fast call (first 2 params in registers ECX/EDX)

The language server provides real-time diagnostics for:
- Missing function prologues/epilogues
- Unbalanced stack operations
- Callee-saved register violations
- Stack cleanup pattern detection

See [CALLING_CONVENTIONS.md](packages/docs/CALLING_CONVENTIONS.md) for detailed documentation.

### Flags
**Z** (Zero) | **C** (Carry) | **O** (Overflow) | **S** (Sign)

### Interrupts

Software interrupts enable system calls and I/O operations similar to DOS/BIOS.

**INT num** - Software interrupt
- Executes interrupt handler for the specified number
- Output appears in VS Code Debug Console

Notes:
- `AL`/`AH` are used for INT 0x10 (teletype output)
- `DL`/`AH` are used for INT 0x21 (DOS-style output)

**Supported Interrupts:**
- `INT 0x10` - Video services
  - `AH=0x0E` - Teletype output (write character in AL to console)
- `INT 0x21` - DOS-style services
  - `AH=0x02` - Write character (character in DL to console)
- `INT 0x20` - Program terminate (halts execution)

**IRET** - Return from interrupt (placeholder for future use)

## Memory-Mapped I/O

### LCD Display (0xF000-0xF0FF)
- Write pixel: `MOV 0xF000 + (y*width + x), value`
- Example: `MOV 0xF000, 1` turns on pixel (0,0)

### Keyboard (0x10100-0x10102)
- `0x10100` - Status (1=key available, 0=empty)
- `0x10101` - Key code (read pops from queue)
- `0x10102` - Key state (1=pressed, 0=released)

**Key Codes:**
- Letters: A-Z=65-90, a-z=97-122
- Numbers: 0-9=48-57
- Arrows: Up=128, Down=129, Left=130, Right=131
- Special: Space=32, Enter=13, Esc=27, Tab=9, Backspace=8

## Example Programs

### Basic Subroutine with CALL/RET

```asm
; Multiply EAX by 2 using a subroutine
main:
    MOV EAX, 5             ; Load value
    CALL multiply_by_2     ; Call subroutine
    HLT                    ; Result in EAX (10)

multiply_by_2:
    ADD EAX, EAX           ; Double the value
    RET                    ; Return to caller
```

### Stack Operations

```asm
; Save and restore registers
main:
    MOV EAX, 10
    MOV EBX, 20
    PUSH EAX               ; Save EAX
    PUSH EBX               ; Save EBX
    
    MOV EAX, 99            ; Modify registers
    MOV EBX, 88
    
    POP EBX                ; Restore EBX (20)
    POP EAX                ; Restore EAX (10)
    HLT
```

### Keyboard-Controlled Pixel

```asm
; Keyboard-controlled pixel
main_loop:
    MOV EAX, 0x10100        ; Read keyboard status
    CMP EAX, 1             ; Key available?
    JNE main_loop          ; No - keep waiting
    
    MOV EBX, 0x10101        ; Read key code (pops key)
    MOV ECX, 0x10102        ; Read key state
    
    CMP ECX, 1             ; Key pressed?
    JE key_pressed
    
    MOV 0xF000, 0          ; Key released - turn off pixel
    JMP main_loop

key_pressed:
    MOV 0xF000, 1          ; Turn on pixel
    JMP main_loop
```

### Console Output with Interrupts

```asm
; Print "Hello" to console using INT 0x10
main:
    MOV AH, 0x0E           ; Teletype output function
    MOV AL, 'H'            ; Character 'H'
    INT 0x10               ; Video services interrupt
    
    MOV AL, 'e'            ; Character 'e'
    INT 0x10
    
    MOV AL, 'l'            ; Character 'l'
    INT 0x10
    INT 0x10               ; Print 'l' twice
    
    MOV AL, 'o'            ; Character 'o'
    INT 0x10
    
    INT 0x20               ; Terminate program
```

### DOS-Style Console Output

```asm
; Print "Hi" using DOS INT 0x21
main:
    MOV AH, 0x02           ; Write character function
    MOV DL, 'H'            ; Character 'H'
    INT 0x21               ; DOS services interrupt
    
    MOV DL, 'i'            ; Character 'i'
    INT 0x21
    
    HLT                    ; Halt execution
```

## Development

### Build & Test

```bash
npm install          # Install dependencies
npm Quality Requirements

Before submitting a contribution:
- ✅ All tests pass (`npm test`)
- ✅ Code coverage ≥80% (`npm test -- --coverage`)
- ✅ No lint errors (`npm run lint`)
- ✅ Build succeeds (`npm run build`)
- ✅ Documentation updated

**For details on CI/CD, automated checks, coverage reports, and the release process, see [Contributing Workflow](.github/CONTRIBUTING_WORKFLOW.md).**
- ✅ Pass ESLint checks
- ✅ Include tests for new features
- ✅ Update relevant documentation

**Test Coverage Thresholds:**
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

**Current Coverage:** 92% statements, 84% branches, 95% functions, 94% lines

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Quick Links:**
- [Report a Bug](https://github.com/Toniboy1/TonX86/issues/new?template=bug_report.yml)
- [Request a Feature](https://github.com/Toniboy1/TonX86/issues/new?template=feature_request.yml)
- [Security Policy](SECURITY.md)

**Important Requirements:**
- All commits must be [GPG/SSH signed](https://github.com/Toniboy1/TonX86/blob/main/.github/COMMIT_SIGNING.md)
- External contributors must submit pull requests (no direct pushes to `main`)
- See [Branch Protection Rules](https://github.com/Toniboy1/TonX86/blob/main/.github/BRANCH_PROTECTION.md)

## License

MIT License - Free to use for educational and commercial purposes.

**Attribution Required:** When using or distributing this software, you must:
- Include the original copyright notice
- Credit the author: **Anthony (Toniboy1)**
- Link to: https://github.com/Toniboy1/TonX86

Example: `"Built with TonX86 by Anthony (Toniboy1)"`

See [LICENSE](LICENSE) for full details.

## Verification Sources

The TonX86 instruction set and behavior have been verified against:

- **x86 Assembly Guide** — University of Virginia CS216, by David Evans
  (originally created by Adam Ferrari, updated by Alan Batson, Mike Lack, and Anita Jones)
  https://www.cs.virginia.edu/~evans/cs216/guides/x86.html
  Licensed under [Creative Commons BY-NC-SA 3.0 US](https://creativecommons.org/licenses/by-nc-sa/3.0/us/)
 and [Contributing Workflow](.github/CONTRIBUTING_WORKFLOW.md) for details on what happens after you submit a PR (CI/CD, automated checks, coverage requirements, and release process).

**Quick Links:**
- [Report a Bug](https://github.com/Toniboy1/TonX86/issues/new?template=bug_report.yml)
- [Request a Feature](https://github.com/Toniboy1/TonX86/issues/new?template=feature_request.yml)
- [Security Policy](SECURITY.md)
- [Contributing Workflow](.github/CONTRIBUTING_WORKFLOW