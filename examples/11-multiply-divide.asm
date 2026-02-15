; Test 11: Multiplication and Division
; Tests: MUL, IMUL, DIV, IDIV
;
; Per x86 spec:
;   MUL src  -> EAX * src -> EDX:EAX (unsigned)
;   IMUL src -> EAX * src -> EDX:EAX (signed, single-operand form)
;   DIV src  -> EAX / src -> quotient in EAX, remainder in EDX
;   IDIV src -> EAX / src -> quotient in EAX, remainder in EDX (signed)
;
; Expected: EAX=4, EBX=5, EDX=0

main:
    ; Unsigned multiply: EAX * 4 -> EDX:EAX
    MOV EAX, 5
    MUL 4              ; EAX = 5 * 4 = 20, EDX = 0
    
    ; Unsigned divide: EAX / 4 -> quotient in EAX, remainder in EDX
    MOV EAX, 20
    DIV 4              ; EAX = 20 / 4 = 5, EDX = 0
    MOV EBX, EAX       ; EBX = 5
    
    ; Signed multiply (single-operand form): EAX * -4 -> EDX:EAX
    MOV EAX, 5
    IMUL -4            ; EAX = 5 * -4 = -20 (0xFFFFFFEC), EDX = 0xFFFFFFFF
    
    ; Signed divide: EAX / 5 -> quotient in EAX, remainder in EDX
    MOV EAX, 20
    IDIV 5             ; EAX = 20 / 5 = 4, EDX = 0
    
    HLT
