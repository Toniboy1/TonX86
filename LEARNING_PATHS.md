# Learning Paths

This guide outlines structured learning paths for different skill levels and goals.

## Path 1: Absolute Beginner (No Assembly Experience)

**Duration:** 4-6 hours  
**Goal:** Understand x86 assembly fundamentals

### Week 1-2: Foundations

**Topics:**

- Registers and their purposes
- Basic instructions (MOV, ADD, SUB)
- Memory addressing
- Flags and comparisons

**Activities:**

1. Read [GETTING_STARTED.md](GETTING_STARTED.md)
2. Follow [Instruction Set Reference](packages/docs/ISA.md) for `MOV` and `ADD`
3. Run and modify examples:
   - `examples/01-basic-instructions.asm` - Basic arithmetic
   - `examples/20-flags.asm` - CPU flags
4. **Exercise:** Write a program that:
   - Loads two numbers into registers
   - Adds them
   - Stores result in memory

### Week 3: Control Flow

**Topics:**

- Labels and jumps
- Conditional jumps (JE, JNE, JL, JG, etc.)
- Conditionals with CMP

**Activities:**

1. Study [ISA.md](packages/docs/ISA.md) section on jumps
2. Run examples:
   - `examples/02-jumps.asm` - All jump types
   - `examples/15-all-jumps.asm` - Comprehensive jump reference
3. **Exercise:** Write a program that:
   - Creates a simple loop (count 1-10)
   - Uses conditional jump to loop
   - Uses CMP to check conditions

### Week 4: Functions & Stack

**Topics:**

- Stack (PUSH/POP)
- CALL and RET instructions
- Return values
- Local variables

**Activities:**

1. Study examples:
   - `examples/03-call-ret.asm` - Simple function calls
   - `examples/04-stack.asm` - Stack operations
   - `examples/06-nested-calls.asm` - Nested function calls
2. **Exercise:** Write a function that:
   - Takes a value as parameter (pass via register)
   - Performs a calculation
   - Returns result in EAX
   - Call it from main

**You're ready for:** Path 2 (Intermediate), or continue with exercises

---

## Path 2: Intermediate (Basic Assembly Knowledge)

**Duration:** 3-5 hours  
**Prerequisite:** Completed Path 1 or similar knowledge

### Phase 1: Advanced Instructions

**Topics:**

- Bitwise operations (AND, OR, XOR, NOT)
- Shift/rotate operations
- Multiplication and division
- String operations

**Activities:**

1. Study examples:
   - `examples/09-bitwise.asm` - AND, OR, XOR, NOT
   - `examples/12-shift-rotate.asm` - SHL, SHR, ROL, ROR
   - `examples/11-multiply-divide.asm` - MUL, IMUL, DIV, IDIV
2. **Exercise:** Write bit manipulation functions:
   - Check if bit N is set
   - Set bit N
   - Clear bit N
   - Rotate left/right

### Phase 2: Memory & Data Structures

**Topics:**

- Different addressing modes
- Data section
- Constants and labels
- Arrays and structures

**Activities:**

1. Study examples:
   - `examples/05-memory.asm` - Memory addressing modes
   - `examples/26-data-section.asm` - Data definitions
   - `examples/28-sections-complete.asm` - Multiple sections
2. **Exercise:** Build a simple data structure:
   - Define an array of numbers
   - Write a function to sum array elements
   - Return total in EAX

### Phase 3: I/O and Interrupts

**Topics:**

- Memory-mapped I/O
- LCD display
- Keyboard input
- Interrupt handling (INT)

**Activities:**

1. Study examples:
   - `examples/08-lcd.asm` - LCD display programming
   - `examples/14-keyboard.asm` - Keyboard input
   - `examples/07-interrupts.asm` - Basic interrupts
   - `examples/16-interrupts-all.asm` - All interrupts
2. **Exercise:** Create an interactive program:
   - Display a pattern on LCD
   - Read keyboard input
   - Update display based on input

**You're ready for:** Path 3 (Advanced), or build projects

---

## Path 3: Advanced (Strong Assembly Skills)

**Duration:** 5+ hours  
**Prerequisite:** Completed Path 2 or equivalent experience

### Phase 1: Game Development

**Topics:**

- Game loop structure
- Sprite positioning
- Collision detection
- Game state management

**Activities:**

1. Study `examples/21-snake.asm`:
   - Understand game structure
   - Study collision detection
   - Review keyboard handling
2. **Project:** Build your own game:
   - Pong: Two paddles, one ball
   - Breakout: Ball breaks bricks
   - Maze: Navigate a maze
   - Pick your favorite!

### Phase 2: Performance Optimization

**Topics:**

- CPU speed control
- Efficient loops
- Register allocation
- Cache considerations

**Activities:**

1. Write algorithm implementations:
   - Bubble sort
   - Binary search
   - Fibonacci sequence
2. Time execution and optimize:
   - Reduce instruction count
   - Minimize memory access
   - Use faster instructions

### Phase 3: Strict x86 Compliance

**Topics:**

- Real x86 constraints
- Memory operand restrictions
- Segment registers (overview)
- Flag behavior accuracy

**Activities:**

1. Switch to `strict-x86` mode
2. Port your programs to follow real x86 rules
3. Study real x86 assembly:
   - Read `examples/` in strict-x86 compatible versions
   - Understand memory-to-register restrictions

