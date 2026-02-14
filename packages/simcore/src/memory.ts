/**
 * TonX86 Memory - supports two separate memory banks (A and B)
 */
export class Memory {
  private bankA: Uint8Array;
  private bankB: Uint8Array;

  constructor(size = 65536) {
    this.bankA = new Uint8Array(size);
    this.bankB = new Uint8Array(size);
  }

  readA(address: number): number {
    return this.bankA[address] || 0;
  }

  writeA(address: number, value: number): void {
    this.bankA[address] = value & 0xff;
  }

  readB(address: number): number {
    return this.bankB[address] || 0;
  }

  writeB(address: number, value: number): void {
    this.bankB[address] = value & 0xff;
  }

  clear(): void {
    this.bankA.fill(0);
    this.bankB.fill(0);
  }
}
