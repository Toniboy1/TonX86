import type { ExecutionContext, RegisterOperand } from "../types";

export function executePush(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  const src = ctx.parseOperand(operands[0]);

  let value: number;
  if (src.type === "register" || src.type === "register8") {
    value = ctx.readRegisterValue(src as RegisterOperand);
  } else if (src.type === "memory") {
    const addr = (ctx.cpu.registers[src.base!] + (src.offset || 0)) & 0xffff;
    value = ctx.readMemory32(addr);
  } else {
    value = src.value;
  }

  ctx.pushStack(value);
}

export function executePop(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  const dest = ctx.parseOperand(operands[0]);

  if (dest.type === "register" || dest.type === "register8") {
    const value = ctx.popStack();
    ctx.writeRegisterValue(dest as RegisterOperand, value);
  }
}
