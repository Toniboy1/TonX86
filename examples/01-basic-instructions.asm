; Test 1: Basic Instructions
; Tests: MOV, ADD, SUB, INC, DEC
; Expected: EAX=15, EBX=3, ECX=11, EDX=5

main:
    MOV EAX, 10        ; EAX = 10
    MOV EBX, 5         ; EBX = 5
    ADD EAX, EBX       ; EAX = 15
    SUB EBX, 2         ; EBX = 3
    MOV ECX, 10        ; ECX = 10
    INC ECX            ; ECX = 11
    MOV EDX, 6         ; EDX = 6
    DEC EDX            ; EDX = 5
    HLT
