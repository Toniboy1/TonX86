; TonX86 Assembly Example - EQU Constants with Data
; Demonstrates EQU directive combined with data sections

; Define constants
LCD_BASE EQU 0xF000
GRID_SIZE EQU 8
MAX_COUNT EQU 100
NULL_CHAR EQU 0x00
PIXEL_ON EQU 0xFF
PIXEL_OFF EQU 0x00

; Data section with constants
.data
ORG 0x3000

; Use constants in data definitions
title: DB "Grid ", GRID_SIZE + 48, NULL_CHAR  ; "Grid 8\0"
counter: DD MAX_COUNT                          ; 100
lcd_addr: DD LCD_BASE                          ; 0xF000

; Pattern using constants
pattern: DB PIXEL_ON, PIXEL_OFF, PIXEL_ON, PIXEL_OFF

; Code section
.text
start:
  ; Load counter using constant
  MOV EAX, counter
  MOV EBX, [EAX]            ; EBX = 100
  
  ; Load LCD address
  MOV ECX, [lcd_addr]       ; ECX = 0xF000
  
  ; Write pixel using constant
  MOV EDX, PIXEL_ON
  MOV [ECX], EDX
  
  ; Loop using constant
  MOV EAX, MAX_COUNT
loop_start:
  DEC EAX
  CMP EAX, 0
  JNE loop_start
  
  HLT
