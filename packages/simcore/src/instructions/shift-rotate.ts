import type { ExecutionContext } from "../types";
import { computeShiftFlags, computeRotateFlags, computeZeroAndSignFlags } from "../flags";

export function executeShl(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const originalValue = ctx.cpu.registers[dest.value];
    const rawCount = src.type === "register" ? ctx.cpu.registers[src.value] : src.value;
    const count = rawCount & 0x1f;
    const result = (originalValue << count) & 0xffffffff;
    ctx.cpu.registers[dest.value] = result;
    ctx.cpu.flags = computeShiftFlags(ctx.cpu.flags, result, originalValue, rawCount, "SHL");
  }
}

export function executeShr(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const originalValue = ctx.cpu.registers[dest.value];
    const rawCount = src.type === "register" ? ctx.cpu.registers[src.value] : src.value;
    const count = rawCount & 0x1f;
    const result = (originalValue >>> count) & 0xffffffff;
    ctx.cpu.registers[dest.value] = result;
    ctx.cpu.flags = computeShiftFlags(ctx.cpu.flags, result, originalValue, rawCount, "SHR");
  }
}

export function executeSar(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const originalValue = ctx.cpu.registers[dest.value];
    const rawCount = src.type === "register" ? ctx.cpu.registers[src.value] : src.value;
    const count = rawCount & 0x1f;
    const signBit = (originalValue & 0x80000000) >>> 31;
    let result = originalValue >>> count;
    if (signBit === 1) {
      const mask = 0xffffffff << (32 - count);
      result |= mask;
    }
    result &= 0xffffffff;
    ctx.cpu.registers[dest.value] = result;
    ctx.cpu.flags = computeShiftFlags(ctx.cpu.flags, result, originalValue, rawCount, "SAR");
  }
}

export function executeRol(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const count = (src.type === "register" ? ctx.cpu.registers[src.value] : src.value) & 0x1f;
    const value = ctx.cpu.registers[dest.value];
    const result = ((value << count) | (value >>> (32 - count))) & 0xffffffff;
    ctx.cpu.registers[dest.value] = result;
    ctx.cpu.flags = computeRotateFlags(ctx.cpu.flags, result, count, "ROL", ctx.compatibilityMode);
  }
}

export function executeRor(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const count = (src.type === "register" ? ctx.cpu.registers[src.value] : src.value) & 0x1f;
    const value = ctx.cpu.registers[dest.value];
    const result = ((value >>> count) | (value << (32 - count))) & 0xffffffff;
    ctx.cpu.registers[dest.value] = result;
    ctx.cpu.flags = computeRotateFlags(ctx.cpu.flags, result, count, "ROR", ctx.compatibilityMode);
  }
}

export function executeRcl(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const rawCount = (src.type === "register" ? ctx.cpu.registers[src.value] : src.value) & 0x1f;
    if (rawCount === 0) return;

    let value = ctx.cpu.registers[dest.value] >>> 0;
    let cf = ctx.cpu.flags & 0x01 ? 1 : 0;

    for (let i = 0; i < rawCount; i++) {
      const msb = (value >>> 31) & 1;
      value = ((value << 1) | cf) >>> 0;
      cf = msb;
    }

    ctx.cpu.registers[dest.value] = value;

    // Update CF
    if (cf) {
      ctx.cpu.flags |= 0x01;
    } else {
      ctx.cpu.flags &= ~0x01;
    }

    // OF: only defined for single-bit rotates
    if (rawCount === 1) {
      const msb = (value >>> 31) & 1;
      if (msb !== cf) {
        ctx.cpu.flags |= 0x800;
      } else {
        ctx.cpu.flags &= ~0x800;
      }
    } else {
      ctx.cpu.flags &= ~0x800;
    }

    if (ctx.compatibilityMode === "educational") {
      ctx.cpu.flags = computeZeroAndSignFlags(ctx.cpu.flags, value);
    }
  }
}

export function executeRcr(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const rawCount = (src.type === "register" ? ctx.cpu.registers[src.value] : src.value) & 0x1f;
    if (rawCount === 0) return;

    let value = ctx.cpu.registers[dest.value] >>> 0;
    let cf = ctx.cpu.flags & 0x01 ? 1 : 0;

    for (let i = 0; i < rawCount; i++) {
      const lsb = value & 1;
      value = ((value >>> 1) | (cf << 31)) >>> 0;
      cf = lsb;
    }

    ctx.cpu.registers[dest.value] = value;

    // Update CF
    if (cf) {
      ctx.cpu.flags |= 0x01;
    } else {
      ctx.cpu.flags &= ~0x01;
    }

    // OF: only defined for single-bit rotates
    if (rawCount === 1) {
      const msb = (value >>> 31) & 1;
      const msb1 = (value >>> 30) & 1;
      if (msb !== msb1) {
        ctx.cpu.flags |= 0x800;
      } else {
        ctx.cpu.flags &= ~0x800;
      }
    } else {
      ctx.cpu.flags &= ~0x800;
    }

    if (ctx.compatibilityMode === "educational") {
      ctx.cpu.flags = computeZeroAndSignFlags(ctx.cpu.flags, value);
    }
  }
}
