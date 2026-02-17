/**
 * TonX86 Simcore Performance Benchmarks
 *
 * Measures step-per-second throughput and instruction-mix latency
 * for the simulator core.  Run with: npm run bench -w packages/simcore
 *
 * Output is machine-parseable (JSON lines) and human-readable.
 */

import { Simulator } from "../index";
import type { Instruction } from "../types";

// ── Helpers ───────────────────────────────────────────────────

function makeInstructions(lines: string[][]): {
  instructions: Instruction[];
  labels: Map<string, number>;
} {
  const instructions: Instruction[] = [];
  const labels = new Map<string, number>();

  for (const parts of lines) {
    const mnemonic = parts[0];
    if (mnemonic.endsWith(":")) {
      labels.set(mnemonic.slice(0, -1), instructions.length);
      continue;
    }
    const operands = parts.slice(1);
    instructions.push({
      mnemonic,
      operands,
      line: instructions.length,
      raw: [mnemonic, ...operands].join(" "),
    });
  }
  return { instructions, labels };
}

interface BenchResult {
  name: string;
  opsPerSec: number;
  avgNs: number;
  totalMs: number;
  iterations: number;
}

function bench(
  name: string,
  setup: () => { sim: Simulator; instructions: Instruction[]; labels: Map<string, number> },
  stepsPerIteration: number,
  minTimeMs = 2000,
): BenchResult {
  const { sim, instructions, labels } = setup();

  // Warm-up
  const warmup = Math.max(10, Math.floor(stepsPerIteration * 0.1));
  for (let w = 0; w < warmup; w++) {
    sim.step();
    if (sim.getState().halted) {
      sim.loadInstructions(instructions, labels);
    }
  }
  sim.loadInstructions(instructions, labels);

  let iterations = 0;
  const start = performance.now();
  let elapsed = 0;

  while (elapsed < minTimeMs) {
    for (let s = 0; s < stepsPerIteration; s++) {
      sim.step();
      if (sim.getState().halted) {
        sim.loadInstructions(instructions, labels);
      }
    }
    iterations += stepsPerIteration;
    elapsed = performance.now() - start;
  }

  const totalMs = elapsed;
  const opsPerSec = (iterations / totalMs) * 1000;
  const avgNs = (totalMs / iterations) * 1_000_000;

  return { name, opsPerSec, avgNs, totalMs, iterations };
}

// ── Benchmark definitions ─────────────────────────────────────

function arithmeticBench(): BenchResult {
  const { instructions, labels } = makeInstructions([
    ["MOV", "EAX", "0"],
    ["MOV", "EBX", "1"],
    ["ADD", "EAX", "EBX"],
    ["ADD", "EBX", "EAX"],
    ["SUB", "EAX", "1"],
    ["INC", "EAX"],
    ["DEC", "EBX"],
    ["CMP", "EAX", "EBX"],
    ["HLT"],
  ]);
  return bench(
    "arithmetic (ADD/SUB/INC/DEC/CMP)",
    () => {
      const sim = new Simulator();
      sim.loadInstructions(instructions, labels);
      return { sim, instructions, labels };
    },
    instructions.length,
  );
}

function memoryBench(): BenchResult {
  const { instructions, labels } = makeInstructions([
    ["MOV", "EAX", "42"],
    ["MOV", "[0x100]", "EAX"],
    ["MOV", "EBX", "[0x100]"],
    ["MOV", "[0x104]", "EBX"],
    ["PUSH", "EAX"],
    ["POP", "ECX"],
    ["XCHG", "EAX", "ECX"],
    ["LEA", "EDX", "[EAX+4]"],
    ["HLT"],
  ]);
  return bench(
    "memory (MOV/PUSH/POP/XCHG/LEA)",
    () => {
      const sim = new Simulator();
      sim.loadInstructions(instructions, labels);
      return { sim, instructions, labels };
    },
    instructions.length,
  );
}

