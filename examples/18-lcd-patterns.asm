; Test 18: LCD Display (Complete Testing)
; Tests: All LCD memory-mapped I/O operations
; Expected: Pattern visible on LCD display
; Default LCD size: 16x16 pixels

main:
    ; Draw horizontal line at top (y=0)
    MOV ECX, 0         ; x counter
draw_top:
    MOV EAX, 0xF000    ; Base address
    ADD EAX, ECX       ; Add x offset (y*width + x, where y=0)
    MOV [EAX], 1       ; Turn on pixel
    INC ECX
    CMP ECX, 16        ; Width = 16
    JNE draw_top
    
    ; Draw vertical line at left (x=0)
    MOV ECX, 0         ; y counter
draw_left:
    MOV EAX, ECX       ; y coordinate
    MOV EBX, 16        ; Width
    MUL EBX            ; EAX = y * width
    ADD EAX, 0xF000    ; Add base address
    MOV [EAX], 1       ; Turn on pixel
    INC ECX
    CMP ECX, 16        ; Height = 16
    JNE draw_left
    
    ; Draw diagonal line
    MOV ECX, 0         ; counter
draw_diagonal:
    MOV EAX, ECX       ; y = x
    MOV EBX, 16        ; Width
    MUL EBX            ; EAX = y * width
    ADD EAX, ECX       ; Add x
    ADD EAX, 0xF000    ; Add base address
    MOV [EAX], 1       ; Turn on pixel
    INC ECX
    CMP ECX, 16
    JNE draw_diagonal
    
    HLT
