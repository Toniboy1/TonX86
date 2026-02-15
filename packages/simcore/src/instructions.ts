import type { ExecutionContext, RegisterOperand } from "./types";
import {
  computeLogicalFlags,
  computeArithFlags,
  computeShiftFlags,
  computeRotateFlags,
  computeMultiplyFlags,
  computeZeroAndSignFlags,
  isZeroFlagSet,
  isSignFlagSet,
  isCarryFlagSet,
  isOverflowFlagSet,
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

    case "RCL":
      executeRcl(ctx, operands);
      break;

    case "RCR":
      executeRcr(ctx, operands);
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

    case "LOOP":
    case "LOOPE":
    case "LOOPZ":
    case "LOOPNE":
    case "LOOPNZ":
      // LOOP instructions: decrement ECX here; branch decision is in step()
      executeLoop(ctx, mnemonic);
      break;

    case "CMOVE":
    case "CMOVZ":
      executeCmov(ctx, operands, () => isZeroFlagSet(ctx.cpu.flags));
      break;

    case "CMOVNE":
    case "CMOVNZ":
      executeCmov(ctx, operands, () => !isZeroFlagSet(ctx.cpu.flags));
      break;

    case "CMOVL":
      executeCmov(
        ctx,
        operands,
        () => isSignFlagSet(ctx.cpu.flags) !== isOverflowFlagSet(ctx.cpu.flags),
      );
      break;

    case "CMOVLE":
      executeCmov(
        ctx,
        operands,
        () =>
          isSignFlagSet(ctx.cpu.flags) !== isOverflowFlagSet(ctx.cpu.flags) ||
          isZeroFlagSet(ctx.cpu.flags),
      );
      break;

    case "CMOVG":
      executeCmov(
        ctx,
        operands,
        () =>
          isSignFlagSet(ctx.cpu.flags) === isOverflowFlagSet(ctx.cpu.flags) &&
          !isZeroFlagSet(ctx.cpu.flags),
      );
      break;

    case "CMOVGE":
      executeCmov(
        ctx,
        operands,
        () => isSignFlagSet(ctx.cpu.flags) === isOverflowFlagSet(ctx.cpu.flags),
      );
      break;

    case "CMOVA":
      executeCmov(
        ctx,
        operands,
        () => !isCarryFlagSet(ctx.cpu.flags) && !isZeroFlagSet(ctx.cpu.flags),
      );
      break;

    case "CMOVAE":
      executeCmov(ctx, operands, () => !isCarryFlagSet(ctx.cpu.flags));
      break;

    case "CMOVB":
      executeCmov(ctx, operands, () => isCarryFlagSet(ctx.cpu.flags));
      break;

    case "CMOVBE":
      executeCmov(
        ctx,
        operands,
        () => isCarryFlagSet(ctx.cpu.flags) || isZeroFlagSet(ctx.cpu.flags),
      );
      break;

    case "CMOVS":
      executeCmov(ctx, operands, () => isSignFlagSet(ctx.cpu.flags));
      break;

    case "CMOVNS":
      executeCmov(ctx, operands, () => !isSignFlagSet(ctx.cpu.flags));
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

    case "LAHF":
      executeLahf(ctx);
      break;

    case "SAHF":
      executeSahf(ctx);
      break;

    case "XADD":
      executeXadd(ctx, operands);
      break;

    case "BSF":
      executeBsf(ctx, operands);
      break;

    case "BSR":
      executeBsr(ctx, operands);
      break;

    case "BSWAP":
      executeBswap(ctx, operands);
      break;

    case "LODSB":
    case "LODS":
      executeLods(ctx);
      break;

    case "STOSB":
    case "STOS":
      executeStos(ctx);
      break;

    case "MOVSB":
    case "MOVS":
      executeMovs(ctx);
      break;

    case "SCASB":
    case "SCAS":
      executeScas(ctx);
      break;

    case "CMPSB":
    case "CMPS":
      executeCmps(ctx);
      break;

    case "INT":
      executeInt(ctx, operands);
      break;

    case "INT3":
      executeInt3(ctx);
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

// ---------------------------------------------------------------------------
// RCL / RCR - Rotate through carry
// ---------------------------------------------------------------------------

function executeRcl(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const rawCount =
      (src.type === "register" ? ctx.cpu.registers[src.value] : src.value) &
      0x1f;
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

function executeRcr(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type === "register") {
    const rawCount =
      (src.type === "register" ? ctx.cpu.registers[src.value] : src.value) &
      0x1f;
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

// ---------------------------------------------------------------------------
// LOOP / LOOPE / LOOPNE - Loop instructions (ECX decrement done here)
// ---------------------------------------------------------------------------

function executeLoop(ctx: ExecutionContext, _mnemonic: string): void {
  // Decrement ECX
  ctx.cpu.registers[1] = (ctx.cpu.registers[1] - 1) & 0xffffffff;
  // Branch decision is handled in Simulator.step()
}

// ---------------------------------------------------------------------------
// CMOVxx - Conditional moves
// ---------------------------------------------------------------------------

function executeCmov(
  ctx: ExecutionContext,
  operands: string[],
  condition: () => boolean,
): void {
  if (operands.length !== 2) return;
  const dest = ctx.parseOperand(operands[0]);
  const src = ctx.parseOperand(operands[1]);

  if (dest.type !== "register") return;

  if (condition()) {
    const srcValue = ctx.resolveSourceValue(src);
    ctx.cpu.registers[dest.value] = srcValue;
  }
}

// ---------------------------------------------------------------------------
// LAHF / SAHF - Load/Store AH from/to flags
// ---------------------------------------------------------------------------

function executeLahf(ctx: ExecutionContext): void {
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

function executeSahf(ctx: ExecutionContext): void {
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

function executeXadd(ctx: ExecutionContext, operands: string[]): void {
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

function executeBsf(ctx: ExecutionContext, operands: string[]): void {
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

function executeBsr(ctx: ExecutionContext, operands: string[]): void {
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

function executeBswap(ctx: ExecutionContext, operands: string[]): void {
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

// ---------------------------------------------------------------------------
// String Operations - LODS, STOS, MOVS, SCAS, CMPS
// ---------------------------------------------------------------------------

function executeLods(ctx: ExecutionContext): void {
  // LODSB: Load byte from [ESI] into AL, increment ESI
  const addr = ctx.cpu.registers[6] & 0xffff; // ESI
  const value = ctx.readMemory32(addr) & 0xff;
  // Store into AL (low byte of EAX)
  ctx.cpu.registers[0] = (ctx.cpu.registers[0] & 0xffffff00) | value;
  // Increment ESI
  ctx.cpu.registers[6] = (ctx.cpu.registers[6] + 1) & 0xffffffff;
}

function executeStos(ctx: ExecutionContext): void {
  // STOSB: Store AL to [EDI], increment EDI
  const addr = ctx.cpu.registers[7] & 0xffff; // EDI
  const al = ctx.cpu.registers[0] & 0xff;
  ctx.writeMemory32(addr, al);
  // Increment EDI
  ctx.cpu.registers[7] = (ctx.cpu.registers[7] + 1) & 0xffffffff;
}

function executeMovs(ctx: ExecutionContext): void {
  // MOVSB: Move byte from [ESI] to [EDI], increment both
  const srcAddr = ctx.cpu.registers[6] & 0xffff; // ESI
  const dstAddr = ctx.cpu.registers[7] & 0xffff; // EDI
  const value = ctx.readMemory32(srcAddr) & 0xff;
  ctx.writeMemory32(dstAddr, value);
  // Increment ESI and EDI
  ctx.cpu.registers[6] = (ctx.cpu.registers[6] + 1) & 0xffffffff;
  ctx.cpu.registers[7] = (ctx.cpu.registers[7] + 1) & 0xffffffff;
}

function executeScas(ctx: ExecutionContext): void {
  // SCASB: Compare AL with byte at [EDI], set flags, increment EDI
  const addr = ctx.cpu.registers[7] & 0xffff; // EDI
  const al = ctx.cpu.registers[0] & 0xff;
  const memValue = ctx.readMemory32(addr) & 0xff;
  const result = (al - memValue) & 0xffffffff;
  ctx.cpu.flags = computeArithFlags(ctx.cpu.flags, result, al, memValue, true);
  // Increment EDI
  ctx.cpu.registers[7] = (ctx.cpu.registers[7] + 1) & 0xffffffff;
}

function executeCmps(ctx: ExecutionContext): void {
  // CMPSB: Compare byte at [ESI] with byte at [EDI], set flags, increment both
  const srcAddr = ctx.cpu.registers[6] & 0xffff; // ESI
  const dstAddr = ctx.cpu.registers[7] & 0xffff; // EDI
  const srcValue = ctx.readMemory32(srcAddr) & 0xff;
  const dstValue = ctx.readMemory32(dstAddr) & 0xff;
  const result = (srcValue - dstValue) & 0xffffffff;
  ctx.cpu.flags = computeArithFlags(
    ctx.cpu.flags,
    result,
    srcValue,
    dstValue,
    true,
  );
  // Increment ESI and EDI
  ctx.cpu.registers[6] = (ctx.cpu.registers[6] + 1) & 0xffffffff;
  ctx.cpu.registers[7] = (ctx.cpu.registers[7] + 1) & 0xffffffff;
}

// ---------------------------------------------------------------------------
// INT3 - Breakpoint interrupt
// ---------------------------------------------------------------------------

function executeInt3(ctx: ExecutionContext): void {
  // INT3 triggers a breakpoint - halt the processor
  ctx.cpu.halted = true;
  ctx.cpu.running = false;
}
