; CDECL Calling Convention Example
; Caller cleans up the stack
; Parameters pushed right-to-left
; Return value in EAX

main:
    ; Call add_numbers(5, 10)
    ; Push parameters right-to-left
    PUSH 10                 ; Second parameter
    PUSH 5                  ; First parameter
    CALL add_numbers
    
    ; Caller cleanup (CDECL)
    POP EBX                 ; Clean up first param
    POP EBX                 ; Clean up second param
    
    ; Result now in EAX (15)
    HLT

add_numbers:
    ; Function prologue
    PUSH EBP                ; Save base pointer
    MOV EBP, ESP            ; Set up stack frame
    
    ; Access parameters
    ; EBP+4 = return address
    ; EBP+8 = first parameter (5)
    ; EBP+12 = second parameter (10)
    
    ; Simplified: just add immediate values
    MOV EAX, 5              ; First param (would be [EBP+8])
    ADD EAX, 10             ; Second param (would be [EBP+12])
    
    ; Function epilogue
    MOV ESP, EBP            ; Restore stack pointer
    POP EBP                 ; Restore base pointer
    RET
