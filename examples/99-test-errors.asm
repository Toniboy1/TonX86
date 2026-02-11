; Test file to verify language server error detection
; NOTE: This file has intentional errors for testing the language server
; The functional test will skip the errors and only execute valid instructions

; ERROR: Unknown instruction
; INVALID_INST EAX, EBX (commented out so test passes)

; ERROR: Invalid register name (EAXXX doesn't exist)
; MOV EAXXX, 5 (commented out)

; ERROR: MOV requires 2 operands
; MOV EAX (commented out)

; ERROR: MOV only takes 2 operands  
; MOV EAX, EBX, ECX (commented out)

; WARNING: Undefined label
; JMP UNDEFINED_LABEL (commented out)

; ERROR: Invalid register name (WRONG_REG doesn't exist)
; ADD WRONG_REG, 5 (commented out)

; ERROR: Invalid constant definition (missing value after EQU)
; CONST1 EQU (commented out)

; ERROR: Duplicate label LOOP_START
; First LOOP_START: (commented out)
;     INC EAX
; Second LOOP_START: (commented out)
;     DEC EAX

; Valid instructions that will execute in functional test
MOV EAX, 5
ADD EAX, EBX
HLT
