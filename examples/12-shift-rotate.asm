; Test 12: Shift and Rotate Operations
; Tests: SHL, SHR, SAR, ROL, ROR
; Expected: see comments for each operation

main:
    ; Shift left (multiply by 2)
    MOV EAX, 5         ; 0000 0101
    SHL EAX, 1         ; 0000 1010 = 10
    
    ; Shift right (divide by 2)
    MOV EBX, 10        ; 0000 1010
    SHR EBX, 1         ; 0000 0101 = 5
    
    ; Arithmetic shift right (preserve sign)
    MOV ECX, -8        ; 1111...1000
    SAR ECX, 1         ; 1111...1100 = -4
    
    ; Rotate left
    MOV EDX, 0x80000001
    ROL EDX, 1         ; Rotate left by 1 = 0x00000003
    
    ; Rotate right
    MOV ESI, 0x80000001
    ROR ESI, 1         ; Rotate right by 1 = 0xC0000000
    
    HLT
