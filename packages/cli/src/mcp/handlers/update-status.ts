import type { UiInspectTaskStatus } from '@ui-inspect/protocol';
import { fetchSelection, updateSessionStatus } from '@ui-inspect/server';

export async function updateUiTaskStatusHandler(args: unknown, daemonUrl: string): Promise<unknown> {
  const input = args && typeof args === 'object' ? args as { sessionId?: unknown; status?: unknown } : {};
  const status = normalizeStatus(input.status);
  const sessionId = typeof input.sessionId === 'string' && input.sessionId.trim()
    ? input.sessionId.trim()
    : await activeSessionId(daemonUrl);
  const session = await updateSessionStatus(sessionId, status, daemonUrl);
  return { ok: true, session };
}

function normalizeStatus(value: unknown): UiInspectTaskStatus {
  if (value === 'claimed' || value === 'working' || value === 'done' || value === 'failed') return value;
  throw new Error('status must be claimed, working, done, or failed');
}

async function activeSessionId(daemonUrl: string): Promise<string> {
  const active = await fetchSelection(daemonUrl);
  if (!active.active || !active.selection?.sessionId) throw new Error('sessionId is required when there is no active selection');
  return active.selection.sessionId;
}
