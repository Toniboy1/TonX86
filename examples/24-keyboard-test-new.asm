; Test keyboard at new addresses (0x10100-0x10102)
; Make sure keyboard capture is enabled and focused

KB_STATUS:      EQU 0x10100
KB_KEYCODE:     EQU 0x10101
KB_STATE:       EQU 0x10102

main:
    ; Turn on first pixel to show program is running
    MOV 0xF000, 1
    
wait_loop:
    ; Check keyboard status
    MOV EAX, KB_STATUS
    CMP EAX, 0
    JE wait_loop
    
    ; Key available - read it
    MOV EBX, KB_KEYCODE
    MOV ECX, KB_STATE
    
    ; Turn on second pixel to show key was detected
    MOV 0xF001, 1
    
    ; If key is pressed (not released)
    CMP ECX, 1
    JNE wait_loop
    
    ; Turn on third pixel
    MOV 0xF002, 1
    
    ; Check if SPACE (32)
    CMP EBX, 32
    JE space_pressed
    
    JMP wait_loop

space_pressed:
    ; Fill first row to show space was pressed
    MOV EAX, 0xF000
    MOV ECX, 0
fill_loop:
    MOV [EAX], 1
    ADD EAX, 1
    ADD ECX, 1
    CMP ECX, 64
    JNE fill_loop
    
    HLT
