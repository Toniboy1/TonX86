; stdcall Calling Convention Example
; Demonstrates the standard call convention (Windows API style)
; - Parameters pushed right-to-left
; - Callee cleans the stack
; - Return value in EAX

main:
    ; Call multiply(4, 7) - expects result of 28
    PUSH 7             ; Push second argument (right-to-left)
    PUSH 4             ; Push first argument
    CALL multiply      ; Call the function
    ; NO stack cleanup - callee does it
    MOV EBX, EAX       ; Save result in EBX (should be 28)
    
    ; Call multiply(3, 9) - expects result of 27
    PUSH 9             ; Push second argument
    PUSH 3             ; Push first argument
    CALL multiply      ; Call the function
    ; NO stack cleanup - callee does it
    MOV ECX, EAX       ; Save result in ECX (should be 27)
    
    HLT                ; Stop execution

; Function: int multiply(int a, int b)
; Returns: a * b (using repeated addition)
; Convention: stdcall
multiply:
    PUSH EBP           ; Save base pointer
    MOV EBP, ESP       ; Set up stack frame
    PUSH EBX           ; Save EBX (callee-saved register we'll use)
    
    MOV EAX, [EBP+8]   ; Load first parameter (a)
    MOV ECX, [EBP+12]  ; Load second parameter (b)
    
    ; Multiply using repeated addition
    MOV EBX, 0         ; Initialize result
    CMP ECX, 0         ; Check if b is 0
    JE multiply_done
multiply_loop:
    ADD EBX, EAX       ; Add a to result
    DEC ECX            ; Decrement counter
    JNZ multiply_loop  ; Continue if not zero
multiply_done:
    MOV EAX, EBX       ; Move result to EAX
    
    POP EBX            ; Restore EBX
    POP EBP            ; Restore base pointer
    
    ; stdcall: callee cleans stack
    ADD ESP, 8         ; Clean 8 bytes (2 params * 4 bytes)
    RET                ; Return
