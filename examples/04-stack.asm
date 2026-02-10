; Test 4: Stack Operations
; Tests: PUSH, POP, ESP management
; Expected: EAX=10, EBX=20 (values restored)

main:
    MOV EAX, 10        ; Set initial values
    MOV EBX, 20
    
    PUSH EAX           ; Save EAX
    PUSH EBX           ; Save EBX
    
    MOV EAX, 99        ; Overwrite registers
    MOV EBX, 88
    
    POP EBX            ; Restore EBX (20)
    POP EAX            ; Restore EAX (10)
    
    HLT
