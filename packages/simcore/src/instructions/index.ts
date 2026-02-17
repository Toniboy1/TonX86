import type { ExecutionContext } from "../types";
import { isZeroFlagSet, isSignFlagSet, isCarryFlagSet, isOverflowFlagSet } from "../flags";

import { executeMov, executeXchg, executeLea, executeMovzx, executeMovsx } from "./data-movement";
import {
  executeAdd,
  executeSub,
  executeInc,
  executeDec,
  executeMul,
  executeImul,
  executeDiv,
  executeIdiv,
  executeMod,
  executeCmp,
  executeNeg,
} from "./arithmetic";
import { executeAnd, executeOr, executeXor, executeNot, executeTest } from "./logical";
import {
  executeShl,
  executeShr,
  executeSar,
  executeRol,
  executeRor,
  executeRcl,
  executeRcr,
} from "./shift-rotate";
import { executePush, executePop } from "./stack";
import {
  executeJmp,
  executeJe,
  executeJne,
  executeJg,
  executeJge,
  executeJl,
  executeJle,
  executeJs,
  executeJns,
  executeJa,
  executeJae,
  executeJb,
  executeJbe,
  executeCall,
  executeRet,
  executeLoop,
  executeCmov,
} from "./control-flow";
import { executeLods, executeStos, executeMovs, executeScas, executeCmps } from "./string-ops";
import {
  executeLahf,
  executeSahf,
  executeXadd,
  executeBsf,
  executeBsr,
  executeBswap,
} from "./bit-ops";
import { executeInt, executeInt3, executeIret } from "./interrupts";
import { executeRand } from "./misc";

type InstructionHandler = (ctx: ExecutionContext, mnemonic: string, operands: string[]) => void;

/**
 * Dispatch map from mnemonic to handler.
 * Using a map instead of a switch statement keeps cyclomatic complexity O(1).
 */
