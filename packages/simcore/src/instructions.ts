import type { ExecutionContext, RegisterOperand } from "./types";
import {
  computeLogicalFlags,
  computeArithFlags,
  computeShiftFlags,
  computeRotateFlags,
  computeMultiplyFlags,
} from "./flags";

/**
 * Execute a single instruction given the execution context.
 * This function is the giant switch extracted from Simulator.executeInstruction.
 */
export function executeInstruction(
  ctx: ExecutionContext,
  mnemonic: string,
  operands: string[],
): void {
  mnemonic = mnemonic.toUpperCase();

  switch (mnemonic) {
    case "MOV":
      executeMov(ctx, operands);
      break;

    case "XCHG":
      executeXchg(ctx, operands);
      break;

    case "LEA":
      executeLea(ctx, operands);
      break;

    case "MOVZX":
      executeMovzx(ctx, operands);
      break;

    case "MOVSX":
      executeMovsx(ctx, operands);
      break;

    case "ADD":
      executeAdd(ctx, operands);
      break;

    case "SUB":
      executeSub(ctx, operands);
      break;

    case "INC":
      executeInc(ctx, operands);
      break;

    case "DEC":
      executeDec(ctx, operands);
      break;

    case "MUL":
      executeMul(ctx, operands);
      break;

    case "IMUL":
      executeImul(ctx, operands);
      break;

    case "DIV":
      executeDiv(ctx, operands);
      break;

    case "IDIV":
      executeIdiv(ctx, operands);
      break;

    case "MOD":
      executeMod(ctx, operands);
      break;

    case "CMP":
      executeCmp(ctx, operands);
      break;

    case "AND":
      executeAnd(ctx, operands);
      break;

    case "OR":
      executeOr(ctx, operands);
      break;

    case "XOR":
      executeXor(ctx, operands);
      break;

    case "NOT":
      executeNot(ctx, operands);
      break;

    case "NEG":
      executeNeg(ctx, operands);
      break;

    case "TEST":
      executeTest(ctx, operands);
      break;

    case "SHL":
      executeShl(ctx, operands);
      break;

    case "SHR":
      executeShr(ctx, operands);
      break;

    case "SAR":
      executeSar(ctx, operands);
      break;

    case "ROL":
      executeRol(ctx, operands);
      break;

    case "ROR":
      executeRor(ctx, operands);
      break;

    case "NOP":
      break;

    case "JMP":
    case "JE":
    case "JZ":
    case "JNE":
    case "JNZ":
    case "JG":
    case "JGE":
    case "JL":
    case "JLE":
    case "JS":
    case "JNS":
    case "JA":
    case "JAE":
    case "JB":
    case "JBE":
      // Jump instructions are no-ops at the executeInstruction level;
      // control flow is handled by step()
      break;

    case "PUSH":
      executePush(ctx, operands);
      break;

    case "POP":
      executePop(ctx, operands);
      break;

    case "CALL":
    case "RET":
      // CALL/RET control flow is handled by step()
      break;

    case "INT":
      executeInt(ctx, operands);
      break;

    case "IRET":
      // IRET placeholder
      break;

    case "RAND":
      executeRand(ctx, operands);
      break;

    case "HLT":
      ctx.cpu.halted = true;
      ctx.cpu.running = false;
      break;

    default:
      throw new Error(`Unknown instruction: ${mnemonic}`);
  }
}

// ---------------------------------------------------------------------------
// Individual instruction implementations
// ---------------------------------------------------------------------------

