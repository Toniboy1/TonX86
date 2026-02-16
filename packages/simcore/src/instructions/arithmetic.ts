import type { ExecutionContext } from "../types";
import {
  computeArithFlags,
  computeLogicalFlags,
  computeMultiplyFlags,
} from "../flags";

export function executeAdd(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const srcValue = ctx.resolveSourceValue(src);
    const destVal = ctx.cpu.registers[dest.value];
    const result = (destVal + srcValue) & 0xffffffff;
    ctx.cpu.registers[dest.value] = result;
    ctx.cpu.flags = computeArithFlags(
      ctx.cpu.flags,
      result,
      destVal,
      srcValue,
      false,
    );
  }
}

export function executeSub(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const srcValue = ctx.resolveSourceValue(src);
    const destVal = ctx.cpu.registers[dest.value];
    const result = (destVal - srcValue) & 0xffffffff;
    ctx.cpu.registers[dest.value] = result;
    ctx.cpu.flags = computeArithFlags(
      ctx.cpu.flags,
      result,
      destVal,
      srcValue,
      true,
    );
  }
}

export function executeInc(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  const dest = ctx.parseOperand(operands[0]);

  if (dest.type === "register") {
    const destVal = ctx.cpu.registers[dest.value];
    const result = (destVal + 1) & 0xffffffff;
    ctx.cpu.registers[dest.value] = result;
    // INC preserves carry flag per x86 spec
    const savedCarry = ctx.cpu.flags & 0x01;
    ctx.cpu.flags = computeArithFlags(ctx.cpu.flags, result, destVal, 1, false);
    ctx.cpu.flags = (ctx.cpu.flags & ~0x01) | savedCarry;
  }
}

export function executeDec(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  const dest = ctx.parseOperand(operands[0]);

  if (dest.type === "register") {
    const destVal = ctx.cpu.registers[dest.value];
    const result = (destVal - 1) & 0xffffffff;
    ctx.cpu.registers[dest.value] = result;
    // DEC preserves carry flag per x86 spec
    const savedCarry = ctx.cpu.flags & 0x01;
    ctx.cpu.flags = computeArithFlags(ctx.cpu.flags, result, destVal, 1, true);
    ctx.cpu.flags = (ctx.cpu.flags & ~0x01) | savedCarry;
  }
}

export function executeMul(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  const src = ctx.parseOperand(operands[0]);

  const srcValue = ctx.resolveSourceValue(src);
  const result = (ctx.cpu.registers[0] >>> 0) * (srcValue >>> 0);
  const lower = (result & 0xffffffff) >>> 0;
  const upper = ((result / 0x100000000) & 0xffffffff) >>> 0;
  ctx.cpu.registers[0] = lower; // EAX
  ctx.cpu.registers[2] = upper; // EDX
  ctx.cpu.flags = computeMultiplyFlags(
    ctx.cpu.flags,
    lower,
    upper,
    ctx.compatibilityMode,
  );
}

export function executeImul(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length === 1) {
    const src = ctx.parseOperand(operands[0]);
    const srcValue = ctx.resolveSourceValue(src);
    const eaxSigned = ctx.cpu.registers[0] | 0;
    const srcSigned = srcValue | 0;
    const result = eaxSigned * srcSigned;
    const lower = (result & 0xffffffff) >>> 0;
    const upper = ((result / 0x100000000) | 0) >>> 0;
    ctx.cpu.registers[0] = lower;
    ctx.cpu.registers[2] = upper; // EDX
    ctx.cpu.flags = computeMultiplyFlags(
      ctx.cpu.flags,
      lower,
      upper,
      ctx.compatibilityMode,
    );
  } else if (operands.length === 2) {
    const dest = ctx.parseOperand(operands[0]);
    const src = ctx.parseOperand(operands[1]);
    if (dest.type !== "register") return;
    const destSigned = ctx.cpu.registers[dest.value] | 0;
    const srcValue = ctx.resolveSourceValue(src) | 0;
    const result64 = destSigned * srcValue;
    const result = (result64 & 0xffffffff) >>> 0;
    ctx.cpu.registers[dest.value] = result;
    const upper = ((result64 / 0x100000000) | 0) >>> 0;
    ctx.cpu.flags = computeMultiplyFlags(
      ctx.cpu.flags,
      result,
      upper,
      ctx.compatibilityMode,
    );
  } else if (operands.length === 3) {
    const dest = ctx.parseOperand(operands[0]);
    const src = ctx.parseOperand(operands[1]);
    const con = ctx.parseOperand(operands[2]);
    if (dest.type !== "register") return;
    const srcValue = ctx.resolveSourceValue(src) | 0;
    const constValue = con.value | 0;
    const result64 = srcValue * constValue;
    const result = (result64 & 0xffffffff) >>> 0;
    ctx.cpu.registers[dest.value] = result;
    const upper = ((result64 / 0x100000000) | 0) >>> 0;
    ctx.cpu.flags = computeMultiplyFlags(
      ctx.cpu.flags,
      result,
      upper,
      ctx.compatibilityMode,
    );
  }
}

