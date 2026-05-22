#!/usr/bin/env node

/**
 * Ensure generated release bundles stay local.
 */

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);

const result = spawnSync('git', ['ls-files', 'release'], {
  cwd: root,
  encoding: 'utf8',
});

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || 'git ls-files release failed');
  process.exit(result.status || 1);
}

const files = result.stdout.trim().split(/\r?\n/).filter(Boolean);

console.log('\n=== Release Artifact Tracking Check ===\n');

if (files.length > 0) {
  console.error('ERROR: release/ artifacts are tracked by git:');
  files.forEach((file) => console.error(`  ${file}`));
  console.error('\nRun: git rm -r --cached release\n');
  process.exit(1);
}

console.log('OK: no release/ artifacts are tracked by git.\n');
