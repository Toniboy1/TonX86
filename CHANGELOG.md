# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.4.1](https://github.com/Toniboy1/TonX86/compare/v0.4.0...v0.4.1) (2026-02-11)


### Bug Fixes

* fix memory operand dereferencing for CMP, AND, OR, XOR, TEST, MUL, IMUL, DIV, IDIV, MOD, ADD, SUB — instructions now properly read memory values instead of returning 0 ([ffed862](https://github.com/Toniboy1/TonX86/commit/ffed862))
* fix debug adapter freezing by replacing 100k iteration limit with event loop yielding (1000-instruction intervals with 1ms sleep) ([ffed862](https://github.com/Toniboy1/TonX86/commit/ffed862))
* fix LCD dimension detection to use EQU constants (GRID_SIZE/LCD_BASE) for proper 64x64 display support ([ffed862](https://github.com/Toniboy1/TonX86/commit/ffed862))


### Features

* add Snake game example (21-snake.asm) with 64x64 LCD display, keyboard controls, collision detection, food spawning, and start screen ([ffed862](https://github.com/Toniboy1/TonX86/commit/ffed862))
* add resolveSourceValue() helper to simulator for consistent memory operand resolution across all instruction types ([ffed862](https://github.com/Toniboy1/TonX86/commit/ffed862))
* rename example files to academic names (removed test/debug/new suffixes) ([ffed862](https://github.com/Toniboy1/TonX86/commit/ffed862))


### Tests

* expand test suite from 156 to 417 tests (25 debug-adapter + 104 language-server + 288 simcore) ([ffed862](https://github.com/Toniboy1/TonX86/commit/ffed862))


## [0.4.0](https://github.com/Toniboy1/TonX86/compare/v0.3.4...v0.4.0) (2026-02-10)

### [0.3.4](https://github.com/Toniboy1/TonX86/compare/v0.3.3...v0.3.4) (2026-02-10)

### [0.3.3](https://github.com/Toniboy1/TonX86/compare/v0.3.2...v0.3.3) (2026-02-10)


### Features

* add future enhancement issues from x86 realism feedback ([2ddc9c6](https://github.com/Toniboy1/TonX86/commit/2ddc9c68d551e4bd3e335edffe411efde39f084f)), closes [#1](https://github.com/Toniboy1/TonX86/issues/1) [#2](https://github.com/Toniboy1/TonX86/issues/2) [#3](https://github.com/Toniboy1/TonX86/issues/3) [#4](https://github.com/Toniboy1/TonX86/issues/4) [#5](https://github.com/Toniboy1/TonX86/issues/5) [#6](https://github.com/Toniboy1/TonX86/issues/6)

### [0.3.2](https://github.com/Toniboy1/TonX86/compare/v0.3.1...v0.3.2) (2026-02-10)

### [0.3.1](https://github.com/Toniboy1/TonX86/compare/v0.3.0...v0.3.1) (2026-02-10)


### Bug Fixes

* copy LICENSE from root during build step ([d05361d](https://github.com/Toniboy1/TonX86/commit/d05361d3f88155138ae29f835e852f0752b6f8af))


### Documentation

* add marketplace README for extension overview page ([104106a](https://github.com/Toniboy1/TonX86/commit/104106a19e61069d4650c7ad0c2d6e768b0984f7))
* update PR template with cleanup changes details ([4428c2b](https://github.com/Toniboy1/TonX86/commit/4428c2bf8b6c66272cb27fa9f7af82bb0b9ba45c))
