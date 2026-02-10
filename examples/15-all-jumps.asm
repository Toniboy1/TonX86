; Test 15: All Jump Instructions
; Tests: JMP, JE/JZ, JNE/JNZ, conditional jumps with flags
; Expected: EAX=100 (all paths tested)

main:
    ; Test unconditional jump
    MOV EAX, 0
    JMP test_je
    MOV EAX, 99        ; Should skip this

test_je:
    ; Test JE (Jump if Equal/Zero)
    MOV EBX, 5
    CMP EBX, 5         ; Sets Z flag
    JE je_taken        ; Should jump
    MOV EAX, 1         ; Should skip
    JMP test_jne

je_taken:
    ADD EAX, 10        ; EAX = 10

test_jne:
    ; Test JNE (Jump if Not Equal/Not Zero)
    MOV ECX, 3
    CMP ECX, 5         ; Z flag = 0
    JNE jne_taken      ; Should jump
    MOV EAX, 2         ; Should skip
    JMP done

jne_taken:
    ADD EAX, 90        ; EAX = 100

done:
    HLT                ; EAX should be 100
