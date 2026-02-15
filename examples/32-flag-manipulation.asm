; Test 32: Flag Manipulation (LAHF / SAHF)
; Tests: LAHF, SAHF - saving and restoring flags via AH
; Expected: Flags preserved and restored across operations

main:
    ; --- LAHF: Save flags to AH ---

    ; Set up known flags: ZF=1 by comparing equal values
    MOV EBX, 42
    CMP EBX, 42        ; ZF=1, SF=0, CF=0

    LAHF                ; AH = flags snapshot (ZF set)
    ; AH now holds: bit7=SF, bit6=ZF, bit0=CF

    ; Do some operations that change flags
    MOV ECX, 100
    SUB ECX, 200       ; Changes flags: CF=1, SF=1, ZF=0

    ; --- SAHF: Restore flags from AH ---
    SAHF                ; Restore original flags from AH
    ; ZF=1 again (as saved), SF=0, CF=0

    ; Verify ZF is restored by using a conditional jump
    JE flags_restored   ; Should jump because ZF=1 was restored

    ; tonx86-disable-next-line
    MOV EAX, 0         ; Should not reach here
    JMP done

flags_restored:
    MOV EAX, 1         ; Success: flags were properly restored

    ; --- Round-trip: save SF ---
    MOV EDX, -5
    TEST EDX, EDX      ; SF=1 (negative)
    LAHF                ; Save SF=1 into AH

    MOV EDX, 10
    TEST EDX, EDX      ; SF=0 (positive) - flags changed

    SAHF                ; Restore SF=1
    ; Sign flag is now set again

done:
    HLT
