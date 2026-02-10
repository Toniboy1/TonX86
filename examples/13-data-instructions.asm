; Test 13: Additional Data Instructions
; Tests: XCHG, LEA, MOVZX, MOVSX, NEG, TEST
; Expected: see comments for each operation

main:
    ; Exchange registers
    MOV EAX, 10
    MOV EBX, 20
    XCHG EAX, EBX      ; EAX=20, EBX=10
    
    ; Load effective address
    LEA ECX, 0x1000    ; ECX = 0x1000
    
    ; Move with zero extend (8-bit to 32-bit)
    MOVZX EDX, 0xFF    ; EDX = 0x000000FF
    
    ; Move with sign extend (8-bit to 32-bit)
    MOVSX ESI, 0xFF    ; ESI = 0xFFFFFFFF (-1)
    
    ; Two's complement negation
    MOV EDI, 5
    NEG EDI            ; EDI = -5
    
    ; Test (AND without storing)
    MOV EAX, 0x0F
    TEST EAX, 0x01     ; Z flag = 0 (result is non-zero)
    
    MOV EAX, 0x0E
    TEST EAX, 0x01     ; Z flag = 1 (result is zero)
    
    HLT
