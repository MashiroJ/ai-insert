import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { clientSource } from './client-source.js';
import { getDianaAssetPath } from './diana-asset.js';

describe('clientSource', () => {
  it('returns a non-empty string', () => {
    const result = clientSource({ daemonUrl: 'http://127.0.0.1:17321', root: '/project' });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(100);
  });

  it('embeds the daemon URL', () => {
    const result = clientSource({ daemonUrl: 'http://custom:9999', root: '/project' });
    expect(result).toContain('http://custom:9999');
  });

  it('embeds the project root', () => {
    const result = clientSource({ daemonUrl: 'http://127.0.0.1:17321', root: '/my/project' });
    expect(result).toContain('/my/project');
  });

  it('produces a valid IIFE', () => {
    const result = clientSource({ daemonUrl: 'http://127.0.0.1:17321', root: '/project' });
    expect(result.startsWith('(() => {')).toBe(true);
    expect(result.trimEnd().endsWith('})();')).toBe(true);
  });

  it('keeps the default Diana sprite URL', () => {
    const result = clientSource({ daemonUrl: 'http://127.0.0.1:17321', root: '/project' });
    expect(result).toContain('/@ui-inspect/diana.webp');
  });

  it('embeds a custom Diana sprite URL', () => {
    const result = clientSource({
      daemonUrl: 'http://127.0.0.1:17321',
      root: '/project',
      dianaSpriteUrl: '/api/ui-inspect/diana',
    });
    expect(result).toContain('/api/ui-inspect/diana');
    expect(result).not.toContain('/@ui-inspect/diana.webp');
  });

  it('includes the CSS debug runtime mode', () => {
    const result = clientSource({ daemonUrl: 'http://127.0.0.1:17321', root: '/project' });

    expect(result).toContain("data-mode=\"css-debug\"");
    expect(result).toContain("mode: 'css-debug'");
    expect(result).toContain('changedStyles');
    expect(result).toContain('resetCssDebugPreview');
    expect(result).toContain('ui-inspect-css-overlay');
    expect(result).toContain('primaryInteraction');
    expect(result).toContain('interactions: cssDebugState.interactions || []');
  });
});

describe('getDianaAssetPath', () => {
  it('returns a string', () => {
    const path = getDianaAssetPath();
    expect(typeof path).toBe('string');
  });

  it('points to an existing file', () => {
    const path = getDianaAssetPath();
    expect(existsSync(path)).toBe(true);
  });

  it('points to a webp file', () => {
    const path = getDianaAssetPath();
    expect(path.endsWith('.webp')).toBe(true);
  });
});
