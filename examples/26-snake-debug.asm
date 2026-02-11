; Snake Game - Simplified Debug Version
; Tests basic functionality step by step

GRID_SIZE:      EQU 64
LCD_BASE:       EQU 0xF000
KB_STATUS:      EQU 0x10100
KB_KEYCODE:     EQU 0x10101
KEY_SPACE:      EQU 32

start:
    ; Draw test pattern to confirm LCD works
    MOV 0xF000, 1        ; Pixel (0,0)
    MOV 0xF001, 1        ; Pixel (1,0)
    MOV 0xF040, 1        ; Pixel (0,1) - 64 width
    MOV 0xF041, 1        ; Pixel (1,1)
    
    ; Draw diagonal line from (0,0) to (63,63)
    MOV ESI, 0           ; Counter: 0 to 63
draw_diagonal:
    ; Calculate address: LCD_BASE + (Y * 64 + X) where X=Y=ESI
    MOV EAX, ESI         ; Y coordinate
    MOV ECX, 64
    IMUL ECX             ; EAX = Y * 64 (signed multiply, keeps result in EAX only)
    ADD EAX, ESI         ; Add X coordinate
    MOV EDX, LCD_BASE
    ADD EAX, EDX         ; Add LCD base address
    MOV [EAX], 1         ; Draw pixel
    
    ADD ESI, 1           ; Increment counter
    CMP ESI, 64
    JNE draw_diagonal
    
    ; Wait for space to continue
wait_space:
    MOV EAX, [KB_STATUS]
    CMP EAX, 0
    JE wait_space
    
    MOV EAX, [KB_KEYCODE]
    CMP EAX, KEY_SPACE
    JNE wait_space
    
    HLT
