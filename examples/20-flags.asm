; Test 20: Comprehensive Flag Testing
; Tests: Z, C, O, S flags with various instructions
; Expected: Flags set correctly for each operation

main:
    ; Test Zero flag (Z)
    MOV EAX, 5
    SUB EAX, 5         ; Result = 0, Z=1
    
    MOV EBX, 10
    SUB EBX, 5         ; Result != 0, Z=0
    
    ; Test Carry flag (C)
    MOV ECX, 1
    SUB ECX, 2         ; Underflow, C=1
    
    MOV EDX, 10
    SUB EDX, 5         ; No underflow, C=0
    
    ; Test Overflow flag (O)
    MOV EAX, 0x7FFFFFFF ; Max positive 32-bit
    ADD EAX, 1          ; Overflow to negative, O=1
    
    ; Test Sign flag (S)
    MOV EBX, 10
    NEG EBX            ; Result negative, S=1
    
    MOV ECX, -10
    NEG ECX            ; Result positive, S=0
    
    ; Test flags with CMP
    MOV EAX, 5
    CMP EAX, 5         ; Equal: Z=1
    
    MOV EBX, 3
    CMP EBX, 5         ; Less than: S=1 (or C=1)
    
    ; Test flags with TEST
    MOV EAX, 0xFF
    TEST EAX, 0x80     ; Non-zero result, Z=0
    
    MOV EBX, 0x7F
    TEST EBX, 0x80     ; Zero result, Z=1
    
    HLT
