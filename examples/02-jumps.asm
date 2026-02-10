; Test 2: Conditional Jumps
; Tests: CMP, JE, JNE, JMP
; Expected: EAX=1 (equals path taken)

main:
    MOV EAX, 5
    MOV EBX, 5
    CMP EAX, EBX
    JNE not_equal      ; Should NOT jump (they're equal)
    
equals:
    MOV EAX, 1         ; This should execute
    JMP done
    
not_equal:
    MOV EAX, 0         ; This should NOT execute
    
done:
    HLT
