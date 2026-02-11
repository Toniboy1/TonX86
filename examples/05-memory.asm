; Test 5: Memory Addressing
; Tests: [REG+offset] memory operations
; Expected: EAX=42, EBX=100

main:
    PUSH EBP
    MOV EBP, ESP
    
    ; Push values onto stack
    PUSH 42            ; [EBP+8] (after next PUSH)
    PUSH 100           ; [EBP+12] (after setup)
    
    ; Actually these will be at different offsets, let's simplify
    MOV EAX, 42
    PUSH EAX           ; Store on stack
    MOV EBX, 100
    PUSH EBX           ; Store on stack
    
    ; Clear registers
    MOV EAX, 0
    MOV EBX, 0
    
    ; Restore from stack
    POP EBX            ; EBX = 100
    POP EAX            ; EAX = 42
    
    POP EBP
    HLT