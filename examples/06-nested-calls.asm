; Test 6: Nested Function Calls
; Tests: Multiple CALL/RET levels
; Expected: EAX=100

main:
    MOV EAX, 10
    CALL level1
    HLT                ; EAX should be 100

level1:
    PUSH EAX           ; Save EAX
    CALL level2        ; Call level 2
    POP EBX            ; Restore to EBX
    MOV EAX, EBX       ; Copy back
    RET

level2:
    MOV EAX, 100       ; Set return value
    RET
