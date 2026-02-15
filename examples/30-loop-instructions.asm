; Test 30: Loop Instructions
; Tests: LOOP, LOOPE/LOOPZ, LOOPNE/LOOPNZ
; Expected: EAX=55 after sum loop

main:
    ; --- LOOP: Simple counted loop ---
    ; Sum 1+2+3+...+10 using LOOP
    MOV EAX, 0         ; Accumulator
    MOV EBX, 0         ; Counter value to add
    MOV ECX, 10        ; Loop count

sum_loop:
    ADD EBX, 1          ; Increment value
    ADD EAX, EBX        ; Add to sum
    LOOP sum_loop       ; Decrement ECX, jump if ECX != 0
    ; EAX = 55 (sum of 1..10), ECX = 0

    ; --- LOOPNE: Search for a matching value ---
    ; Compare register values in a loop to find target
    MOV ECX, 5          ; Max iterations
    MOV EDX, 0          ; Counter

search_loop:
    ADD EDX, 1          ; EDX = 1, 2, 3, 4, 5
    CMP EDX, 3          ; Are we at value 3?
    LOOPNE search_loop  ; Continue if not found (ZF=0) and ECX > 0
    ; After: EDX=3, ZF=1 (found), ECX=2

    ; --- LOOPE: Continue while values match ---
    MOV ECX, 5          ; Max iterations
    MOV ESI, 10         ; Value to compare

skip_loop:
    CMP ESI, 10         ; Compare ESI with 10
    LOOPE skip_loop     ; Continue while equal (ZF=1) and ECX > 0
    ; ECX will reach 0 since ESI always equals 10

    HLT
