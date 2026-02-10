; Test 8: LCD Display
; Tests: Memory-mapped I/O for LCD
; Expected: Top-left pixel lit

main:
    MOV 0xF000, 1      ; Turn on pixel at (0,0)
    MOV 0xF001, 1      ; Turn on pixel at (0,1)
    MOV 0xF010, 1      ; Turn on pixel at (1,0) in 16-width display
    HLT
