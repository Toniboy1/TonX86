; Test 14: Keyboard Input
; Tests: Keyboard memory-mapped I/O (0x10100-0x10102)
; Expected: Reads keyboard input and displays on LCD
; Instructions: 
; 1. Press F5 to start
; 2. Click in the LCD display panel to focus it
; 3. Type keys - pixel should turn on/off
; 4. Press ESC to exit

main_loop:
    ; Visual indicator - flash pixel to show we're running
    MOV 0xF001, 1      ; Turn on pixel (0,1) as activity indicator
    
    MOV EAX, [0x10100]  ; Read keyboard status
    CMP EAX, 1         ; Key available?
    JNE main_loop      ; No - keep waiting
    
    ; Key available - read it
    MOV EBX, [0x10101]  ; Read key code (pops from queue)
    MOV ECX, [0x10102]  ; Read key state (1=pressed, 0=released)
    
    CMP ECX, 1         ; Key pressed?
    JE key_pressed
    
    ; Key released
    MOV 0xF000, 0      ; Turn off pixel
    JMP main_loop

key_pressed:
    ; Key pressed - turn on pixel
    MOV 0xF000, 1      ; Turn on pixel at (0,0)
    
    ; Check for ESC key to exit
    CMP EBX, 27
    JE exit_program
    JMP main_loop

exit_program:
    HLT
