import type { ExecutionContext } from "../types";
import { isZeroFlagSet, isSignFlagSet, isCarryFlagSet, isOverflowFlagSet } from "../flags";

// ---------------------------------------------------------------------------
// Jump helpers
// ---------------------------------------------------------------------------

/**
 * Helper function to perform an unconditional jump to a label
 */
function performJump(ctx: ExecutionContext, targetLabel: string): void {
  const targetIndex = ctx.resolveLabel(targetLabel);
  if (targetIndex !== undefined) {
    ctx.setEIP(targetIndex);
  } else {
    throw new Error(`Jump target "${targetLabel}" not found in labels`);
  }
}

/**
 * Helper function to perform a conditional jump
 * Validates label exists first, then checks condition
 */
function performConditionalJump(
  ctx: ExecutionContext,
  targetLabel: string,
  condition: boolean,
): void {
  const targetIndex = ctx.resolveLabel(targetLabel);
  if (targetIndex === undefined) {
    throw new Error(`Jump target "${targetLabel}" not found in labels`);
  }

  if (condition) {
    ctx.setEIP(targetIndex);
  } else {
    ctx.setEIP(ctx.getEIP() + 1);
  }
}

// ---------------------------------------------------------------------------
// Unconditional jump
// ---------------------------------------------------------------------------

export function executeJmp(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  performJump(ctx, operands[0]);
}

// ---------------------------------------------------------------------------
// Conditional jumps
// ---------------------------------------------------------------------------

export function executeJe(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  performConditionalJump(ctx, operands[0], isZeroFlagSet(ctx.cpu.flags));
}

export function executeJne(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  performConditionalJump(ctx, operands[0], !isZeroFlagSet(ctx.cpu.flags));
}

export function executeJg(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  const flags = ctx.cpu.flags;
  performConditionalJump(
    ctx,
    operands[0],
    isSignFlagSet(flags) === isOverflowFlagSet(flags) && !isZeroFlagSet(flags),
  );
}

export function executeJge(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  performConditionalJump(
    ctx,
    operands[0],
    isSignFlagSet(ctx.cpu.flags) === isOverflowFlagSet(ctx.cpu.flags),
  );
}

export function executeJl(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  performConditionalJump(
    ctx,
    operands[0],
    isSignFlagSet(ctx.cpu.flags) !== isOverflowFlagSet(ctx.cpu.flags),
  );
}

export function executeJle(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  const flags = ctx.cpu.flags;
  performConditionalJump(
    ctx,
    operands[0],
    isSignFlagSet(flags) !== isOverflowFlagSet(flags) || isZeroFlagSet(flags),
  );
}

export function executeJs(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  performConditionalJump(ctx, operands[0], isSignFlagSet(ctx.cpu.flags));
}

export function executeJns(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  performConditionalJump(ctx, operands[0], !isSignFlagSet(ctx.cpu.flags));
}

export function executeJa(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  performConditionalJump(
    ctx,
    operands[0],
    !isCarryFlagSet(ctx.cpu.flags) && !isZeroFlagSet(ctx.cpu.flags),
  );
}

export function executeJae(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  performConditionalJump(ctx, operands[0], !isCarryFlagSet(ctx.cpu.flags));
}

export function executeJb(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  performConditionalJump(ctx, operands[0], isCarryFlagSet(ctx.cpu.flags));
}

export function executeJbe(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  performConditionalJump(
    ctx,
    operands[0],
    isCarryFlagSet(ctx.cpu.flags) || isZeroFlagSet(ctx.cpu.flags),
  );
}

// ---------------------------------------------------------------------------
// CALL / RET
// ---------------------------------------------------------------------------

export function executeCall(ctx: ExecutionContext, operands: string[]): void {
  if (operands.length !== 1) return;
  const targetLabel = operands[0];
  const targetIndex = ctx.resolveLabel(targetLabel);

  if (targetIndex !== undefined) {
    const returnAddress = ctx.getEIP() + 1;
    ctx.pushCallStack(returnAddress);
    ctx.pushStack(returnAddress);
    ctx.setEIP(targetIndex);
  } else {
    throw new Error(`CALL target "${targetLabel}" not found in labels`);
  }
}

export function executeRet(ctx: ExecutionContext): void {
  const returnAddress = ctx.popCallStack();
  if (returnAddress !== undefined) {
    ctx.popStack();
    ctx.setEIP(returnAddress);
  } else {
    // No return address on call stack, just advance EIP
    ctx.setEIP(ctx.getEIP() + 1);
  }
}

// ---------------------------------------------------------------------------
// LOOP / LOOPE / LOOPNE
// ---------------------------------------------------------------------------

export function executeLoop(ctx: ExecutionContext, _mnemonic: string): void {
  // Decrement ECX
  ctx.cpu.registers[1] = (ctx.cpu.registers[1] - 1) & 0xffffffff;
  // Branch decision is handled in Simulator.step()
}

// ---------------------------------------------------------------------------
// CMOVxx - Conditional moves
// ---------------------------------------------------------------------------

export function executeCmov(
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
