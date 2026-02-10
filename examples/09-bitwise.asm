; Test 9: Bitwise Operations
; Tests: AND, OR, XOR, NOT
; Expected: EAX=6, EBX=7, ECX=1, EDX=0xFFFFFFF9

main:
    MOV EAX, 0x0F      ; 0000 1111
    MOV EBX, 0x06      ; 0000 0110
    AND EAX, EBX       ; EAX = 0000 0110 = 6
    
    MOV EAX, 0x05      ; 0000 0101
    MOV EBX, 0x03      ; 0000 0011
    OR EAX, EBX        ; EAX = 0000 0111 = 7
    MOV EBX, EAX
    
    MOV EAX, 0x05      ; 0000 0101
    MOV EDX, 0x04      ; 0000 0100
    XOR EAX, EDX       ; EAX = 0000 0001 = 1
    MOV ECX, EAX
    
    MOV EDX, 0x06      ; 0000 0110
    NOT EDX            ; EDX = 1111...1001 = 0xFFFFFFF9
    
    HLT
