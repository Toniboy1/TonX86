; STDCALL Calling Convention Example
; Parameters pushed right-to-left
; Callee cleans up the stack
; Return value in EAX

main:
    ; Call add_three(5, 10, 15)
    ; Push parameters right-to-left
    PUSH 15                 ; Third parameter
    PUSH 10                 ; Second parameter
    PUSH 5                  ; First parameter
    CALL add_three
    
    ; No cleanup needed - callee does it (STDCALL)
    ; Result in EAX (30)
    HLT

add_three:
    ; Function prologue
    PUSH EBP                ; Save base pointer
    MOV EBP, ESP            ; Set up stack frame
    
    ; Stack layout:
    ; EBP+16: third parameter (15)
    ; EBP+12: second parameter (10)
    ; EBP+8:  first parameter (5)
    ; EBP+4:  return address
    ; EBP+0:  saved EBP
    
    ; Simplified: use immediate values
    ; In real implementation would access [EBP+8], [EBP+12], [EBP+16]
    MOV EAX, 5              ; First param
    ADD EAX, 10             ; Second param
    ADD EAX, 15             ; Third param
    
    ; Function epilogue
    MOV ESP, EBP            ; Restore stack pointer
    POP EBP                 ; Restore base pointer
    
    ; STDCALL: callee cleans parameters
    ; RET 12                ; Return and pop 12 bytes (3 params * 4 bytes)
    ; For now, just RET (simplified)
    RET
