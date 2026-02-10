; Simple test for INT 0x10
; Should print "Hi" to console

MOV AH, 0x0E
MOV AL, 'H'
INT 0x10

MOV AL, 'i'
INT 0x10

HLT
