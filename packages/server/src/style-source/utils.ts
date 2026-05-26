import { readFileSync } from 'node:fs';
import type { UiInspectCssDebugPayload } from '@ui-inspect/protocol';

export function clonePayload(payload: UiInspectCssDebugPayload): UiInspectCssDebugPayload {
  return JSON.parse(JSON.stringify(payload));
}

export function tryReadFile(path: string): string | null {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}
