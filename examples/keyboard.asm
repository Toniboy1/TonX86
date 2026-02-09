; TonX86 Keyboard Input Example
; This program demonstrates reading keyboard input and displaying it on the LCD
;
; Memory Map:
; 0xF000-0xF0FF: LCD Display (8x8 grid)
; 0xF100: Keyboard status (1 = key available, 0 = no key)
; 0xF101: Key code (ASCII or special code, reading pops from queue)
; 0xF102: Key state (1 = pressed, 0 = released)
;
; Key Codes:
; - Letters: A-Z = 65-90, a-z = 97-122
; - Numbers: 0-9 = 48-57
; - Arrow Keys: Up=128, Down=129, Left=130, Right=131
; - Space: 32, Enter: 13, Escape: 27

; Wait for a key press
wait_for_key:
    MOV EAX, 0xF100        ; Read keyboard status
    CMP EAX, 0             ; Check if key available
    JE wait_for_key        ; If no key, loop back

; Read the key
    MOV EBX, 0xF101        ; Read key code (pops from queue)
    MOV ECX, 0xF102        ; Read key state (pressed/released)

; Check if it's the letter 'A' (65)
    CMP EBX, 65            ; Compare with 'A'
    JE light_pixel_a       ; If 'A', light first pixel

; Check if it's the letter 'B' (66)
    CMP EBX, 66            ; Compare with 'B'
    JE light_pixel_b       ; If 'B', light second pixel

; Check if it's arrow up (128)
    CMP EBX, 128           ; Compare with Up arrow
    JE light_pixel_up      ; If Up, light top row

; Check if it's space (32)
    CMP EBX, 32            ; Compare with Space
    JE clear_display       ; If Space, clear display

; Continue waiting for keys
    JMP wait_for_key

light_pixel_a:
    MOV 0xF000, 1          ; Light pixel at (0,0)
    JMP wait_for_key

light_pixel_b:
    MOV 0xF001, 1          ; Light pixel at (1,0)
    JMP wait_for_key

light_pixel_up:
    MOV 0xF000, 1          ; Light entire top row
    MOV 0xF001, 1
    MOV 0xF002, 1
    MOV 0xF003, 1
    MOV 0xF004, 1
    MOV 0xF005, 1
    MOV 0xF006, 1
    MOV 0xF007, 1
    JMP wait_for_key

clear_display:
    MOV EAX, 0             ; Set EAX to 0
    MOV EDX, 0             ; Counter for 64 pixels
clear_loop:
    MOV 0xF000, 0          ; This is simplified - in real code you'd calculate address
    ADD EDX, 1
    CMP EDX, 64
    JNE clear_loop
    JMP wait_for_key

HLT                        ; End program
