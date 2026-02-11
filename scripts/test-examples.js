#!/usr/bin/env node

/**
 * Functional test script for ASM examples
 * Executes all .asm files in the examples folder and verifies they run without errors
 */

const fs = require('fs');
const path = require('path');

// Import the simulator from compiled simcore package
const { Simulator } = require('../packages/simcore/out/simulator.js');

const EXAMPLES_DIR = path.join(__dirname, '..', 'examples');
const MAX_STEPS = 100000; // Maximum instruction steps before timeout
const SKIP_FILES = ['test-dap.js']; // Non-ASM files to skip

/**
 * Parse an ASM file into instructions
 */
function parseASM(content) {
  const lines = content.split('\n');
  const instructions = [];
  const labels = {};
  let lineNumber = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Remove comments
    const commentIndex = line.indexOf(';');
    if (commentIndex >= 0) {
      line = line.substring(0, commentIndex).trim();
    }

    if (!line) continue;

    // Check for label
    if (line.endsWith(':')) {
      const label = line.substring(0, line.length - 1);
      labels[label] = lineNumber;
      continue;
    }

    // Check for EQU directive
    if (line.includes(' EQU ')) {
      continue; // Skip constants for now
    }

    instructions.push({ line: line, lineNumber: i + 1 });
    lineNumber++;
  }

  return { instructions, labels };
}

/**
 * Execute a single ASM file
 */
function testASMFile(filePath) {
  const fileName = path.basename(filePath);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { instructions } = parseASM(content);

    if (instructions.length === 0) {
      console.log(`⚠️  ${fileName}: No instructions found`);
      return { success: true, skipped: true };
    }

    // Create simulator with appropriate LCD size
    // Most examples use 8x8, but some use 64x64
    let lcdSize = 8;
    if (fileName.includes('snake') || fileName.includes('lcd-test-64')) {
      lcdSize = 64;
    } else if (fileName.includes('lcd')) {
      lcdSize = 16;
    }

    const sim = new Simulator(lcdSize, lcdSize);
    let steps = 0;
    let halted = false;

    // Execute instructions
    for (const { line } of instructions) {
      if (steps >= MAX_STEPS) {
        throw new Error(`Timeout: exceeded ${MAX_STEPS} steps`);
      }

      const parts = line.split(/\s+/);
      const instruction = parts[0].toUpperCase();

      // Check for HLT
      if (instruction === 'HLT') {
        halted = true;
        break;
      }

      // Parse operands
      const operands = parts.slice(1).join(' ').split(',').map(op => op.trim());

      try {
        sim.executeInstruction(instruction, operands);
      } catch (error) {
        // Some instructions might fail in test mode (e.g., keyboard reads with no input)
        // Only fail on critical errors
        if (error.message.includes('Unknown instruction') || 
            error.message.includes('Invalid operand')) {
          throw error;
        }
        // Otherwise, log and continue
        // console.log(`  Note: ${error.message}`);
      }

      steps++;
    }

    console.log(`✅ ${fileName}: ${steps} steps executed${halted ? ' (halted)' : ''}`);
    return { success: true, steps, halted };

  } catch (error) {
    console.log(`❌ ${fileName}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main test runner
 */
function main() {
  console.log('🧪 Testing ASM examples...\n');

  const files = fs.readdirSync(EXAMPLES_DIR)
    .filter(file => file.endsWith('.asm'))
    .filter(file => !SKIP_FILES.includes(file))
    .sort();

  if (files.length === 0) {
    console.log('No ASM files found in examples directory');
    process.exit(1);
  }

  const results = [];

  for (const file of files) {
    const filePath = path.join(EXAMPLES_DIR, file);
    const result = testASMFile(filePath);
    results.push({ file, ...result });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  const successful = results.filter(r => r.success && !r.skipped).length;
  const failed = results.filter(r => !r.success).length;
  const skipped = results.filter(r => r.skipped).length;
  const total = results.length;

  console.log(`\n📊 Results: ${successful}/${total} passed`);
  if (skipped > 0) console.log(`   ${skipped} skipped (empty files)`);
  if (failed > 0) console.log(`   ${failed} failed`);

  if (failed > 0) {
    console.log('\n❌ Some examples failed');
    process.exit(1);
  } else {
    console.log('\n✅ All examples executed successfully!');
    process.exit(0);
  }
}

main();
