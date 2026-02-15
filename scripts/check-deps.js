#!/usr/bin/env node

/**
 * Pre-check script: verifies that required dev-tools are available.
 * Runs automatically before `npm run check` to surface a clear error
 * if `npm install` was not executed or devDependencies were omitted.
 *
 * Fixes GitHub issue #91 – "macOS: npm run check fails with eslint not found"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const REQUIRED_BINS = ['eslint', 'tsc', 'jest'];

let ok = true;

for (const bin of REQUIRED_BINS) {
  const binPath = path.join(ROOT, 'node_modules', '.bin', bin);
  if (!fs.existsSync(binPath)) {
    console.error(`❌  Required tool "${bin}" not found at ${binPath}`);
    ok = false;
  }
}

// Also verify simcore build output exists (needed for test:examples)
const simcoreOut = path.join(ROOT, 'packages', 'simcore', 'out', 'simulator.js');
if (!fs.existsSync(simcoreOut)) {
  console.warn(`⚠️  simcore build output missing (${simcoreOut}). Run "npm run build" first.`);
}

if (!ok) {
  console.error(`
╔══════════════════════════════════════════════════════════════╗
║  Missing dependencies – please run:                        ║
║                                                            ║
║    npm install                                             ║
║    npm run build                                           ║
║                                                            ║
║  If the problem persists on macOS, ensure NODE_ENV is NOT  ║
║  set to "production" and try:                              ║
║                                                            ║
║    npm install --include=dev                               ║
║                                                            ║
╚══════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

console.log('✅  All required development tools are available.');
