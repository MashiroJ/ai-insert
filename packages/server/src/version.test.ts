import { describe, it, expect } from 'vitest';
import { getVersion } from './version.js';

describe('server version', () => {
  it('reads version from package.json', () => {
    const version = getVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(version).not.toBe('0.0.0');
  });

  it('returns the same value on repeated calls', () => {
    const first = getVersion();
    const second = getVersion();
    expect(first).toBe(second);
  });
});
