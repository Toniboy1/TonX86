; TonX86 Assembly Example - Complete Program with .text and .data
; Demonstrates section switching and proper program structure

; Constants
SCREEN_WIDTH EQU 64
SCREEN_HEIGHT EQU 64
LCD_BASE EQU 0xF000

; ========================================
; DATA SECTION
; ========================================
.data
ORG 0x2000

; Message strings
welcome_msg: DB "TonX86 v1.0", 0x00
error_msg: DB "Error", 0x00

; Configuration data
screen_w: DW SCREEN_WIDTH
screen_h: DW SCREEN_HEIGHT
pixel_size: DB 1
  
; Lookup table
square_table: DB 0, 1, 4, 9, 16, 25, 36, 49, 64

; Color palette (RGBA)
palette: DD 0xFF000000, 0xFFFFFFFF, 0xFFFF0000, 0xFF00FF00

; ========================================
; CODE SECTION
; ========================================
.text
ORG 0x0000

main:
  ; Initialize
  CALL init_screen
  CALL draw_border
  
  ; Main loop
main_loop:
  CALL update_display
  CMP EAX, 0
  JE main_loop
  
  ; Exit
  HLT

; Initialize screen
init_screen:
  PUSH EBP
  MOV EBP, ESP
  PUSH EBX                  ; Save callee-saved register
  
  ; Load screen configuration
  MOV EAX, [screen_w]       ; Load width
  MOV EBX, [screen_h]       ; Load height
  
  ; Clear initial state
  MOV ECX, LCD_BASE
  MOV EDX, 0
  MOV [ECX], EDX
  
  POP EBX                   ; Restore callee-saved register
  POP EBP
  RET

; Draw border on screen
draw_border:
  PUSH EBP
  MOV EBP, ESP
  PUSH ESI
  PUSH EDI
  
  MOV ESI, LCD_BASE
  MOV EDI, 0
  MOV ECX, SCREEN_WIDTH
  
border_loop:
  MOV EDI, [ESI]
  OR EDI, 0xFF
  MOV [ESI], EDI          ; Write pixel
  ADD ESI, 1
  DEC ECX
  CMP ECX, 0
  JNE border_loop
  
  POP EDI
  POP ESI
  POP EBP
  RET

; Update display
update_display:
  PUSH EBP
  MOV EBP, ESP
  PUSH EBX                  ; Save callee-saved register
  PUSH ESI                  ; Save callee-saved register
  PUSH EDI                  ; Save callee-saved register
  
  ; Read from lookup table
  MOV ESI, square_table
  ADD ESI, 3
  MOV AL, [ESI]             ;  Get square of 3 = 9
  MOVZX EAX, AL             ; Zero-extend to 32-bit
  
  ; Use color from palette
  MOV EDI, palette
  ADD EDI, 8                ; Second color (white)
  MOV EBX, [EDI]
  
  ; Return status
  MOV EAX, 1
  
  POP EDI                   ; Restore callee-saved register
  POP ESI                   ; Restore callee-saved register
  POP EBX                   ; Restore callee-saved register
  POP EBP
  RET
