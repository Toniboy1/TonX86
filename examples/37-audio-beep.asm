; Audio Beep Example - Demonstrates PC Speaker style audio
; This example plays various tones using the memory-mapped audio device
; All sounds play sequentially without manual intervention
; Audio I/O Map:
;   0x10200 - AUDIO_CTRL    (bit 0: 0=stop, 1=play)
;   0x10201 - AUDIO_WAVE    (0=square, 1=sine)
;   0x10202 - AUDIO_FREQ_LO (frequency Hz, low byte)
;   0x10203 - AUDIO_FREQ_HI (frequency Hz, high byte)
;   0x10204 - AUDIO_DUR_LO  (duration ms, low byte)
;   0x10205 - AUDIO_DUR_HI  (duration ms, high byte)
;   0x10206 - AUDIO_VOLUME  (0-255)

; Constants for audio I/O addresses
AUDIO_CTRL:   EQU 0x10200
AUDIO_WAVE:   EQU 0x10201
AUDIO_FREQ_LO: EQU 0x10202
AUDIO_FREQ_HI: EQU 0x10203
AUDIO_DUR_LO:  EQU 0x10204
AUDIO_DUR_HI:  EQU 0x10205
AUDIO_VOLUME:  EQU 0x10206

; Musical note frequencies (Hz)
NOTE_A4:  EQU 440   ; A4 (concert pitch)
NOTE_C5:  EQU 523   ; C5
NOTE_E5:  EQU 659   ; E5
NOTE_G5:  EQU 784   ; G5

; Example 1: Simple beep at 440 Hz (A4) for 300ms
MOV [AUDIO_WAVE], 0             ; Square wave
MOV [AUDIO_FREQ_LO], 0xB8       ; 440 Hz low byte (184)
MOV [AUDIO_FREQ_HI], 0x01       ; 440 Hz high byte (1)
MOV [AUDIO_DUR_LO], 0x2C        ; 300 ms low byte (44)
MOV [AUDIO_DUR_HI], 0x01        ; 300 ms high byte (1)
MOV [AUDIO_VOLUME], 200         ; Volume 200/255
MOV [AUDIO_CTRL], 1             ; Play sound
MOV [AUDIO_CTRL], 0             ; Reset for next sound

; Example 2: Sine wave at 523 Hz (C5) for 500ms
MOV [AUDIO_WAVE], 1             ; Sine wave
MOV EAX, NOTE_C5
MOV [AUDIO_FREQ_LO], AL         ; Low byte of frequency
SHR EAX, 8
MOV [AUDIO_FREQ_HI], AL         ; High byte of frequency
MOV [AUDIO_DUR_LO], 0xF4        ; 500 ms low byte (244)
MOV [AUDIO_DUR_HI], 0x01        ; 500 ms high byte (1)
MOV [AUDIO_VOLUME], 150         ; Volume 150/255
MOV [AUDIO_CTRL], 1             ; Play sound
MOV [AUDIO_CTRL], 0             ; Reset for next sound

; Example 3: Play a simple melody (C-E-G arpeggio)
; Note C5 - 200ms
MOV [AUDIO_WAVE], 0             ; Square wave
MOV EAX, NOTE_C5
MOV [AUDIO_FREQ_LO], AL
SHR EAX, 8
MOV [AUDIO_FREQ_HI], AL
MOV [AUDIO_DUR_LO], 0xC8        ; 200 ms
MOV [AUDIO_DUR_HI], 0x00
MOV [AUDIO_VOLUME], 180
MOV [AUDIO_CTRL], 1             ; Play C5
MOV [AUDIO_CTRL], 0             ; Reset for next sound

; Note E5 - 200ms (reuse duration settings)
MOV EAX, NOTE_E5
MOV [AUDIO_FREQ_LO], AL
SHR EAX, 8
MOV [AUDIO_FREQ_HI], AL
MOV [AUDIO_CTRL], 1             ; Play E5
MOV [AUDIO_CTRL], 0             ; Reset for next sound

; Note G5 - 200ms (reuse duration settings)
MOV EAX, NOTE_G5
MOV [AUDIO_FREQ_LO], AL
SHR EAX, 8
MOV [AUDIO_FREQ_HI], AL
MOV [AUDIO_CTRL], 1             ; Play G5
MOV [AUDIO_CTRL], 0             ; Reset for next sound

; Example 4: Low volume test (25/255) - 300ms
MOV [AUDIO_WAVE], 1             ; Sine wave
MOV EAX, NOTE_A4
MOV [AUDIO_FREQ_LO], AL
SHR EAX, 8
MOV [AUDIO_FREQ_HI], AL
MOV [AUDIO_DUR_LO], 0x2C        ; 300 ms
MOV [AUDIO_DUR_HI], 0x01
MOV [AUDIO_VOLUME], 25          ; Low volume
MOV [AUDIO_CTRL], 1             ; Play sound
MOV [AUDIO_CTRL], 0             ; Reset for next sound

; Example 5: High frequency beep (1000 Hz) - 100ms
MOV [AUDIO_WAVE], 0             ; Square wave
MOV [AUDIO_FREQ_LO], 0xE8       ; 1000 Hz low byte (232)
MOV [AUDIO_FREQ_HI], 0x03       ; 1000 Hz high byte (3)
MOV [AUDIO_DUR_LO], 0x64        ; 100 ms low byte (100)
MOV [AUDIO_DUR_HI], 0x00        ; 100 ms high byte (0)
MOV [AUDIO_VOLUME], 200
MOV [AUDIO_CTRL], 1             ; Play sound

; All examples complete
HLT
