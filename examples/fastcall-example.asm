; FASTCALL Calling Convention Example
; First 2 parameters in ECX, EDX
; Remaining parameters on stack
; Callee cleans up stack parameters

main:
    ; Call multiply(7, 6)
    ; FASTCALL: first 2 params in registers
    MOV ECX, 7              ; First parameter in ECX
    MOV EDX, 6              ; Second parameter in EDX
    CALL multiply
    
    ; Result in EAX (42)
    ; No stack cleanup needed for register params
    HLT

multiply:
    ; No stack frame needed - params in registers
    PUSH EBX                ; Save EBX if needed
    
    ; ECX = 7, EDX = 6
    MOV EAX, ECX            ; Move first param to EAX
    MOV EBX, 0              ; Initialize result
    
multiplication_loop:
    CMP EDX, 0              ; Check if counter is 0
    JE done_multiply
    ADD EBX, EAX            ; Add to result
    DEC EDX                 ; Decrement counter
    JMP multiplication_loop
    
done_multiply:
    MOV EAX, EBX            ; Move result to EAX
    POP EBX                 ; Restore EBX
    RET
