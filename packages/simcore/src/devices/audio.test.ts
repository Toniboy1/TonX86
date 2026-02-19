import { AudioDevice } from "./audio";

describe("AudioDevice", () => {
  let audio: AudioDevice;

  beforeEach(() => {
    audio = new AudioDevice();
  });

  describe("initialization", () => {
    test("initializes with default values", () => {
      expect(audio.read(0)).toBe(0); // CTRL = off
      expect(audio.read(1)).toBe(0); // WAVE = square
      expect(audio.read(2)).toBe(440 & 0xff); // FREQ_LO
      expect(audio.read(3)).toBe((440 >> 8) & 0xff); // FREQ_HI
      expect(audio.read(4)).toBe(100 & 0xff); // DUR_LO
      expect(audio.read(5)).toBe((100 >> 8) & 0xff); // DUR_HI
      expect(audio.read(6)).toBe(128); // VOLUME
    });

    test("getControl returns initial state", () => {
      expect(audio.getControl()).toBe(0);
    });
  });

  describe("control register (offset 0)", () => {
    test("writing 1 to CTRL triggers audio event", () => {
      const event = audio.write(0, 1);
      expect(event).not.toBeNull();
      expect(event?.frequency).toBe(440);
      expect(event?.duration).toBe(100);
      expect(event?.waveform).toBe("square");
      expect(event?.volume).toBeCloseTo(128 / 255);
    });

    test("writing 0 to CTRL stops audio without event", () => {
      audio.write(0, 1); // Start
      const event = audio.write(0, 0); // Stop
      expect(event).toBeNull();
      expect(audio.read(0)).toBe(0);
    });

    test("writing 1 again when already playing does not trigger event", () => {
      audio.write(0, 1); // First play
      const event = audio.write(0, 1); // Already playing
      expect(event).toBeNull();
    });

    test("toggling from 0 to 1 triggers event each time", () => {
      const event1 = audio.write(0, 1);
      expect(event1).not.toBeNull();

      audio.write(0, 0); // Stop
      const event2 = audio.write(0, 1); // Play again
      expect(event2).not.toBeNull();
    });

    test("reading CTRL returns current state", () => {
      audio.write(0, 1);
      expect(audio.read(0)).toBe(1);
      audio.write(0, 0);
      expect(audio.read(0)).toBe(0);
    });
  });

  describe("waveform register (offset 1)", () => {
    test("writing 0 sets square wave", () => {
      audio.write(1, 0);
      expect(audio.read(1)).toBe(0);
      const event = audio.write(0, 1);
      expect(event?.waveform).toBe("square");
    });

    test("writing 1 sets sine wave", () => {
      audio.write(1, 1);
      expect(audio.read(1)).toBe(1);
      const event = audio.write(0, 1);
      expect(event?.waveform).toBe("sine");
    });

    test("only stores bit 0", () => {
      audio.write(1, 0xff);
      expect(audio.read(1)).toBe(1);
    });
  });

  describe("frequency registers (offset 2-3)", () => {
    test("setting frequency low byte", () => {
      audio.write(2, 0xb8); // 184 decimal
      expect(audio.read(2)).toBe(0xb8);
      expect(audio.read(3)).toBe((440 >> 8) & 0xff); // High byte unchanged
    });

    test("setting frequency high byte", () => {
      audio.write(3, 0x01);
      expect(audio.read(3)).toBe(0x01);
      expect(audio.read(2)).toBe(440 & 0xff); // Low byte unchanged
    });

    test("setting 16-bit frequency (440 Hz)", () => {
      audio.write(2, 440 & 0xff); // Low byte = 0xB8
      audio.write(3, (440 >> 8) & 0xff); // High byte = 0x01
      const event = audio.write(0, 1);
      expect(event?.frequency).toBe(440);
    });

    test("setting 16-bit frequency (1000 Hz)", () => {
      audio.write(2, 1000 & 0xff); // Low byte = 0xE8
      audio.write(3, (1000 >> 8) & 0xff); // High byte = 0x03
      const event = audio.write(0, 1);
      expect(event?.frequency).toBe(1000);
    });

    test("setting frequency 0 Hz", () => {
      audio.write(2, 0);
      audio.write(3, 0);
      const event = audio.write(0, 1);
      expect(event?.frequency).toBe(0);
    });

    test("setting frequency 65535 Hz (max uint16)", () => {
      audio.write(2, 0xff);
      audio.write(3, 0xff);
      const event = audio.write(0, 1);
      expect(event?.frequency).toBe(65535);
    });
  });

  describe("duration registers (offset 4-5)", () => {
    test("setting duration low byte", () => {
      audio.write(4, 0x2c); // 44 decimal
      expect(audio.read(4)).toBe(0x2c);
      expect(audio.read(5)).toBe((100 >> 8) & 0xff); // High byte unchanged
    });

    test("setting duration high byte", () => {
      audio.write(5, 0x01);
      expect(audio.read(5)).toBe(0x01);
      expect(audio.read(4)).toBe(100 & 0xff); // Low byte unchanged
    });

    test("setting 16-bit duration (300 ms)", () => {
      audio.write(4, 300 & 0xff); // Low byte = 0x2C
      audio.write(5, (300 >> 8) & 0xff); // High byte = 0x01
      const event = audio.write(0, 1);
      expect(event?.duration).toBe(300);
    });

    test("setting duration 0 ms", () => {
      audio.write(4, 0);
      audio.write(5, 0);
      const event = audio.write(0, 1);
      expect(event?.duration).toBe(0);
    });

    test("setting duration 5000 ms", () => {
      audio.write(4, 5000 & 0xff);
      audio.write(5, (5000 >> 8) & 0xff);
      const event = audio.write(0, 1);
      expect(event?.duration).toBe(5000);
    });
  });

  describe("volume register (offset 6)", () => {
    test("setting volume to 0 (silent)", () => {
      audio.write(6, 0);
      expect(audio.read(6)).toBe(0);
      const event = audio.write(0, 1);
      expect(event?.volume).toBe(0);
    });

    test("setting volume to 255 (max)", () => {
      audio.write(6, 255);
      expect(audio.read(6)).toBe(255);
      const event = audio.write(0, 1);
      expect(event?.volume).toBe(1.0);
    });

    test("setting volume to 200", () => {
      audio.write(6, 200);
      expect(audio.read(6)).toBe(200);
      const event = audio.write(0, 1);
      expect(event?.volume).toBeCloseTo(200 / 255);
    });

    test("volume is normalized to 0.0-1.0 range", () => {
      audio.write(6, 128);
      const event = audio.write(0, 1);
      expect(event?.volume).toBeCloseTo(0.502, 3);
    });
  });

  describe("complete audio event", () => {
    test("generates correct event with all parameters", () => {
      // Set frequency to 880 Hz (A5)
      audio.write(2, 880 & 0xff);
      audio.write(3, (880 >> 8) & 0xff);

      // Set duration to 500 ms
      audio.write(4, 500 & 0xff);
      audio.write(5, (500 >> 8) & 0xff);

      // Set sine wave
      audio.write(1, 1);

      // Set volume to 200
      audio.write(6, 200);

      // Trigger play
      const event = audio.write(0, 1);

      expect(event).not.toBeNull();
      expect(event?.frequency).toBe(880);
      expect(event?.duration).toBe(500);
      expect(event?.waveform).toBe("sine");
      expect(event?.volume).toBeCloseTo(200 / 255);
    });

    test("example from issue #84", () => {
      // MOV [0x10201], 0      ; Square wave
      audio.write(1, 0);

      // MOV [0x10202], 0xB8   ; Freq low = 184
      audio.write(2, 0xb8);

      // MOV [0x10203], 0x01   ; Freq high = 1 -> 440 Hz
      audio.write(3, 0x01);

      // MOV [0x10204], 0x2C   ; Duration low = 44
      audio.write(4, 0x2c);

      // MOV [0x10205], 0x01   ; Duration high = 1 -> 300 ms
      audio.write(5, 0x01);

      // MOV [0x10206], 200    ; Volume = 200
      audio.write(6, 200);

      // MOV [0x10200], 1      ; Play
      const event = audio.write(0, 1);

      expect(event).not.toBeNull();
      expect(event?.frequency).toBe(440);
      expect(event?.duration).toBe(300);
      expect(event?.waveform).toBe("square");
      expect(event?.volume).toBeCloseTo(200 / 255);
    });
  });

  describe("clear", () => {
    test("resets all registers to defaults", () => {
      // Set non-default values
      audio.write(0, 1);
      audio.write(1, 1);
      audio.write(2, 0xff);
      audio.write(3, 0xff);
      audio.write(4, 0xff);
      audio.write(5, 0xff);
      audio.write(6, 0xff);

      // Clear
      audio.clear();

      // Check defaults restored
      expect(audio.read(0)).toBe(0);
      expect(audio.read(1)).toBe(0);
      expect(audio.read(2)).toBe(440 & 0xff);
      expect(audio.read(3)).toBe((440 >> 8) & 0xff);
      expect(audio.read(4)).toBe(100 & 0xff);
      expect(audio.read(5)).toBe((100 >> 8) & 0xff);
      expect(audio.read(6)).toBe(128);
    });
  });

  describe("invalid offsets", () => {
    test("reading invalid offset returns 0", () => {
      expect(audio.read(7)).toBe(0);
      expect(audio.read(100)).toBe(0);
      expect(audio.read(-1)).toBe(0);
    });

    test("writing to invalid offset does not crash", () => {
      expect(() => audio.write(7, 123)).not.toThrow();
      expect(() => audio.write(100, 123)).not.toThrow();
      expect(() => audio.write(-1, 123)).not.toThrow();
    });
  });
});
