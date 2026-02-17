import type { ExecutionContext } from "../types";
import { computeLogicalFlags } from "../flags";

export function executeRand(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length < 1) return;

  const dest = ctx.parseOperand(operands[0]);
  if (dest.type !== "register") return;

  let maxValue = 0xffffffff;

  if (operands.length === 2) {
    const maxOp = ctx.parseOperand(operands[1]);
    maxValue = maxOp.type === "register" ? ctx.cpu.registers[maxOp.value] : maxOp.value;
  }

  if (maxValue <= 0) maxValue = 1;

  const randomValue = Math.floor(Math.random() * maxValue) >>> 0;
  ctx.cpu.registers[dest.value] = randomValue;
  ctx.cpu.flags = computeLogicalFlags(ctx.cpu.flags, randomValue);
}
