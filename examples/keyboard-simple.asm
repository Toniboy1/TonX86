; Simple Keyboard Test
; Lights the first LCD pixel while any key is pressed
; Turns it off when key is released

main_loop:
    ; Check if key is available
    MOV EAX, 0xF100        ; Read keyboard status
    CMP EAX, 1             ; Is there a key?
    JNE main_loop          ; If not, keep waiting

    ; Read the key
    MOV EBX, 0xF101        ; Read key code (pops key)
    MOV ECX, 0xF102        ; Read key state (1 = pressed, 0 = released)

    ; Check key state
    CMP ECX, 1             ; Is key pressed?
    JE key_pressed         ; If pressed, light pixel

    ; Key released, turn off pixel
    MOV 0xF000, 0
    JMP main_loop

key_pressed:
    ; Key pressed, turn on pixel
    MOV 0xF000, 1
    JMP main_loop

HLT
