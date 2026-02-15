; Test 29: Rotate Through Carry (RCL / RCR)
; Tests: RCL, RCR with immediate and register counts
; Expected: see comments for each operation

main:
    ; --- RCL: Rotate Left through Carry ---

    ; Simple RCL by 1, carry starts clear after MOV
    MOV EAX, 0x80000000 ; MSB set
    RCL EAX, 1           ; MSB -> CF, old CF(0) -> LSB => EAX=0x00000000, CF=1

    ; RCL by 1 when carry was set from previous RCL
    MOV EBX, 0x00000000
    RCL EBX, 1           ; CF(1) flows into LSB => EBX=0x00000001, CF=0

    ; RCL by multiple positions
    MOV ECX, 1
    RCL ECX, 4           ; Rotate left 4 through carry

    ; --- RCR: Rotate Right through Carry ---

    ; Simple RCR by 1
    MOV EDX, 0x00000001 ; LSB set
    RCR EDX, 1           ; LSB -> CF, old CF -> MSB

    ; RCR by 1 when previous op set carry
    MOV ESI, 0x00000000
    RCR ESI, 1           ; CF from previous op flows into MSB

    ; RCR with register count
    MOV EDI, 0x10
    MOV ECX, 4
    RCR EDI, CL          ; Rotate right by 4 through carry

    ; Chain: RCL sets carry, next RCR uses it
    MOV EAX, 0x80000000 ; MSB=1
    RCL EAX, 1           ; CF=1 (from MSB), EAX=0
    MOV EBX, 0
    RCR EBX, 1           ; CF(1) -> MSB => EBX=0x80000000

    HLT
