#!/usr/bin/env node

/**
 * Keep user-facing docs independent from concrete npm publish versions.
 *
 * README should point users at @latest and capabilities, not at internal
 * release numbers. Package manifests, tags, changelog/release notes, and
 * generated local release README files may still contain exact versions.
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const files = ['README.md'];
const versionPattern = /(?<![\d.])0\.\d+\.\d+(?![\d.])/g;

let hasError = false;

console.log('\n=== Public Docs Version Scan ===\n');

for (const file of files) {
  const fullPath = join(root, file);
  const lines = readFileSync(fullPath, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const matches = line.match(versionPattern);
    if (!matches) return;
    hasError = true;
    console.log(`  FOUND      ${file}:${index + 1}: ${matches.join(', ')}`);
  });
}

console.log(
  hasError
    ? '\nERROR: Public docs must not expose concrete npm versions. Use @latest or move history to release notes.\n'
    : '\nOK: Public docs do not expose concrete npm versions.\n'
);

process.exit(hasError ? 1 : 0);
