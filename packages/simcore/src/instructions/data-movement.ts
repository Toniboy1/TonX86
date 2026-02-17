import type { ExecutionContext, ParsedOperand, RegisterOperand } from "../types";

/** Resolve the effective address for a memory-type operand */
function resolveMemoryAddress(ctx: ExecutionContext, op: ParsedOperand): number {
  if (op.base === -1) {
    return op.offset || 0;
  }
  return (ctx.cpu.registers[op.base!] + (op.offset || 0)) & 0xffff;
}

/** Check whether an address falls in the I/O-mapped region */
function isIOAddress(addr: number): boolean {
  return (addr >= 0xf000 && addr <= 0xffff) || (addr >= 0x10100 && addr <= 0x101ff);
}

/** Read the value described by a parsed operand */
function readSourceValue(ctx: ExecutionContext, src: ParsedOperand): number {
  if (src.type === "register" || src.type === "register8") {
    return ctx.readRegisterValue(src as RegisterOperand);
  }
  if (src.type === "memory") {
    const addr = resolveMemoryAddress(ctx, src);
    return isIOAddress(addr) ? ctx.readIO(addr) : ctx.readMemory32(addr);
  }
  return src.value;
}

/** Write a value into a parsed destination operand */
function writeDestValue(ctx: ExecutionContext, dest: ParsedOperand, value: number): void {
  if (dest.type === "register" || dest.type === "register8") {
    ctx.writeRegisterValue(dest as RegisterOperand, value);
    return;
  }
  if (dest.type === "memory") {
    const addr = resolveMemoryAddress(ctx, dest);
    if (isIOAddress(addr)) {
      ctx.writeIO(addr, value);
    } else {
      ctx.writeMemory32(addr, value);
    }
    return;
  }
  // Immediate value destination - treat as I/O address
  ctx.writeIO(dest.value, value);
}

export function executeMov(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  // In strict-x86 mode, memory-to-memory MOV is not allowed
  if (ctx.compatibilityMode === "strict-x86") {
    const isDestMemory = dest.type === "immediate" || dest.type === "memory";
    const isSrcMemory =
      src.type === "memory" ||
      (src.type === "immediate" &&
        ((src.value >= 0xf000 && src.value <= 0xffff) ||
          (src.value >= 0x10100 && src.value <= 0x101ff)));

    if (isDestMemory && isSrcMemory) {
      throw new Error(
        "Memory-to-memory MOV not allowed in strict-x86 mode. Use a register as intermediate.",
      );
    }
  }

  writeDestValue(ctx, dest, readSourceValue(ctx, src));
}

export function executeXchg(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (
    (dest.type === "register" || dest.type === "register8") &&
    (src.type === "register" || src.type === "register8")
  ) {
    const temp = ctx.readRegisterValue(dest as RegisterOperand);
    ctx.writeRegisterValue(dest as RegisterOperand, ctx.readRegisterValue(src as RegisterOperand));
    ctx.writeRegisterValue(src as RegisterOperand, temp);
  }
}

export function executeLea(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    if (src.type === "memory") {
      let addr: number;
      if (src.base === -1) {
        addr = src.offset || 0;
      } else {
        addr = (ctx.cpu.registers[src.base!] + (src.offset || 0)) & 0xffffffff;
      }
      ctx.cpu.registers[dest.value] = addr >>> 0;
    } else if (src.type === "immediate") {
      ctx.cpu.registers[dest.value] = src.value;
    }
  }
}

export function executeMovzx(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    let srcValue: number;
    if (src.type === "register" || src.type === "register8") {
      srcValue = ctx.readRegisterValue(src as RegisterOperand) & 0xff;
    } else {
      srcValue = src.value & 0xff;
    }
    ctx.cpu.registers[dest.value] = srcValue;
  }
}

export function executeMovsx(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    let srcValue: number;
    if (src.type === "register" || src.type === "register8") {
      srcValue = ctx.readRegisterValue(src as RegisterOperand) & 0xff;
    } else {
      srcValue = src.value & 0xff;
    }
    // Sign extend from 8-bit to 32-bit
    if (srcValue & 0x80) {
      ctx.cpu.registers[dest.value] = srcValue | 0xffffff00;
    } else {
      ctx.cpu.registers[dest.value] = srcValue;
    }
  }
}
