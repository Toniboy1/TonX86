; Nested Function Calls Example
; Demonstrates calling functions from within other functions
; Shows proper register preservation
; Convention: cdecl

main:
    ; Call outer(6) - expects result of 18
    PUSH 6             ; Push argument
    CALL outer         ; Call outer function
    ADD ESP, 4         ; Caller cleans stack (cdecl)
    MOV EBX, EAX       ; Save result (should be 18)
    
    HLT                ; Stop execution

; Function: int outer(int n)
; Returns: inner(n) + n
; Calls another function (inner) from within
; Convention: cdecl
outer:
    PUSH EBP           ; Save base pointer
    MOV EBP, ESP       ; Set up stack frame
    PUSH EBX           ; Save EBX (callee-saved, we'll use it)
    
    MOV EBX, [EBP+8]   ; Load parameter n into EBX
    
    ; Call inner(n) - need to preserve EBX across the call
    PUSH EBX           ; Push argument for inner()
    CALL inner         ; Call inner function
    ADD ESP, 4         ; Clean stack (cdecl)
    
    ; EAX now contains result from inner(n)
    ADD EAX, EBX       ; Add n to the result
    ; Result is in EAX
    
    POP EBX            ; Restore EBX
    POP EBP            ; Restore base pointer
    RET                ; Return

; Function: int inner(int x)
; Returns: x * 2
; Convention: cdecl
inner:
    PUSH EBP           ; Save base pointer
    MOV EBP, ESP       ; Set up stack frame
    
    MOV EAX, [EBP+8]   ; Load parameter x
    ADD EAX, EAX       ; Multiply by 2 (x * 2)
    ; Result is in EAX
    
    POP EBP            ; Restore base pointer
    RET                ; Return
