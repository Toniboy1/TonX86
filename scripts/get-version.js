#!/usr/bin/env node

/**
 * Gets the current extension version
 * Usage: node scripts/get-version.js
 */

const fs = require('fs');
const path = require('path');

// Read extension package.json
const extPackagePath = path.join(__dirname, '..', 'packages', 'extension', 'package.json');
const extPackage = JSON.parse(fs.readFileSync(extPackagePath, 'utf8'));

// Output just the version (for use in scripts/CI)
console.log(extPackage.version);
