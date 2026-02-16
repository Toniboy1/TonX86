// Flag bit positions
const CF_BIT = 0x01; // Carry flag (bit 0)
const ZF_BIT = 0x40; // Zero flag (bit 6)
const SF_BIT = 0x80; // Sign flag (bit 7)
const OF_BIT = 0x800; // Overflow flag (bit 11)

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
