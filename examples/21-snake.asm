
; Snake Game - TonX86
; A classic snake game implementation for 64x64 LCD display
; 
; REQUIRED SETTINGS:
;   - Set tonx86.lcd.width = 64
;   - Set tonx86.lcd.height = 64
;   (File → Preferences → Settings → search "tonx86.lcd")
;
; Controls:
;   SPACE - Start/Restart game
;   UP ARROW (128) - Move up
;   DOWN ARROW (129) - Move down
;   LEFT ARROW (130) - Move left
;   RIGHT ARROW (131) - Move right
;
; Memory Layout:
;   Snake body stored at 0x1000-0x1FFF (max 256 positions, 2 bytes each: X,Y)
;   Snake direction: 0=right, 1=down, 2=left, 3=up
;   Grid size: 64x64
;   LCD memory: 0xF000-0xFFFF (mapped to 64x64 grid, 4096 pixels)

; Constants
GRID_SIZE:      EQU 64
LCD_BASE:       EQU 0xF000
SNAKE_BODY:     EQU 0x1000
KB_STATUS:      EQU 0x10100
KB_KEYCODE:     EQU 0x10101
KB_STATE:       EQU 0x10102

; Key codes
KEY_SPACE:      EQU 32
KEY_UP:         EQU 128
KEY_DOWN:       EQU 129
KEY_LEFT:       EQU 130
KEY_RIGHT:      EQU 131

; Registers usage:
; EAX - general purpose / calculations
; EBX - snake head X coordinate
; ECX - snake head Y coordinate
; EDX - snake length
; ESI - current direction (0=right, 1=down, 2=left, 3=up)
; EDI - food X,Y coordinate (packed: high=Y, low=X)

start:
    ; Wait for SPACE to start
    CALL wait_for_space
    
    ; Initialize game
    CALL init_game
    
    ; Main game loop
game_loop:
    ; Check for keyboard input (direction change)
    CALL check_input
    
    ; Small delay for game speed
    CALL game_delay
    
    ; Move snake
    CALL move_snake
    
    ; Check collision with walls or self
    CALL check_collision
    CMP EAX, 1
    JE game_over
    
    ; Check if food eaten
    CALL check_food
    CMP EAX, 1
    JE food_eaten
    
    ; Update display
    CALL draw_game
    
    JMP game_loop

food_eaten:
    ; Increase snake length
    ADD EDX, 1
    
    ; Spawn new food
    CALL spawn_food
    
    ; Update display
    CALL draw_game
    
    JMP game_loop

game_over:
    ; Flash the screen
    CALL flash_screen
    
    ; Restart
    JMP start

; ============================================
; Initialize game state
; ============================================
init_game:
    PUSH EBP
    MOV EBP, ESP
    
    ; Clear LCD
    CALL clear_lcd
    
    ; Initialize snake in center
    MOV EBX, 32          ; Head X = 32
    MOV ECX, 32          ; Head Y = 32
    MOV EDX, 3           ; Initial length = 3
    MOV ESI, 0           ; Direction = right
    
    ; Store initial snake body positions
    MOV EAX, SNAKE_BODY
    ; Position 0 (head): X=32, Y=32
    MOV [EAX], 32
    ADD EAX, 4
    MOV [EAX], 32
    ADD EAX, 4
    ; Position 1: X=31, Y=32
    MOV [EAX], 31
    ADD EAX, 4
    MOV [EAX], 32
    ADD EAX, 4
    ; Position 2 (tail): X=30, Y=32
    MOV [EAX], 30
    ADD EAX, 4
    MOV [EAX], 32
    
    ; Spawn initial food
    CALL spawn_food
    
    ; Draw initial game state
    CALL draw_game
    
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
    MOV EBX, 4096        ; 64*64 pixels
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
; Draw game state to LCD
; ============================================
draw_game:
    PUSH EBP
    MOV EBP, ESP
    PUSH EAX
    PUSH EBX
    PUSH ECX
    PUSH EDI
    
    ; Clear LCD first
    CALL clear_lcd
    
    ; Draw snake body
    MOV EAX, 0           ; Body index
draw_snake_loop:
    CMP EAX, EDX         ; Compare with length
    JE draw_snake_done
    
    ; Calculate memory address for this segment
    PUSH EAX
    MOV EBX, EAX
    ADD EBX, EBX         ; Multiply by 2 (X,Y pair)
    ADD EBX, EBX         ; Multiply by 4 (each coord is 4 bytes)
    MOV ECX, SNAKE_BODY
    ADD EBX, ECX
    
    ; Get X,Y coordinates
    MOV ECX, [EBX]       ; X
    ADD EBX, 4
    MOV EBX, [EBX]       ; Y
    
    ; Draw pixel at (ECX, EBX) - X, Y
    CALL draw_pixel
    
    POP EAX
    ADD EAX, 1
    JMP draw_snake_loop
    
