// Re-export everything via the simulator barrel (which re-exports peripheral classes)
export { Simulator } from "./simulator/index";
export type { CompatibilityMode, Instruction } from "./types";
export { REGISTER_MAP, REGISTER8_MAP } from "./types";
export type { AudioEvent } from "./devices";

// Also export individual modules for consumers who want fine-grained imports
export { CPUState } from "./cpu/index";
export { Memory, LCDDisplay, Keyboard, AudioDevice } from "./devices";
