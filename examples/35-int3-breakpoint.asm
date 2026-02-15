; Test 35: INT3 Breakpoint Instruction
; Tests: INT3 - software breakpoint for debugging
; Expected: Execution halts at INT3

main:
    MOV EAX, 1         ; Step 1
    MOV EBX, 2         ; Step 2
    ADD EAX, EBX       ; EAX = 3

    INT3                ; Breakpoint! Execution halts here
                        ; Use this to inspect: EAX=3, EBX=2

    ; Code below only runs if debugger continues past INT3
    MOV ECX, EAX       ; ECX = 3
    ADD ECX, 10        ; ECX = 13

    HLT
