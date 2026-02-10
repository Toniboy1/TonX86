; Stack Frame Example
; Demonstrates proper stack frame setup with local variables
; Convention: cdecl

main:
    ; Call calculate(10, 5) - expects result of 55
    PUSH 5             ; Push second argument
    PUSH 10            ; Push first argument
    CALL calculate     ; Call the function
    ADD ESP, 8         ; Caller cleans stack (cdecl)
    MOV EBX, EAX       ; Save result (should be 55)
    
    HLT                ; Stop execution

; Function: int calculate(int x, int y)
; Returns: (x * y) + (x - y)
; Uses local variables to store intermediate results
; Convention: cdecl
calculate:
    ; Standard function prologue
    PUSH EBP           ; Save caller's base pointer
    MOV EBP, ESP       ; Set up new base pointer
    SUB ESP, 8         ; Allocate space for 2 local variables
    
    ; At this point:
    ; [EBP+8]  = first parameter (x)
    ; [EBP+12] = second parameter (y)
    ; [EBP-4]  = local variable 1 (will store x*y)
    ; [EBP-8]  = local variable 2 (will store x-y)
    
    ; Calculate x * y using repeated addition
    MOV EAX, [EBP+8]   ; Load x
    MOV ECX, [EBP+12]  ; Load y
    MOV EDX, 0         ; Initialize product
    CMP ECX, 0
    JE multiply_done
multiply_loop:
    ADD EDX, EAX       ; Add x to product
    DEC ECX            ; Decrement counter
    JNZ multiply_loop
multiply_done:
    MOV [EBP-4], EDX   ; Store x*y in local variable 1
    
    ; Calculate x - y
    MOV EAX, [EBP+8]   ; Load x
    SUB EAX, [EBP+12]  ; Subtract y
    MOV [EBP-8], EAX   ; Store x-y in local variable 2
    
    ; Calculate final result: (x*y) + (x-y)
    MOV EAX, [EBP-4]   ; Load x*y
    ADD EAX, [EBP-8]   ; Add x-y
    ; Result is in EAX
    
    ; Standard function epilogue
    MOV ESP, EBP       ; Deallocate local variables
    POP EBP            ; Restore caller's base pointer
    RET                ; Return to caller
