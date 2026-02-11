# x86 Calling Conventions

This document explains the standard x86 calling conventions supported by TonX86 for educational purposes.

## Overview

Calling conventions define how functions receive parameters, return values, and manage the stack. Understanding these conventions is essential for writing correct assembly code that interfaces with other code.

## Stack Frame Structure

A typical stack frame in x86 assembly looks like this:

```
High Memory
+------------------+
| Parameter N      | [EBP + 4*(N+1)]
| ...              |
| Parameter 2      | [EBP + 12]
| Parameter 1      | [EBP + 8]
| Return Address   | [EBP + 4]
| Saved EBP        | [EBP]       <-- EBP points here
| Local Variable 1 | [EBP - 4]
| Local Variable 2 | [EBP - 8]
| ...              |
+------------------+ <-- ESP points here
Low Memory
```

### Standard Function Prologue

```asm
function_name:
    PUSH EBP           ; Save caller's base pointer
    MOV EBP, ESP       ; Set up new base pointer
    ; (Optional) SUB ESP, N  ; Allocate space for local variables
```

### Standard Function Epilogue

```asm
    ; (Optional) MOV ESP, EBP  ; Deallocate locals (if allocated)
    POP EBP            ; Restore caller's base pointer
    RET                ; Return to caller
```

## Calling Conventions

### 1. cdecl (C Declaration)

**Overview:** The default calling convention for C programs on x86.

**Characteristics:**
- Parameters pushed **right-to-left** onto the stack
- **Caller** cleans up the stack after the call
- Return value in **EAX**
- Caller-saved registers: EAX, ECX, EDX
- Callee-saved registers: EBX, ESI, EDI, EBP

**Advantages:**
- Supports variable argument functions (like printf)
- Clean separation between caller and callee

**Example:**

```asm
; Function: int add(int a, int b)
; Returns: a + b

; Calling the function add(5, 3)
caller:
    PUSH 3             ; Push second argument (right-to-left)
    PUSH 5             ; Push first argument
    CALL add           ; Call the function
    ADD ESP, 8         ; Caller cleans stack (2 params * 4 bytes)
    ; Result is in EAX (8)
    HLT

; Function implementation
add:
    PUSH EBP           ; Save base pointer
    MOV EBP, ESP       ; Set up stack frame
    
    MOV EAX, [EBP+8]   ; Load first parameter (a)
    ADD EAX, [EBP+12]  ; Add second parameter (b)
    ; Result is in EAX
    
    POP EBP            ; Restore base pointer
    RET                ; Return (caller will clean stack)
```

**Stack Cleanup Pattern (cdecl):**
```asm
CALL function
ADD ESP, N             ; N = number_of_parameters * 4
```

### 2. stdcall (Standard Call)

**Overview:** Used by Windows API functions.

**Characteristics:**
- Parameters pushed **right-to-left** onto the stack
- **Callee** cleans up the stack before returning
- Return value in **EAX**
- Same register preservation as cdecl

**Advantages:**
- Smaller code size (cleanup code only in callee)
- More efficient when function is called multiple times

**Disadvantages:**
- Cannot support variable argument functions

**Example:**

```asm
; Function: int multiply(int a, int b)
; Returns: a * b
; Convention: stdcall

; Calling the function multiply(4, 7)
caller:
    PUSH 7             ; Push second argument (right-to-left)
    PUSH 4             ; Push first argument
    CALL multiply      ; Call the function
    ; NO stack cleanup needed - callee does it
    ; Result is in EAX (28)
    HLT

; Function implementation
multiply:
    PUSH EBP           ; Save base pointer
    MOV EBP, ESP       ; Set up stack frame
    
    MOV EAX, [EBP+8]   ; Load first parameter (a)
    MOV ECX, [EBP+12]  ; Load second parameter (b)
    
    ; Simple multiplication using repeated addition
    MOV EDX, 0         ; Initialize result
    CMP ECX, 0
    JE multiply_done
multiply_loop:
    ADD EDX, EAX
    DEC ECX
    JNZ multiply_loop
multiply_done:
    MOV EAX, EDX       ; Result in EAX
    
    POP EBP            ; Restore base pointer
    RET 8              ; Return and clean 8 bytes (2 params * 4)
```

