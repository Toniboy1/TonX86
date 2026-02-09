# TonX86

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/Toniboy1/TonX86/workflows/CI/badge.svg)](https://github.com/Toniboy1/TonX86/actions)
[![CodeQL](https://github.com/Toniboy1/TonX86/workflows/CodeQL/badge.svg)](https://github.com/Toniboy1/TonX86/security/code-scanning)
[![codecov](https://codecov.io/gh/Toniboy1/TonX86/branch/main/graph/badge.svg)](https://codecov.io/gh/Toniboy1/TonX86)
[![Tests](https://img.shields.io/badge/tests-102%20passing-brightgreen)](https://github.com/Toniboy1/TonX86/actions)

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
| `ADD` | reg, reg | ZCOS | Add |
| `SUB` | reg, reg | ZCOS | Subtract |
| `AND` | reg, reg | ZS | Bitwise AND |
| `OR` | reg, reg | ZS | Bitwise OR |
| `CMP` | reg, reg | ZCOS | Compare (SUB without storing) |
| `JMP` | label | - | Unconditional jump |
| `JE/JZ` | label | - | Jump if zero |
| `JNE/JNZ` | label | - | Jump if not zero |
| `HLT` | - | - | Halt execution |

### Flags
**Z** (Zero) | **C** (Carry) | **O** (Overflow) | **S** (Sign)

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

## Example Program

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

### Repository Setup (For Maintainers)

**Apply Branch Protection (Automated):**
```powershell
# Windows
pwsh .github/scripts/apply-branch-protection.ps1

# Linux/macOS
bash .github/scripts/apply-branch-protection.sh
```

Requires: [GitHub CLI](https://cli.github.com/) + admin access

See: [Setup Guide](.github/SETUP_BRANCH_PROTECTION.md) | [Config File](.github/branch-protection.json)

### CI/CD

The project includes automated workflows:

- **CI Pipeline** - Runs on every push/PR
  - Build verification (Node 18 & 20)
  - TypeScript compilation
  - Linting
  - Test execution with coverage (102 tests)
  - Security audit
  - Coverage reporting to Codecov

- **CodeQL Security Scan** - Weekly security analysis

- **Dependabot** - Automated dependency updates
  - Weekly checks for all packages
  - Grouped minor/patch updates

- **Release Workflow** - Triggered on version tags
  - Packages extension as .vsix
  - Creates GitHub release with artifact
  - Ready for marketplace publication

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
