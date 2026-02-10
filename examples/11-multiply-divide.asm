; Test 11: Multiplication and Division
; Tests: MUL, IMUL, DIV, IDIV
; Expected: EAX=20, EBX=5, ECX=-20, EDX=4

main:
    ; Unsigned multiply
    MOV EAX, 5
    MUL 4              ; EAX = 5 * 4 = 20
    
    ; Unsigned divide
    MOV EBX, 20
    MOV EAX, EBX
    DIV 4              ; EAX = 20 / 4 = 5
    MOV EBX, EAX
    
    ; Signed multiply (negative result)
    MOV ECX, 5
    IMUL -4            ; ECX = 5 * -4 = -20
    
    ; Signed divide
    MOV EDX, 20
    MOV EAX, EDX
    IDIV 5             ; EAX = 20 / 5 = 4
    MOV EDX, EAX
    
    HLT
