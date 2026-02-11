; Snake Game - TonX86 (Rewritten)
; Classic snake for 64x64 LCD display
;
; REQUIRED SETTINGS:
;   - tonx86.lcd.width = 64
;   - tonx86.lcd.height = 64
;   (File -> Preferences -> Settings -> search "tonx86.lcd")
;
; Controls:
;   SPACE - Start/Restart
;   UP ARROW (128) - Move up
;   DOWN ARROW (129) - Move down
;   LEFT ARROW (130) - Move left
;   RIGHT ARROW (131) - Move right
;
; Memory Layout:
;   Snake body: 0x1000-0x1FFF (each segment = 8 bytes: X (4), Y (4))
;   State vars: 0x2000+
;   LCD memory: 0xF000-0xFFFF (mapped to 64x64 grid, 4096 pixels)
;
; Constants
GRID_SIZE:      EQU 64
LCD_BASE:       EQU 0xF000
SNAKE_BODY:     EQU 0x1000

STATE_DIR:      EQU 0x2000
STATE_LEN:      EQU 0x2004
STATE_HEAD_X:   EQU 0x2008
STATE_HEAD_Y:   EQU 0x200C
STATE_FOOD_X:   EQU 0x2010
STATE_FOOD_Y:   EQU 0x2014

KB_STATUS:      EQU 0x10100
KB_KEYCODE:     EQU 0x10101

KEY_SPACE:      EQU 32
KEY_UP:         EQU 128
KEY_DOWN:       EQU 129
KEY_LEFT:       EQU 130
KEY_RIGHT:      EQU 131

; Direction values
DIR_RIGHT:      EQU 0
DIR_DOWN:       EQU 1
DIR_LEFT:       EQU 2
DIR_UP:         EQU 3

start:
    CALL clear_lcd
    CALL draw_start_screen
    CALL wait_for_space
    CALL init_game

main_loop:
    CALL read_input
    CALL move_snake
    CMP EAX, 1
    JE game_over

    CALL check_food
    CMP EAX, 1
    JNE draw_step

    ; Food eaten, increase length and spawn new food
    MOV EAX, [STATE_LEN]
    ADD EAX, 1
    MOV [STATE_LEN], EAX
    CALL spawn_food

draw_step:
    CALL draw_game
    CALL game_delay
    JMP main_loop

game_over:
    CALL flash_screen
    JMP start

; ============================================
; Draw start screen (visual indicator to press SPACE)
; Draws a small play button triangle in the center
; ============================================
draw_start_screen:
    PUSH EBP
    MOV EBP, ESP
    PUSH EAX
    PUSH EBX

    ; Draw a play triangle (right-pointing arrow) centered at (30,28)
    ; Row 0: (30,28)
    MOV EAX, 28
    MOV EBX, 64
    IMUL EAX, EBX
    ADD EAX, 30
    ADD EAX, LCD_BASE
    MOV [EAX], 1

    ; Row 1: (30,29) (31,29)
    MOV EAX, 29
    MOV EBX, 64
    IMUL EAX, EBX
    ADD EAX, 30
    ADD EAX, LCD_BASE
    MOV [EAX], 1
    ADD EAX, 1
    MOV [EAX], 1

    ; Row 2: (30,30) (31,30) (32,30)
    MOV EAX, 30
    MOV EBX, 64
    IMUL EAX, EBX
    ADD EAX, 30
    ADD EAX, LCD_BASE
    MOV [EAX], 1
    ADD EAX, 1
    MOV [EAX], 1
    ADD EAX, 1
    MOV [EAX], 1

    ; Row 3: (30,31) (31,31) (32,31) (33,31)
    MOV EAX, 31
    MOV EBX, 64
    IMUL EAX, EBX
    ADD EAX, 30
    ADD EAX, LCD_BASE
    MOV [EAX], 1
    ADD EAX, 1
    MOV [EAX], 1
    ADD EAX, 1
    MOV [EAX], 1
    ADD EAX, 1
    MOV [EAX], 1

    ; Row 4: (30,32) (31,32) (32,32) (33,32) (34,32) - widest point
    MOV EAX, 32
    MOV EBX, 64
    IMUL EAX, EBX
    ADD EAX, 30
    ADD EAX, LCD_BASE
    MOV [EAX], 1
    ADD EAX, 1
    MOV [EAX], 1
    ADD EAX, 1
    MOV [EAX], 1
    ADD EAX, 1
    MOV [EAX], 1
    ADD EAX, 1
    MOV [EAX], 1

    ; Row 5: (30,33) (31,33) (32,33) (33,33)
    MOV EAX, 33
    MOV EBX, 64
    IMUL EAX, EBX
    ADD EAX, 30
    ADD EAX, LCD_BASE
    MOV [EAX], 1
    ADD EAX, 1
    MOV [EAX], 1
    ADD EAX, 1
    MOV [EAX], 1
    ADD EAX, 1
    MOV [EAX], 1

    ; Row 6: (30,34) (31,34) (32,34)
    MOV EAX, 34
    MOV EBX, 64
    IMUL EAX, EBX
    ADD EAX, 30
    ADD EAX, LCD_BASE
    MOV [EAX], 1
    ADD EAX, 1
    MOV [EAX], 1
    ADD EAX, 1
    MOV [EAX], 1

    ; Row 7: (30,35) (31,35)
    MOV EAX, 35
    MOV EBX, 64
    IMUL EAX, EBX
    ADD EAX, 30
    ADD EAX, LCD_BASE
    MOV [EAX], 1
    ADD EAX, 1
    MOV [EAX], 1

    ; Row 8: (30,36)
    MOV EAX, 36
    MOV EBX, 64
    IMUL EAX, EBX
    ADD EAX, 30
    ADD EAX, LCD_BASE
    MOV [EAX], 1

    POP EBX
    POP EAX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Wait for SPACE to start
