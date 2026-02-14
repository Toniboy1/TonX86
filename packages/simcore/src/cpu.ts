/**
 * TonX86 CPU State - single-threaded execution
 */
export class CPUState {
  pc: number = 0; // Program counter
  registers: Uint32Array = new Uint32Array(8); // EAX, ECX, EDX, EBX, ESP, EBP, ESI, EDI
  flags: number = 0;
  running: boolean = false;
  halted: boolean = false;
  breakpoints: Set<number> = new Set();

  reset(): void {
    this.pc = 0;
    this.registers.fill(0);
    this.registers[4] = 0xffff; // Initialize ESP to top of stack
    this.flags = 0;
    this.running = false;
    this.halted = false;
  }

  addBreakpoint(address: number): void {
    this.breakpoints.add(address);
  }

  removeBreakpoint(address: number): void {
    this.breakpoints.delete(address);
  }

  hasBreakpoint(address: number): boolean {
    return this.breakpoints.has(address);
  }
}
