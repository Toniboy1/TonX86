import type { ExecutionContext } from "../types";
import { computeLogicalFlags } from "../flags";

export function executeAnd(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const srcValue = ctx.resolveSourceValue(src);
    ctx.cpu.registers[dest.value] = ctx.cpu.registers[dest.value] & srcValue & 0xffffffff;
    ctx.cpu.flags = computeLogicalFlags(ctx.cpu.flags, ctx.cpu.registers[dest.value]);
  }
}

export function executeOr(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const srcValue = ctx.resolveSourceValue(src);
    ctx.cpu.registers[dest.value] = (ctx.cpu.registers[dest.value] | srcValue) & 0xffffffff;
    ctx.cpu.flags = computeLogicalFlags(ctx.cpu.flags, ctx.cpu.registers[dest.value]);
  }
}

export function executeXor(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const srcValue = ctx.resolveSourceValue(src);
    ctx.cpu.registers[dest.value] = (ctx.cpu.registers[dest.value] ^ srcValue) & 0xffffffff;
    ctx.cpu.flags = computeLogicalFlags(ctx.cpu.flags, ctx.cpu.registers[dest.value]);
  }
}

export function executeNot(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  const dest = ctx.parseOperand(operands[0]);

  if (dest.type === "register") {
    ctx.cpu.registers[dest.value] = ~ctx.cpu.registers[dest.value] & 0xffffffff;
    // NOT does not affect flags in x86
  }
}

export function executeTest(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const destValue = ctx.cpu.registers[dest.value];
    const srcValue = ctx.resolveSourceValue(src);
    const result = destValue & srcValue & 0xffffffff;
    ctx.cpu.flags = computeLogicalFlags(ctx.cpu.flags, result);
  }
}
