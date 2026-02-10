; Test 16: Interrupt Handling
; Tests: INT 0x10, INT 0x21, INT 0x20, IRET
; Expected: "Hello" printed to Debug Console, then program terminates

main:
    ; Print "Hello" using INT 0x10
    MOV AH, 0x0E       ; Teletype output function
    MOV AL, 'H'
    INT 0x10
    
    MOV AL, 'e'
    INT 0x10
    
    MOV AL, 'l'
    INT 0x10
    INT 0x10           ; Print 'l' twice
    
    MOV AL, 'o'
    INT 0x10
    
    ; Print newline
    MOV AL, 10         ; '\n'
    INT 0x10
    
    ; Print "Hi" using INT 0x21
    MOV AH, 0x02       ; Write character function
    MOV DL, 'H'
    INT 0x21
    
    MOV DL, 'i'
    INT 0x21
    
    ; Terminate program
    INT 0x20           ; Program terminate
