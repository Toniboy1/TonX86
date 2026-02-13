; TonX86 Assembly Example - Data Section with DB/DW/DD
; Demonstrates .data section, DB/DW/DD directives, and ORG

; Data section - define constants and strings
.data
ORG 0x2000              ; Start data at 0x2000

; String data using DB (Define Byte)
message: DB "Hello", 0x00    ; Null-terminated string
prompt: DB "Enter: "         ; String without null terminator

; Byte arrays
colors: DB 0xFF, 0x00, 0xFF, 0x00  ; RGBW pattern

; Word data using DW (Define Word - 2 bytes)
width: DW 640
height: DW 480

; Doubleword data using DD (Define Doubleword - 4 bytes)
screen_size: DD 307200       ; 640 * 480
magic_number: DD 0xDEADBEEF

; Multiple values on one line
coordinates: DD 100, 200, 300

; Code section
.text
start:
  ; Load message address
  MOV EAX, message
  
  ; Read first character 'H' (0x48)
  MOV BL, [EAX]
  
  ; Load width value (little-endian: 640 = 0x0280)
  MOV ECX, [width]
  
  ; Load screen_size
  MOV EDX, [screen_size]
  
  ; Calculate offset: coordinates + 4 (second value)
  MOV ESI, coordinates
  ADD ESI, 4
  MOV EBX, [ESI]            ; Load 200
  
  HLT
