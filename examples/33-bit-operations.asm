; Test 33: Bit Scan and Byte Swap
; Tests: BSF, BSR, BSWAP, XADD
; Expected: See comments for each operation

main:
    ; --- BSF: Bit Scan Forward (find lowest set bit) ---
    MOV EBX, 0x30      ; Binary: 0011 0000 -> lowest set bit is bit 4
    BSF EAX, EBX       ; EAX = 4

    MOV EBX, 1         ; Binary: 0000 0001 -> lowest set bit is bit 0
    BSF EAX, EBX       ; EAX = 0

    MOV EBX, 0x8000    ; Binary: 1000 0000 0000 0000 -> bit 15
    BSF EAX, EBX       ; EAX = 15

    ; BSF with zero sets ZF
    MOV EBX, 0
    BSF EAX, EBX       ; ZF=1, EAX unchanged

    ; --- BSR: Bit Scan Reverse (find highest set bit) ---
    MOV EBX, 0x30      ; Binary: 0011 0000 -> highest set bit is bit 5
    BSR EAX, EBX       ; EAX = 5

    MOV EBX, 0xFF      ; Binary: 1111 1111 -> highest set bit is bit 7
    BSR EAX, EBX       ; EAX = 7

    MOV EBX, 0x80000000 ; Bit 31 set
    BSR EAX, EBX       ; EAX = 31

    ; --- BSWAP: Byte order reversal ---
    MOV EAX, 0x12345678
    BSWAP EAX           ; EAX = 0x78563412

    MOV EBX, 0xAABBCCDD
    BSWAP EBX           ; EBX = 0xDDCCBBAA

    MOV ECX, 0x00FF0000
    BSWAP ECX           ; ECX = 0x0000FF00

    ; Double BSWAP restores original
    MOV EDX, 0xDEADBEEF
    BSWAP EDX           ; EDX = 0xEFBEADDE
    BSWAP EDX           ; EDX = 0xDEADBEEF (back to original)

    ; --- XADD: Exchange and Add ---
    MOV EAX, 10        ; Destination
    MOV EBX, 20        ; Source
    XADD EAX, EBX      ; EAX = 10+20 = 30, EBX = 10 (old EAX)

    ; XADD is useful for atomic fetch-and-add patterns
    MOV ECX, 100
    MOV EDX, 1
    XADD ECX, EDX      ; ECX = 101, EDX = 100 (old value)

    HLT
