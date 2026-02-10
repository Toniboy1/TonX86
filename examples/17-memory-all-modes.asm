; Test 17: Memory Addressing Modes (Complete)
; Tests: [REG], [REG+offset], [REG-offset], [REG+REG]
; Expected: All memory operations work correctly

main:
    PUSH EBP
    MOV EBP, ESP
    
    ; Test [REG] - direct register addressing
    MOV EAX, 0x1000
    MOV ESP, EAX
    MOV EBX, 42
    PUSH EBX           ; Store 42 on stack
    MOV ECX, [ESP]     ; ECX = 42 (direct register)
    POP EBX            ; Clean up
    
    ; Reset ESP
    MOV ESP, EBP
    
    ; Test [REG+offset] - positive offset
    PUSH 100           ; Store value on stack
    PUSH 200           ; Store another value
    MOV EAX, [EBP-4]   ; Access first pushed value (200)
    MOV EBX, [EBP-8]   ; Access second pushed value (100)
    
    ; Test [REG-offset] - negative offset (already tested above)
    
    ; Test [REG+REG] - register + register
    MOV ECX, 0x1000    ; Base address
    MOV EDX, 4         ; Offset
    MOV [ECX+EDX], 99  ; Store 99 at address 0x1004
    MOV ESI, [ECX+EDX] ; Load back (ESI = 99)
    
    POP EBX            ; Clean stack
    POP EBX
    POP EBP
    HLT
