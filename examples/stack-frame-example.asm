; Stack Frame Example
; Demonstrates proper stack frame setup with EBP
; Shows local variables and parameter access

main:
    ; Setup parameters for function
    PUSH 15                 ; Second parameter
    PUSH 10                 ; First parameter
    CALL function_with_locals
    
    ; Cleanup stack (caller responsibility)
    POP EBX
    POP EBX
    
    ; Result in EAX
    HLT

function_with_locals:
    ; === Function Prologue ===
    PUSH EBP                ; Save old base pointer
    MOV EBP, ESP            ; Set new base pointer
    
    ; Allocate space for local variables
    ; SUB ESP, 8            ; Reserve 8 bytes for locals (when implemented)
    
    ; Stack layout:
    ; EBP+12: second parameter (15)
    ; EBP+8:  first parameter (10)
    ; EBP+4:  return address
    ; EBP+0:  saved EBP
    ; EBP-4:  local variable 1
    ; EBP-8:  local variable 2
    
    ; === Function Body ===
    PUSH EBX                ; Save registers we'll use
    PUSH ECX
    
    ; Access parameters (simplified - direct values)
    MOV EAX, 10             ; First parameter [EBP+8]
    MOV EBX, 15             ; Second parameter [EBP+12]
    
    ; Do some calculation with locals
    ADD EAX, EBX            ; Sum parameters
    MOV ECX, 5              ; Local variable
    ADD EAX, ECX            ; Add local to result
    
    POP ECX                 ; Restore registers
    POP EBX
    
    ; === Function Epilogue ===
    ; MOV ESP, EBP          ; Deallocate locals (when implemented)
    POP EBP                 ; Restore base pointer
    RET                     ; Return (EAX contains result)
