// Flag bit positions
const CF_BIT = 0x01; // Carry flag (bit 0)
const ZF_BIT = 0x40; // Zero flag (bit 6)
const SF_BIT = 0x80; // Sign flag (bit 7)

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
  return (flags & 0x800) !== 0;
}
