# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.5.0](https://github.com/Toniboy1/TonX86/compare/v0.4.5...v0.5.0) (2026-02-19)


### Features

* Add memory-mapped audio device with PC Speaker style support ([#106](https://github.com/Toniboy1/TonX86/issues/106)) ([f7aaf76](https://github.com/Toniboy1/TonX86/commit/f7aaf7603685739535c982c686efad603f9046ca)), closes [#84](https://github.com/Toniboy1/TonX86/issues/84)

### [0.4.5](https://github.com/Toniboy1/TonX86/compare/v0.4.4...v0.4.5) (2026-02-15)

### Documentation

- add x86 assembly reference source and addressing modes documentation ([c4f3d26](https://github.com/Toniboy1/TonX86/commit/c4f3d267a50c9a1ed2cd34820834a7a44a88c9bd)), closes [/notes.shichao.io/asm/#x86](https://github.com/Toniboy1/TonX86/issues/x86)

### [0.4.4](https://github.com/Toniboy1/TonX86/compare/v0.4.3...v0.4.4) (2026-02-15)

### [0.4.3](https://github.com/Toniboy1/TonX86/compare/v0.4.2...v0.4.3) (2026-02-14)

### Features

- Add assembler directives support (.text, .data, DB/DW/DD, ORG, EQU)give me the markdown to copy paste with the data ([#82](https://github.com/Toniboy1/TonX86/issues/82)) ([9cfde6a](https://github.com/Toniboy1/TonX86/commit/9cfde6a30b60baa5d26472b3bb1e5d4977ac35d7)), closes [#77](https://github.com/Toniboy1/TonX86/issues/77)
- implement accurate x86 flag semantics and fix all ESLint warnings ([#76](https://github.com/Toniboy1/TonX86/issues/76)) ([2696fd6](https://github.com/Toniboy1/TonX86/commit/2696fd65603bc1b6bf201a29c97f151d1f09686d))

### Documentation

- remove redundant root-level summary files ([f24cc71](https://github.com/Toniboy1/TonX86/commit/f24cc7194ec80d872c483452b04eca56d462ee91))

## [0.6.0](https://github.com/Toniboy1/TonX86/compare/v0.4.2...v0.6.0) (2026-02-12)

### Features

- **flags**: implement accurate x86 flag semantics for shift, rotate, NEG, and multiply instructions ([#76](https://github.com/Toniboy1/TonX86/issues/76))
  - Add 4 new flag helper methods to simulator (`updateZeroAndSignFlags`, `updateFlagsShift`, `updateFlagsRotate`, `updateFlagsMultiply`)
  - **SHL**: CF now set to last bit shifted out, OF = (MSB XOR CF) for single-bit shifts
  - **SHR**: CF set to last bit shifted out, OF = original MSB for single-bit shifts
  - **SAR**: CF set to last bit shifted out, OF always cleared for single-bit shifts
  - **ROL**: CF set to bit rotated to LSB, OF = (MSB XOR CF) for single-bit rotates
  - **ROR**: CF set to bit rotated to MSB, OF = (bit31 XOR bit30) for single-bit rotates
  - **NEG**: CF behavior corrected (CF = source != 0, per x86 spec)
  - **MUL/IMUL**: CF/OF now set based on upper 32 bits (EDX) or result truncation
  - **INC/DEC**: Verified CF preservation (no modification to carry flag)
  - **AND/OR/XOR**: Verified CF/OF are always cleared
  - Maintains backward compatibility through educational mode (default behavior)
  - Compatibility mode system supports "strict-x86" for exact x86 behavior

### Tests

- add 32 comprehensive flag behavior tests covering all updated instructions
- expand test suite from 428 to 460 tests (25 debug-adapter + 104 language-server + 331 simcore)

### Documentation

- update ISA.md with detailed flag behavior for all affected instructions
- document CF/OF semantics for shifts, rotates, NEG, and multiply operations
- clarify INC/DEC CF preservation behavior
- add notes on logical instruction flag clearing behavior

### [0.4.2](https://github.com/Toniboy1/TonX86/compare/v0.4.1...v0.4.2) (2026-02-11)

### [0.4.1](https://github.com/Toniboy1/TonX86/compare/v0.4.0...v0.4.1) (2026-02-11)

### Bug Fixes

- fix memory operand dereferencing for CMP, AND, OR, XOR, TEST, MUL, IMUL, DIV, IDIV, MOD, ADD, SUB — instructions now properly read memory values instead of returning 0 ([ffed862](https://github.com/Toniboy1/TonX86/commit/ffed862))
- fix debug adapter freezing by replacing 100k iteration limit with event loop yielding (1000-instruction intervals with 1ms sleep) ([ffed862](https://github.com/Toniboy1/TonX86/commit/ffed862))
- fix LCD dimension detection to use EQU constants (GRID_SIZE/LCD_BASE) for proper 64x64 display support ([ffed862](https://github.com/Toniboy1/TonX86/commit/ffed862))

### Features

- add Snake game example (21-snake.asm) with 64x64 LCD display, keyboard controls, collision detection, food spawning, and start screen ([ffed862](https://github.com/Toniboy1/TonX86/commit/ffed862))
- add resolveSourceValue() helper to simulator for consistent memory operand resolution across all instruction types ([ffed862](https://github.com/Toniboy1/TonX86/commit/ffed862))
- rename example files to academic names (removed test/debug/new suffixes) ([ffed862](https://github.com/Toniboy1/TonX86/commit/ffed862))

### Tests

- expand test suite from 156 to 417 tests (25 debug-adapter + 104 language-server + 288 simcore) ([ffed862](https://github.com/Toniboy1/TonX86/commit/ffed862))

## [0.4.0](https://github.com/Toniboy1/TonX86/compare/v0.3.4...v0.4.0) (2026-02-10)

### [0.3.4](https://github.com/Toniboy1/TonX86/compare/v0.3.3...v0.3.4) (2026-02-10)

### [0.3.3](https://github.com/Toniboy1/TonX86/compare/v0.3.2...v0.3.3) (2026-02-10)

### Features

- add future enhancement issues from x86 realism feedback ([2ddc9c6](https://github.com/Toniboy1/TonX86/commit/2ddc9c68d551e4bd3e335edffe411efde39f084f)), closes [#1](https://github.com/Toniboy1/TonX86/issues/1) [#2](https://github.com/Toniboy1/TonX86/issues/2) [#3](https://github.com/Toniboy1/TonX86/issues/3) [#4](https://github.com/Toniboy1/TonX86/issues/4) [#5](https://github.com/Toniboy1/TonX86/issues/5) [#6](https://github.com/Toniboy1/TonX86/issues/6)

### [0.3.2](https://github.com/Toniboy1/TonX86/compare/v0.3.1...v0.3.2) (2026-02-10)

### [0.3.1](https://github.com/Toniboy1/TonX86/compare/v0.3.0...v0.3.1) (2026-02-10)

### Bug Fixes

- copy LICENSE from root during build step ([d05361d](https://github.com/Toniboy1/TonX86/commit/d05361d3f88155138ae29f835e852f0752b6f8af))

### Documentation

- add marketplace README for extension overview page ([104106a](https://github.com/Toniboy1/TonX86/commit/104106a19e61069d4650c7ad0c2d6e768b0984f7))
- update PR template with cleanup changes details ([4428c2b](https://github.com/Toniboy1/TonX86/commit/4428c2bf8b6c66272cb27fa9f7af82bb0b9ba45c))
