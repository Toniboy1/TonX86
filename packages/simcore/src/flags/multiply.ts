import type { CompatibilityMode } from "../types";
import { computeZeroAndSignFlags } from "./arithmetic";

// Flag bit positions
const CF_BIT = 0x01; // Carry flag (bit 0)
const ZF_BIT = 0x40; // Zero flag (bit 6)
const SF_BIT = 0x80; // Sign flag (bit 7)
const OF_BIT = 0x800; // Overflow flag (bit 11)

/**
 * Update flags for multiply instructions (MUL, IMUL).
 * Per x86 specification for multiplication.
 * @param flags - current flags value
 * @param lower - lower 32 bits of result (in EAX)
 * @param upper - upper 32 bits of result (in EDX)
 * @param compatibilityMode - current compatibility mode
 */
export function computeMultiplyFlags(
  flags: number,
  lower: number,
  upper: number,
  compatibilityMode: CompatibilityMode,
): number {
  let f = flags;
  const upper32 = upper >>> 0;

  // CF and OF: Set if upper half is non-zero
  if (upper32 !== 0) {
    f |= CF_BIT;
    f |= OF_BIT;
  } else {
    f &= ~CF_BIT;
    f &= ~OF_BIT;
  }

  // ZF and SF: Keep for educational mode (undefined in strict x86)
  if (compatibilityMode === "educational") {
    f = computeZeroAndSignFlags(f, lower);
  } else {
    // In strict-x86 mode, ZF and SF are undefined - clear them
    f &= ~ZF_BIT;
    f &= ~SF_BIT;
  }

  return f;
}
