// Re-export everything via the simulator barrel (which re-exports peripheral classes)
export { Simulator } from "./simulator";
export type { CompatibilityMode, Instruction } from "./types";

// Also export individual modules for consumers who want fine-grained imports
export { CPUState } from "./cpu";
export { Memory } from "./memory";
export { LCDDisplay } from "./lcd";
export { Keyboard } from "./keyboard";
