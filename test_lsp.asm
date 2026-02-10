; Test file for LSP features
; This file tests diagnostics and hover documentation

main:
    MOV EAX, 10         ; Move 10 to EAX (should show hover for MOV and EAX)
    ADD EAX, 5          ; Add 5 to EAX (hover shows flags affected)
    CMP EAX, 15         ; Compare with 15
    JE equal            ; Jump if equal
    JNE not_equal       ; Jump if not equal

equal:
    INC EAX             ; Increment EAX
    JMP end

not_equal:
    DEC EAX             ; Decrement EAX

end:
    HLT                 ; Halt execution

; Test errors - these should show diagnostics
invalid_instr:
    INVALID EAX, EBX    ; Error: Unknown instruction
    JMP undefined_label ; Warning: undefined label
