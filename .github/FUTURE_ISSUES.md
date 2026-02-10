# Future Issues - x86 Realism Enhancement

Based on feedback about TonX86's educational positioning vs. real x86 compatibility.

---

## Issue 1: Add CALL/RET and Stack Instructions

**Labels**: `enhancement`, `instruction-set`

**Feature Category**: Instruction Set

**Problem Statement**:
TonX86 currently lacks fundamental subroutine/procedure support that is central to real x86 programming. Without CALL/RET and proper stack operations, students cannot learn:
- Function calling conventions
- Stack frame management  
- Procedural programming in assembly
- How real programs structure code

**Proposed Solution**:
Implement core stack and subroutine instructions:

```asm
CALL label    ; Push return address, jump to label
RET           ; Pop return address, jump to it
PUSH reg      ; Push register onto stack
POP reg       ; Pop from stack into register
```

**Implementation Details**:
- Use ESP (already available) as stack pointer
- Stack grows downward from high memory (e.g., 0xFFFF)
- CALL pushes current IP+1 onto stack, sets IP to label
- RET pops address from stack, sets IP to it
- PUSH decrements ESP then writes value
- POP reads value then increments ESP

**Use Case**:
```asm
main:
    MOV EAX, 5
    CALL multiply_by_2
    HLT

multiply_by_2:
    ADD EAX, EAX
    RET
```

**Breaking Change**: No - additive feature

**Priority**: High - fundamental for realistic assembly learning

---

## Issue 2: Add Basic Interrupt/Syscall Support

**Labels**: `enhancement`, `instruction-set`

**Feature Category**: Instruction Set

**Problem Statement**:
TonX86 has no concept of interrupts or system calls, which are essential to understanding:
- How programs interact with the "OS"
- Hardware interaction in real systems
- Privilege levels and protection
- Real-world I/O beyond memory-mapped

**Proposed Solution**:
Add basic interrupt mechanism:

```asm
INT num       ; Software interrupt (simplified)
IRET          ; Return from interrupt
```

**Implementation Details**:
- Define a small set of educational interrupts:
  - `INT 0x10` - Video services (write char to console output)
  - `INT 0x21` - DOS-style services (read char, write string)
  - `INT 0x20` - Program terminate (alternative to HLT)
- Implement simplified interrupt handler registration
- Add console output view alongside LCD

**Use Case**:
```asm
; Print "Hello" to console
    MOV AH, 0x0E    ; Teletype output
    MOV AL, 'H'
    INT 0x10        ; BIOS interrupt
    MOV AL, 'e'
    INT 0x10
```

**Breaking Change**: No - additive feature

**Priority**: Medium - important for realism, but secondary to CALL/RET

---

## Issue 3: Expand Instruction Set Toward Real x86

**Labels**: `enhancement`, `instruction-set`

**Feature Category**: Instruction Set

**Problem Statement**:
TonX86 has only 11 instructions. Real x86 has hundreds. Students learning TonX86 face a steep jump when moving to real assemblems.

**Proposed Solution**:
Add commonly-used x86 instructions in phases:

**Phase 1 - Arithmetic/Logic**:
```asm
INC reg       ; Increment
DEC reg       ; Decrement  
NEG reg       ; Two's complement negation
NOT reg       ; Bitwise NOT
XOR reg, reg  ; Bitwise XOR
TEST reg, reg ; Logical AND (sets flags, doesn't store)
```

**Phase 2 - Data Movement**:
```asm
XCHG reg, reg ; Exchange values
LEA reg, mem  ; Load effective address
MOVZX         ; Move with zero-extend
MOVSX         ; Move with sign-extend
```

**Phase 3 - Shifts/Rotates**:
```asm
SHL reg, count ; Shift left
SHR reg, count ; Shift right  
SAR reg, count ; Arithmetic shift right
ROL reg, count ; Rotate left
ROR reg, count ; Rotate right
```

**Phase 4 - Multiplication/Division**:
```asm
MUL reg       ; Unsigned multiply
IMUL reg      ; Signed multiply
DIV reg       ; Unsigned divide
IDIV reg      ; Signed divide
```

**Use Case**:
More realistic programs with bit manipulation, multiplication, etc.

**Breaking Change**: No - additive features

**Priority**: Medium - Nice to have, but current set teaches fundamentals

---

## Issue 4: Implement x86 Calling Conventions

**Labels**: `enhancement`, `documentation`, `instruction-set`

**Feature Category**: Documentation + Instruction Set

