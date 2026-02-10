; Test 3: CALL and RET
; Tests: CALL, RET, function calls
; Expected: EAX=20 (5 * 4)

main:
    MOV EAX, 5
    CALL multiply_by_4
    HLT                ; EAX should be 20

multiply_by_4:
    PUSH EBP           ; Save base pointer
    MOV EBP, ESP       ; Set up stack frame
    ADD EAX, EAX       ; Double it (EAX = 10)
    ADD EAX, EAX       ; Double again (EAX = 20)
    POP EBP            ; Restore base pointer
    RET
