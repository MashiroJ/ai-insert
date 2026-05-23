import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { getDianaAssetPath } from '@ui-inspect/browser-ui/plugin-runtime';
import { dianaHandler, type UiInspectPagesResponse } from './pages.js';

describe('dianaHandler', () => {
  it('returns the Diana sprite as image/webp', () => {
    const headers = new Map<string, string>();
    let statusCode = 0;
    let body: Buffer | undefined;
    const response: UiInspectPagesResponse = {
      get statusCode() {
        return statusCode;
      },
      set statusCode(value: number | undefined) {
        statusCode = value ?? 0;
      },
      setHeader: vi.fn((name: string, value: string) => {
        headers.set(name.toLowerCase(), value);
      }),
      end: vi.fn((nextBody?: Buffer) => {
        body = nextBody;
      }),
    };

    dianaHandler({}, response);

    expect(statusCode).toBe(200);
    expect(headers.get('content-type')).toBe('image/webp');
    expect(headers.get('cache-control')).toBe('no-store');
    expect(body).toBeDefined();
    expect(body?.length).toBeGreaterThan(0);
    expect(body?.equals(readFileSync(getDianaAssetPath()))).toBe(true);
  });
});
