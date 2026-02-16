#!/usr/bin/env node

/**
 * Functional test script for ASM examples
 * Executes all .asm files in the examples folder and verifies they run without errors
 */

const fs = require('fs');
const path = require('path');

// Import the simulator from compiled simcore package
const { Simulator } = require('../packages/simcore/out/index.js');

const EXAMPLES_DIR = path.join(__dirname, '..', 'examples');
const MAX_STEPS = 100000; // Maximum instruction steps before timeout
const SKIP_FILES = ['test-dap.js', 'tonx86-debug.log']; // Non-ASM files to skip

// Files that are expected to timeout (interactive/infinite loop examples)
const EXPECTED_TIMEOUT_FILES = new Set([
  '14-keyboard.asm',
  '21-snake.asm',
  '24-keyboard-input.asm',
  '25-keyboard-basics.asm',
]);

// All valid instruction mnemonics (must match simulator switch cases)
const VALID_MNEMONICS = new Set([
  'MOV', 'XCHG', 'LEA', 'MOVZX', 'MOVSX',
  'ADD', 'SUB', 'INC', 'DEC', 'MUL', 'IMUL', 'DIV', 'IDIV', 'MOD',
  'CMP', 'AND', 'OR', 'XOR', 'NOT', 'NEG', 'TEST',
  'SHL', 'SHR', 'SAR', 'ROL', 'ROR', 'RCL', 'RCR',
  'NOP',
  'JMP', 'JE', 'JZ', 'JNE', 'JNZ',
  'JG', 'JGE', 'JL', 'JLE', 'JS', 'JNS',
  'JA', 'JAE', 'JB', 'JBE',
  'PUSH', 'POP', 'CALL', 'RET',
  'INT', 'IRET', 'RAND', 'HLT',
  'LOOP', 'LOOPE', 'LOOPZ', 'LOOPNE', 'LOOPNZ',
  'CMOVE', 'CMOVZ', 'CMOVNE', 'CMOVNZ',
  'CMOVL', 'CMOVLE', 'CMOVG', 'CMOVGE',
  'CMOVA', 'CMOVAE', 'CMOVB', 'CMOVBE',
  'CMOVS', 'CMOVNS',
  'LAHF', 'SAHF', 'XADD', 'BSF', 'BSR', 'BSWAP',
  'LODSB', 'LODS', 'STOSB', 'STOS',
  'MOVSB', 'MOVS', 'SCASB', 'SCAS',
  'CMPSB', 'CMPS', 'INT3',
]);

// Instructions that take a label operand (jump/call targets)
const LABEL_INSTRUCTIONS = new Set([
  'JMP', 'JE', 'JZ', 'JNE', 'JNZ',
  'JG', 'JGE', 'JL', 'JLE', 'JS', 'JNS',
  'JA', 'JAE', 'JB', 'JBE',
  'CALL',
  'LOOP', 'LOOPE', 'LOOPZ', 'LOOPNE', 'LOOPNZ',
]);

/**
 * Parse an ASM file into instructions
 */
