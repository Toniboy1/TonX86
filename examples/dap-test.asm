; DAP Control Flow Test Program
; Tests stepping, breakpoints, and control flow

start:
    ; Test basic stepping
    MOV EAX, 0x01       ; Line 6 - First instruction
    MOV EBX, 0x02       ; Line 7 - Second instruction
    
    ; Test arithmetic and flags
    ADD EAX, EBX        ; Line 10 - EAX should be 3
    CMP EAX, 0x03       ; Line 11 - Compare with 3 (sets Zero flag)
    
    ; Test conditional jump (should jump)
    JE equal_branch     ; Line 14 - Should jump to equal_branch
    MOV ECX, 0xFF       ; Line 15 - Should NOT execute
    
equal_branch:
    MOV ECX, 0x10       ; Line 18 - Should execute (EAX was 3)
    
    ; Test loop with counter
    MOV EDX, 0x03       ; Line 21 - Loop counter = 3
    
loop_start:
    DEC EDX             ; Line 24 - Decrement counter
    CMP EDX, 0          ; Line 25 - Check if zero
    JNE loop_start      ; Line 26 - Loop if not zero
    
    ; Test unconditional jump
    JMP finish          ; Line 29 - Jump to finish
    MOV ESI, 0xBAD      ; Line 30 - Should NOT execute
    
finish:
    MOV EDI, 0xD09E     ; Line 33 - Final instruction (0xDONE as hex)
    HLT                 ; Line 34 - Halt