function branchBench(): BenchResult {
  const { instructions, labels } = makeInstructions([
    ["MOV", "ECX", "100"],
    ["loop:"],
    ["DEC", "ECX"],
    ["JNZ", "loop"],
    ["HLT"],
  ]);
  return bench(
    "branching (DEC+JNZ loop x100)",
    () => {
      const sim = new Simulator();
      sim.loadInstructions(instructions, labels);
      return { sim, instructions, labels };
    },
    // 1(MOV) + 100*(DEC+JNZ) + 1(HLT) = 202 steps per run
    202,
  );
}

function bitwiseBench(): BenchResult {
  const { instructions, labels } = makeInstructions([
    ["MOV", "EAX", "0xFF00FF00"],
    ["MOV", "EBX", "0x00FF00FF"],
    ["AND", "EAX", "EBX"],
    ["OR", "EAX", "0x12345678"],
    ["XOR", "EAX", "EBX"],
    ["NOT", "EAX"],
    ["SHL", "EAX", "2"],
    ["SHR", "EAX", "1"],
    ["ROL", "EAX", "4"],
    ["ROR", "EAX", "4"],
    ["HLT"],
  ]);
  return bench(
    "bitwise (AND/OR/XOR/NOT/SHL/SHR/ROL/ROR)",
    () => {
      const sim = new Simulator();
      sim.loadInstructions(instructions, labels);
      return { sim, instructions, labels };
    },
    instructions.length,
  );
}

function callRetBench(): BenchResult {
  const { instructions, labels } = makeInstructions([
    ["MOV", "ECX", "50"],
    ["loop:"],
    ["CALL", "func"],
    ["DEC", "ECX"],
    ["JNZ", "loop"],
    ["HLT"],
    ["func:"],
    ["PUSH", "EBP"],
    ["MOV", "EBP", "ESP"],
    ["MOV", "EAX", "1"],
    ["POP", "EBP"],
    ["RET"],
  ]);
  return bench(
    "call/ret (50 function calls)",
    () => {
      const sim = new Simulator();
      sim.loadInstructions(instructions, labels);
      return { sim, instructions, labels };
    },
    // 1(MOV) + 50*(CALL + 5-instr func + DEC + JNZ) + 1(HLT) = 402
    402,
  );
}

function lcdWriteBench(): BenchResult {
  const { instructions, labels } = makeInstructions([
    ["MOV", "EAX", "1"],
    ["MOV", "[0xF000]", "EAX"],
    ["MOV", "[0xF001]", "EAX"],
    ["MOV", "[0xF002]", "EAX"],
    ["MOV", "[0xF003]", "EAX"],
    ["MOV", "[0xF004]", "EAX"],
    ["MOV", "[0xF005]", "EAX"],
    ["MOV", "[0xF006]", "EAX"],
    ["MOV", "[0xF007]", "EAX"],
    ["HLT"],
  ]);
  return bench(
    "LCD writes (8 pixel writes)",
    () => {
      const sim = new Simulator();
      sim.loadInstructions(instructions, labels);
      return { sim, instructions, labels };
    },
    instructions.length,
  );
}

// ── Runner ────────────────────────────────────────────────────

const benchmarks = [
  arithmeticBench,
  memoryBench,
  branchBench,
  bitwiseBench,
  callRetBench,
  lcdWriteBench,
];

console.log("TonX86 Simcore Benchmarks");
console.log("=".repeat(72));
console.log("");

const results: BenchResult[] = [];

for (const fn of benchmarks) {
  const result = fn();
  results.push(result);
  const mops = (result.opsPerSec / 1_000_000).toFixed(2);
  console.log(
    `  ${result.name.padEnd(44)} ${mops.padStart(8)} Mops/s  ${result.avgNs.toFixed(0).padStart(6)} ns/op`,
  );
}

console.log("");
console.log("=".repeat(72));

const totalOps = results.reduce((s, r) => s + r.iterations, 0);
const totalMs = results.reduce((s, r) => s + r.totalMs, 0);
const overallMops = ((totalOps / totalMs) * 1000) / 1_000_000;

console.log(`  OVERALL: ${overallMops.toFixed(2)} Mops/s across ${results.length} benchmarks`);
console.log("");

// JSON output for CI/tooling
console.log("--- JSON ---");
console.log(JSON.stringify(results, null, 2));
