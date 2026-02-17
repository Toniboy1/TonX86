# FAQ

## Installation & Setup

### Q: Is TonX86 free?

**A:** Yes! TonX86 is MIT-licensed and completely free for educational and commercial use.

### Q: What versions of VS Code are supported?

**A:** VS Code 1.84.0 and later. Check the [marketplace listing](https://marketplace.visualstudio.com/items?itemName=Toniboy1.tonx86).

### Q: Can I use TonX86 offline?

**A:** Yes! Once installed, TonX86 works completely offline. No internet connection needed.

### Q: How do I uninstall?

**A:** In VS Code Extensions, search for "TonX86", click the gear icon, and select "Uninstall".

### Q: `eslint: command not found` on macOS

**A:** Dev-dependencies were not installed. Fix:

```bash
unset NODE_ENV
npm install --include=dev
npm run check:deps
```

### Q: Debugger exits immediately without executing anything

**A:** Build artifacts are missing. Run `npm run build` then press F5 again.
If installing from the Marketplace, reinstall the extension. If developing from source, ensure `npm install && npm run build` completed successfully.

### Q: Does TonX86 work on macOS and Windows?

**A:** Yes! TonX86 is tested on both macOS and Windows. See [GETTING_STARTED.md](GETTING_STARTED.md) for platform-specific setup instructions.

## Programming

### Q: What's the difference between `JMP` and `CALL`?

**A:**

- `JMP` jumps immediately to an address
- `CALL` pushes the return address onto the stack before jumping (used for functions)
- Use `CALL` → `RET` for functions, `JMP` for loops

### Q: How do I create a loop?

**A:** Use a label and `JMP`:

```asm
loop_start:
    ; code here
    CMP EAX, 10
    JNE loop_start  ; Jump to loop_start if not equal
```

### Q: Can I call a function and return from it?

**A:** Yes! Use `CALL` and `RET`:

```asm
main:
    CALL my_function
    ; Function returned here

my_function:
    MOV EAX, 42
    RET  ; Return to caller
```

### Q: What registers are available?

**A:** 8 general-purpose 32-bit registers:

- `EAX`, `EBX`, `ECX`, `EDX` (data registers)
- `ESP`, `EBP` (stack pointers)
- `ESI`, `EDI` (index registers)

Plus 8-bit aliases: `AL`/`AH`, `BL`/`BH`, `CL`/`CH`, `DL`/`DH`

### Q: Can I use 64-bit registers?

**A:** No, TonX86 is 32-bit. This is sufficient for learning assembly fundamentals.

### Q: How do I define a constant?

**A:** Use `EQU`:

```asm
MY_CONSTANT EQU 42
MOV EAX, MY_CONSTANT
```

### Q: What's the stack for?

**A:** Storing return addresses (via `CALL`/`RET`) and temporary data:

```asm
PUSH EAX  ; Push EAX onto stack
POP EBX   ; Pop into EBX
```

## Memory & I/O

### Q: How much memory does the simulator have?

**A:** 1 MB (1,048,576 bytes) of addressable memory (0x000000 to 0xFFFFFF).

### Q: What are special memory addresses?

**A:**

- `0x00000000-0xEFFFF` - General RAM
- `0xF000-0xFFFF` - LCD display memory (configurable 2×2 to 256×256)
- `0x10100-0x10102` - Keyboard input

### Q: How do I write to the LCD?

**A:** Write to address `0xF000` and beyond:

```asm
; Assuming 16×16 LCD
MOV EAX, 0xF000  ; LCD address
MOV byte [EAX], 1  ; Set first pixel (1=on, 0=off)
```

Configure size: **Preferences → Settings → Search "tonx86.lcd"**

### Q: How do I read keyboard input?

**A:**

```asm
; Check if key pressed
MOV AL, [0x10100]  ; 1 if key available, 0 if not
CMP AL, 1
JNE no_key

; Read key code
MOV BL, [0x10101]  ; Key code
MOV CL, [0x10102]  ; State (1=press, 0=release)

no_key:
```

### Q: Why does `MOV [0xF000], 1` not work in strict-x86 mode?

**A:** Real x86 forbids memory-to-memory moves. Use a register as intermediate:

```asm
MOV AL, 1          ; Load into register
MOV [0xF000], AL   ; Write from register
```

## Debugging

### Q: How do I set a breakpoint?

**A:** Click the line number on the left. A red dot appears. Press F5 to run; execution stops at the breakpoint.

### Q: How do I step through code?

**A:**

- **F10** (Step Over) - Execute one instruction
- **F11** (Step In) - Step into function calls
- **Shift+F5** (Stop) - Stop debugging

### Q: Where can I see register values?

**A:**

- **Run → Debug Console** (shows all registers after pause)
- **Left sidebar: Registers** panel (live view)

### Q: How do I inspect memory?

**A:** Open **Left sidebar: Memory A** or **Memory B** panels. Enter the address and click.

### Q: My program runs forever. How do I stop it?

**A:** Press **Shift+F5** or click the Stop button.

### Q: How do I slow down execution?

**A:** Change `tonx86.cpu.speed` in settings (default 100%):

- < 100% = slower (easier to debug)
- > 100% = faster

## Errors & Troubleshooting

### Q: I get "Syntax error" - what does it mean?

**A:** Your assembly code has invalid syntax. Check:

- Instruction spelling (e.g., `MOV` not `MVO`)
- Operand format (e.g., `ADD EAX, 5` not `ADD EAX 5`)
- Label names are valid identifiers

See [ISA.md](packages/docs/ISA.md) for correct syntax.

### Q: My breakpoint is red with a "⊗" and I can't debug

**A:** This means the line isn't debuggable (e.g., a label or comment line). Set breakpoints on instruction lines only.

### Q: Breakpoints aren't stopping execution

**A:**

1. Ensure file is saved (Ctrl+S)
2. Try reassembling: **Ctrl+Shift+P** → "TonX86: Assemble"
3. Set breakpoint on an actual instruction, not a label

### Q: "Undefined label" error

**A:** You referenced a label that doesn't exist. Check spelling:

```asm
JMP my_label  ; Error if my_label isn't defined below

my_label:
    MOV EAX, 5
```

### Q: LCD display not showing

**A:**

1. Verify `tonx86.lcd.enabled = true` in settings
2. Check that you're writing to `0xF000` (beginning of LCD memory)
3. Verify LCD dimensions in settings match your program

### Q: I can't type multiple files at once

**A:** Create separate `.asm` files in your workspace. Debugging runs the currently open file.

## Learning & Examples

### Q: Where's the best place to start?

**A:**

1. Read [GETTING_STARTED.md](GETTING_STARTED.md)
2. Run example programs in order (01 → 10)
3. Modify them and re-run to see what changes

### Q: Which example should I study first?

**A:** Start with `01-basic-instructions.asm`. It shows MOV, ADD, SUB.

### Q: Is there a game I can play/study?

**A:** Yes! `examples/21-snake.asm` is a complete Snake game:

1. Open it in VS Code
2. Press F5
3. Use arrow keys to move

Then read the code to understand how it works.

### Q: Can I see a program with multiple functions?

**A:** Check `examples/03-call-ret.asm` for function examples and `examples/06-nested-calls.asm` for nested calls.

### Q: What's "educational mode" vs "strict-x86"?

**A:**

- **Educational** (default): Simplified for learning, memory-to-memory MOV allowed
- **Strict x86**: Real x86 rules, stricter operand constraints

Start in educational mode, switch to strict-x86 when ready for realism.

Change in **Settings → tonx86.compatibility.mode**

## Contributing

### Q: How do I contribute?

**A:** See [CONTRIBUTING.md](../CONTRIBUTING.md). You can:

- Report bugs via [Issues](https://github.com/Toniboy1/TonX86/issues)
- Suggest features
- Submit pull requests (code, docs, examples)

### Q: Can I add my own examples?

**A:** Yes! Create a `.asm` file in `examples/` with clear comments. See existing examples for style.

### Q: I found a bug - what do I do?

**A:** [Report it here](https://github.com/Toniboy1/TonX86/issues/new?template=bug_report.yml) with:

- What you were doing
- What you expected
- What actually happened

---

Still have questions? [Ask on Discussions](https://github.com/Toniboy1/TonX86/discussions)!
