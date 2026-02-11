; Simpler LCD test with constants
GRID_SIZE:      EQU 64
LCD_BASE:       EQU 0xF000

main:
    ; Direct write - should work
    MOV 0xF000, 1
    
    ; Using constant in calculation
    MOV EAX, LCD_BASE
    MOV [EAX], 1
    
    ; Calculate pixel (0, 1)
    MOV EAX, 0       ; Y = 0
    MOV ECX, 1       ; X = 1
    MOV EBX, GRID_SIZE
    MUL EBX          ; EAX = Y * GRID_SIZE
    ADD EAX, ECX     ; EAX = Y * GRID_SIZE + X
    ADD EAX, LCD_BASE
    MOV [EAX], 1
    
    HLT
