# Calling Convention Examples

This directory contains example programs demonstrating x86 calling conventions supported by TonX86.

## Examples

### Basic Calling Conventions

1. **cdecl-example.asm** - C declaration calling convention
   - Parameters pushed right-to-left
   - Caller cleans the stack
   - Demonstrates standard C function calling

2. **stdcall-example.asm** - Standard call convention (Windows API style)
   - Parameters pushed right-to-left
   - Callee cleans the stack
   - More compact code when function is called multiple times

3. **fastcall-example.asm** - Fast call convention
   - First two parameters in ECX and EDX registers
   - Additional parameters on stack
   - Fastest for small parameter counts

### Advanced Examples

4. **stack-frame-example.asm** - Stack frame with local variables
   - Proper EBP-based stack frame
   - Local variable allocation
   - Parameter and local variable access patterns

5. **nested-calls-example.asm** - Nested function calls
   - Functions calling other functions
   - Register preservation across calls
   - Demonstrates callee-saved register handling

6. **test-diagnostics.asm** - LSP diagnostic test cases
   - Examples of common mistakes
   - Triggers LSP warnings and hints
   - Useful for testing the language server

## Running the Examples

To run any example in VS Code:

1. Open the `.asm` file
2. Press F5 or use Run → Start Debugging
3. Step through the code to see the calling convention in action
4. Watch the Register and Memory views to see stack operations

## LSP Diagnostics

When you open these files in VS Code with the TonX86 extension, the language server will provide:

- **Information** messages for missing standard prologues/epilogues
- **Warning** messages for unbalanced stacks and unsaved callee-saved registers
- **Hint** messages identifying calling convention patterns

## Documentation

See [CALLING_CONVENTIONS.md](../../packages/docs/CALLING_CONVENTIONS.md) for detailed documentation on:
- Stack frame structure
- Each calling convention's characteristics
- Register usage rules
- Common patterns and best practices
- Common mistakes to avoid
