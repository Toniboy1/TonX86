/**
 * TonX86 LCD Display - supports 2x2 to 256x256 grids
 */
export class LCDDisplay {
  private width: number;
  private height: number;
  private pixels: Uint8Array;

  constructor(width: number = 8, height: number = 8) {
    if (width < 2 || width > 256 || height < 2 || height > 256) {
      throw new Error("LCD dimensions must be between 2x2 and 256x256");
    }
    // Check if width and height are powers of 2
    const isPowerOf2 = (n: number) => n > 0 && (n & (n - 1)) === 0;
    if (!isPowerOf2(width) || !isPowerOf2(height)) {
      throw new Error("LCD dimensions must be powers of 2");
    }
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height);
  }

  getPixel(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return 0;
    }
    return this.pixels[y * this.width + x];
  }

  setPixel(x: number, y: number, value: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    this.pixels[y * this.width + x] = value ? 1 : 0;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  clear(): void {
    this.pixels.fill(0);
  }

  getDisplay(): Uint8Array {
    return new Uint8Array(this.pixels);
  }
}