**Note:** In real x86, `RET n` pops n bytes from stack after returning. In TonX86's current implementation, you would manually adjust ESP before RET:

```asm
    POP EBP
    ADD ESP, 8         ; Clean parameters (stdcall)
    RET
```

### 3. fastcall

**Overview:** Optimized convention using registers for first arguments.

**Characteristics:**
- First **two** parameters passed in **ECX** and **EDX** registers
- Additional parameters pushed **right-to-left** onto the stack
- **Callee** cleans up the stack
- Return value in **EAX**

**Advantages:**
- Faster for functions with 1-2 parameters (no memory access needed)
- Reduced stack traffic

**Example:**

```asm
; Function: int subtract(int a, int b)
; Returns: a - b
; Convention: fastcall

; Calling the function subtract(15, 8)
caller:
    MOV ECX, 15        ; First parameter in ECX
    MOV EDX, 8         ; Second parameter in EDX
    CALL subtract      ; Call the function
    ; Result is in EAX (7)
    HLT

; Function implementation
subtract:
    PUSH EBP           ; Save base pointer
    MOV EBP, ESP       ; Set up stack frame
    
    ; Parameters already in ECX and EDX
    MOV EAX, ECX       ; Load first parameter (a)
    SUB EAX, EDX       ; Subtract second parameter (b)
    ; Result is in EAX
    
    POP EBP            ; Restore base pointer
    RET                ; Return
```

**Example with 3 parameters:**

```asm
; Function: int add3(int a, int b, int c)
; Returns: a + b + c
; Convention: fastcall

; Calling the function add3(1, 2, 3)
caller:
    PUSH 3             ; Third parameter on stack
    MOV ECX, 1         ; First parameter in ECX
    MOV EDX, 2         ; Second parameter in EDX
    CALL add3          ; Call the function
    ; NO stack cleanup needed - callee does it
    ; Result is in EAX (6)
    HLT

; Function implementation
add3:
    PUSH EBP           ; Save base pointer
    MOV EBP, ESP       ; Set up stack frame
    
    MOV EAX, ECX       ; Load first parameter (a)
    ADD EAX, EDX       ; Add second parameter (b)
    ADD EAX, [EBP+8]   ; Add third parameter (c) from stack
    ; Result is in EAX
    
    POP EBP            ; Restore base pointer
    RET 4              ; Return and clean 4 bytes (1 param on stack)
```

## Register Usage

### Caller-Saved Registers (Volatile)
These registers may be modified by the called function:
- **EAX** - Return value, scratch register
- **ECX** - Scratch register (first param in fastcall)
- **EDX** - Scratch register (second param in fastcall)

If the caller needs these values after a function call, they must be saved before the call:
```asm
PUSH ECX           ; Save ECX
PUSH EDX           ; Save EDX
CALL function
POP EDX            ; Restore EDX
POP ECX            ; Restore ECX
```

### Callee-Saved Registers (Non-Volatile)
These registers must be preserved by the called function:
- **EBX** - Must be saved/restored if used
- **ESI** - Must be saved/restored if used
- **EDI** - Must be saved/restored if used
- **EBP** - Must be saved/restored (stack frame)

**Example of preserving registers:**
```asm
function:
    PUSH EBP           ; Save EBP (required)
    MOV EBP, ESP
    PUSH EBX           ; Save EBX (if we use it)
    PUSH ESI           ; Save ESI (if we use it)
    
    ; Function body using EBX and ESI
    MOV EBX, 10
    MOV ESI, 20
    
    POP ESI            ; Restore ESI
    POP EBX            ; Restore EBX
    POP EBP            ; Restore EBP
    RET
```

## Return Values

- **EAX**: Primary return value (integers, pointers, booleans)
- **EDX:EAX**: 64-bit return values (high 32 bits in EDX, low 32 bits in EAX)

## Common Patterns

### Accessing Parameters (cdecl/stdcall)

