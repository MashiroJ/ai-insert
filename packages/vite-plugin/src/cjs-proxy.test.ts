import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const distProxy = join(import.meta.dirname, '..', 'dist', 'index.cjs');

describe('@ui-inspect/vite-plugin CommonJS proxy', () => {
  it('exports a require entry for CommonJS Vite config files', () => {
    expect(pkg.exports['.'].require).toBe('./dist/index.cjs');
    expect(pkg.exports['.'].import).toBe('./dist/index.js');
    expect(pkg.main).toBe('./dist/index.cjs');
  });

  it('keeps a generated proxy that lazily imports the ESM implementation', () => {
    expect(existsSync(distProxy)).toBe(true);
    const source = readFileSync(distProxy, 'utf8');
    expect(source).toContain("import('./index.js')");
    expect(source).toContain('module.exports.uiInspect = createProxyPlugin');
    expect(source).toContain("name: 'ui-inspect'");
  });
});
