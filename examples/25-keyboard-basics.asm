; Simple Keyboard Test
; Tests basic keyboard input with visual feedback

; First, draw a pattern to confirm LCD is working
MOV 0xF000, 1      ; Pixel (0,0)
MOV 0xF001, 1      ; Pixel (1,0)
MOV 0xF010, 1      ; Pixel (0,1) - assuming 16 width
MOV 0xF011, 1      ; Pixel (1,1)

; Wait for a key press
wait_key:
    MOV EAX, [0x10100]  ; Read keyboard status
    CMP EAX, 0
    JE wait_key         ; Keep waiting if no key
    
    ; Key is available!
    MOV EBX, [0x10101]  ; Read key code (pops from queue)
    
    ; Light up more pixels to show we got a key
    MOV 0xF002, 1
    MOV 0xF003, 1

HLT