function executeMov(ctx: ExecutionContext, operands: string[]): void {
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

function executeXchg(ctx: ExecutionContext, operands: string[]): void {
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

function executeLea(ctx: ExecutionContext, operands: string[]): void {
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

function executeMovzx(ctx: ExecutionContext, operands: string[]): void {
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

function executeMovsx(ctx: ExecutionContext, operands: string[]): void {
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

function executeAdd(ctx: ExecutionContext, operands: string[]): void {
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

function executeSub(ctx: ExecutionContext, operands: string[]): void {
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

function executeInc(ctx: ExecutionContext, operands: string[]): void {
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

function executeDec(ctx: ExecutionContext, operands: string[]): void {
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

function executeMul(ctx: ExecutionContext, operands: string[]): void {
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

function executeImul(ctx: ExecutionContext, operands: string[]): void {
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

function executeDiv(ctx: ExecutionContext, operands: string[]): void {
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

function executeIdiv(ctx: ExecutionContext, operands: string[]): void {
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

function executeMod(ctx: ExecutionContext, operands: string[]): void {
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

function executeCmp(ctx: ExecutionContext, operands: string[]): void {
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

function executeAnd(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const srcValue = ctx.resolveSourceValue(src);
    ctx.cpu.registers[dest.value] =
      ctx.cpu.registers[dest.value] & srcValue & 0xffffffff;
    ctx.cpu.flags = computeLogicalFlags(
      ctx.cpu.flags,
      ctx.cpu.registers[dest.value],
    );
  }
}

function executeOr(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const srcValue = ctx.resolveSourceValue(src);
    ctx.cpu.registers[dest.value] =
      (ctx.cpu.registers[dest.value] | srcValue) & 0xffffffff;
    ctx.cpu.flags = computeLogicalFlags(
      ctx.cpu.flags,
      ctx.cpu.registers[dest.value],
    );
  }
}

function executeXor(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const srcValue = ctx.resolveSourceValue(src);
    ctx.cpu.registers[dest.value] =
      (ctx.cpu.registers[dest.value] ^ srcValue) & 0xffffffff;
    ctx.cpu.flags = computeLogicalFlags(
      ctx.cpu.flags,
      ctx.cpu.registers[dest.value],
    );
  }
}

function executeNot(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  const dest = ctx.parseOperand(operands[0]);

  if (dest.type === "register") {
    ctx.cpu.registers[dest.value] = ~ctx.cpu.registers[dest.value] & 0xffffffff;
    // NOT does not affect flags in x86
  }
}

function executeNeg(ctx: ExecutionContext, operands: string[]): void {
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

function executeTest(ctx: ExecutionContext, operands: string[]): void {
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

function executeShl(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const originalValue = ctx.cpu.registers[dest.value];
    const rawCount =
      src.type === "register" ? ctx.cpu.registers[src.value] : src.value;
    const count = rawCount & 0x1f;
    const result = (originalValue << count) & 0xffffffff;
    ctx.cpu.registers[dest.value] = result;
    ctx.cpu.flags = computeShiftFlags(
      ctx.cpu.flags,
      result,
      originalValue,
      rawCount,
      "SHL",
    );
  }
}

function executeShr(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const originalValue = ctx.cpu.registers[dest.value];
    const rawCount =
      src.type === "register" ? ctx.cpu.registers[src.value] : src.value;
    const count = rawCount & 0x1f;
    const result = (originalValue >>> count) & 0xffffffff;
    ctx.cpu.registers[dest.value] = result;
    ctx.cpu.flags = computeShiftFlags(
      ctx.cpu.flags,
      result,
      originalValue,
      rawCount,
      "SHR",
    );
  }
}

function executeSar(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const originalValue = ctx.cpu.registers[dest.value];
    const rawCount =
      src.type === "register" ? ctx.cpu.registers[src.value] : src.value;
    const count = rawCount & 0x1f;
    const signBit = (originalValue & 0x80000000) >>> 31;
    let result = originalValue >>> count;
    if (signBit === 1) {
      const mask = 0xffffffff << (32 - count);
      result |= mask;
    }
    result &= 0xffffffff;
    ctx.cpu.registers[dest.value] = result;
    ctx.cpu.flags = computeShiftFlags(
      ctx.cpu.flags,
      result,
      originalValue,
      rawCount,
      "SAR",
    );
  }
}

function executeRol(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const count =
      (src.type === "register" ? ctx.cpu.registers[src.value] : src.value) &
      0x1f;
    const value = ctx.cpu.registers[dest.value];
    const result = ((value << count) | (value >>> (32 - count))) & 0xffffffff;
    ctx.cpu.registers[dest.value] = result;
    ctx.cpu.flags = computeRotateFlags(
      ctx.cpu.flags,
      result,
      count,
      "ROL",
      ctx.compatibilityMode,
    );
  }
}

function executeRor(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const count =
      (src.type === "register" ? ctx.cpu.registers[src.value] : src.value) &
      0x1f;
    const value = ctx.cpu.registers[dest.value];
    const result = ((value >>> count) | (value << (32 - count))) & 0xffffffff;
    ctx.cpu.registers[dest.value] = result;
    ctx.cpu.flags = computeRotateFlags(
      ctx.cpu.flags,
      result,
      count,
      "ROR",
      ctx.compatibilityMode,
    );
  }
}

function executePush(ctx: ExecutionContext, operands: string[]): void {
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

function executePop(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  const dest = ctx.parseOperand(operands[0]);

  if (dest.type === "register" || dest.type === "register8") {
    const value = ctx.popStack();
    ctx.writeRegisterValue(dest as RegisterOperand, value);
  }
}

function executeInt(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  const intNum = ctx.parseOperand(operands[0]);

  if (intNum.type === "immediate") {
    switch (intNum.value) {
      case 0x10: {
        // Video services - write character to console
        const ah = (ctx.cpu.registers[0] >> 8) & 0xff;
        const al = ctx.cpu.registers[0] & 0xff;

        if (ah === 0x0e) {
          ctx.appendConsoleOutput(String.fromCharCode(al));
        }
        break;
      }

      case 0x20: {
        // Program terminate
        ctx.cpu.halted = true;
        ctx.cpu.running = false;
        break;
      }

      case 0x21: {
        // DOS-style services
        const ah = (ctx.cpu.registers[0] >> 8) & 0xff;

        switch (ah) {
          case 0x02: {
            const dl = ctx.cpu.registers[2] & 0xff;
            ctx.appendConsoleOutput(String.fromCharCode(dl));
            break;
          }
          case 0x09: {
            // Write string to stdout - not fully implemented
            break;
          }
        }
        break;
      }
    }
  }
}

function executeRand(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length < 1) return;

  const dest = ctx.parseOperand(operands[0]);
  if (dest.type !== "register") return;

  let maxValue = 0xffffffff;

  if (operands.length === 2) {
    const maxOp = ctx.parseOperand(operands[1]);
    maxValue =
      maxOp.type === "register" ? ctx.cpu.registers[maxOp.value] : maxOp.value;
  }

  if (maxValue <= 0) maxValue = 1;

  const randomValue = Math.floor(Math.random() * maxValue) >>> 0;
  ctx.cpu.registers[dest.value] = randomValue;
  ctx.cpu.flags = computeLogicalFlags(ctx.cpu.flags, randomValue);
}
