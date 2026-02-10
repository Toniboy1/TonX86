; Test 10: Breakpoint Test
; Tests: Multiple breakpoints with CALL/RET and state verification
; Suggested breakpoints:
;   - main: MOV EAX, 5
;   - add_ten: ADD EAX, 10
;   - main: MOV EBX, EAX
;   - main: MOV ECX, EAX
; Expected flow: main MOV -> add_ten ADD -> main MOV EBX -> add_ten ADD -> main MOV ECX -> HLT

main:
    MOV EAX, 5         ; Breakpoint: start state (EAX=5)
    CALL add_ten
    MOV EBX, EAX       ; Breakpoint: after first call (EAX=15, EBX=15)
    CALL add_ten
    MOV ECX, EAX       ; Breakpoint: after second call (EAX=25, ECX=25)
    HLT

add_ten:
    PUSH EBP
    MOV EBP, ESP
    ADD EAX, 10        ; Breakpoint: function body (called twice)
    POP EBP
    RET
