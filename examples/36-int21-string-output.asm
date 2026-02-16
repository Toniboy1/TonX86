; INT 0x21 String Output Example
; Demonstrates INT 0x21 AH=0x09 (write $-terminated string)

.data
ORG 0x1000
    msg1: DB 'H', 'e', 'l', 'l', 'o', ',', ' ', 'W', 'o', 'r', 'l', 'd', '!', '$'
    msg2: DB 'T', 'o', 'n', 'X', '8', '6', '$'
    msg3: DB 'D', 'O', 'S', ' ', 'S', 't', 'y', 'l', 'e', '$'

.text
    ; Print first message
    MOV AH, 0x09
    MOV EDX, msg1
    INT 0x21

    ; Print newline using AH=0x02
    MOV AH, 0x02
    MOV DL, 0x0A
    INT 0x21

    ; Print second message
    MOV AH, 0x09
    MOV EDX, msg2
    INT 0x21

    ; Print newline
    MOV AH, 0x02
    MOV DL, 0x0A
    INT 0x21

    ; Print third message
    MOV AH, 0x09
    MOV EDX, msg3
    INT 0x21

    ; Exit
    INT 0x20
