; Test CALL/RET and Stack Instructions
; This program demonstrates subroutine calls and stack operations

main:
    MOV EAX, 5              ; Load initial value
    CALL multiply_by_2      ; Call subroutine
    MOV EBX, EAX            ; Save result (should be 10)
    
    MOV EAX, 7              ; Load another value
    CALL multiply_by_2      ; Call again
    MOV ECX, EAX            ; Save result (should be 14)
    
    HLT                     ; Stop execution

multiply_by_2:
    ADD EAX, EAX            ; Double the value in EAX
    RET                     ; Return to caller
