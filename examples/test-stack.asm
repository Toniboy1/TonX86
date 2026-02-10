; Test PUSH/POP Stack Instructions
; This program demonstrates stack operations

main:
    MOV EAX, 10             ; Load value into EAX
    MOV EBX, 20             ; Load value into EBX
    MOV ECX, 30             ; Load value into ECX
    
    PUSH EAX                ; Save EAX on stack
    PUSH EBX                ; Save EBX on stack
    PUSH ECX                ; Save ECX on stack
    
    MOV EAX, 99             ; Overwrite registers
    MOV EBX, 88
    MOV ECX, 77
    
    POP ECX                 ; Restore ECX (should be 30)
    POP EBX                 ; Restore EBX (should be 20)
    POP EAX                 ; Restore EAX (should be 10)
    
    HLT                     ; Stop execution
