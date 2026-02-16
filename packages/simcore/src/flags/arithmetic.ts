// Flag bit positions
const CF_BIT = 0x01; // Carry flag (bit 0)
const ZF_BIT = 0x40; // Zero flag (bit 6)
const SF_BIT = 0x80; // Sign flag (bit 7)
const OF_BIT = 0x800; // Overflow flag (bit 11)

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
