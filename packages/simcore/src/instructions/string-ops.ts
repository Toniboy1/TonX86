import type { ExecutionContext } from "../types";
import { computeArithFlags } from "../flags";

export function executeLods(ctx: ExecutionContext): void {
  // LODSB: Load byte from [ESI] into AL, increment ESI
  const addr = ctx.cpu.registers[6] & 0xffff; // ESI
  const value = ctx.readMemory32(addr) & 0xff;
  // Store into AL (low byte of EAX)
  ctx.cpu.registers[0] = (ctx.cpu.registers[0] & 0xffffff00) | value;
  // Increment ESI
  ctx.cpu.registers[6] = (ctx.cpu.registers[6] + 1) & 0xffffffff;
}

export function executeStos(ctx: ExecutionContext): void {
  // STOSB: Store AL to [EDI], increment EDI
  const addr = ctx.cpu.registers[7] & 0xffff; // EDI
  const al = ctx.cpu.registers[0] & 0xff;
  ctx.writeMemory32(addr, al);
  // Increment EDI
  ctx.cpu.registers[7] = (ctx.cpu.registers[7] + 1) & 0xffffffff;
}

export function executeMovs(ctx: ExecutionContext): void {
  // MOVSB: Move byte from [ESI] to [EDI], increment both
  const srcAddr = ctx.cpu.registers[6] & 0xffff; // ESI
  const dstAddr = ctx.cpu.registers[7] & 0xffff; // EDI
  const value = ctx.readMemory32(srcAddr) & 0xff;
  ctx.writeMemory32(dstAddr, value);
  // Increment ESI and EDI
  ctx.cpu.registers[6] = (ctx.cpu.registers[6] + 1) & 0xffffffff;
  ctx.cpu.registers[7] = (ctx.cpu.registers[7] + 1) & 0xffffffff;
}

export function executeScas(ctx: ExecutionContext): void {
  // SCASB: Compare AL with byte at [EDI], set flags, increment EDI
  const addr = ctx.cpu.registers[7] & 0xffff; // EDI
  const al = ctx.cpu.registers[0] & 0xff;
  const memValue = ctx.readMemory32(addr) & 0xff;
  const result = (al - memValue) & 0xffffffff;
  ctx.cpu.flags = computeArithFlags(ctx.cpu.flags, result, al, memValue, true);
  // Increment EDI
  ctx.cpu.registers[7] = (ctx.cpu.registers[7] + 1) & 0xffffffff;
}

export function executeCmps(ctx: ExecutionContext): void {
  // CMPSB: Compare byte at [ESI] with byte at [EDI], set flags, increment both
  const srcAddr = ctx.cpu.registers[6] & 0xffff; // ESI
  const dstAddr = ctx.cpu.registers[7] & 0xffff; // EDI
  const srcValue = ctx.readMemory32(srcAddr) & 0xff;
  const dstValue = ctx.readMemory32(dstAddr) & 0xff;
  const result = (srcValue - dstValue) & 0xffffffff;
  ctx.cpu.flags = computeArithFlags(ctx.cpu.flags, result, srcValue, dstValue, true);
  // Increment ESI and EDI
  ctx.cpu.registers[6] = (ctx.cpu.registers[6] + 1) & 0xffffffff;
  ctx.cpu.registers[7] = (ctx.cpu.registers[7] + 1) & 0xffffffff;
}
