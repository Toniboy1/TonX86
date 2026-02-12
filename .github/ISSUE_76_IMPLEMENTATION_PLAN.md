# Issue #76: Implement Accurate x86 Flag Semantics for Strict Mode

## Status: Planning Phase
**Target Version:** v0.6.0  
**Priority:** Medium  
**Complexity:** High

## Overview

Implement correct CF, OF, ZF, SF behavior for arithmetic, logical, shift, and CMP instructions that matches real x86 processor behavior when `compatibilityMode` is set to `"strict-x86"`. Maintain backward compatibility with `"educational"` mode.

## Current Implementation

### Existing Flag System
- **Location:** `packages/simcore/src/simulator.ts`
- **Flag Register:** `cpu.flags` (32-bit integer)
- **Flag Bits:**
  - Bit 0: CF (Carry Flag)
  - Bit 6: ZF (Zero Flag)
  - Bit 7: SF (Sign Flag)
  - Bit 11: OF (Overflow Flag)

### Current Flag Methods
1. `updateFlags(result)` - For logical operations (AND, OR, XOR, shifts, rotates)
   - Sets ZF, SF correctly
   - **Issue:** Always clears CF and OF (incorrect for shifts/rotates)
   
2. `updateFlagsArith(result, dest, src, isSub)` - For arithmetic (ADD, SUB, CMP, INC, DEC)
   - Sets ZF, SF, CF, OF
   - **Status:** Generally correct for ADD/SUB
   - **Issue:** Edge cases need verification

### Compatibility Mode Support
- Two modes: `"educational"` (default) and `"strict-x86"`
- Currently only affects MOV instruction (memory-to-memory restriction)
- Flag behavior is the same in both modes

## Problems to Fix

### 1. Shift Instructions (SHL, SHR, SAR) - **HIGH PRIORITY**

**Current Behavior:**
```typescript
// In updateFlags() - called after shifts
this.cpu.flags &= ~0x01; // Clears CF unconditionally
this.cpu.flags &= ~0x800; // Clears OF unconditionally
```

**x86 Specification:**
- **CF:** Should contain the last bit shifted out
- **OF:** For single-bit shifts only:
  - SHL: OF = (MSB of result) XOR CF
  - SHR: OF = MSB of original operand
  - SAR: OF = 0 (always cleared)
