; Test 14: Keyboard Input
; Tests: Keyboard memory-mapped I/O (0xF100-0xF102)
; Expected: Reads keyboard input and displays on LCD
; Instructions: 
; 1. Set breakpoint on line 8
; 2. Press F5 to start
; 3. When stopped, manually type keys in the capture panel
; 4. Press F5 to continue

main_loop:
    PUSH EBX           ; Save callee-saved register
    MOV EAX, 0xF100    ; Read keyboard status
    CMP EAX, 1         ; Key available?
    JNE main_loop_end  ; No - keep waiting
    
    ; Key available - read it
    MOV EBX, 0xF101    ; Read key code (pops from queue)
    MOV ECX, 0xF102    ; Read key state (1=pressed, 0=released)
    
    CMP ECX, 1         ; Key pressed?
    JE key_pressed
    
    ; Key released
    MOV 0xF000, 0      ; Turn off pixel
    JMP main_loop_end
    POP EBX

key_pressed:
    ; Key pressed - turn on pixel
    MOV 0xF000, 1      ; Turn on pixel at (0,0)
    
    ; Check for ESC key to exit
    CMP EBX, 27
    JE exit_program
    
main_loop_end:
    PUSH EBX            ; Restore callee-saved register
    JMP main_loop
    POP EBX

exit_program:
    HLT