export function executeDiv(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  const src = ctx.parseOperand(operands[0]);

  const srcValue = ctx.resolveSourceValue(src);
  if (srcValue === 0) {
    ctx.cpu.registers[0] = 0;
    ctx.cpu.registers[2] = 0;
  } else {
    const dividend = ctx.cpu.registers[0] >>> 0;
    const divisor = srcValue >>> 0;
    ctx.cpu.registers[0] = Math.floor(dividend / divisor) >>> 0;
    ctx.cpu.registers[2] = (dividend % divisor) >>> 0;
  }

  if (ctx.compatibilityMode === "educational") {
    ctx.cpu.flags = computeLogicalFlags(ctx.cpu.flags, ctx.cpu.registers[0]);
  } else {
    ctx.cpu.flags &= ~0x01;
    ctx.cpu.flags &= ~0x800;
  }
}

export function executeIdiv(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  const src = ctx.parseOperand(operands[0]);

  const srcValue = ctx.resolveSourceValue(src);
  const divisor = srcValue | 0;

  if (divisor === 0) {
    ctx.cpu.registers[0] = 0;
    ctx.cpu.registers[2] = 0;
  } else {
    const dividend = ctx.cpu.registers[0] | 0;
    ctx.cpu.registers[0] = Math.trunc(dividend / divisor) >>> 0;
    ctx.cpu.registers[2] = (dividend % divisor) >>> 0;
  }

  if (ctx.compatibilityMode === "educational") {
    ctx.cpu.flags = computeLogicalFlags(ctx.cpu.flags, ctx.cpu.registers[0]);
  } else {
    ctx.cpu.flags &= ~0x01;
    ctx.cpu.flags &= ~0x800;
  }
}

export function executeMod(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type !== "register") return;

  const srcValue = ctx.resolveSourceValue(src);

  if (srcValue === 0) {
    ctx.cpu.registers[dest.value] = 0;
  } else {
    const destValue = ctx.cpu.registers[dest.value] >>> 0;
    const modValue = srcValue >>> 0;
    ctx.cpu.registers[dest.value] = (destValue % modValue) >>> 0;
  }
  ctx.cpu.flags = computeLogicalFlags(
    ctx.cpu.flags,
    ctx.cpu.registers[dest.value],
  );
}

export function executeCmp(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const destValue = ctx.cpu.registers[dest.value];
    const srcValue = ctx.resolveSourceValue(src);
    const result = (destValue - srcValue) & 0xffffffff;
    ctx.cpu.flags = computeArithFlags(
      ctx.cpu.flags,
      result,
      destValue,
      srcValue,
      true,
    );
  }
}

export function executeNeg(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  const dest = ctx.parseOperand(operands[0]);

  if (dest.type === "register") {
    const destVal = ctx.cpu.registers[dest.value];
    const result = (0 - destVal) & 0xffffffff;
    ctx.cpu.registers[dest.value] = result;

    // NEG has special CF behavior: CF = (source != 0)
    ctx.cpu.flags = computeArithFlags(ctx.cpu.flags, result, 0, destVal, true);

    // Override CF with NEG-specific behavior
    if (destVal !== 0) {
      ctx.cpu.flags |= 0x01;
    } else {
      ctx.cpu.flags &= ~0x01;
    }
  }
}
