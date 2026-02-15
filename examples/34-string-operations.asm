; Test 34: String Operations
; Tests: LODSB, STOSB, MOVSB, SCASB, CMPSB
; Expected: String copied, searched, and compared

main:
    ; === Setup: Write "HELLO" to memory using STOSB ===
    MOV EDI, 0x100     ; Destination address
    MOV EAX, 72        ; 'H'
    STOSB
    MOV EAX, 69        ; 'E'
    STOSB
    MOV EAX, 76        ; 'L'
    STOSB
    MOV EAX, 76        ; 'L'
    STOSB
    MOV EAX, 79        ; 'O'
    STOSB               ; EDI now at 0x105

    ; --- LODSB: Load bytes from [ESI] into AL ---
    MOV ESI, 0x100     ; Point to source string
    LODSB               ; AL = 72 ('H'), ESI = 0x101
    LODSB               ; AL = 69 ('E'), ESI = 0x102
    LODSB               ; AL = 76 ('L'), ESI = 0x103

    ; --- STOSB: Store AL to new location ---
    MOV EDI, 0x200     ; Point to destination
    MOV EAX, 65        ; 'A'
    STOSB               ; [0x200] = 65, EDI = 0x201
    MOV EAX, 66        ; 'B'
    STOSB               ; [0x201] = 66, EDI = 0x202
    MOV EAX, 67        ; 'C'
    STOSB               ; [0x202] = 67, EDI = 0x203

    ; --- MOVSB: Copy byte from [ESI] to [EDI] ---
    ; Copy "HELLO" from 0x100 to 0x300
    MOV ESI, 0x100     ; Source
    MOV EDI, 0x300     ; Destination
    MOV ECX, 5         ; Byte count

copy_loop:
    MOVSB               ; [EDI] = [ESI]; ESI++; EDI++
    LOOP copy_loop      ; Repeat 5 times

    ; --- SCASB: Search for 'L' in copied string ---
    MOV EDI, 0x300
    MOV EAX, 76        ; 'L' to search for
    MOV ECX, 5

scan_loop:
    SCASB               ; Compare AL with [EDI], set flags, EDI++
    JE found            ; Jump if match (ZF=1)
    LOOP scan_loop
    JMP not_found

found:
    MOV EBX, 1         ; Found flag
    JMP compare_test

not_found:
    MOV EBX, 0

compare_test:
    ; --- CMPSB: Compare original with copy ---
    MOV ESI, 0x100     ; Original string
    MOV EDI, 0x300     ; Copy (should be identical)
    MOV ECX, 5

cmp_loop:
    CMPSB               ; Compare [ESI] with [EDI], set flags
    JNE strings_differ
    LOOP cmp_loop

    MOV EAX, 1         ; Strings are equal
    JMP done

strings_differ:
    MOV EAX, 0         ; Strings differ

done:
    HLT
