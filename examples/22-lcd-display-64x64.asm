; Simple LCD test for 64x64
; Tests direct writes to LCD memory

main:
    ; Test 1: Direct write to first pixel
    MOV 0xF000, 1
    
    ; Test 2: Write to pixel using register
    LEA EAX, 0xF001
    MOV [EAX], 1
    
    ; Test 3: Calculate address and write
    MOV EAX, 0xF000
    ADD EAX, 64        ; Second row, first pixel
    MOV [EAX], 1
    
    ; Test 4: Draw a line
    MOV ECX, 0         ; Counter
    LEA EAX, 0xF080    ; Row 2 (2*64 = 128 = 0x80)
draw_line:
    MOV [EAX], 1
    ADD EAX, 1
    ADD ECX, 1
    CMP ECX, 10
    JNE draw_line
    
    HLT
