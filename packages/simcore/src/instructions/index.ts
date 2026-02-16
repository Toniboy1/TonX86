import type { ExecutionContext } from "../types";
import {
  isZeroFlagSet,
  isSignFlagSet,
  isCarryFlagSet,
  isOverflowFlagSet,
} from "../flags";

import {
  executeMov,
  executeXchg,
  executeLea,
  executeMovzx,
  executeMovsx,
} from "./data-movement";
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
import {
  executeAnd,
  executeOr,
  executeXor,
  executeNot,
  executeTest,
} from "./logical";
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
import {
  executeLods,
  executeStos,
  executeMovs,
  executeScas,
  executeCmps,
} from "./string-ops";
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
      executeJmp(ctx, operands);
      break;

    case "JE": // fall-through: JE is alias for JZ (Jump if Equal / Jump if Zero)
    case "JZ":
      executeJe(ctx, operands);
      break;

    case "JNE": // fall-through: JNE is alias for JNZ (Jump if Not Equal / Jump if Not Zero)
    case "JNZ":
      executeJne(ctx, operands);
      break;

    case "JG":
      executeJg(ctx, operands);
      break;

    case "JGE":
      executeJge(ctx, operands);
      break;

    case "JL":
      executeJl(ctx, operands);
      break;

    case "JLE":
      executeJle(ctx, operands);
      break;

    case "JS":
      executeJs(ctx, operands);
      break;

    case "JNS":
      executeJns(ctx, operands);
      break;

    case "JA":
      executeJa(ctx, operands);
      break;

    case "JAE":
      executeJae(ctx, operands);
      break;

    case "JB":
      executeJb(ctx, operands);
      break;

    case "JBE":
      executeJbe(ctx, operands);
      break;

    case "LOOP": // fall-through: all LOOP variants share one handler, mnemonic differentiates
    case "LOOPE":
    case "LOOPZ": // alias for LOOPE
    case "LOOPNE":
    case "LOOPNZ": // alias for LOOPNE
      executeLoop(ctx, mnemonic);
      break;

    case "CMOVE": // fall-through: CMOVE is alias for CMOVZ (Move if Equal / Move if Zero)
    case "CMOVZ":
      executeCmov(ctx, operands, () => isZeroFlagSet(ctx.cpu.flags));
      break;

    case "CMOVNE": // fall-through: CMOVNE is alias for CMOVNZ (Move if Not Equal / Not Zero)
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
      executeCall(ctx, operands);
      break;

    case "RET":
      executeRet(ctx);
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

    case "LODSB": // fall-through: LODSB is alias for LODS (Load String Byte)
    case "LODS":
      executeLods(ctx);
      break;

    case "STOSB": // fall-through: STOSB is alias for STOS (Store String Byte)
    case "STOS":
      executeStos(ctx);
      break;

    case "MOVSB": // fall-through: MOVSB is alias for MOVS (Move String Byte)
    case "MOVS":
      executeMovs(ctx);
      break;

    case "SCASB": // fall-through: SCASB is alias for SCAS (Scan String Byte)
    case "SCAS":
      executeScas(ctx);
      break;

    case "CMPSB": // fall-through: CMPSB is alias for CMPS (Compare String Byte)
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
      executeIret(ctx);
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
