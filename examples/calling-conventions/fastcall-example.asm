; fastcall Calling Convention Example
; Demonstrates the fast call convention
; - First two parameters in ECX and EDX registers
; - Additional parameters pushed right-to-left
; - Callee cleans the stack (if any stack params)
; - Return value in EAX

main:
    ; Call subtract(15, 8) - expects result of 7
    MOV ECX, 15        ; First parameter in ECX
    MOV EDX, 8         ; Second parameter in EDX
    CALL subtract      ; Call the function
    MOV EBX, EAX       ; Save result in EBX (should be 7)
    
    ; Call subtract(100, 42) - expects result of 58
    MOV ECX, 100       ; First parameter in ECX
    MOV EDX, 42        ; Second parameter in EDX
    CALL subtract      ; Call the function
    MOV ESI, EAX       ; Save result in ESI (should be 58)
    
    ; Call add3(1, 2, 3) - expects result of 6
    PUSH 3             ; Third parameter on stack
    MOV ECX, 1         ; First parameter in ECX
    MOV EDX, 2         ; Second parameter in EDX
    CALL add3          ; Call the function
    ; NO stack cleanup - callee does it
    MOV EDI, EAX       ; Save result in EDI (should be 6)
    
    HLT                ; Stop execution

; Function: int subtract(int a, int b)
; Returns: a - b
; Convention: fastcall
subtract:
    PUSH EBP           ; Save base pointer
    MOV EBP, ESP       ; Set up stack frame
    
    ; Parameters already in ECX and EDX
    MOV EAX, ECX       ; Load first parameter (a)
    SUB EAX, EDX       ; Subtract second parameter (b)
    ; Result is in EAX
    
    POP EBP            ; Restore base pointer
    RET                ; Return

; Function: int add3(int a, int b, int c)
; Returns: a + b + c
; Convention: fastcall (3 parameters: 2 in regs, 1 on stack)
add3:
    PUSH EBP           ; Save base pointer
    MOV EBP, ESP       ; Set up stack frame
    
    MOV EAX, ECX       ; Load first parameter (a) from ECX
    ADD EAX, EDX       ; Add second parameter (b) from EDX
    ADD EAX, [EBP+8]   ; Add third parameter (c) from stack
    ; Result is in EAX
    
    POP EBP            ; Restore base pointer
    
    ; fastcall: callee cleans stack parameters
    ADD ESP, 4         ; Clean 4 bytes (1 param on stack)
    RET                ; Return
