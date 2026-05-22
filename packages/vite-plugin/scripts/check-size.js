#!/usr/bin/env node

/**
 * Bundle size checker for vite-plugin.
 *
 * Monitors the size of injected client code to keep it within a reasonable
 * range without requiring a TypeScript runtime.
 */

import { statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));

const LIMITS = {
  good: 30 * 1024,
  warning: 50 * 1024,
};

function checkFile(filePath) {
  const stats = statSync(filePath);
  const sizeKB = stats.size / 1024;

  let status = 'large';
  if (stats.size <= LIMITS.good) {
    status = 'good';
  } else if (stats.size <= LIMITS.warning) {
    status = 'warning';
  }

  return {
    file: filePath,
    size: stats.size,
    sizeKB: Number(sizeKB.toFixed(2)),
    status,
  };
}

function formatResult(result) {
  const label = {
    good: 'OK',
    warning: 'WARN',
    large: 'FAIL',
  }[result.status];

  return `${label} ${result.sizeKB}KB - ${result.file}`;
}

function main() {
  const distPath = join(currentDir, '../dist/client-source.js');

  try {
    const result = checkFile(distPath);
    console.log('\nBundle Size Report:');
    console.log(formatResult(result));
    console.log();

    if (result.status === 'large') {
      console.error('Bundle size exceeds recommended limit (50KB)');
      process.exit(1);
    }

    if (result.status === 'warning') {
      console.warn('Bundle size is above optimal size (30KB)');
      return;
    }

    console.log('Bundle size is within optimal range');
  } catch (error) {
    console.error('Failed to check bundle size:', error);
    process.exit(1);
  }
}

main();
