import { computeZeroAndSignFlags } from "./arithmetic";

// Flag bit positions
const CF_BIT = 0x01; // Carry flag (bit 0)
const OF_BIT = 0x800; // Overflow flag (bit 11)

/**
 * Update flags for shift instructions (SHL, SHR, SAR).
 * Per x86 specification for shift operations.
 * @param flags - current flags value
 * @param result - the shifted result
 * @param originalValue - the value before shifting
 * @param rawCount - the raw shift count (before masking)
 * @param shiftType - the type of shift operation
 */
export function computeShiftFlags(
  flags: number,
  result: number,
  originalValue: number,
  rawCount: number,
  shiftType: "SHL" | "SHR" | "SAR",
): number {
  // Mask count to 5 bits (0-31) per x86 spec
  const count = rawCount & 0x1f;

  // If count is 0, flags are not affected
  if (count === 0) return flags;

  let f = flags;
  const result32 = result >>> 0;
  const original32 = originalValue >>> 0;

  // Update ZF and SF based on result
  f = computeZeroAndSignFlags(f, result32);

  // CF: Last bit shifted out
  if (shiftType === "SHL") {
    // For left shift, CF gets the bit shifted out from MSB
    if (rawCount <= 32) {
      const cf = (original32 >>> (32 - count)) & 1;
      if (cf) {
        f |= CF_BIT;
      } else {
        f &= ~CF_BIT;
      }
    } else {
      // RawCount > 32, all bits shifted out, CF = 0
      f &= ~CF_BIT;
    }
  } else {
    // For right shifts (SHR, SAR), CF gets the last bit shifted out from LSB
    const cf = (original32 >>> (count - 1)) & 1;
    if (cf) {
      f |= CF_BIT;
    } else {
      f &= ~CF_BIT;
    }
  }

  // OF: Only affected for single-bit shifts
  if (count === 1) {
    if (shiftType === "SHL") {
      // OF = MSB of result XOR CF
      const msb = (result32 >>> 31) & 1;
      const cf = f & CF_BIT ? 1 : 0;
      if (msb !== cf) {
        f |= OF_BIT;
      } else {
        f &= ~OF_BIT;
      }
    } else if (shiftType === "SHR") {
      // OF = MSB of original operand
      const originalMsb = (original32 >>> 31) & 1;
      if (originalMsb) {
        f |= OF_BIT;
      } else {
        f &= ~OF_BIT;
      }
    } else {
      // SAR: OF is always cleared for single-bit shift
      f &= ~OF_BIT;
    }
  } else {
    // OF is undefined for multi-bit shifts (we clear it)
    f &= ~OF_BIT;
  }

  return f;
}
