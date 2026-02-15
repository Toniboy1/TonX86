; Test 31: Conditional Move Instructions (CMOVxx)
; Tests: CMOVE, CMOVNE, CMOVL, CMOVG, CMOVA, CMOVB, CMOVS, CMOVNS
; Expected: See comments for final register values

main:
    ; --- CMOVE / CMOVZ: Move if equal ---
    MOV EAX, 10
    MOV EBX, 99
    CMP EAX, 10        ; ZF=1 (equal)
    CMOVE EAX, EBX     ; EAX = 99 (condition met)

    ; --- CMOVNE / CMOVNZ: Move if not equal ---
    MOV EAX, 10
    MOV EBX, 42
    CMP EAX, 10        ; ZF=1 (equal)
    CMOVNE EAX, EBX    ; EAX stays 10 (condition NOT met)

    MOV ECX, 5
    CMP ECX, 10        ; ZF=0 (not equal)
    CMOVNE ECX, EBX    ; ECX = 42 (condition met)

    ; --- CMOVL: Move if less (signed) ---
    MOV EAX, -5
    MOV EBX, 100
    CMP EAX, 0         ; -5 < 0
    CMOVL EAX, EBX     ; EAX = 100 (condition met)

    ; --- CMOVG: Move if greater (signed) ---
    MOV EAX, 50
    MOV EBX, 200
    CMP EAX, 25        ; 50 > 25
    CMOVG EAX, EBX     ; EAX = 200 (condition met)

    ; --- CMOVLE / CMOVGE: Less-or-equal and greater-or-equal ---
    MOV EAX, 10
    MOV EBX, 77
    CMP EAX, 10        ; 10 == 10, so LE is true
    CMOVLE EAX, EBX    ; EAX = 77

    MOV EAX, 10
    CMP EAX, 10        ; 10 == 10, so GE is true
    CMOVGE EAX, EBX    ; EAX = 77

    ; --- CMOVA: Move if above (unsigned) ---
    MOV EAX, 20
    MOV EBX, 55
    CMP EAX, 5         ; 20 > 5 unsigned
    CMOVA EAX, EBX     ; EAX = 55

    ; --- CMOVB: Move if below (unsigned) ---
    MOV EAX, 3
    MOV EBX, 88
    CMP EAX, 10        ; 3 < 10 unsigned
    CMOVB EAX, EBX     ; EAX = 88

    ; --- CMOVS / CMOVNS: Move on sign flag ---
    MOV EAX, -1
    MOV EBX, 33
    TEST EAX, EAX      ; SF=1 (negative)
    CMOVS EAX, EBX     ; EAX = 33

    MOV EAX, 5
    MOV EBX, 44
    TEST EAX, EAX      ; SF=0 (positive)
    CMOVNS EAX, EBX    ; EAX = 44

    HLT
