; TonX86 Assembly - Hello World Example
; This program demonstrates basic assembly operations

; Program entry point
start:
    ; Initialize registers
    MOV EAX, 0x00       ; Clear EAX
    MOV ECX, 0x0A       ; Set ECX to 10 (loop counter)
    
; Main loop - counts from 0 to 10
loop:
    ; Add 1 to EAX each iteration
    ADD EAX, 1
    
    ; Decrement counter
    DEC ECX
    
    ; Check if counter reached 0
    CMP ECX, 0
    
    ; If not zero, jump back to loop
    JNE loop
    
    ; If zero, exit program
    JMP exit
    
; Exit point
exit:
    ; EAX now contains 10
it
    HLT
