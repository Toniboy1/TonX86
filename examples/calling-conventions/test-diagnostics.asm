; Test file for calling convention diagnostics
; This should trigger several LSP warnings and hints

main:
    ; cdecl call pattern - should show hints
    MOV EAX, 3
    MOV EBX, 5
    PUSH EAX
    PUSH EBX
    CALL add
    POP ECX            ; Should detect cdecl pattern (caller cleanup)
    POP ECX
    
    ; Call without proper prologue/epilogue
    CALL bad_function
    
    HLT

; Good function with proper prologue/epilogue
add:
    PUSH EBP           ; Proper prologue
    MOV EBP, ESP
    
    ; Simplified: use passed values directly
    ; In real implementation would access [EBP+8] and [EBP+12]
    MOV EAX, 3
    ADD EAX, 5
    
    POP EBP            ; Proper epilogue
    RET

; Bad function - modifies callee-saved register without saving
bad_function:
    MOV EBX, 100       ; Should warn: modifies EBX without saving
    RET

; Bad function - unbalanced stack
unbalanced:
    PUSH EBP
    MOV EBP, ESP
    PUSH EBX
    ; Missing POP EBX - should warn about unbalanced stack
    POP EBP
    RET

; Bad function - missing prologue
no_prologue:
    MOV EAX, 10
    RET
