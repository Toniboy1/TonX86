# TonX86 — DEBUG ADAPTER PROMPT

Implement DAP server.

MVP:
- initialize, launch
- setBreakpoints
- continue, pause
- stepIn, next, stepOut
- single thread
- stopped events: breakpoint, step, pause, halt, fault

Stepping:
- stepIn: 1 instruction
- stepOver: CALL as single step
- stepOut: run until RET