draw_snake_done:
    ; Draw food
    MOV ECX, EDI
    AND ECX, 0xFF        ; X coordinate (low byte)
    MOV EBX, EDI
    SHR EBX, 16          ; Y coordinate (high word)
    AND EBX, 0xFF
    CALL draw_pixel
    
    POP EDI
    POP ECX
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
    
    ; Calculate LCD address: LCD_BASE + (Y * GRID_SIZE + X)
    MOV EAX, EBX
    MOV EDX, GRID_SIZE
    MUL EDX
    ADD EAX, ECX
    MOV EDX, LCD_BASE
    ADD EAX, EDX
    
    ; Set pixel
    MOV [EAX], 1
    
    POP EDX
    POP EAX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Move snake one step in current direction
; ============================================
move_snake:
    PUSH EBP
    MOV EBP, ESP
    PUSH EAX
    PUSH EBX
    PUSH ECX
    
    ; Calculate new head position based on direction
    MOV EAX, EBX         ; Current head X
    MOV EBX, ECX         ; Current head Y
    
    CMP ESI, 0           ; Right?
    JE move_right
    CMP ESI, 1           ; Down?
    JE move_down
    CMP ESI, 2           ; Left?
    JE move_left
    CMP ESI, 3           ; Up?
    JE move_up
    JMP move_done

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
    JMP move_apply

move_apply:
    ; Wrap around edges
    MOD EAX, GRID_SIZE
    MOD EBX, GRID_SIZE
    
    ; Shift body backwards (remove tail, add new head)
    ; Move all segments one position back
    PUSH EDI
    MOV EDI, EDX         ; Length
    SUB EDI, 1           ; Start from second-to-last
    
shift_body:
    CMP EDI, 0
    JE shift_done
    
    ; Copy segment EDI-1 to segment EDI
    PUSH EAX
    PUSH EBX
    
    MOV EAX, EDI
    SUB EAX, 1
    ADD EAX, EAX         ; *2 for X,Y pair
    ADD EAX, EAX         ; *4 for byte offset
    MOV ECX, SNAKE_BODY
    ADD EAX, ECX
    
    MOV EBX, [EAX]       ; Get X of previous segment
    ADD EAX, 4
    MOV ECX, [EAX]       ; Get Y of previous segment
    
    ; Write to current segment
    ADD EAX, 4           ; Move to current segment X
    MOV [EAX], EBX       ; Store X
    ADD EAX, 4
    MOV [EAX], ECX       ; Store Y
    
    POP EBX
    POP EAX
    SUB EDI, 1
    JMP shift_body

shift_done:
    ; Store new head position
    MOV ECX, SNAKE_BODY
    MOV [ECX], EAX       ; New head X
    ADD ECX, 4
    MOV [ECX], EBX       ; New head Y
    
    ; Update global head coordinates
    MOV EAX, SNAKE_BODY
    MOV EBX, [EAX]       ; EBX = new head X
    ADD EAX, 4
    MOV ECX, [EAX]       ; ECX = new head Y
    
    POP EDI

move_done:
    POP ECX
    POP EBX
    POP EAX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Check for collision (with self or walls)
; Returns: EAX=1 if collision, EAX=0 if safe
; ============================================
check_collision:
    PUSH EBP
    MOV EBP, ESP
    PUSH EBX
    PUSH ECX
    
    ; Get head position
    MOV EAX, SNAKE_BODY
    MOV EBX, [EAX]       ; Head X
    ADD EAX, 4
    PUSH EAX
    MOV EAX, [EAX]       ; Head Y
    PUSH EAX             ; Save head Y
    
    ; Check if head hit body (skip first segment)
    PUSH EDI
    MOV EDI, 1           ; Start from segment 1
    
check_body_loop:
    CMP EDI, EDX         ; Compare with length
    JE no_collision
    
    ; Get segment position
    PUSH EAX
    PUSH EBX
    MOV EAX, EDI
    ADD EAX, EAX         ; *2 for X,Y pair
    ADD EAX, EAX         ; *4 for byte offset
    MOV ECX, SNAKE_BODY
    ADD EAX, ECX
    MOV ECX, [EAX]       ; Segment X
    ADD EAX, 4
    MOV EAX, [EAX]       ; Segment Y
    
    ; Compare with head
    POP EBX              ; Restore head X
    CMP ECX, EBX
    PUSH EBX
    JNE not_this_segment
    MOV EBX, [ESP+8]     ; Get saved head Y from stack
    CMP EAX, EBX
    JNE not_this_segment
    
    ; Collision detected!
    POP EBX
    POP EAX
    POP EDI
    ADD ESP, 8           ; Clean up saved head coords
    MOV EAX, 1
    JMP collision_done

not_this_segment:
    POP EBX
    POP EAX
    ADD EDI, 1
    JMP check_body_loop

no_collision:
    POP EDI
    ADD ESP, 8           ; Clean up saved head coords
    MOV EAX, 0

collision_done:
    POP ECX
    POP EBX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Check if food is eaten
