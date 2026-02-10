#!/usr/bin/env node

/**
 * Syncs the version from root package.json to extension package.json
 * Usage: node scripts/sync-version.js
 */

const fs = require('fs');
const path = require('path');

// Read root package.json
const rootPackagePath = path.join(__dirname, '..', 'package.json');
const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));

// Read extension package.json
const extPackagePath = path.join(__dirname, '..', 'packages', 'extension', 'package.json');
const extPackage = JSON.parse(fs.readFileSync(extPackagePath, 'utf8'));

// Get the version from root
const version = rootPackage.version;

console.log(`Syncing version: ${extPackage.version} -> ${version}`);

// Update extension version
extPackage.version = version;

// Write back to extension package.json
fs.writeFileSync(extPackagePath, JSON.stringify(extPackage, null, 2) + '\n', 'utf8');

console.log(`✓ Extension version updated to ${version}`);
