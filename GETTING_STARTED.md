# Getting Started with TonX86

Welcome! This guide will help you get up and running with TonX86 in just a few minutes.

## 📦 Installation

### From VS Code Marketplace (Recommended)

1. Open **VS Code**
2. Go to **Extensions** (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for **"TonX86"**
4. Click **Install**

That's it! You're ready to write assembly code.

### From Source (For Contributors)

```bash
git clone https://github.com/Toniboy1/TonX86.git
cd TonX86
npm install
npm run build
npm run package  # Creates .vsix file
```

Then install the generated `.vsix` file in VS Code via Extensions → Install from VSIX.

### macOS-Specific Setup

On macOS, `npm install` must include dev-dependencies. If you encounter
`eslint: command not found` or similar errors:

```bash
# Ensure NODE_ENV is not "production"
unset NODE_ENV

# Clean install with all dev dependencies
rm -rf node_modules package-lock.json
npm install --include=dev
npm run build

# Verify everything works
npm run check:deps   # Quick tool check
npm run check        # Full check (lint → build → test → examples)
```

> **Why?** npm workspaces hoist shared dependencies to the root
> `node_modules/.bin/`. If dev-dependencies are omitted, tools like
> ESLint, Jest, and TypeScript won't be available on PATH.

## 🚀 Your First Program

### 1. Create a file

Create a new file called `hello.asm` or open any existing `.asm` file.

### 2. Write assembly code

```asm
; Simple addition program
MOV EAX, 5      ; Load 5 into EAX
ADD EAX, 3      ; Add 3 to EAX
```

### 3. Start debugging

Press **F5** or click the **Run and Debug** button.

The debugger will:
- ✅ Assemble your code
- ✅ Start execution
- ✅ Stop at the first instruction
- ✅ Show registers and memory in the sidebar

### 4. Step through code

- **Step Over** (F10) - Execute one instruction
- **Step In** (F11) - Step into function calls
- **Continue** (F5) - Run until breakpoint
- **Set Breakpoint** - Click the line number

## 📚 Learn by Examples

The `examples/` folder contains 30+ complete programs showcasing all features:

| Example | What It Teaches |
|---------|-----------------|
| [01-basic-instructions.asm](../examples/01-basic-instructions.asm) | MOV, ADD, SUB basics |
| [02-jumps.asm](../examples/02-jumps.asm) | Conditional jumps (JE, JNE, JL, etc.) |
| [03-call-ret.asm](../examples/03-call-ret.asm) | Function calls and returns |
| [04-stack.asm](../examples/04-stack.asm) | PUSH/POP stack operations |
| [08-lcd.asm](../examples/08-lcd.asm) | Drawing on LCD display |
| [14-keyboard.asm](../examples/14-keyboard.asm) | Reading keyboard input |
| [20-flags.asm](../examples/20-flags.asm) | CPU flags (ZF, CF, OF, SF) |
| [21-snake.asm](../examples/21-snake.asm) | **Game:** Snake on 64×64 LCD |

**Try this:** Open `examples/21-snake.asm`, press F5, and play! Use arrow keys to move.

## 🎯 Common Tasks

### Reading Registers

Open **Run → Debug Console** to see register values:

```
EAX = 0x00000008
EBX = 0x00000000
...
```

Or check the **Registers** panel in the Debug view (left sidebar).

### Setting Breakpoints

Click the line number on the left. The debugger will pause when reaching that line.

### Writing to Memory

```asm
MOV EAX, 0xF000  ; Point to LCD memory
MOV byte [EAX], 1  ; Write value 1 to memory
```

Then check the **Memory** panels to see changes.

### Displaying on LCD

```asm
MOV EAX, 0xF000  ; LCD memory address
MOV byte [EAX], 0xFF  ; Set pixel (1 = on, 0 = off)
```

Configure LCD size in **Preferences → Settings → Search "tonx86.lcd"**

### Reading Keyboard

```asm
MOV BX, 0x10100  ; Keyboard status address
MOV AL, [BX]     ; AL = 1 if key pressed, 0 if not

CMP AL, 1
JNE no_key

MOV CL, [0x10101]  ; Read the key code
; Process key...

no_key:
```

## ⚙️ Configuration

Access settings via **Preferences → Settings → Search "tonx86"**

### Useful Settings

| Setting | Purpose | Default |
|---------|---------|---------|
| `tonx86.lcd.width` | LCD display width in pixels | 16 |
| `tonx86.lcd.height` | LCD display height in pixels | 16 |
| `tonx86.cpu.speed` | CPU speed (1-200%, 100%=normal) | 100 |
| `tonx86.debug.stopOnEntry` | Pause at first instruction | true |
| `tonx86.compatibility.mode` | `educational` or `strict-x86` | educational |

## 🔍 Instruction Reference

See [packages/docs/ISA.md](packages/docs/ISA.md) for complete instruction set.

**Quick reference:**

| Instruction | Purpose | Example |
|-------------|---------|---------|
| `MOV` | Move data | `MOV EAX, 5` |
| `ADD`, `SUB` | Arithmetic | `ADD EAX, EBX` |
| `CMP` | Compare | `CMP EAX, 0` |
| `JE`, `JNE` | Conditional jump | `JE label` |
| `JMP` | Unconditional jump | `JMP label` |
| `CALL`, `RET` | Function calls | `CALL func` |
| `PUSH`, `POP` | Stack operations | `PUSH EAX` |
| `AND`, `OR`, `XOR` | Bitwise ops | `AND EAX, 0xFF` |
| `MOV [addr], val` | Write to memory | `MOV [0xF000], 1` |

## ❓ FAQs

### Q: How do I stop the program?
**A:** Set a breakpoint at the end or press the **Stop** button (Shift+F5).

### Q: Memory address `0xF000` does what?
**A:** That's the LCD display memory. Writing 1 turns pixels on, 0 turns them off.

### Q: How do I read input?
**A:** Use address `0x10100` for keyboard status and `0x10101` for key codes.

### Q: Can I use constants/labels?
**A:** Yes! Define them at the start:
```asm
MY_CONSTANT EQU 42
MY_LABEL:
    MOV EAX, MY_CONSTANT
```

### Q: What's "educational mode"?
**A:** Simplified x86 behavior perfect for learning. Switch to `strict-x86` mode for realistic x86 rules.

## 🐛 Troubleshooting

### Debugger exits immediately (no instructions executed)
This usually means build artifacts are missing:
```bash
npm run build        # Build all packages (required before debugging)
```
Then press **F5** again. If you're developing from source, make sure
`npm install && npm run build` completed without errors.

### `eslint: command not found` (macOS)
Dev-dependencies were not installed. Fix:
```bash
unset NODE_ENV
npm install --include=dev
npm run check:deps   # Verify tools are available
```

### "Syntax error" when debugging
- Check for typos in instruction names
- Ensure proper operand formatting (e.g., `ADD EAX, 5` not `ADD EAX 5`)
- See [ISA.md](packages/docs/ISA.md) for instruction syntax

### Breakpoints not working
- Ensure file is saved
- Try reassembling: Run → "TonX86: Assemble"

### LCD not displaying
Check settings:
- `tonx86.lcd.enabled` = `true`
- Memory addresses: `0xF000` - `0xFFFF`

## 🎓 Learning Paths

### Beginner: Learn Assembly Basics
1. Run examples 01-03
2. Create simple arithmetic programs
3. Move to conditional jumps (example 02)

### Intermediate: Control Flow & Functions
1. Study examples 03-04 (CALL/RET, STACK)
2. Write recursive functions
3. Try example 20 (flags)

### Advanced: I/O & Games
1. Study LCD (example 08)
2. Study keyboard (example 14)
3. Build a game like Snake (example 21)

## 📖 Next Steps

- **Read:** [Instruction Set Reference](packages/docs/ISA.md)
- **Watch:** Try examples 1-20 in order
- **Build:** Create your own assembly programs
- **Join:** [Discussions](https://github.com/Toniboy1/TonX86/discussions)
- **Contribute:** See [CONTRIBUTING.md](CONTRIBUTING.md)

## 💬 Need Help?

- **Issues:** [Report bugs](https://github.com/Toniboy1/TonX86/issues)
- **Discussions:** [Ask questions](https://github.com/Toniboy1/TonX86/discussions)
- **Documentation:** [See all docs](packages/docs/ISA.md)

Happy assembling! 🚀
