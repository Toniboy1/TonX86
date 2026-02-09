# TonX86 - Educational x86-like Assembly Environment

TonX86 is a VS Code extension that provides an educational x86-like assembly environment with integrated debugging, memory visualization, and an LCD display.

## Features

- **Assembly Editor** - Syntax highlighting and code intelligence for x86-like assembly
- **Debugger** - Run, pause, step, and breakpoint support
- **Single-threaded Execution** - Execute programs step by step
- **Dual Memory Banks** - Separate Memory A and Memory B (64KB each)
- **LCD Display** - Configurable 2x4 to 16x16 pixel grid for visual feedback
- **Register Viewer** - Real-time display of CPU register values
- **Memory Inspector** - Browse and modify memory contents
- **Embedded Documentation** - Hover over instructions for quick reference

## Architecture

TonX86 is built as a monorepo with the following components:

```
/packages
  ├── extension/        - VS Code extension UI and commands
  ├── debug-adapter/    - Debug Adapter Protocol (DAP) server
  ├── language-server/  - Language Server Protocol (LSP) support
  ├── simcore/          - Simulator core with CPU emulation
  └── docs/             - ISA documentation and definitions
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- VS Code 1.84.0 or later

### Installation

```bash
# Clone the repository
git clone https://github.com/Toniboy1/TonX86.git
cd TonX86

# Install dependencies
npm install

# Build all packages
npm run build
```

### Development

```bash
# Watch mode - rebuild on file changes
npm run watch

# Run linter
npm run lint

# Run tests
npm run test
```

## Instruction Set Architecture (ISA)

TonX86 supports a minimal but complete instruction set:

### Registers

8 general-purpose 32-bit registers:
- **EAX** - Accumulator
- **ECX** - Counter
- **EDX** - Data
- **EBX** - Base
- **ESP** - Stack Pointer
- **EBP** - Base Pointer
- **ESI** - Source Index
- **EDI** - Destination Index

### Instructions

| Instruction | Operands | Description | Cycles |
|-------------|----------|-------------|--------|
| `MOV` | reg, reg | Move data between registers | 1 |
| `ADD` | reg, reg | Add two registers | 1 |
| `SUB` | reg, reg | Subtract two registers | 1 |
| `AND` | reg, reg | Bitwise AND | 1 |
| `OR` | reg, reg | Bitwise OR | 1 |
| `JMP` | addr | Unconditional jump | 1 |
| `JZ` | addr | Jump if zero flag set | 1 |
| `HLT` | - | Halt execution | 1 |

### Flags

- **Z** (Zero) - Set when result is zero
- **C** (Carry) - Set on overflow
- **O** (Overflow) - Set on signed overflow
- **S** (Sign) - Set when result is negative

## Example Program

Create a file named `program.asm`:

```asm
; Simple addition program
MOV EAX, 5      ; Load 5 into EAX
MOV ECX, 3      ; Load 3 into ECX
ADD EAX, ECX    ; Add: EAX = 8
HLT             ; Stop execution
```

## Usage

1. Open or create an assembly file (`.asm` or `.s` extension)
2. Use the TonX86 commands from the Command Palette (Ctrl+Shift+P):
   - **TonX86: Run** - Execute the program
   - **TonX86: Pause** - Pause execution
   - **TonX86: Step Over** - Execute one instruction
   - **TonX86: Step In** - Step into calls
   - **TonX86: Step Out** - Step out of calls
   - **TonX86: Reset** - Reset CPU state and memory
3. Set breakpoints by clicking on line numbers
4. View register and memory contents in the TonX86 side panel
5. Use LCD display to visualize pixel data

## Building the Extension

To package the extension for distribution:

```bash
npm run build
# The compiled files will be in packages/extension/out/
```

## Project Status

**Current Version:** 0.0.1 (Foundation)

This is the initial foundation release with:
- ✅ Monorepo structure
- ✅ All core packages scaffolded
- ✅ TypeScript compilation working
- ✅ Basic ISA definitions
- ⏳ Full instruction execution (in progress)
- ⏳ Debug adapter integration (in progress)
- ⏳ VS Code extension UI (in progress)

## Contributing

Contributions are welcome! Please ensure:
- All TypeScript files compile without errors
- Code follows the established patterns
- New features include documentation
- All packages build successfully

## License

MIT

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Debug Adapter Protocol](https://microsoft.github.io/debug-adapter-protocol/)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
- [x86 Assembly](https://en.wikipedia.org/wiki/X86_assembly_language)

## Author

Anthony @ TonX86
