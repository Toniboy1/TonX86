; Test 10: Breakpoint Test
; Tests: Multiple breakpoints with CALL
; Set breakpoints on lines: 8, 15, 17, 24
; Expected flow: line 8 -> 15 -> 17 -> 8 -> 24

main:
    MOV EAX, 5         ; Breakpoint here (line 8)
    CALL add_ten
    MOV EBX, EAX       ; Breakpoint here (line 10) - EAX should be 15
    CALL add_ten
    MOV ECX, EAX       ; Breakpoint here (line 12) - EAX should be 25
    HLT

add_ten:
    ADD EAX, 10        ; Breakpoint here (line 16) - called twice
    RET
