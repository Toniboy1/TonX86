; Test 18: LCD Display (Complete Testing)
; Tests: All LCD memory-mapped I/O operations
; Expected: Border square with cross inside
; Default LCD size: 16x16 pixels

main:
    ; Draw top border (y=0, x=0-15)
    MOV ECX, 0
top_loop:
    MOV EAX, 0xF000
    ADD EAX, ECX
    MOV [EAX], 1
    INC ECX
    CMP ECX, 16
    JNE top_loop
    
    ; Draw bottom border (y=15, x=0-15)
    MOV ECX, 0
    PUSH EBX
bottom_loop:
    MOV EAX, 15
    XOR EDX, EDX
    MOV EBX, 16
    MUL EBX
    ADD EAX, ECX
    ADD EAX, 0xF000
    MOV [EAX], 1
    INC ECX
    CMP ECX, 16
    JNE bottom_loop
    POP EBX
    
    ; Draw left border (x=0, y=0-15)
    MOV ECX, 0
    PUSH EBX
left_loop:
    MOV EAX, ECX
    XOR EDX, EDX
    MOV EBX, 16
    MUL EBX
    ADD EAX, 0xF000
    MOV [EAX], 1
    INC ECX
    CMP ECX, 16
    JNE left_loop
    POP EBX
    
    ; Draw right border (x=15, y=0-15)
    MOV ECX, 0
    PUSH EBX
right_loop:
    MOV EAX, ECX
    XOR EDX, EDX
    MOV EBX, 16
    MUL EBX
    ADD EAX, 15
    ADD EAX, 0xF000
    MOV [EAX], 1
    INC ECX
    CMP ECX, 16
    JNE right_loop
    POP EBX
    
    ; Draw horizontal line (y=8, middle)
    MOV ECX, 0
    PUSH EBX
h_cross_loop:
    MOV EAX, 8
    XOR EDX, EDX
    MOV EBX, 16
    MUL EBX
    ADD EAX, ECX
    ADD EAX, 0xF000
    MOV [EAX], 1
    INC ECX
    CMP ECX, 16
    JNE h_cross_loop
    POP EBX
    
    ; Draw vertical line (x=8, middle)
    MOV ECX, 0
    PUSH EBX
v_cross_loop:
    MOV EAX, ECX
    XOR EDX, EDX
    MOV EBX, 16
    MUL EBX
    ADD EAX, 8
    ADD EAX, 0xF000
    MOV [EAX], 1
    INC ECX
    CMP ECX, 16
    JNE v_cross_loop
    POP EBX
    
    HLT