function parseASM(content) {
  const lines = content.split('\n');
  const instructions = [];
  const labels = {};
  const constants = {}; // EQU constants
  const dataLabels = {}; // Data section labels with memory addresses
  let lineNumber = 0;
  let currentSection = 'text'; // 'text' or 'data'
  let dataAddress = 0x2000; // Default data start address

  // First pass: collect EQU constants
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Remove comments
    const commentIndex = line.indexOf(';');
    if (commentIndex >= 0) {
      line = line.substring(0, commentIndex).trim();
    }

    if (!line) continue;

    // Check for EQU directive (with or without colon)
    const equMatch = line.match(/^(\w+):?\s+EQU\s+(.+)/i);
    if (equMatch) {
      const constName = equMatch[1];
      const constValue = equMatch[2].trim();
      constants[constName] = constValue;
    }
  }

  // Second pass: collect data labels with addresses
  currentSection = 'text';
  dataAddress = 0x2000;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Remove comments
    const commentIndex = line.indexOf(';');
    if (commentIndex >= 0) {
      line = line.substring(0, commentIndex).trim();
    }

    if (!line) continue;

    // Track section changes
    if (line.toUpperCase() === '.DATA') {
      currentSection = 'data';
      continue;
    }
    if (line.toUpperCase() === '.TEXT') {
      currentSection = 'text';
      continue;
    }

    // Handle ORG directive
    if (/^ORG\s+/i.test(line)) {
      const orgMatch = line.match(/^ORG\s+(.+)/i);
      if (orgMatch && currentSection === 'data') {
        const addressStr = orgMatch[1].trim();
        // Parse hex, binary, or decimal
        if (addressStr.startsWith('0x') || addressStr.startsWith('0X')) {
          dataAddress = parseInt(addressStr.substring(2), 16);
        } else if (addressStr.startsWith('0b') || addressStr.startsWith('0B')) {
          dataAddress = parseInt(addressStr.substring(2), 2);
        } else {
          dataAddress = parseInt(addressStr, 10);
        }
      }
      continue;
    }

    // In data section, track labels and their addresses
    if (currentSection === 'data') {
      // Data directive with label on same line
      const labelWithData = line.match(/^(\w+):\s*(DB|DW|DD)\s+(.+)/i);
      if (labelWithData) {
        const labelName = labelWithData[1];
        const directive = labelWithData[2].toUpperCase();
        const values = labelWithData[3];
        dataLabels[labelName] = dataAddress;
        
        // Calculate size to advance address
        // For simplicity, count comma-separated values
        const valueCount = values.split(',').length;
        const size = directive === 'DB' ? 1 : directive === 'DW' ? 2 : 4;
        
        // Handle string literals
        if (values.includes('"')) {
          const strMatch = values.match(/"([^"]*)"/);
          if (strMatch) {
            dataAddress += strMatch[1].length;
          }
        } else {
          dataAddress += valueCount * size;
        }
        continue;
      }

      // Standalone label in data section
      if (line.endsWith(':')) {
        const labelName = line.substring(0, line.length - 1);
        dataLabels[labelName] = dataAddress;
        continue;
      }

      // Data directive without label
      if (/^(DB|DW|DD)\s+/i.test(line)) {
        const dataMatch = line.match(/^(DB|DW|DD)\s+(.+)/i);
        if (dataMatch) {
          const directive = dataMatch[1].toUpperCase();
          const values = dataMatch[2];
          const valueCount = values.split(',').length;
          const size = directive === 'DB' ? 1 : directive === 'DW' ? 2 : 4;
          
          // Handle string literals
          if (values.includes('"')) {
            const strMatch = values.match(/"([^"]*)"/);
            if (strMatch) {
              dataAddress += strMatch[1].length;
            }
          } else {
            dataAddress += valueCount * size;
          }
        }
        continue;
      }
    }
  }

  // Third pass: collect code labels and instructions
  currentSection = 'text';
  lineNumber = 0;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Remove comments
    const commentIndex = line.indexOf(';');
    if (commentIndex >= 0) {
      line = line.substring(0, commentIndex).trim();
    }

    if (!line) continue;

    // Handle section directives - track which section we're in
    if (line.toUpperCase() === '.TEXT') {
      currentSection = 'text';
      continue;
    }
    if (line.toUpperCase() === '.DATA') {
      currentSection = 'data';
      continue;
    }

    // Skip ORG directive
    if (/^ORG\s+/i.test(line)) {
      continue;
    }

    // Skip data directives (DB, DW, DD) in data section
    if (currentSection === 'data' && /^(\w+:)?\s*(DB|DW|DD)\s+/i.test(line)) {
      continue;
    }

    // Only process instructions if we're in text section
    if (currentSection !== 'text') {
      continue;
    }

    // Check for label with instruction on same line (e.g., "start: MOV EAX, 1")
    const labelWithInstruction = line.match(/^(\w+):\s+(.+)$/);
    if (labelWithInstruction) {
      const label = labelWithInstruction[1];
      const restOfLine = labelWithInstruction[2].trim();
      labels[label] = lineNumber;
      
      // Skip if rest is a directive
      if (/^(DB|DW|DD|ORG|EQU)\s+/i.test(restOfLine)) {
        continue;
      }
      
      // Process the instruction part
      let processedLine = restOfLine;
      for (const [constName, constValue] of Object.entries(constants)) {
        const regex = new RegExp(`\\b${constName}\\b`, 'g');
        processedLine = processedLine.replace(regex, constValue);
      }
      // Substitute data labels with their addresses
      for (const [labelName, address] of Object.entries(dataLabels)) {
        const regex = new RegExp(`\\b${labelName}\\b`, 'g');
        processedLine = processedLine.replace(regex, `0x${address.toString(16)}`);
      }
      instructions.push({ line: processedLine, lineNumber: i + 1 });
      lineNumber++;
      continue;
    }

    // Check for standalone label
    if (line.endsWith(':')) {
      const label = line.substring(0, line.length - 1);
      labels[label] = lineNumber;
      continue;
    }

    // Skip EQU directives
    if (/\s+EQU\s+/i.test(line)) {
      continue;
    }

    // Substitute EQU constants in the line
    let processedLine = line;
    for (const [constName, constValue] of Object.entries(constants)) {
      // Replace constant name with its value (word boundary match)
      const regex = new RegExp(`\\b${constName}\\b`, 'g');
      processedLine = processedLine.replace(regex, constValue);
    }
    
    // Substitute data labels with their addresses
    for (const [labelName, address] of Object.entries(dataLabels)) {
      const regex = new RegExp(`\\b${labelName}\\b`, 'g');
      processedLine = processedLine.replace(regex, `0x${address.toString(16)}`);
    }

    instructions.push({ line: processedLine, lineNumber: i + 1 });
    lineNumber++;
  }

  return { instructions, labels };
}

