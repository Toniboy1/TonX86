import type { CompatibilityMode } from "./types";

// Flag bit positions
const CF_BIT = 0x01; // Carry flag (bit 0)
const ZF_BIT = 0x40; // Zero flag (bit 6)
const SF_BIT = 0x80; // Sign flag (bit 7)
const OF_BIT = 0x800; // Overflow flag (bit 11)

/**
 * Check if the Zero flag (ZF, bit 6) is set
 */
export function isZeroFlagSet(flags: number): boolean {
  return (flags & ZF_BIT) !== 0;
}

/**
 * Check if the Sign flag (SF, bit 7) is set
 */
export function isSignFlagSet(flags: number): boolean {
  return (flags & SF_BIT) !== 0;
}

/**
 * Check if the Carry flag (CF, bit 0) is set
 */
export function isCarryFlagSet(flags: number): boolean {
  return (flags & CF_BIT) !== 0;
}

/**
 * Check if the Overflow flag (OF, bit 11) is set
 */
export function isOverflowFlagSet(flags: number): boolean {
  return (flags & OF_BIT) !== 0;
}

/**
 * Update CPU flags based on result (Zero and Sign only).
 * Used for logical operations that clear C and O flags.
 */
export function computeLogicalFlags(flags: number, result: number): number {
  let f = flags;

  // Set Zero flag if result is zero
  if (result === 0) {
    f |= ZF_BIT;
  } else {
    f &= ~ZF_BIT;
  }

  // Set Sign flag if result is negative (bit 31 set)
  if ((result & 0x80000000) !== 0) {
    f |= SF_BIT;
  } else {
    f &= ~SF_BIT;
  }

  // Clear Carry and Overflow for logical operations
  f &= ~CF_BIT;
  f &= ~OF_BIT;

  return f;
}

/**
 * Update Zero and Sign flags only (helper for other flag methods).
 * @param flags - current flags value
 * @param result - the 32-bit result value
 */
export function computeZeroAndSignFlags(flags: number, result: number): number {
  let f = flags;
  const result32 = result >>> 0;

  // Zero flag (bit 6)
  if (result32 === 0) {
    f |= ZF_BIT;
  } else {
    f &= ~ZF_BIT;
  }

  // Sign flag (bit 7)
  if ((result32 & 0x80000000) !== 0) {
    f |= SF_BIT;
  } else {
    f &= ~SF_BIT;
  }

  return f;
}

/**
 * Update CPU flags based on arithmetic result with Carry and Overflow.
 * Per x86 specification (ref: UVA CS216 x86 Guide).
 * @param flags - current flags value
 * @param result - the masked 32-bit result
 * @param destVal - original destination value (unsigned)
 * @param srcVal - source value (unsigned)
 * @param isSubtraction - true for SUB/CMP/DEC/NEG operations
 */
export function computeArithFlags(
  flags: number,
  result: number,
  destVal: number,
  srcVal: number,
  isSubtraction: boolean,
): number {
  let f = flags;
  const result32 = result >>> 0;
  const dest32 = destVal >>> 0;
  const src32 = srcVal >>> 0;

  // Zero flag (bit 6)
  if (result32 === 0) {
    f |= ZF_BIT;
  } else {
    f &= ~ZF_BIT;
  }

  // Sign flag (bit 7)
  if ((result32 & 0x80000000) !== 0) {
    f |= SF_BIT;
  } else {
    f &= ~SF_BIT;
  }

  // Carry flag (bit 0) - unsigned overflow/borrow
  if (isSubtraction) {
    // CF set if borrow: unsigned src > unsigned dest
    if (src32 > dest32) {
      f |= CF_BIT;
    } else {
      f &= ~CF_BIT;
    }
  } else {
    // CF set if result wrapped (unsigned overflow)
    if (result32 < dest32) {
      f |= CF_BIT;
    } else {
      f &= ~CF_BIT;
    }
  }

  // Overflow flag (bit 11) - signed overflow
  const destSign = (dest32 & 0x80000000) !== 0;
  const srcSign = (src32 & 0x80000000) !== 0;
  const resultSign = (result32 & 0x80000000) !== 0;
  if (isSubtraction) {
    // Overflow if: positive - negative = negative, or negative - positive = positive
    if (destSign !== srcSign && resultSign !== destSign) {
      f |= OF_BIT;
    } else {
      f &= ~OF_BIT;
    }
  } else {
    // Overflow if: positive + positive = negative, or negative + negative = positive
    if (destSign === srcSign && resultSign !== destSign) {
      f |= OF_BIT;
    } else {
      f &= ~OF_BIT;
    }
  }

  return f;
}

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
