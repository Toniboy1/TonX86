; Test 19: Stack Operations (Complete)
; Tests: PUSH reg/imm/mem, POP, ESP management
; Expected: Stack operations work correctly with all operand types

main:
    MOV EAX, ESP       ; Save initial ESP
    PUSH EAX           ; Save for later
    
    ; Test PUSH with register
    MOV EBX, 100
    PUSH EBX           ; Push register
    
    ; Test PUSH with immediate
    PUSH 200           ; Push immediate value
    
    ; Test PUSH with memory
    MOV ECX, ESP
    ADD ECX, 8         ; Point to saved EBX
    PUSH [ECX]         ; Push memory value (100)
    
    ; Now stack has: [initial_ESP, 100, 200, 100]
    
    ; Test POP
    POP EDX            ; EDX = 100
    POP ESI            ; ESI = 200
    POP EDI            ; EDI = 100
    POP EAX            ; EAX = initial ESP
    
    ; Verify ESP is back to original
    CMP ESP, EAX       ; Should be equal
    JE stack_ok
    
    MOV EAX, 0xFFFF    ; Error indicator
    HLT

stack_ok:
    MOV EAX, 1         ; Success indicator
    HLT
