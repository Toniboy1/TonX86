import type { ExecutionContext } from "../types";
import { computeArithFlags } from "../flags";

// ---------------------------------------------------------------------------
// LAHF / SAHF - Load/Store AH from/to flags
// ---------------------------------------------------------------------------

export function executeLahf(ctx: ExecutionContext): void {
  // LAHF: Load flags (SF:ZF:0:AF:0:PF:1:CF) into AH
  // We store SF, ZF, CF; AF and PF are not implemented (set 0)
  const flags = ctx.cpu.flags;
  let ah = 0x02; // Bit 1 is always 1 in x86 EFLAGS
  if (flags & 0x01) ah |= 0x01; // CF -> bit 0
  if (flags & 0x40) ah |= 0x40; // ZF -> bit 6
  if (flags & 0x80) ah |= 0x80; // SF -> bit 7
  // Store into AH (bits 8-15 of EAX)
  const eax = ctx.cpu.registers[0];
  ctx.cpu.registers[0] = (eax & 0xffff00ff) | (ah << 8);
}

export function executeSahf(ctx: ExecutionContext): void {
  // SAHF: Store AH into flags (SF:ZF:0:AF:0:PF:1:CF)
  const ah = (ctx.cpu.registers[0] >> 8) & 0xff;
  let flags = ctx.cpu.flags;
  // CF from bit 0
  if (ah & 0x01) {
    flags |= 0x01;
  } else {
    flags &= ~0x01;
  }
  // ZF from bit 6
  if (ah & 0x40) {
    flags |= 0x40;
  } else {
    flags &= ~0x40;
  }
  // SF from bit 7
  if (ah & 0x80) {
    flags |= 0x80;
  } else {
    flags &= ~0x80;
  }
  ctx.cpu.flags = flags;
}

// ---------------------------------------------------------------------------
// XADD - Exchange and Add
// ---------------------------------------------------------------------------

export function executeXadd(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register" && src.type === "register") {
    const destVal = ctx.cpu.registers[dest.value];
    const srcVal = ctx.cpu.registers[src.value];
    const result = (destVal + srcVal) & 0xffffffff;
    ctx.cpu.registers[src.value] = destVal; // old dest -> source
    ctx.cpu.registers[dest.value] = result; // sum -> dest
    ctx.cpu.flags = computeArithFlags(
      ctx.cpu.flags,
      result,
      destVal,
      srcVal,
      false,
    );
  }
}

// ---------------------------------------------------------------------------
// BSF / BSR - Bit Scan Forward / Reverse
// ---------------------------------------------------------------------------

export function executeBsf(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type !== "register") return;

  const srcValue = ctx.resolveSourceValue(src) >>> 0;

  if (srcValue === 0) {
    // ZF is set when source is 0, dest is undefined
    ctx.cpu.flags |= 0x40; // Set ZF
  } else {
    ctx.cpu.flags &= ~0x40; // Clear ZF
    // Find least significant set bit
    for (let i = 0; i < 32; i++) {
      if ((srcValue >>> i) & 1) {
        ctx.cpu.registers[dest.value] = i;
        break;
      }
    }
  }
}

export function executeBsr(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type !== "register") return;

  const srcValue = ctx.resolveSourceValue(src) >>> 0;

  if (srcValue === 0) {
    // ZF is set when source is 0, dest is undefined
    ctx.cpu.flags |= 0x40; // Set ZF
  } else {
    ctx.cpu.flags &= ~0x40; // Clear ZF
    // Find most significant set bit
    for (let i = 31; i >= 0; i--) {
      if ((srcValue >>> i) & 1) {
        ctx.cpu.registers[dest.value] = i;
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// BSWAP - Byte Swap (endianness conversion)
// ---------------------------------------------------------------------------

export function executeBswap(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  const dest = ctx.parseOperand(operands[0]);

  if (dest.type === "register") {
    const value = ctx.cpu.registers[dest.value] >>> 0;
    const byte0 = value & 0xff;
    const byte1 = (value >> 8) & 0xff;
    const byte2 = (value >> 16) & 0xff;
    const byte3 = (value >> 24) & 0xff;
    ctx.cpu.registers[dest.value] =
      ((byte0 << 24) | (byte1 << 16) | (byte2 << 8) | byte3) >>> 0;
  }
}