; Returns: EAX=1 if eaten, EAX=0 if not
; ============================================
check_food:
    PUSH EBP
    MOV EBP, ESP
    PUSH EBX
    PUSH ECX
    
    ; Get head position
    MOV EAX, SNAKE_BODY
    MOV EBX, [EAX]       ; Head X
    ADD EAX, 4
    MOV ECX, [EAX]       ; Head Y
    
    ; Get food position
    PUSH EDI
    MOV EAX, EDI
    AND EAX, 0xFF        ; Food X
    
    CMP EBX, EAX
    JNE food_not_eaten
    
    MOV EAX, EDI
    SHR EAX, 16
    AND EAX, 0xFF        ; Food Y
    
    CMP ECX, EAX
    JNE food_not_eaten
    
    ; Food eaten!
    POP EDI
    MOV EAX, 1
    JMP food_check_done

food_not_eaten:
    POP EDI
    MOV EAX, 0

food_check_done:
    POP ECX
    POP EBX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Spawn food at random location
; ============================================
spawn_food:
    PUSH EBP
    MOV EBP, ESP
    PUSH EAX
    PUSH EBX
    
    ; Generate random X (0-63)
    RAND EAX, GRID_SIZE
    MOV EBX, EAX
    
    ; Generate random Y (0-63)
    RAND EAX, GRID_SIZE
    SHL EAX, 16          ; Shift Y to high word
    OR EAX, EBX          ; Combine with X in low byte
    
    MOV EDI, EAX         ; Store in EDI
    
    POP EBX
    POP EAX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Check keyboard input and update direction
; ============================================
check_input:
    PUSH EBP
    MOV EBP, ESP
    PUSH EAX
    PUSH EBX
    
    ; Check if key available
    MOV EAX, [KB_STATUS]
    CMP EAX, 0
    JE no_input
    
    ; Read key code
    MOV EAX, [KB_KEYCODE]
    
    ; Check key state (only process key press)
    MOV EBX, [KB_STATE]
    CMP EBX, 1
    JNE no_input
    
    ; Check which key
    CMP EAX, KEY_UP
    JE input_up
    CMP EAX, KEY_DOWN
    JE input_down
    CMP EAX, KEY_LEFT
    JE input_left
    CMP EAX, KEY_RIGHT
    JE input_right
    JMP no_input

input_up:
    ; Don't allow reversing
    CMP ESI, 1           ; Currently going down?
    JE drain_input_queue
    MOV ESI, 3
    JMP drain_input_queue

input_down:
    CMP ESI, 3           ; Currently going up?
    JE drain_input_queue
    MOV ESI, 1
    JMP drain_input_queue

input_left:
    CMP ESI, 0           ; Currently going right?
    JE drain_input_queue
    MOV ESI, 2
    JMP drain_input_queue

input_right:
    CMP ESI, 2           ; Currently going left?
    JE drain_input_queue
    MOV ESI, 0

    ; Fall through to drain queue

drain_input_queue:
    ; Drain remaining keyboard events (release + any extras)
    MOV EAX, [KB_STATUS]
    CMP EAX, 0
    JE no_input
    MOV EAX, [KB_KEYCODE]  ; Pop event
    JMP drain_input_queue

no_input:
    POP EBX
    POP EAX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Wait for SPACE key press
; ============================================
wait_for_space:
    PUSH EBP
    MOV EBP, ESP
    PUSH EAX
    PUSH EBX
    
wait_space_loop:
    MOV EAX, [KB_STATUS]
    CMP EAX, 0
    JE wait_space_loop
    
    MOV EAX, [KB_KEYCODE]
    MOV EBX, [KB_STATE]
    
    CMP EAX, KEY_SPACE
    JNE wait_space_loop
    CMP EBX, 1           ; Press event
    JNE wait_space_loop
    
    ; Drain remaining keyboard events
drain_space_queue:
    MOV EAX, [KB_STATUS]
    CMP EAX, 0
    JE space_queue_empty
    MOV EAX, [KB_KEYCODE]  ; Pop event
    JMP drain_space_queue
    
space_queue_empty:
    POP EBX
    POP EAX
    MOV ESP, EBP
    POP EBP
    RET

; ============================================
; Game delay (simple loop)
; ============================================
game_delay:
    PUSH EBP
    MOV EBP, ESP
    PUSH EAX
    
    MOV EAX, 50000       ; Delay counter
delay_loop:
    SUB EAX, 1
    CMP EAX, 0
    JNE delay_loop
    
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
    PUSH ECX
    
    MOV ECX, 3           ; Flash 3 times
flash_loop:
    ; Fill screen
    MOV EAX, LCD_BASE
    MOV EBX, 4096
fill_loop:
    MOV [EAX], 1
    ADD EAX, 1
    SUB EBX, 1
    CMP EBX, 0
    JNE fill_loop
    
    ; Delay
    PUSH ECX
    MOV EAX, 100000
delay1:
    SUB EAX, 1
    CMP EAX, 0
    JNE delay1
    POP ECX
    
    ; Clear screen
    CALL clear_lcd
    
    ; Delay
    PUSH ECX
    MOV EAX, 100000
delay2:
    SUB EAX, 1
    CMP EAX, 0
    JNE delay2
    POP ECX
    
    SUB ECX, 1
    CMP ECX, 0
    JNE flash_loop
    
    POP ECX
    POP EBX
    POP EAX
    MOV ESP, EBP
    POP EBP
    RET
