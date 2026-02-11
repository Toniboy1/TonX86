; Test file to verify control flow validation

; WARNING: Unreachable code after HLT
main:
    MOV EAX, 5
    HLT
    MOV EBX, 10    ; Should warn: unreachable after HLT

; WARNING: RET outside function
standalone_ret:
    MOV ECX, 20
    RET            ; Should warn: RET outside function context

; Valid function (no warnings)
valid_function:
    PUSH EBP
    MOV EBP, ESP
    MOV EAX, 100
    POP EBP
    RET            ; OK: inside function context

; WARNING: Unreachable after unconditional JMP
loop_start:
    MOV EAX, 1
    JMP loop_start
    MOV EBX, 2     ; Should warn: unreachable after JMP

; Valid code (label makes it reachable)
another_label:
    MOV EDX, 3     ; OK: label makes this reachable
    HLT
