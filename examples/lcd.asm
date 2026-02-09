; lcd.asm - LCD memory-mapped I/O test
; Writes pixels directly to addresses 0xF000 + (y*width + x)
; Assumes default LCD size 8x8 (addresses 0xF000 .. 0xF03F)

start:
    ; Draw top border
    MOV 0xF000, 1
    MOV 0xF001, 1
    MOV 0xF002, 1
    MOV 0xF003, 1
    MOV 0xF004, 1
    MOV 0xF005, 1
    MOV 0xF006, 1
    MOV 0xF007, 1

    ; Draw bottom border
    MOV 0xF038, 1
    MOV 0xF039, 1
    MOV 0xF03A, 1
    MOV 0xF03B, 1
    MOV 0xF03C, 1
    MOV 0xF03D, 1
    MOV 0xF03E, 1
    MOV 0xF03F, 1

    ; Draw left and right borders (middle rows)
    MOV 0xF008, 1   ; (0,1)
    MOV 0xF00F, 1   ; (7,1)
    MOV 0xF010, 1   ; (0,2)
    MOV 0xF017, 1   ; (7,2)
    MOV 0xF018, 1   ; (0,3)
    MOV 0xF01F, 1   ; (7,3)
    MOV 0xF020, 1   ; (0,4)
    MOV 0xF027, 1   ; (7,4)
    MOV 0xF028, 1   ; (0,5)
    MOV 0xF02F, 1   ; (7,5)
    MOV 0xF030, 1   ; (0,6)
    MOV 0xF037, 1   ; (7,6)

    ; Draw main diagonal (0,0) .. (7,7)
    MOV 0xF000, 1   ; (0,0) already set but safe
    MOV 0xF009, 1   ; (1,1)
    MOV 0xF012, 1   ; (2,2)
    MOV 0xF01B, 1   ; (3,3)
    MOV 0xF024, 1   ; (4,4)
    MOV 0xF02D, 1   ; (5,5)
    MOV 0xF036, 1   ; (6,6)
    MOV 0xF03F, 1   ; (7,7) already set

    ; Optional: small pattern in center
    MOV 0xF01C, 1   ; (4,3)
    MOV 0xF01D, 1   ; (5,3)
    MOV 0xF014, 1   ; (4,1)

    HLT