; ============================================
wait_for_space:
    PUSH EBP
    MOV EBP, ESP
    PUSH EAX
    PUSH EBX

wait_loop:
    MOV EAX, [KB_STATUS]
    CMP EAX, 0
    JE wait_loop

    MOV EBX, [KB_KEYCODE]
    CMP EBX, KEY_SPACE
    JNE wait_loop

    POP EBX
    POP EAX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Initialize game state
; ============================================
init_game:
    PUSH EBP
    MOV EBP, ESP
    PUSH EAX
    PUSH EBX
    PUSH ECX

    CALL clear_lcd

    ; Initial head position (center)
    MOV EBX, 32
    MOV ECX, 32

    ; Store state
    MOV [STATE_HEAD_X], EBX
    MOV [STATE_HEAD_Y], ECX
    MOV EAX, 3
    MOV [STATE_LEN], EAX
    MOV EAX, DIR_RIGHT
    MOV [STATE_DIR], EAX

    ; Build initial snake (3 segments)
    MOV EAX, SNAKE_BODY
    MOV [EAX], 32
    ADD EAX, 4
    MOV [EAX], 32
    ADD EAX, 4
    MOV [EAX], 31
    ADD EAX, 4
    MOV [EAX], 32
    ADD EAX, 4
    MOV [EAX], 30
    ADD EAX, 4
    MOV [EAX], 32

    CALL spawn_food
    CALL draw_game

    POP ECX
    POP EBX
    POP EAX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Read keyboard input and update direction
; ============================================
read_input:
    PUSH EBP
    MOV EBP, ESP
    PUSH EAX
    PUSH EBX
    PUSH ECX

    MOV EAX, [KB_STATUS]
    CMP EAX, 0
    JE input_done

    MOV EBX, [KB_KEYCODE]
    MOV ECX, [STATE_DIR]

    CMP EBX, KEY_UP
    JE input_up
    CMP EBX, KEY_DOWN
    JE input_down
    CMP EBX, KEY_LEFT
    JE input_left
    CMP EBX, KEY_RIGHT
    JE input_right
    JMP input_done

input_up:
    CMP ECX, DIR_DOWN
    JE input_done
    MOV ECX, DIR_UP
    JMP store_dir
input_down:
    CMP ECX, DIR_UP
    JE input_done
    MOV ECX, DIR_DOWN
    JMP store_dir
input_left:
    CMP ECX, DIR_RIGHT
    JE input_done
    MOV ECX, DIR_LEFT
    JMP store_dir
input_right:
    CMP ECX, DIR_LEFT
    JE input_done
    MOV ECX, DIR_RIGHT

store_dir:
    MOV [STATE_DIR], ECX

