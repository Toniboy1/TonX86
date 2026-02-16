import type { ExecutionContext, RegisterOperand } from "../types";

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

  // Get source value
  let srcValue: number;
  if (src.type === "register" || src.type === "register8") {
    srcValue = ctx.readRegisterValue(src as RegisterOperand);
  } else if (src.type === "memory") {
    let addr: number;
    if (src.base === -1) {
      addr = src.offset || 0;
    } else {
      addr = (ctx.cpu.registers[src.base!] + (src.offset || 0)) & 0xffff;
    }

    if (
      (addr >= 0xf000 && addr <= 0xffff) ||
      (addr >= 0x10100 && addr <= 0x101ff)
    ) {
      srcValue = ctx.readIO(addr);
    } else {
      srcValue = ctx.readMemory32(addr);
    }
  } else {
    srcValue = src.value;
  }

  // Handle destination
  if (dest.type === "register" || dest.type === "register8") {
    ctx.writeRegisterValue(dest as RegisterOperand, srcValue);
  } else if (dest.type === "memory") {
    let addr: number;
    if (dest.base === -1) {
      addr = dest.offset || 0;
    } else {
      addr = (ctx.cpu.registers[dest.base!] + (dest.offset || 0)) & 0xffff;
    }

    if (
      (addr >= 0xf000 && addr <= 0xffff) ||
      (addr >= 0x10100 && addr <= 0x101ff)
    ) {
      ctx.writeIO(addr, srcValue);
    } else {
      ctx.writeMemory32(addr, srcValue);
    }
  } else if (dest.type === "immediate") {
    ctx.writeIO(dest.value, srcValue);
  }
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
    ctx.writeRegisterValue(
      dest as RegisterOperand,
      ctx.readRegisterValue(src as RegisterOperand),
    );
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