**You're ready for:** Real x86 assembly, contributing to TonX86

---

## Path 4: Teacher/Educator

**Duration:** Variable  
**Goal:** Use TonX86 in classroom or training

### Preparation

1. **Master TonX86:**
   - Complete Path 1 (absolutely essential)
   - Complete Path 2 (recommended)
2. **Prepare materials:**
   - Review all examples
   - Understand [CONTRIBUTING.md](../CONTRIBUTING.md) for extension mechanisms
   - Know where documentation is

### Teaching Guide

**Lesson 1 (30 min): Introduction**

- What is assembly? Why learn it?
- Overview of TonX86 features
- Quick demo: Run `examples/01-basic-instructions.asm`

**Lesson 2 (45 min): Registers & Instructions**

- Show register view in debugger
- Live walkthrough of `examples/01-basic-instructions.asm`
- Students: Modify and re-run

**Lesson 3 (45 min): Control Flow**

- Explain CMP, jumps
- Step through `examples/02-jumps.asm` together
- Students: Implement a loop exercise

**Lesson 4 (1 hour): Functions & Stack**

- Show CALL/RET mechanics
- Demonstrate with `examples/03-call-ret.asm`
- Students: Write a simple function

**Lesson 5 (1 hour): All Together**

- Build a small program together
- Review memory visualization
- Q&A

### Resources for Students

Provide:

- [GETTING_STARTED.md](GETTING_STARTED.md) - First reference
- [FAQ.md](FAQ.md) - Common questions
- [examples/](../examples/) folder - All example programs
- [ISA.md](packages/docs/ISA.md) - Instruction reference

### Assessment Ideas

1. **Quizzes:**
   - What does `MOV [EAX], 5` do?
   - Trace execution of a short program
   - Identify register values after operations

2. **Coding Exercises:**
   - Fibonacci sequence
   - Sum an array
   - String search/compare

3. **Projects:**
   - Create a function library
   - Build a simple game
   - Optimize existing code

---

## Topic-Based Quick Reference

### Just Want to Learn...

**...Basic Instructions?**  
→ [examples/01-basic-instructions.asm](../examples/01-basic-instructions.asm)

**...Control Flow?**  
→ [examples/02-jumps.asm](../examples/02-jumps.asm) + [examples/15-all-jumps.asm](../examples/15-all-jumps.asm)

**...Functions?**  
→ [examples/03-call-ret.asm](../examples/03-call-ret.asm) + [examples/06-nested-calls.asm](../examples/06-nested-calls.asm)

**...Stack?**  
→ [examples/04-stack.asm](../examples/04-stack.asm) + [examples/19-stack-complete.asm](../examples/19-stack-complete.asm)

**...Memory?**  
→ [examples/05-memory.asm](../examples/05-memory.asm) + [examples/26-data-section.asm](../examples/26-data-section.asm)

**...Graphics/LCD?**  
→ [examples/08-lcd.asm](../examples/08-lcd.asm) + [examples/18-lcd-patterns.asm](../examples/18-lcd-patterns.asm) + [examples/22-lcd-display-64x64.asm](../examples/22-lcd-display-64x64.asm)

**...Keyboard Input?**  
→ [examples/14-keyboard.asm](../examples/14-keyboard.asm) + [examples/24-keyboard-input.asm](../examples/24-keyboard-input.asm)

**...Bitwise Operations?**  
→ [examples/09-bitwise.asm](../examples/09-bitwise.asm)

**...Shifts & Rotates?**  
→ [examples/12-shift-rotate.asm](../examples/12-shift-rotate.asm)

**...Multiply/Divide?**  
→ [examples/11-multiply-divide.asm](../examples/11-multiply-divide.asm)

**...Flags?**  
→ [examples/20-flags.asm](../examples/20-flags.asm)

**...Game Programming?**  
→ [examples/21-snake.asm](../examples/21-snake.asm)

**...Everything Together?**  
→ Start at examples/01 and work your way up!

---

## Recommended Study Schedule

### Self-Paced Learner

- Week 1: Path 1 Foundations
- Week 2: Path 1 Control Flow + Functions
- Week 3: Path 2 Advanced Instructions
- Week 4+: Path 2 & 3 based on interest

### Classroom (Semester)

- Weeks 1-3: Path 1 (all phases)
- Weeks 4-7: Path 2 (Phases 1-2)
- Weeks 8-14: Path 2 Phase 3 + projects
- Week 15: Path 3 or student presentations

### Intensive Bootcamp (1-2 weeks)

- Day 1-2: Path 1 Foundations
- Day 3: Path 1 Control Flow + Functions
- Day 4-5: Path 2 Phases 1-2
- Day 6-10: Path 3 + projects

---

## Getting Help

Stuck on something?

1. **Check [FAQ.md](FAQ.md)** - Answers to common questions
2. **Read [GETTING_STARTED.md](GETTING_STARTED.md)** - Beginner guide
3. **Study relevant example** - See topic-based reference above
4. **Read [ISA.md](packages/docs/ISA.md)** - Instruction details
5. **[Ask on Discussions](https://github.com/Toniboy1/TonX86/discussions)** - Community help
6. **[Report an issue](https://github.com/Toniboy1/TonX86/issues)** - If something's broken

Happy learning! 🚀