/**
 * Validate all parsed instructions for correctness
 * - Check all mnemonics are valid
 * - Check all jump/call targets reference existing labels
 */
function validateASM(instructions, labels, fileName) {
  const errors = [];

  for (const { line, lineNumber } of instructions) {
    const parts = line.split(/\s+/);
    const mnemonic = parts[0].toUpperCase();

    // Check valid mnemonic
    if (!VALID_MNEMONICS.has(mnemonic)) {
      errors.push(`Line ${lineNumber}: Unknown instruction '${mnemonic}'`);
      continue;
    }

    // Check label targets for jump/call instructions
    if (LABEL_INSTRUCTIONS.has(mnemonic)) {
      const operand = parts.slice(1).join(' ').trim();
      if (operand && !(operand in labels)) {
        errors.push(`Line ${lineNumber}: ${mnemonic} references undefined label '${operand}'`);
      }
    }
  }

  return errors;
}

/**
 * Execute a single ASM file
 */
function testASMFile(filePath) {
  const fileName = path.basename(filePath);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { instructions, labels } = parseASM(content);

    if (instructions.length === 0) {
      console.log(`⚠️  ${fileName}: No instructions found`);
      return { success: true, skipped: true };
    }

    // Validate all instructions before execution
    const validationErrors = validateASM(instructions, labels, fileName);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed:\n  ${validationErrors.join('\n  ')}`);
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
    
    // Convert parsed instructions to Simulator format
    const simInstructions = instructions.map(({ line, lineNumber }) => {
      const parts = line.split(/\s+/);
      const mnemonic = parts[0].toUpperCase();
      const operands = parts.slice(1).join(' ').split(',').map(op => op.trim()).filter(op => op);
      return {
        line: lineNumber,
        mnemonic,
        operands,
        raw: line
      };
    });

    // Convert labels object to Map with instruction indices (0-based)
    const labelsMap = new Map();
    for (const [label, index] of Object.entries(labels)) {
      labelsMap.set(label, index);
    }

    // Load instructions and labels into simulator
    sim.loadInstructions(simInstructions, labelsMap);

    let steps = 0;
    let halted = false;

    // Execute using step() which properly handles control flow
    while (!halted && steps < MAX_STEPS) {
      const lineNum = sim.step();
      
      if (lineNum === -1 || sim.getState().halted) {
        halted = true;
        break;
      }
      
      steps++;
    }

    if (steps >= MAX_STEPS) {
      // Check if this is an expected timeout (interactive examples)
      if (EXPECTED_TIMEOUT_FILES.has(fileName)) {
        console.log(`✅ ${fileName}: ${steps} steps executed (expected timeout for interactive example)`);
        return { success: true, steps, expectedTimeout: true };
      }
      throw new Error(`Timeout: exceeded ${MAX_STEPS} steps`);
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
  const expectedTimeouts = results.filter(r => r.success && r.expectedTimeout).length;
  const total = results.length;

  console.log(`\n📊 Results: ${successful}/${total} passed`);
  if (expectedTimeouts > 0) console.log(`   ${expectedTimeouts} expected timeouts (interactive examples)`);
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