input_done:
    POP ECX
    POP EBX
    POP EAX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Move snake one step
; Returns: EAX=1 if collision, 0 otherwise
; ============================================
move_snake:
    PUSH EBP
    MOV EBP, ESP
    PUSH EBX
    PUSH ECX
    PUSH EDI

    MOV EAX, [STATE_HEAD_X]
    MOV EBX, [STATE_HEAD_Y]
    MOV ECX, [STATE_DIR]

    CMP ECX, DIR_RIGHT
    JE move_right
    CMP ECX, DIR_DOWN
    JE move_down
    CMP ECX, DIR_LEFT
    JE move_left
    CMP ECX, DIR_UP
    JE move_up
    JMP move_apply

move_right:
    ADD EAX, 1
    JMP move_apply
move_down:
    ADD EBX, 1
    JMP move_apply
move_left:
    SUB EAX, 1
    JMP move_apply
move_up:
    SUB EBX, 1

move_apply:
    ; Wrap around edges
    MOD EAX, GRID_SIZE
    MOD EBX, GRID_SIZE

    ; Store new head position
    MOV [STATE_HEAD_X], EAX
    MOV [STATE_HEAD_Y], EBX

    ; Shift body from tail to head
    MOV EDI, [STATE_LEN]
    SUB EDI, 1

shift_loop:
    CMP EDI, 0
    JE shift_done

    ; source = segment (EDI - 1)
    MOV ECX, EDI
    SUB ECX, 1
    MOV EAX, ECX
    ADD EAX, EAX
    ADD EAX, EAX
    ADD EAX, EAX
    ADD EAX, SNAKE_BODY
    MOV ECX, [EAX]
    ADD EAX, 4
    MOV EBX, [EAX]

    ; dest = segment EDI
    MOV EAX, EDI
    ADD EAX, EAX
    ADD EAX, EAX
    ADD EAX, EAX
    ADD EAX, SNAKE_BODY
    MOV [EAX], ECX
    ADD EAX, 4
    MOV [EAX], EBX

    SUB EDI, 1
    JMP shift_loop

shift_done:
    ; New head
    MOV EAX, SNAKE_BODY
    MOV ECX, [STATE_HEAD_X]
    MOV [EAX], ECX
    ADD EAX, 4
    MOV ECX, [STATE_HEAD_Y]
    MOV [EAX], ECX

    ; Check self-collision (result in EAX)
    CALL check_collision

    ; EAX holds collision result (0 or 1) — don't touch it
    POP EDI
    POP ECX
    POP EBX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Check collision with self
; Returns: EAX=1 if collision, EAX=0 otherwise
; ============================================
check_collision:
    PUSH EBP
    MOV EBP, ESP
    PUSH EBX
    PUSH ECX
    PUSH EDI

    MOV EBX, [STATE_HEAD_X]
    MOV ECX, [STATE_HEAD_Y]

    MOV EDI, 1
collision_loop:
    CMP EDI, [STATE_LEN]
    JE no_collision

    MOV EAX, EDI
    ADD EAX, EAX
    ADD EAX, EAX
    ADD EAX, EAX
    ADD EAX, SNAKE_BODY
    MOV EAX, [EAX]
    CMP EAX, EBX
    JNE next_segment

    MOV EAX, EDI
    ADD EAX, EAX
    ADD EAX, EAX
    ADD EAX, EAX
    ADD EAX, SNAKE_BODY
    ADD EAX, 4
    MOV EAX, [EAX]
    CMP EAX, ECX
    JNE next_segment

    MOV EAX, 1
    JMP collision_done

next_segment:
    ADD EDI, 1
    JMP collision_loop

no_collision:
    MOV EAX, 0

collision_done:
    POP EDI
    POP ECX
    POP EBX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Check if head is on food
; Returns: EAX=1 if eaten, EAX=0 otherwise
; ============================================
check_food:
    PUSH EBP
    MOV EBP, ESP
    PUSH EBX

    MOV EAX, [STATE_HEAD_X]
    MOV EBX, [STATE_FOOD_X]
    CMP EAX, EBX
    JNE not_eaten

    MOV EAX, [STATE_HEAD_Y]
    MOV EBX, [STATE_FOOD_Y]
    CMP EAX, EBX
    JNE not_eaten

    MOV EAX, 1
    JMP food_done