- **AF:** Undefined (we don't implement AF)
- **ZF, SF, PF:** Set according to result (we handle ZF, SF correctly)

**Required Changes:**
```typescript
// New method needed:
private updateFlagsShift(
  result: number,
  originalValue: number,
  count: number,
  shiftType: 'SHL' | 'SHR' | 'SAR'
): void {
  // Only update flags if count > 0
  if (count === 0) return;
  
  // ZF and SF - current implementation OK
  this.updateZeroAndSignFlags(result);
  
  // CF: Last bit shifted out
  if (shiftType === 'SHL') {
    // CF gets the bit that was shifted out from MSB
    const cf = (originalValue >>> (32 - count)) & 1;
    if (cf) this.cpu.flags |= 0x01;
    else this.cpu.flags &= ~0x01;
  } else { // SHR or SAR
    // CF gets the bit that was shifted out from LSB
    const cf = (originalValue >>> (count - 1)) & 1;
    if (cf) this.cpu.flags |= 0x01;
    else this.cpu.flags &= ~0x01;
  }
  
  // OF: Only for single-bit shifts
  if (count === 1) {
    if (shiftType === 'SHL') {
      const msb = (result >>> 31) & 1;
      const cf = (this.cpu.flags & 0x01) ? 1 : 0;
      if (msb !== cf) this.cpu.flags |= 0x800;
      else this.cpu.flags &= ~0x800;
    } else if (shiftType === 'SHR') {
      const originalMsb = (originalValue >>> 31) & 1;
      if (originalMsb) this.cpu.flags |= 0x800;
      else this.cpu.flags &= ~0x800;
    } else { // SAR
      this.cpu.flags &= ~0x800; // Always cleared
    }
  } else {
    // OF undefined for multi-bit shifts (clear it)
    this.cpu.flags &= ~0x800;
  }
}
```

### 2. Rotate Instructions (ROL, ROR) - **HIGH PRIORITY**

**Current Behavior:**
- Uses `updateFlags()` which clears CF and OF

**x86 Specification:**
- **CF:** Should contain the bit rotated from one end to the other
- **OF:** For single-bit rotates only:
  - ROL: OF = (MSB of result) XOR CF
  - ROR: OF = (MSB of result) XOR (MSB-1 of result)
- **ZF, SF, PF, AF:** Undefined (but we can keep setting ZF, SF for educational purposes)

**Required Changes:**
```typescript
private updateFlagsRotate(
  result: number,
  count: number,
  rotateType: 'ROL' | 'ROR'
): void {
  if (count === 0) return;
  
  // CF: Bit rotated into CF
  if (rotateType === 'ROL') {
    // CF gets LSB of result (bit that was rotated from MSB)
    const cf = result & 1;
    if (cf) this.cpu.flags |= 0x01;
    else this.cpu.flags &= ~0x01;
  } else { // ROR
    // CF gets MSB of result (bit that was rotated from LSB)
    const cf = (result >>> 31) & 1;
    if (cf) this.cpu.flags |= 0x01;
    else this.cpu.flags &= ~0x01;
  }
  
  // OF: Only for single-bit rotates
  if (count === 1) {
    const msb = (result >>> 31) & 1;
    if (rotateType === 'ROL') {
      const cf = (this.cpu.flags & 0x01) ? 1 : 0;
      if (msb !== cf) this.cpu.flags |= 0x800;
      else this.cpu.flags &= ~0x800;
    } else { // ROR
      const msb1 = (result >>> 30) & 1;
      if (msb !== msb1) this.cpu.flags |= 0x800;
      else this.cpu.flags &= ~0x800;
    }
  } else {
    // OF undefined for multi-bit rotates
    this.cpu.flags &= ~0x800;
  }
  
  // Optional: Keep ZF and SF for educational purposes
  // (undefined in real x86 but useful for learning)
  if (this.compatibilityMode === 'educational') {
    this.updateZeroAndSignFlags(result);
  }
}
```

### 3. NEG Instruction - **MEDIUM PRIORITY**

**Current Behavior:**
```typescript
case "NEG":
  const result = (0 - destVal) & 0xffffffff;
  this.cpu.registers[dest.value] = result;
  this.updateFlagsArith(result, 0, destVal, true);
```

**x86 Specification:**
- **CF:** Set if source operand is NOT zero (CF = source != 0)
- **OF, SF, ZF, AF, PF:** Same as SUB from zero

**Required Fix:**
```typescript
case "NEG":
  const destVal = this.cpu.registers[dest.value];
  const result = (0 - destVal) & 0xffffffff;
  this.cpu.registers[dest.value] = result;
  
  // NEG has special CF behavior
  if (destVal !== 0) {
    this.cpu.flags |= 0x01;  // CF = 1 if source != 0
  } else {
    this.cpu.flags &= ~0x01; // CF = 0 if source == 0
  }
  
  // Other flags: treat as SUB 0, src (but CF already set above)
  const savedCF = this.cpu.flags & 0x01;
  this.updateFlagsArith(result, 0, destVal, true);
  // Restore our special CF
  this.cpu.flags = (this.cpu.flags & ~0x01) | savedCF;
```

### 4. INC/DEC Instructions - **MEDIUM PRIORITY**

**Current Behavior:**
```typescript
case "INC":
  const savedCarry = this.cpu.flags & 0x01;
  // ... increment ...
  this.updateFlagsArith(result, destVal, 1, false);
  this.cpu.flags = (this.cpu.flags & ~0x01) | savedCarry; // Restore CF
```

**Status:** ✅ **CORRECT** - INC/DEC preserve CF as per x86 spec

### 5. Logical Instructions (AND, OR, XOR, TEST) - **LOW PRIORITY**

**Current Behavior:**
```typescript
private updateFlags(result: number): void {
  // Set ZF, SF
  // Clear CF and OF
}
```

**x86 Specification:**
- **CF, OF:** Cleared
- **ZF, SF, PF:** Set according to result
- **AF:** Undefined

**Status:** ✅ **CORRECT** - Current implementation matches x86 spec

### 6. Multiply Instructions (MUL, IMUL) - **LOW PRIORITY**

**Current Behavior:**
```typescript
case "MUL":
  const result = (this.cpu.registers[0] >>> 0) * srcValue;
  this.cpu.registers[0] = (result & 0xffffffff) >>> 0;
  this.cpu.registers[2] = ((result / 0x100000000) | 0) >>> 0;
  this.updateFlags(this.cpu.registers[0]); // Only checks lower 32 bits
```

**x86 Specification:**
- **CF, OF:** Set if upper half (EDX) is non-zero
- **ZF, SF, AF, PF:** Undefined (but we set ZF, SF for educational purposes)

**Required Fix:**
```typescript
case "MUL":
  const result = (this.cpu.registers[0] >>> 0) * srcValue;
  const lower = (result & 0xffffffff) >>> 0;
  const upper = ((result / 0x100000000) | 0) >>> 0;
  this.cpu.registers[0] = lower;
  this.cpu.registers[2] = upper;
  
  // CF and OF: Set if upper half is non-zero
  if (upper !== 0) {
    this.cpu.flags |= 0x01;   // Set CF
    this.cpu.flags |= 0x800;  // Set OF
  } else {
    this.cpu.flags &= ~0x01;  // Clear CF
    this.cpu.flags &= ~0x800; // Clear OF
  }
  
  // ZF, SF: Keep for educational mode
  if (this.compatibilityMode === 'educational') {
    this.updateZeroAndSignFlags(lower);
  } else {
    // In strict mode, these are undefined - could clear them
    this.cpu.flags &= ~0x40;  // Clear ZF
    this.cpu.flags &= ~0x80;  // Clear SF
  }
```

### 7. Divide Instructions (DIV, IDIV) - **LOW PRIORITY**

**Current Behavior:**
- Sets ZF and SF based on quotient

**x86 Specification:**
- **ALL FLAGS UNDEFINED** after DIV/IDIV

**Required Fix:**
```typescript
case "DIV":
case "IDIV":
  // ... perform division ...
  
  if (this.compatibilityMode === 'educational') {
    // Keep current behavior for learning
    this.updateFlags(this.cpu.registers[0]);
  } else {
    // In strict-x86 mode, all flags are undefined
    // Options:
    // 1. Leave flags unchanged
    // 2. Clear all flags
    // 3. Clear only CF and OF (common practice)
    this.cpu.flags &= ~0x01;   // Clear CF
    this.cpu.flags &= ~0x800;  // Clear OF
  }
```

### 8. CMP Instruction - **LOW PRIORITY**

**Current Behavior:**
```typescript
case "CMP":
  this.updateFlagsArith(result, destValue, srcValue, true);
```

**Status:** ✅ **CORRECT** - CMP is SUB without storing result

## Implementation Strategy

### Phase 1: Core Infrastructure (Week 1)
1. Add helper method `updateZeroAndSignFlags(result)` - extract from `updateFlags()`
2. Create new methods:
   - `updateFlagsShift(result, original, count, type)`
   - `updateFlagsRotate(result, count, type)`
   - `updateFlagsMultiply(lower, upper)`
3. Update documentation in comments

### Phase 2: Shift/Rotate Instructions (Week 1-2)
1. Update SHL instruction to use `updateFlagsShift()`
2. Update SHR instruction to use `updateFlagsShift()`
3. Update SAR instruction to use `updateFlagsShift()`
4. Update ROL instruction to use `updateFlagsRotate()`
5. Update ROR instruction to use `updateFlagsRotate()`

### Phase 3: Arithmetic Instructions (Week 2)
1. Fix NEG special CF handling
2. Review/verify INC/DEC CF preservation
3. Update MUL/IMUL CF/OF behavior
4. Update DIV/IDIV undefined flags handling

### Phase 4: Testing (Week 2-3)
1. Add comprehensive flag tests for each instruction category:
   - `test_flags_shifts.test.ts` - SHL, SHR, SAR edge cases
   - `test_flags_rotates.test.ts` - ROL, ROR edge cases
   - `test_flags_arithmetic.test.ts` - NEG, MUL, DIV edge cases
2. Test cases should include:
   - Zero count shifts/rotates
   - Single-bit shifts/rotates (OF behavior)
   - Multi-bit shifts/rotates
   - Boundary values (0, 0xFFFFFFFF, 0x80000000)
   - Both compatibility modes

### Phase 5: Documentation (Week 3)
1. Update `simcore.prompt.md` with accurate flag behavior
2. Update `ISA.md` with flag semantics for each instruction
3. Add "Flag Behavior" section to README
4. Document differences between educational and strict-x86 modes

## Test Cases Required

### Shift Instructions
```typescript
describe('SHL Flag Behavior', () => {
  test('CF gets last bit shifted out', () => {
    // SHL 0x80000000, 1 -> CF=1
  });
  
  test('OF set correctly for single-bit shift', () => {
    // SHL 0x40000000, 1 -> OF=1 (MSB changed)
  });
  
  test('Zero count preserves flags', () => {
    // Set flags, SHL reg, 0 -> flags unchanged
  });
});
```

### Rotate Instructions
```typescript
describe('ROL Flag Behavior', () => {
  test('CF gets bit rotated into LSB', () => {
    // ROL 0x80000001, 1 -> CF=1
  });
  
  test('OF set correctly for single-bit rotate', () => {
    // ROL 0x80000000, 1 -> OF should be set
  });
});
```

### NEG Instruction
```typescript
describe('NEG Flag Behavior', () => {
  test('CF set when negating non-zero', () => {
    // NEG 1 -> CF=1
  });
  
  test('CF clear when negating zero', () => {
    // NEG 0 -> CF=0
  });
});
```

### Multiply Instructions
```typescript
describe('MUL Flag Behavior', () => {
  test('CF and OF set when result needs upper bits', () => {
    // MUL large_value -> CF=1, OF=1 if EDX != 0
  });
  
  test('CF and OF clear when result fits in EAX', () => {
    // MUL 2 -> CF=0, OF=0 if EDX == 0
  });
});
```

## Compatibility Mode Strategy

### Educational Mode (Current Default)
- **Goal:** Easy to understand, predictable flag behavior
- **Approach:**
  - Keep ZF and SF for all instructions (even when undefined in x86)
  - Implement correct CF and OF where it matters for conditionals
  - Document deviations from strict x86

### Strict-x86 Mode
- **Goal:** Match real x86 processor behavior exactly
- **Approach:**
  - Follow Intel/AMD manuals precisely
  - Leave flags undefined when x86 spec says "undefined"
  - Required for students transitioning to real assembly

## Success Criteria

1. ✅ All shift instructions set CF to last bit shifted out
2. ✅ All rotate instructions set CF correctly
3. ✅ Single-bit shifts/rotates set OF according to x86 spec
4. ✅ NEG sets CF only for non-zero values
5. ✅ MUL/IMUL set CF/OF based on upper 32 bits
6. ✅ 100+ new flag behavior tests pass
7. ✅ All existing tests still pass
8. ✅ All 27 example programs still work
9. ✅ Documentation updated with flag semantics
10. ✅ Both compatibility modes tested thoroughly

## References

- [Intel® 64 and IA-32 Architectures Software Developer's Manual](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
- [x86 Assembly Guide - UVA CS216](https://www.cs.virginia.edu/~evans/cs216/guides/x86.html)
- [x86 Instruction Set Reference](https://www.felixcloutier.com/x86/)

## Estimated Effort

- **Development:** 2-3 weeks
- **Testing:** 1 week
- **Documentation:** 3-5 days
- **Total:** 3-4 weeks for complete implementation

## Breaking Changes

None - this is additive enhancement that maintains backward compatibility in educational mode.

## Migration Path

1. Default mode remains `"educational"` - existing code unchanged
2. Users wanting strict x86 behavior opt-in via settings: `tonx86.compatibility.mode: "strict-x86"`
3. Language server could add diagnostics warning about undefined flag usage

## Future Enhancements

Beyond this issue scope:
- **Parity Flag (PF)** - Not currently implemented
- **Auxiliary Carry (AF)** - Not currently implemented  
- **Direction Flag (DF)** - For string operations (MOVS, STOS, etc.)
- **Trap Flag (TF)** - For single-step debugging
