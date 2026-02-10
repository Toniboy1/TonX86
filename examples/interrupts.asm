; Example: Using software interrupts for console output
; This demonstrates INT 0x10 (Video services) and INT 0x21 (DOS services)
; Output appears in VS Code Debug Console

main:
    ; Print "Hello, World!" using INT 0x10 (Video services)
    ; AH = 0x0E is the teletype output function
    MOV AH, 0x0E           ; Set function: teletype output
    
    MOV AL, 'H'            ; Character 'H'
    INT 0x10               ; Call BIOS video interrupt
    
    MOV AL, 'e'
    INT 0x10
    
    MOV AL, 'l'
    INT 0x10
    
    MOV AL, 'l'
    INT 0x10
    
    MOV AL, 'o'
    INT 0x10
    
    MOV AL, ','
    INT 0x10
    
    MOV AL, ' '            ; Space character
    INT 0x10
    
    ; Now use INT 0x21 (DOS services) for remaining characters
    ; AH = 0x02 writes character from DL
    MOV AH, 0x02           ; Set function: write character
    
    MOV DL, 'W'
    INT 0x21               ; Call DOS services interrupt
    
    MOV DL, 'o'
    INT 0x21
    
    MOV DL, 'r'
    INT 0x21
    
    MOV DL, 'l'
    INT 0x21
    
    MOV DL, 'd'
    INT 0x21
    
    MOV DL, '!'
    INT 0x21
    
    ; Print newline
    MOV AH, 0x0E
    MOV AL, 10             ; Line feed (newline)
    INT 0x10
    
    ; Terminate program using INT 0x20
    INT 0x20               ; Program terminate interrupt