```asm
function:
    PUSH EBP
    MOV EBP, ESP
    
    MOV EAX, [EBP+8]   ; First parameter
    MOV ECX, [EBP+12]  ; Second parameter
    MOV EDX, [EBP+16]  ; Third parameter
    ; ...
    
    POP EBP
    RET
```

### Local Variables

```asm
function:
    PUSH EBP
    MOV EBP, ESP
    SUB ESP, 8         ; Allocate 2 local variables (8 bytes)
    
    MOV [EBP-4], 10    ; First local variable
    MOV [EBP-8], 20    ; Second local variable
    
    ; Function body
    
    MOV ESP, EBP       ; Deallocate locals
    POP EBP
    RET
```

### Nested Function Calls

```asm
; Calling function B from function A
functionA:
    PUSH EBP
    MOV EBP, ESP
    
    ; Save caller-saved registers if needed
    PUSH EAX
    
    ; Call another function
    PUSH 5
    CALL functionB
    ADD ESP, 4         ; Clean stack (if cdecl)
    
    ; Restore caller-saved registers
    POP EAX
    
    POP EBP
    RET
```

## Best Practices

1. **Always match calling conventions** - Caller and callee must agree on convention
2. **Document which convention you're using** - Add comments to your code
3. **Preserve callee-saved registers** - Save and restore EBX, ESI, EDI, EBP
4. **Use EBP for stack frames** - Makes parameter access easier and debugging clearer
5. **Balance the stack** - Every PUSH must have a corresponding POP or ESP adjustment
6. **Return values in EAX** - Follow the standard for consistency

## Common Mistakes

### 1. Wrong Stack Cleanup
```asm
; WRONG (cdecl) - Callee cleaning stack
function:
    PUSH EBP
    MOV EBP, ESP
    ; ...
    POP EBP
    RET 8              ; ERROR: cdecl functions don't clean stack

; RIGHT (cdecl) - Caller cleaning stack
caller:
    PUSH 3
    PUSH 5
    CALL function
    ADD ESP, 8         ; Caller cleans up
```

### 2. Wrong Parameter Order
```asm
; WRONG - Pushing left-to-right
PUSH 5             ; First parameter
PUSH 3             ; Second parameter
CALL add           ; add(5, 3) - parameters will be swapped!

; RIGHT - Pushing right-to-left
PUSH 3             ; Second parameter
PUSH 5             ; First parameter
CALL add           ; add(5, 3) - correct order
```

### 3. Forgetting to Preserve Registers
```asm
; WRONG - Modifying EBX without saving
function:
    PUSH EBP
    MOV EBP, ESP
    MOV EBX, 100       ; ERROR: Caller's EBX value is lost
    POP EBP
    RET

; RIGHT - Saving and restoring EBX
function:
    PUSH EBP
    MOV EBP, ESP
    PUSH EBX           ; Save EBX
    MOV EBX, 100       ; Now we can use it
    POP EBX            ; Restore EBX
    POP EBP
    RET
```

### 4. Unbalanced Stack
```asm
; WRONG - Unbalanced stack operations
function:
    PUSH EBP
    MOV EBP, ESP
    PUSH EBX
    ; ... (forgot to POP EBX)
    POP EBP
    RET                ; ERROR: Stack is corrupted!
```

## Summary Table

| Convention | Parameter Order | Stack Cleanup | Reg Params | Use Case |
|------------|-----------------|---------------|------------|----------|
| **cdecl** | Right-to-left | Caller | None | C functions, varargs |
| **stdcall** | Right-to-left | Callee | None | Windows API |
| **fastcall** | Right-to-left | Callee | ECX, EDX | Performance-critical |

## See Also

- [ISA.md](ISA.md) - Instruction Set Architecture reference
- [README.md](../../README.md) - TonX86 overview and examples
- Example programs in the `examples/` folder

## Verification Sources

Calling convention behavior verified against:

- **x86 Assembly Guide** — University of Virginia CS216, by David Evans
  (originally created by Adam Ferrari, updated by Alan Batson, Mike Lack, and Anita Jones)
  https://www.cs.virginia.edu/~evans/cs216/guides/x86.html
  Licensed under [Creative Commons BY-NC-SA 3.0 US](https://creativecommons.org/licenses/by-nc-sa/3.0/us/)
