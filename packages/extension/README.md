# TonX86 - Educational Assembly Environment

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/visual-studio-marketplace/v/Toniboy1.tonx86)](https://marketplace.visualstudio.com/items?itemName=Toniboy1.tonx86)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/Toniboy1.tonx86)](https://marketplace.visualstudio.com/items?itemName=Toniboy1.tonx86)

Educational x86-like assembly language environment for learning low-level programming concepts with integrated debugging, memory visualization, LCD display, and keyboard input simulation.

## ✨ Features

### 🐛 Full Debugging Support
- Set breakpoints and step through code
- Pause/continue execution at any time
- View CPU state and memory in real-time
- Variable speed execution (1-200%)

### 💻 Simulated Hardware
- **8 General-Purpose Registers**: EAX, ECX, EDX, EBX, ESP, EBP, ESI, EDI
- **CPU Flags**: Zero, Carry, Overflow, Sign
- **64KB Memory**: Dual banks (Memory A & B) for data storage
- **LCD Display**: Configurable 2x2 to 256x256 pixel grid
- **Keyboard Input**: Real-time key press/release capture

### 📝 Development Tools
- **Syntax Highlighting**: Assembly-specific color coding
- **IntelliSense**: Code completion for instructions and registers
- **Diagnostics**: Real-time error detection
- **Hover Documentation**: Instruction reference on hover

## 🎯 Getting Started

### Step 1: Install the Extension
- Open VS Code
- Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
- Search for "TonX86"
- Click Install

### Step 2: Explore Examples
The extension includes 27 example programs to help you learn. Find them in the [examples folder on GitHub](https://github.com/Toniboy1/TonX86/tree/main/examples):

- **[01-basic-instructions.asm](https://github.com/Toniboy1/TonX86/blob/main/examples/01-basic-instructions.asm)** - MOV, ADD, SUB operations
- **[02-jumps.asm](https://github.com/Toniboy1/TonX86/blob/main/examples/02-jumps.asm)** - Conditional and unconditional jumps
- **[03-call-ret.asm](https://github.com/Toniboy1/TonX86/blob/main/examples/03-call-ret.asm)** - Function calls and returns
- **[04-stack.asm](https://github.com/Toniboy1/TonX86/blob/main/examples/04-stack.asm)** - Stack operations (PUSH/POP)
- **[08-lcd.asm](https://github.com/Toniboy1/TonX86/blob/main/examples/08-lcd.asm)** - LCD display programming
- **[14-keyboard.asm](https://github.com/Toniboy1/TonX86/blob/main/examples/14-keyboard.asm)** - Keyboard input handling
- **[20-flags.asm](https://github.com/Toniboy1/TonX86/blob/main/examples/20-flags.asm)** - CPU flag operations

...and 20 more examples covering interrupts, memory modes, bitwise operations, and more!

### Step 3: Write Your First Program
Create a new `.asm` file and start coding. The Language Server provides syntax highlighting, IntelliSense, and diagnostics as you type.

### Step 4: Debug and Run
Press F5 to start debugging. Use breakpoints, step through instructions, and watch your program execute in real-time!

## 🚀 Quick Start

### 1. Create an Assembly File

Create a new file with `.asm` extension:

```asm
; Simple program - Light up LCD pixel
MOV EAX, 1           ; Set pixel value to 1 (on)
MOV 0xF000, EAX      ; Write to LCD at position (0,0)
HLT                  ; Stop execution
```

### 2. Configure Launch

Press `F5` or click **Run → Start Debugging**. VS Code will create a launch configuration:

```json
{
  "type": "tonx86",
  "request": "launch",
  "name": "Debug Assembly",
  "program": "${file}",
  "stopOnEntry": true
}
```

### 3. Debug Your Code

- **F5** - Start debugging
- **F10** - Step over (execute next instruction)
- **F5** - Continue
- **Shift+F5** - Stop

## 📖 Instruction Set

| Instruction | Description | Example |
|-------------|-------------|---------|
| `MOV dest, src` | Move data | `MOV EAX, 10` |
| `ADD dest, src` | Add | `ADD EAX, EBX` |
| `SUB dest, src` | Subtract | `SUB EAX, 5` |
| `AND dest, src` | Bitwise AND | `AND EAX, 0xFF` |
| `OR dest, src` | Bitwise OR | `OR EAX, EBX` |
| `CMP op1, op2` | Compare | `CMP EAX, 0` |
| `JMP label` | Unconditional jump | `JMP loop_start` |
| `JE/JZ label` | Jump if equal/zero | `JE end` |
| `JNE/JNZ label` | Jump if not equal/zero | `JNE loop` |
| `HLT` | Halt execution | `HLT` |

## 🖥️ Memory-Mapped I/O

### LCD Display (0xF000-0xF0FF)

Write pixel values to memory addresses to control the display:

```asm
; Turn on pixel at position (0,0)
MOV 0xF000, 1

; Turn on pixel at position (5,3) on a 16x16 display
; Address = 0xF000 + (y * width + x) = 0xF000 + (3 * 16 + 5) = 0xF035
MOV 0xF035, 1
```

### Keyboard Input (0x10100-0x10102)

Read keyboard events from memory-mapped registers:

```asm
keyboard_loop:
    MOV EAX, 0x10100      ; Read status (1=key available, 0=empty)
    CMP EAX, 0
    JE keyboard_loop     ; Wait for key
    
    MOV EBX, 0x10101      ; Read key code (pops from queue)
    MOV ECX, 0x10102      ; Read key state (1=pressed, 0=released)
    
    ; Process key press...
    JMP keyboard_loop
```

**Key Codes:**
- Letters: A-Z (65-90), a-z (97-122)
- Numbers: 0-9 (48-57)
- Arrows: Up (128), Down (129), Left (130), Right (131)
- Special: Space (32), Enter (13), Esc (27), Tab (9), Backspace (8)

## ⚙️ Extension Settings

Configure TonX86 through VS Code settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `tonx86.lcd.enabled` | `true` | Enable LCD display |
| `tonx86.lcd.width` | `16` | LCD width (2-256 pixels) |
| `tonx86.lcd.height` | `16` | LCD height (2-256 pixels) |
| `tonx86.lcd.pixelSize` | `5` | Pixel size in pixels (1-50) |
| `tonx86.keyboard.enabled` | `true` | Enable keyboard input |
| `tonx86.keyboard.memoryAddress` | `0x10100` | Keyboard buffer memory address |
| `tonx86.cpu.speed` | `100` | CPU speed percentage (1-200%) |
| `tonx86.debug.stopOnEntry` | `true` | Pause at first instruction when debugging |
| `tonx86.debug.enableLogging` | `false` | Enable debug adapter logging |

## 📋 Example Programs

### Hello World (LCD Pattern)

```asm
; Draw a simple pattern on LCD
start:
    MOV EAX, 0        ; Counter
    MOV EBX, 0xF000   ; LCD base address

draw_loop:
    MOV [EBX], 1      ; Turn on pixel
    ADD EBX, 2        ; Skip one pixel
    ADD EAX, 1
    CMP EAX, 64       ; Draw 64 pixels
    JNE draw_loop
    HLT
```

### Interactive Keyboard

```asm
; Simple keyboard echo to LCD
main:
    MOV EAX, 0x10100      ; Check keyboard status
    CMP EAX, 1
    JNE main             ; Wait for key
    
    MOV EBX, 0x10101      ; Get key code
    MOV ECX, 0x10102      ; Get key state
    
    CMP ECX, 1           ; Key pressed?
    JE key_press
    MOV 0xF000, 0        ; Key released - turn off
    JMP main

key_press:
    MOV 0xF000, 1        ; Turn on first pixel
    JMP main
```

## 🎓 Educational Use

Perfect for:
- **Computer Science Courses**: Learn CPU architecture and assembly
- **Self-Study**: Practice low-level programming
- **Teaching**: Demonstrate how computers work at the hardware level
- **Prototyping**: Test assembly algorithms with visual feedback

## 🤝 Contributing

Contributions are welcome! Visit the [GitHub repository](https://github.com/Toniboy1/TonX86) to:
- Report bugs
- Request features
- Submit pull requests
- View full documentation

## 📄 License

MIT License - Free to use for educational and commercial purposes.

**Attribution Required**: When using this software, please credit **Anthony (Toniboy1)** and link to the repository.

---

**Enjoy learning assembly with TonX86!** 🎉

For issues or questions, visit: https://github.com/Toniboy1/TonX86/issues
