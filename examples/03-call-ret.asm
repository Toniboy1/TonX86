; Test 3: CALL and RET
; Tests: CALL, RET, function calls
; Expected: EAX=20 (5 * 4)

main:
    MOV EAX, 5
    CALL multiply_by_4
    HLT                ; EAX should be 20

multiply_by_4:
    ADD EAX, EAX       ; Double it (EAX = 10)
    ADD EAX, EAX       ; Double again (EAX = 20)
    RET
