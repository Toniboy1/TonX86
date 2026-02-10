; Test 7: Interrupts - Console Output
; Tests: INT 0x10, INT 0x21
; Expected: "Hi" printed to Debug Console

main:
    ; Print 'H' using INT 0x10
    MOV AH, 0x0E       ; Teletype output
    MOV AL, 'H'
    INT 0x10
    
    ; Print 'i' using INT 0x21
    MOV AH, 0x02       ; Write character
    MOV DL, 'i'
    INT 0x21
    
    HLT
