/**
 * TonX86 Audio Device - PC Speaker style audio support
 *
 * Memory Map:
 * - 0x10200: AUDIO_CTRL    (bit 0: 0=stop, 1=play)
 * - 0x10201: AUDIO_WAVE    (0=square, 1=sine)
 * - 0x10202: AUDIO_FREQ_LO (frequency Hz, low byte)
 * - 0x10203: AUDIO_FREQ_HI (frequency Hz, high byte)
 * - 0x10204: AUDIO_DUR_LO  (duration ms, low byte)
 * - 0x10205: AUDIO_DUR_HI  (duration ms, high byte)
 * - 0x10206: AUDIO_VOLUME  (0-255)
 */
export interface AudioEvent {
  frequency: number;
  duration: number;
  waveform: "square" | "sine";
  volume: number;
}

export class AudioDevice {
  private ctrl: number = 0; // 0 = stopped, 1 = playing
  private waveform: number = 0; // 0 = square, 1 = sine
  private frequencyHz: number = 440; // Default A4 note
  private durationMs: number = 100; // Default 100ms
  private volume: number = 128; // Default mid volume (0-255)

  /**
   * Write to an audio register
   */
  write(offset: number, value: number): AudioEvent | null {
    switch (offset) {
      case 0: // AUDIO_CTRL
        {
          const wasOff = this.ctrl === 0;
          this.ctrl = value & 1;
          // Emit event when transitioning from off to on
          if (wasOff && this.ctrl === 1) {
            return this.generateEvent();
          }
        }
        break;
      case 1: // AUDIO_WAVE
        this.waveform = value & 1;
        break;
      case 2: // AUDIO_FREQ_LO
        this.frequencyHz = (this.frequencyHz & 0xff00) | (value & 0xff);
        break;
      case 3: // AUDIO_FREQ_HI
        this.frequencyHz = (this.frequencyHz & 0x00ff) | ((value & 0xff) << 8);
        break;
      case 4: // AUDIO_DUR_LO
        this.durationMs = (this.durationMs & 0xff00) | (value & 0xff);
        break;
      case 5: // AUDIO_DUR_HI
        this.durationMs = (this.durationMs & 0x00ff) | ((value & 0xff) << 8);
        break;
      case 6: // AUDIO_VOLUME
        this.volume = value & 0xff;
        break;
    }
    return null;
  }

  /**
   * Read from an audio register
   */
  read(offset: number): number {
    switch (offset) {
      case 0: // AUDIO_CTRL
        return this.ctrl;
      case 1: // AUDIO_WAVE
        return this.waveform;
      case 2: // AUDIO_FREQ_LO
        return this.frequencyHz & 0xff;
      case 3: // AUDIO_FREQ_HI
        return (this.frequencyHz >> 8) & 0xff;
      case 4: // AUDIO_DUR_LO
        return this.durationMs & 0xff;
      case 5: // AUDIO_DUR_HI
        return (this.durationMs >> 8) & 0xff;
      case 6: // AUDIO_VOLUME
        return this.volume;
      default:
        return 0;
    }
  }

  /**
   * Get current control state
   */
  getControl(): number {
    return this.ctrl;
  }

  /**
   * Generate an audio event with current settings
   */
  private generateEvent(): AudioEvent {
    return {
      frequency: this.frequencyHz,
      duration: this.durationMs,
      waveform: this.waveform === 0 ? "square" : "sine",
      volume: this.volume / 255.0, // Normalize to 0.0-1.0
    };
  }

  /**
   * Clear device state
   */
  clear(): void {
    this.ctrl = 0;
    this.waveform = 0;
    this.frequencyHz = 440;
    this.durationMs = 100;
    this.volume = 128;
  }
}