not_eaten:
    MOV EAX, 0

food_done:
    POP EBX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Spawn new food (avoid snake body)
; ============================================
spawn_food:
    PUSH EBP
    MOV EBP, ESP
    PUSH EAX
    PUSH EBX
    PUSH ECX
    PUSH EDI

spawn_loop:
    RAND EAX, GRID_SIZE
    RAND EBX, GRID_SIZE
    MOV [STATE_FOOD_X], EAX
    MOV [STATE_FOOD_Y], EBX

    ; Check against snake body
    MOV EDI, 0
food_check_loop:
    CMP EDI, [STATE_LEN]
    JE food_ok

    MOV ECX, EDI
    ADD ECX, ECX
    ADD ECX, ECX
    ADD ECX, ECX
    ADD ECX, SNAKE_BODY
    MOV ECX, [ECX]
    CMP ECX, EAX
    JNE food_next

    MOV ECX, EDI
    ADD ECX, ECX
    ADD ECX, ECX
    ADD ECX, ECX
    ADD ECX, SNAKE_BODY
    ADD ECX, 4
    MOV ECX, [ECX]
    CMP ECX, EBX
    JE spawn_loop

food_next:
    ADD EDI, 1
    JMP food_check_loop

food_ok:
    POP EDI
    POP ECX
    POP EBX
    POP EAX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Draw game state
; ============================================
draw_game:
    PUSH EBP
    MOV EBP, ESP
    PUSH EAX
    PUSH EBX
    PUSH ECX
    PUSH EDI

    CALL clear_lcd

    MOV EDI, 0
snake_draw_loop:
    CMP EDI, [STATE_LEN]
    JE draw_food

    MOV EAX, EDI
    ADD EAX, EAX
    ADD EAX, EAX
    ADD EAX, EAX
    ADD EAX, SNAKE_BODY
    MOV ECX, [EAX]
    ADD EAX, 4
    MOV EBX, [EAX]
    CALL draw_pixel

    ADD EDI, 1
    JMP snake_draw_loop

draw_food:
    MOV ECX, [STATE_FOOD_X]
    MOV EBX, [STATE_FOOD_Y]
    CALL draw_pixel

    POP EDI
    POP ECX
    POP EBX
    POP EAX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Clear LCD display
; ============================================
clear_lcd:
    PUSH EBP
    MOV EBP, ESP
    PUSH EAX
    PUSH EBX

    MOV EAX, LCD_BASE
    MOV EBX, 4096
clear_loop:
    MOV [EAX], 0
    ADD EAX, 1
    SUB EBX, 1
    CMP EBX, 0
    JNE clear_loop

    POP EBX
    POP EAX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Draw pixel at (ECX=X, EBX=Y)
; ============================================
draw_pixel:
    PUSH EBP
    MOV EBP, ESP
    PUSH EAX
    PUSH EDX

    MOV EAX, EBX
    MOV EDX, GRID_SIZE
    MUL EDX
    ADD EAX, ECX
    ADD EAX, LCD_BASE
    MOV [EAX], 1

    POP EDX
    POP EAX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Small delay for game speed
; ============================================
game_delay:
    PUSH EBP
    MOV EBP, ESP
    PUSH EAX

    MOV EAX, 10000
spin_delay:
    SUB EAX, 1
    CMP EAX, 0
    JNE spin_delay

    POP EAX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Flash screen on game over
; ============================================
flash_screen:
    PUSH EBP
    MOV EBP, ESP
    PUSH EAX
    PUSH EBX

    MOV EBX, 3
flash_loop:
    CALL clear_lcd
    MOV EAX, 80000
flash_wait_on:
    SUB EAX, 1
    CMP EAX, 0
    JNE flash_wait_on

    MOV EAX, LCD_BASE
    MOV ECX, 4096
flash_fill:
    MOV [EAX], 1
    ADD EAX, 1
    SUB ECX, 1
    CMP ECX, 0
    JNE flash_fill

    MOV EAX, 80000
flash_wait_off:
    SUB EAX, 1
    CMP EAX, 0
    JNE flash_wait_off

    SUB EBX, 1
    CMP EBX, 0
    JNE flash_loop

    POP EBX
    POP EAX
    MOV ESP, EBP
    POP EBP
    RET