**Problem Statement**:
Even with CALL/RET (Issue #1), students won't know how to pass arguments or preserve registers according to real conventions (cdecl, stdcall, fastcall, etc.).

**Proposed Solution** (depends on Issue #1):

1. **Documentation**: Add calling convention guide explaining:
   - cdecl: arguments pushed right-to-left, caller cleans stack
   - Stack frame setup with EBP
   - Register preservation (callee-saved: EBX, ESI, EDI, EBP)

2. **Examples**: Provide reference implementations

3. **Optional**: Add LSP diagnostics warning about convention violations

**Use Case**:
```asm
; cdecl: add(5, 3)
    PUSH 3        ; arg2
    PUSH 5        ; arg1  
    CALL add
    ADD ESP, 8    ; Caller cleans stack
    ; Result in EAX

add:
    PUSH EBP      ; Save frame pointer
    MOV EBP, ESP  ; Setup frame
    MOV EAX, [EBP+8]  ; arg1
    ADD EAX, [EBP+12] ; arg2
    POP EBP       ; Restore frame
    RET
```

**Breaking Change**: No - documentation + optional features

**Priority**: Low - Depends on Issue #1 completion

---

## Issue 5: Add "Real x86 Learning Path" Documentation

**Labels**: `documentation`, `enhancement`

**Feature Category**: Documentation

**Problem Statement**:
Users learning TonX86 don't have guidance on:
- What TonX86 teaches well vs. what's different in real x86
- How to progress from TonX86 to real x86 assembly
- What tools/setup to use next (NASM, QEMU, etc.)
- The "gap" between TonX86 and production x86

**Proposed Solution**:
Create comprehensive progression guide:

**File**: `docs/LEARNING_PATH.md`

**Sections**:
1. **What TonX86 Teaches** (realistic)
   - Register/flag reasoning
   - Conditional branching
   - Memory addressing
   - Debugging mindset

2. **What TonX86 Simplifies** (for education)
   - Instruction count (11 vs hundreds)
   - No real encoding/machine code
   - Custom memory-mapped I/O
   - No segments/paging/privilege

3. **Progression Path**:
   ```
   TonX86 (this) 
   → NASM + Linux syscalls (x86-64)
   → Boot sector programming
   → OS development tutorials
   ```

4. **Recommended Next Steps**:
   - Tools: NASM/MASM, QEMU/Bochs, GDB
   - Tutorials: Linux x86-64 syscalls, "Programming from Ground Up"
   - Projects: Simple bootloader, tiny OS kernel

5. **Compatibility Matrix**:
   | Feature | TonX86 | Real x86-32 | Real x86-64 |
   |---------|--------|-------------|-------------|
   | Registers | 8 GPRs | 8 GPRs | 16 GPRs |
   | Instructions | 11 | ~300+ | ~300+ |
   | Stack | Limited | Full | Full |
   | System calls | No | Yes | Yes |

**Breaking Change**: No - documentation only

**Priority**: High - Helps set realistic expectations

---

## Issue 6: Add "x86 Compatibility Mode" Toggle

**Labels**: `enhancement`, `instruction-set`, `breaking-change`

**Feature Category**: Instruction Set

**Problem Statement**:
TonX86's simplified model vs. real x86 creates confusion about what's "real" assembly vs. educational shortcuts.

**Proposed Solution**:
Add configuration option for stricter x86 behavior:

```json
{
  "tonx86.compatibility.mode": "educational" | "strict-x86"
}
```

**Educational Mode** (default - current behavior):
- Simplified flags
- Flexible memory access
- Memory-mapped LCD/keyboard
- All current features

**Strict x86 Mode**:
- Enforces real x86 rules:
  - MOV cannot do memory-to-memory
  - Realistic flag behavior
  - Segment registers required (CS, DS, ES, SS)
  - Stack must be used for CALL/RET
  - Proper instruction encoding constraints

**Use Case**:
Students start in educational mode, switch to strict when ready for real x86.

**Breaking Change**: Yes (if made default), No (if optional)

**Priority**: Low - Complex to implement, educational mode sufficient for now

---

## Implementation Priority

**High Priority**:
1. Issue #5: Learning path documentation (quick win, high value)
2. Issue #1: CALL/RET/PUSH/POP (fundamental gap)

**Medium Priority**:
3. Issue #3: Expand instruction set (Phase 1-2)
4. Issue #2: Basic interrupts

**Low Priority**:
5. Issue #4: Calling conventions (depends on #1)
6. Issue #6: Compatibility mode (complex, nice-to-have)

---

## Notes

- All enhancements should maintain backward compatibility unless marked breaking
- Educational focus remains primary goal
- Real x86 compatibility is secondary goal for advanced learners
- Each issue should be created separately with appropriate labels