const INSTRUCTION_MAP: Record<string, InstructionHandler> = {
  // ── Data movement ────────────────────────────────────────
  MOV: (ctx, _, ops) => executeMov(ctx, ops),
  XCHG: (ctx, _, ops) => executeXchg(ctx, ops),
  LEA: (ctx, _, ops) => executeLea(ctx, ops),
  MOVZX: (ctx, _, ops) => executeMovzx(ctx, ops),
  MOVSX: (ctx, _, ops) => executeMovsx(ctx, ops),

  // ── Arithmetic ───────────────────────────────────────────
  ADD: (ctx, _, ops) => executeAdd(ctx, ops),
  SUB: (ctx, _, ops) => executeSub(ctx, ops),
  INC: (ctx, _, ops) => executeInc(ctx, ops),
  DEC: (ctx, _, ops) => executeDec(ctx, ops),
  MUL: (ctx, _, ops) => executeMul(ctx, ops),
  IMUL: (ctx, _, ops) => executeImul(ctx, ops),
  DIV: (ctx, _, ops) => executeDiv(ctx, ops),
  IDIV: (ctx, _, ops) => executeIdiv(ctx, ops),
  MOD: (ctx, _, ops) => executeMod(ctx, ops),
  CMP: (ctx, _, ops) => executeCmp(ctx, ops),
  NEG: (ctx, _, ops) => executeNeg(ctx, ops),

  // ── Logical ──────────────────────────────────────────────
  AND: (ctx, _, ops) => executeAnd(ctx, ops),
  OR: (ctx, _, ops) => executeOr(ctx, ops),
  XOR: (ctx, _, ops) => executeXor(ctx, ops),
  NOT: (ctx, _, ops) => executeNot(ctx, ops),
  TEST: (ctx, _, ops) => executeTest(ctx, ops),

  // ── Shift / Rotate ───────────────────────────────────────
  SHL: (ctx, _, ops) => executeShl(ctx, ops),
  SHR: (ctx, _, ops) => executeShr(ctx, ops),
  SAR: (ctx, _, ops) => executeSar(ctx, ops),
  ROL: (ctx, _, ops) => executeRol(ctx, ops),
  ROR: (ctx, _, ops) => executeRor(ctx, ops),
  RCL: (ctx, _, ops) => executeRcl(ctx, ops),
  RCR: (ctx, _, ops) => executeRcr(ctx, ops),

  // ── No-op ────────────────────────────────────────────────
  NOP: () => {},

  // ── Control flow ─────────────────────────────────────────
  JMP: (ctx, _, ops) => executeJmp(ctx, ops),
  JE: (ctx, _, ops) => executeJe(ctx, ops),
  JZ: (ctx, _, ops) => executeJe(ctx, ops),
  JNE: (ctx, _, ops) => executeJne(ctx, ops),
  JNZ: (ctx, _, ops) => executeJne(ctx, ops),
  JG: (ctx, _, ops) => executeJg(ctx, ops),
  JGE: (ctx, _, ops) => executeJge(ctx, ops),
  JL: (ctx, _, ops) => executeJl(ctx, ops),
  JLE: (ctx, _, ops) => executeJle(ctx, ops),
  JS: (ctx, _, ops) => executeJs(ctx, ops),
  JNS: (ctx, _, ops) => executeJns(ctx, ops),
  JA: (ctx, _, ops) => executeJa(ctx, ops),
  JAE: (ctx, _, ops) => executeJae(ctx, ops),
  JB: (ctx, _, ops) => executeJb(ctx, ops),
  JBE: (ctx, _, ops) => executeJbe(ctx, ops),

  // ── Loop variants (mnemonic passed through) ──────────────
  LOOP: (ctx, m) => executeLoop(ctx, m),
  LOOPE: (ctx, m) => executeLoop(ctx, m),
  LOOPZ: (ctx, m) => executeLoop(ctx, m),
  LOOPNE: (ctx, m) => executeLoop(ctx, m),
  LOOPNZ: (ctx, m) => executeLoop(ctx, m),

  // ── Conditional moves ────────────────────────────────────
  CMOVE: (ctx, _, ops) => executeCmov(ctx, ops, () => isZeroFlagSet(ctx.cpu.flags)),
  CMOVZ: (ctx, _, ops) => executeCmov(ctx, ops, () => isZeroFlagSet(ctx.cpu.flags)),
  CMOVNE: (ctx, _, ops) => executeCmov(ctx, ops, () => !isZeroFlagSet(ctx.cpu.flags)),
  CMOVNZ: (ctx, _, ops) => executeCmov(ctx, ops, () => !isZeroFlagSet(ctx.cpu.flags)),
  CMOVL: (ctx, _, ops) =>
    executeCmov(ctx, ops, () => isSignFlagSet(ctx.cpu.flags) !== isOverflowFlagSet(ctx.cpu.flags)),
  CMOVLE: (ctx, _, ops) =>
    executeCmov(
      ctx,
      ops,
      () =>
        isSignFlagSet(ctx.cpu.flags) !== isOverflowFlagSet(ctx.cpu.flags) ||
        isZeroFlagSet(ctx.cpu.flags),
    ),
  CMOVG: (ctx, _, ops) =>
    executeCmov(
      ctx,
      ops,
      () =>
        isSignFlagSet(ctx.cpu.flags) === isOverflowFlagSet(ctx.cpu.flags) &&
        !isZeroFlagSet(ctx.cpu.flags),
    ),
  CMOVGE: (ctx, _, ops) =>
    executeCmov(ctx, ops, () => isSignFlagSet(ctx.cpu.flags) === isOverflowFlagSet(ctx.cpu.flags)),
  CMOVA: (ctx, _, ops) =>
    executeCmov(ctx, ops, () => !isCarryFlagSet(ctx.cpu.flags) && !isZeroFlagSet(ctx.cpu.flags)),
  CMOVAE: (ctx, _, ops) => executeCmov(ctx, ops, () => !isCarryFlagSet(ctx.cpu.flags)),
  CMOVB: (ctx, _, ops) => executeCmov(ctx, ops, () => isCarryFlagSet(ctx.cpu.flags)),
  CMOVBE: (ctx, _, ops) =>
    executeCmov(ctx, ops, () => isCarryFlagSet(ctx.cpu.flags) || isZeroFlagSet(ctx.cpu.flags)),
  CMOVS: (ctx, _, ops) => executeCmov(ctx, ops, () => isSignFlagSet(ctx.cpu.flags)),
  CMOVNS: (ctx, _, ops) => executeCmov(ctx, ops, () => !isSignFlagSet(ctx.cpu.flags)),

  // ── Stack ────────────────────────────────────────────────
  PUSH: (ctx, _, ops) => executePush(ctx, ops),
  POP: (ctx, _, ops) => executePop(ctx, ops),
  CALL: (ctx, _, ops) => executeCall(ctx, ops),
  RET: (ctx) => executeRet(ctx),

  // ── Bit operations ───────────────────────────────────────
  LAHF: (ctx) => executeLahf(ctx),
  SAHF: (ctx) => executeSahf(ctx),
  XADD: (ctx, _, ops) => executeXadd(ctx, ops),
  BSF: (ctx, _, ops) => executeBsf(ctx, ops),
  BSR: (ctx, _, ops) => executeBsr(ctx, ops),
  BSWAP: (ctx, _, ops) => executeBswap(ctx, ops),

  // ── String operations ────────────────────────────────────
  LODSB: (ctx) => executeLods(ctx),
  LODS: (ctx) => executeLods(ctx),
  STOSB: (ctx) => executeStos(ctx),
  STOS: (ctx) => executeStos(ctx),
  MOVSB: (ctx) => executeMovs(ctx),
  MOVS: (ctx) => executeMovs(ctx),
  SCASB: (ctx) => executeScas(ctx),
  SCAS: (ctx) => executeScas(ctx),
  CMPSB: (ctx) => executeCmps(ctx),
  CMPS: (ctx) => executeCmps(ctx),

  // ── Interrupts ───────────────────────────────────────────
  INT: (ctx, _, ops) => executeInt(ctx, ops),
  INT3: (ctx) => executeInt3(ctx),
  IRET: (ctx) => executeIret(ctx),

  // ── Misc ─────────────────────────────────────────────────
  RAND: (ctx, _, ops) => executeRand(ctx, ops),

  // ── Halt ─────────────────────────────────────────────────
  HLT: (ctx) => {
    ctx.cpu.halted = true;
    ctx.cpu.running = false;
  },
};

/**
 * Execute a single instruction given the execution context.
 * Uses a dispatch map for O(1) lookup instead of a switch statement.
 */
export function executeInstruction(
  ctx: ExecutionContext,
  mnemonic: string,
  operands: string[],
): void {
  const upper = mnemonic.toUpperCase();
  const handler = INSTRUCTION_MAP[upper];
  if (handler) {
    handler(ctx, upper, operands);
    return;
  }
  throw new Error(`Unknown instruction: ${mnemonic}`);
}
