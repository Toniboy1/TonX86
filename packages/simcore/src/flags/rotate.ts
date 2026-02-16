import type { CompatibilityMode } from "../types";
import { computeZeroAndSignFlags } from "./arithmetic";

// Flag bit positions
const CF_BIT = 0x01; // Carry flag (bit 0)
const OF_BIT = 0x800; // Overflow flag (bit 11)

/**
 * Update flags for rotate instructions (ROL, ROR).
 * Per x86 specification for rotate operations.
 * @param flags - current flags value
 * @param result - the rotated result
 * @param count - the rotate count
 * @param rotateType - the type of rotate operation
 * @param compatibilityMode - current compatibility mode
 */
export function computeRotateFlags(
  flags: number,
  result: number,
  count: number,
  rotateType: "ROL" | "ROR",
  compatibilityMode: CompatibilityMode,
): number {
  // If count is 0, flags are not affected
  if (count === 0) return flags;

  let f = flags;
  const result32 = result >>> 0;

  // CF: Bit rotated into CF
  if (rotateType === "ROL") {
    // For ROL, CF gets the LSB of result (bit rotated from MSB to LSB)
    const cf = result32 & 1;
    if (cf) {
      f |= CF_BIT;
    } else {
      f &= ~CF_BIT;
    }
  } else {
    // For ROR, CF gets the MSB of result (bit rotated from LSB to MSB)
    const cf = (result32 >>> 31) & 1;
    if (cf) {
      f |= CF_BIT;
    } else {
      f &= ~CF_BIT;
    }
  }

  // OF: Only affected for single-bit rotates
  if (count === 1) {
    const msb = (result32 >>> 31) & 1;
    if (rotateType === "ROL") {
      // OF = MSB of result XOR CF
      const cf = f & CF_BIT ? 1 : 0;
      if (msb !== cf) {
        f |= OF_BIT;
      } else {
        f &= ~OF_BIT;
      }
    } else {
      // ROR: OF = MSB XOR (MSB-1)
      const msb1 = (result32 >>> 30) & 1;
      if (msb !== msb1) {
        f |= OF_BIT;
      } else {
        f &= ~OF_BIT;
      }
    }
  } else {
    // OF is undefined for multi-bit rotates (we clear it)
    f &= ~OF_BIT;
  }

  // For educational mode, also update ZF and SF (undefined in strict x86)
  if (compatibilityMode === "educational") {
    f = computeZeroAndSignFlags(f, result32);
  }

  return f;
}
