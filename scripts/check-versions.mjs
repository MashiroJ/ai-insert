#!/usr/bin/env node

/**
 * check-versions.mjs
 *
 * Verify that all pkg versions match the root version,
 * and scan source files for leftover hardcoded version strings.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const rootDir = new URL('..', import.meta.url).pathname;

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function walkDir(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

const rootPkg = readJson(join(rootDir, 'package.json'));
const expectedVersion = rootPkg.version;

if (!expectedVersion) {
  console.error('ERROR: root pkg has no version field');
  process.exit(1);
}

let hasError = false;

// 1. Check all packages/*/package.json versions
const packagesDir = join(rootDir, 'packages');
const packageNames = readdirSync(packagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

console.log(`\n=== Version Consistency Check (expected: ${expectedVersion}) ===\n`);

for (const name of packageNames) {
  const pkgPath = join(packagesDir, name, 'package.json');
  try {
    const pkg = readJson(pkgPath);
    const match = pkg.version === expectedVersion;
    const status = match ? 'OK' : 'MISMATCH';
    console.log(`  ${status.padEnd(10)} @ui-inspect/${name}: ${pkg.version}`);
    if (!match) hasError = true;
  } catch {
    console.log(`  SKIP       @ui-inspect/${name}: no pkg`);
  }
}

// 2. Recursively scan src/ for hardcoded version strings
const versionPattern = /['"]0\.\d+\.\d+['"]/g;

console.log(`\n=== Hardcoded Version Scan ===\n`);

for (const name of packageNames) {
  const srcDir = join(packagesDir, name, 'src');
  let files;
  try {
    files = walkDir(srcDir);
  } catch {
    continue;
  }
  for (const fullPath of files) {
    const relPath = relative(packagesDir, fullPath);
    const content = readFileSync(fullPath, 'utf8');
    const matches = content.match(versionPattern);
    if (matches) {
      console.log(`  FOUND      ${relPath}: ${matches.join(', ')}`);
      const baseName = fullPath.split('/').pop();
      if (!baseName.endsWith('.test.ts') && baseName !== 'version.ts') {
        hasError = true;
      }
    }
  }
}

console.log(hasError ? '\n❌ Version check failed.\n' : '\n✅ All version checks passed.\n');
process.exit(hasError ? 1 : 0);
