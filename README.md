# TonX86

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/Toniboy1/TonX86/workflows/CI/badge.svg)](https://github.com/Toniboy1/TonX86/actions)
[![CodeQL](https://github.com/Toniboy1/TonX86/workflows/CodeQL/badge.svg)](https://github.com/Toniboy1/TonX86/security/code-scanning)
[![Tests](https://img.shields.io/badge/tests-102%20passing-brightgreen)](https://github.com/Toniboy1/TonX86/actions)
[![Coverage](https://img.shields.io/badge/coverage-92%25-brightgreen)](https://github.com/Toniboy1/TonX86/actions)

Educational x86-like assembly environment for VS Code with integrated debugging, memory visualization, LCD display, and keyboard input.

## Features

- **Assembly Debugging** - Full DAP support with breakpoints, stepping, pause/continue
- **CPU Simulator** - 8 general-purpose 32-bit registers with flags (Z, C, O, S)
- **Memory-Mapped I/O** - LCD display (0xF000-0xF0FF) and keyboard input (0xF100-0xF102)
- **LCD Display** - Configurable 2x2 to 256x256 pixel grid with pop-out support
- **Keyboard Input** - Real-time key press/release capture with event queue
- **Register/Memory Views** - Live inspection of CPU state
- **CPU Speed Control** - 1-200% execution speed for debugging/visualization
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

## Quick Start

```bash
npm install
npm run build
# Press F5 in VS Code to launch Extension Development Host
```

## Configuration

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `tonx86.lcd.enabled` | `true` | Enable LCD display |
| `tonx86.lcd.width` | `16` | LCD width (2-256 pixels) |
| `tonx86.lcd.height` | `16` | LCD height (2-256 pixels) |
| `tonx86.lcd.pixelSize` | `"auto"` | Pixel size: "auto" or 2-500 |
| `tonx86.keyboard.enabled` | `true` | Enable keyboard input capture |
| `tonx86.cpu.speed` | `100` | CPU speed 1-200% (100=normal) |

### Launch Configuration

```json
{
  "type": "tonx86",
  "request": "launch",
  "name": "Debug Assembly",
  "program": "${workspaceFolder}/program.asm",
  "stopOnEntry": true,
  "cpuSpeed": 100,
  "enableLogging": false
}
```

## Instruction Set

### Registers
`EAX` `ECX` `EDX` `EBX` `ESP` `EBP` `ESI` `EDI`

### Instructions

| Mnemonic | Operands | Flags | Description |
|----------|----------|-------|-------------|
| `MOV` | reg/mem, reg/imm | - | Move data |
| `XCHG` | reg, reg | - | Exchange values |
| `LEA` | reg, imm | - | Load effective address |
| `MOVZX` | reg, reg/imm | - | Move with zero extend |
| `MOVSX` | reg, reg/imm | - | Move with sign extend |
| `ADD` | reg, reg/imm | ZCOS | Add |
| `SUB` | reg, reg/imm | ZCOS | Subtract |
| `INC` | reg | ZCOS | Increment |
| `DEC` | reg | ZCOS | Decrement |
| `NEG` | reg | ZCOS | Two's complement negation |
| `CMP` | reg, reg/imm | ZCOS | Compare (SUB without storing) |
| `AND` | reg, reg/imm | ZS | Bitwise AND |
| `OR` | reg, reg/imm | ZS | Bitwise OR |
| `XOR` | reg, reg/imm | ZS | Bitwise XOR |
| `NOT` | reg | - | Bitwise NOT (one's complement) |
| `TEST` | reg, reg/imm | ZS | Logical AND (flags only) |
| `JMP` | label | - | Unconditional jump |
| `JE/JZ` | label | - | Jump if zero |
| `JNE/JNZ` | label | - | Jump if not zero |
| `CALL` | label | - | Push return address, jump to label |
| `RET` | - | - | Pop return address, jump to it |
| `PUSH` | reg | - | Push register onto stack |
| `POP` | reg | - | Pop from stack into register |
| `INT` | imm8 | - | Software interrupt (syscall) |
| `IRET` | - | All | Return from interrupt |
| `HLT` | - | - | Halt execution |

### Stack Operations

**Stack Pointer:** `ESP` is initialized to `0xFFFF` (top of memory)  
**Stack Growth:** Downward (from high to low memory addresses)  
**Stack Width:** 32-bit (4 bytes per push/pop)

- `PUSH reg` - Decrements ESP by 4, writes register value to memory
- `POP reg` - Reads value from memory, increments ESP by 4
- `CALL label` - Pushes return address, jumps to label
- `RET` - Pops return address, jumps to it

### Flags
**Z** (Zero) | **C** (Carry) | **O** (Overflow) | **S** (Sign)

### Interrupts

Software interrupts enable system calls and I/O operations similar to DOS/BIOS.

**INT num** - Software interrupt
- Executes interrupt handler for the specified number
- Output appears in VS Code Debug Console

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

### Keyboard (0xF100-0xF102)
- `0xF100` - Status (1=key available, 0=empty)
- `0xF101` - Key code (read pops from queue)
- `0xF102` - Key state (1=pressed, 0=released)

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
    MOV EAX, 0xF100        ; Read keyboard status
    CMP EAX, 1             ; Key available?
    JNE main_loop          ; No - keep waiting
    
    MOV EBX, 0xF101        ; Read key code (pops key)
    MOV ECX, 0xF102        ; Read key state
    
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
npm run build        # Build all packages
npm run watch        # Watch mode for development
npm test             # Run tests
npm run lint         # Run linter
npm run check        # Run all checks (lint, build, test)

# Run tests with coverage
cd packages/simcore
npm test -- --coverage
```

### CI/CD

The project includes automated workflows:

- **CI Pipeline** - Runs on every push/PR
  - Build verification (Node 18 & 20)
  - TypeScript compilation
  - Linting
  - Test execution with coverage (102 tests)
  - Security audit
  - Coverage reports uploaded as artifacts
  - Coverage comments on PRs (free service)

- **CodeQL Security Scan** - Weekly security analysis

- **Dependabot** - Automated dependency updates
  - Weekly checks for all packages
  - Grouped minor/patch updates

- **Release Workflow** - Triggered on version tags
  - Packages extension as .vsix
  - Creates GitHub release with artifact
  - Ready for marketplace publication

**Coverage Reports:**
- View HTML coverage report: Check artifacts in [Actions](https://github.com/Toniboy1/TonX86/actions)
- Coverage comments appear on pull requests automatically
- All coverage runs executed locally during CI builds

### Quality Standards

All contributions must:
- ✅ Pass TypeScript compilation
- ✅ Pass all tests (102/102 currently)
- ✅ Maintain 80%+ code coverage
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
