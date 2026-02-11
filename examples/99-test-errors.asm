; Test file to verify language server error detection

; ERROR: Unknown instruction
INVALID_INST EAX, EBX

; ERROR: Invalid register name (EAXXX doesn't exist)
MOV EAXXX, 5

; ERROR: MOV requires 2 operands
MOV EAX

; ERROR: MOV only takes 2 operands
MOV EAX, EBX, ECX

; WARNING: Undefined label
JMP UNDEFINED_LABEL

; ERROR: Invalid register name (WRONG_REG doesn't exist)
ADD WRONG_REG, 5

; ERROR: Invalid constant definition (missing value after EQU)
CONST1 EQU

; ERROR: Duplicate label LOOP_START
LOOP_START:
    INC EAX
LOOP_START:
    DEC EAX

; Valid instructions for comparison
MOV EAX, 5
ADD EAX, EBX
HLT
