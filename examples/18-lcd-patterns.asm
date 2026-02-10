; Test 18: LCD Display (Complete Testing)
; Tests: All LCD memory-mapped I/O operations
; Expected: Border square with cross inside
; Default LCD size: 16x16 pixels

main:
    ; Draw top border (y=0, x=0-15)
    MOV ECX, 0
draw_top:
    MOV EAX, 0xF000
    ADD EAX, ECX
    MOV [EAX], 1
    INC ECX
    CMP ECX, 16
    JNE draw_top
    
    ; Draw bottom border (y=15, x=0-15)
    MOV ECX, 0
draw_bottom:
    MOV EAX, 15
    MOV EDX, 16
    MUL EDX
    ADD EAX, ECX
    ADD EAX, 0xF000
    MOV [EAX], 1
    INC ECX
    CMP ECX, 16
    JNE draw_bottom
    
    ; Draw left border (x=0, y=0-15)
    MOV ECX, 0
draw_left:
    PUSH EBX
    MOV EAX, ECX
    MOV EBX, 16
    MUL EBX
    ADD EAX, 0xF000
    MOV [EAX], 1
    INC ECX
    CMP ECX, 16
    JNE draw_left
    POP EBX
    
    ; Draw right border (x=15, y=0-15)
    MOV ECX, 0
draw_right:
    PUSH EBX
    MOV EAX, ECX
    MOV EBX, 16
    MUL EBX
    ADD EAX, 15
    ADD EAX, 0xF000
    MOV [EAX], 1
    INC ECX
    CMP ECX, 16
    JNE draw_right
    POP EBX
    
    ; Draw horizontal line (y=8, middle)
    MOV ECX, 0
draw_h_cross:
    MOV EAX, 8
    MOV EDX, 16
    MUL EDX
    ADD EAX, ECX
    ADD EAX, 0xF000
    MOV [EAX], 1
    INC ECX
    CMP ECX, 16
    JNE draw_h_cross
    
    ; Draw vertical line (x=8, middle)
    MOV ECX, 0
draw_v_cross:
    PUSH EBX
    MOV EAX, ECX
    MOV EBX, 16
    MUL EBX
    ADD EAX, 8
    ADD EAX, 0xF000
    MOV [EAX], 1
    INC ECX
    CMP ECX, 16
    JNE draw_v_cross
    POP EBX
    
    HLT
