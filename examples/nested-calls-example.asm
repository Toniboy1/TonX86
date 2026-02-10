; Nested Function Calls Example
; Demonstrates calling functions from within functions
; Shows proper stack management through multiple call levels

main:
    MOV EAX, 3              ; Initial value
    CALL level1
    ; Result in EAX should be 9 (3 * 3)
    HLT

level1:
    PUSH EAX                ; Save EAX
    PUSH EBX                ; Save EBX
    
    MOV EBX, EAX            ; Save value to EBX
    CALL level2             ; Call next level
    
    ; EAX now contains squared value
    MOV EBX, EAX            ; Save result
    
    POP EBX                 ; Restore registers
    POP EAX
    MOV EAX, EBX            ; Put result in EAX
    RET

level2:
    PUSH EBX                ; Save EBX
    
    ; Square the value in EBX
    MOV EAX, EBX
    CALL square             ; Call helper function
    
    POP EBX                 ; Restore EBX
    RET

square:
    ; Multiply EAX by itself
    MOV ECX, EAX            ; Copy value
    MOV EBX, 0              ; Initialize result
    
square_loop:
    CMP ECX, 0
    JE square_done
    ADD EBX, EAX
    DEC ECX
    JMP square_loop
    
square_done:
    MOV EAX, EBX            ; Result in EAX
    RET
