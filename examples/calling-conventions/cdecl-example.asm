; cdecl Calling Convention Example
; Demonstrates the C declaration calling convention
; - Parameters pushed right-to-left
; - Caller cleans the stack
; - Return value in EAX

main:
    ; Call add(5, 3) - expects result of 8
    PUSH 3             ; Push second argument (right-to-left)
    PUSH 5             ; Push first argument
    CALL add           ; Call the function
    ADD ESP, 8         ; Caller cleans stack (2 params * 4 bytes)
    MOV EBX, EAX       ; Save result in EBX (should be 8)
    
    ; Call add(10, 25) - expects result of 35
    PUSH 25            ; Push second argument
    PUSH 10            ; Push first argument
    CALL add           ; Call the function
    ADD ESP, 8         ; Caller cleans stack
    MOV ECX, EAX       ; Save result in ECX (should be 35)
    
    HLT                ; Stop execution

; Function: int add(int a, int b)
; Returns: a + b
; Convention: cdecl
add:
    PUSH EBP           ; Save base pointer (callee-saved register)
    MOV EBP, ESP       ; Set up stack frame
    
    MOV EAX, [EBP+8]   ; Load first parameter (a)
    ADD EAX, [EBP+12]  ; Add second parameter (b)
    ; Result is in EAX
    
    POP EBP            ; Restore base pointer
    RET                ; Return (caller will clean stack)
