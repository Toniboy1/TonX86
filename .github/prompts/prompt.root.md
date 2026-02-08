# TonX86 — ROOT PROMPT

Build TonX86: an educational x86-like assembly environment for VS Code.

Hard requirements:
- VS Code extension
- Debugger: run/pause, step in/over/out, breakpoints
- Single-threaded execution
- Memory A + Memory B
- LCD grid 2x4..16x16
- Embedded docs via hover + panel

Architecture:
- Extension (UI)
- Debug Adapter (DAP)
- Language Server (LSP)
- Simulator Core
- Docs (isa.json + markdown)
