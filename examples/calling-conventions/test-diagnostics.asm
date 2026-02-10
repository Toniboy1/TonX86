; Test file for calling convention diagnostics
; This should trigger several LSP warnings and hints

main:
    ; cdecl call pattern - should show hints
    PUSH 3
    PUSH 5
    CALL add
    ADD ESP, 8         ; Should detect cdecl pattern
    
    ; Call without proper prologue/epilogue
    CALL bad_function
    
    HLT

; Good function with proper prologue/epilogue
add:
    PUSH EBP           ; Proper prologue
    MOV EBP, ESP
    
    MOV EAX, [EBP+8]
    ADD EAX, [EBP+12]
    
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
