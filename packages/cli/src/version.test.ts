import { describe, it, expect } from 'vitest';
import { getVersion } from './version.js';

describe('cli version', () => {
  it('reads version from package.json', () => {
    const version = getVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(version).not.toBe('0.0.0');
  });
});
