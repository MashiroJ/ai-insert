import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getDianaAssetPath } from '@ui-inspect/browser-ui/plugin-runtime';
import { GET } from './app.js';

describe('GET', () => {
  it('returns the Diana sprite as image/webp', async () => {
    const response = GET();
    const body = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.length).toBeGreaterThan(0);
    expect(body.equals(readFileSync(getDianaAssetPath()))).toBe(true);
  });
});
