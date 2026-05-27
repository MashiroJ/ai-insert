// Wait loop and latest request tracking

import type { ToolArgs } from './types.js';
import type { UiInspectSession, UiInspectMessage, UiInspectSessionsResponse } from '@ui-inspect/protocol';
import { fetchSessions } from '@ui-inspect/server';

let latestFrontendRequestCache: {
  timestamp: number;
  request: any;
} | null = null;

export async function waitForFrontendRequest(
  args: ToolArgs,
  daemonUrl: string,
  sessionId: string | undefined
): Promise<any> {
  throw new Error('Not implemented - will be in handlers/wait.ts');
}

export function getLatestFrontendRequest(): any | null {
  return latestFrontendRequestCache?.request ?? null;
}

export function setLatestFrontendRequest(request: any): void {
  latestFrontendRequestCache = {
    timestamp: Date.now(),
    request,
  };
}

export function clearLatestFrontendRequest(): void {
  latestFrontendRequestCache = null;
}

export function extractAfterRequestId(args: ToolArgs): string | undefined {
  return typeof args.afterRequestId === 'string' ? args.afterRequestId : undefined;
}

export function extractSinceTimestamp(args: ToolArgs, now = Date.now()): number {
  if (typeof args.sinceTimestamp === 'number') {
    return args.sinceTimestamp;
  }
  return now - 30 * 1000;
}

export function extractTimeoutMs(args: ToolArgs): number {
  if (typeof args.timeoutMs === 'number') {
    return Math.min(args.timeoutMs, 10 * 60 * 1000);
  }
  return 10 * 60 * 1000;
}

export function extractContext(args: ToolArgs): number {
  if (typeof args.context === 'number') {
    return args.context;
  }
  return 80;
}

interface FrontendRequest {
  session: UiInspectSession;
  message: UiInspectMessage;
  requestId: string;
  nextCursor?: { afterRequestId: string };
}

export function latestFrontendRequest(
  data: { sessions: UiInspectSession[] },
  sinceTimestamp: number,
  afterRequestId?: string,
): FrontendRequest | null {
  const candidates: Array<{
    session: UiInspectSession;
    message: UiInspectMessage;
    requestId: string;
    timestamp: number;
    sortKey: number;
  }> = [];

  for (const session of data.sessions) {
    // Collect user messages
    const userMessages = session.messages.filter((m) => m.role === 'user');
    for (let i = 0; i < userMessages.length; i++) {
      const msg = userMessages[i];
      candidates.push({
        session,
        message: msg,
        requestId: `message:${msg.id}`,
        timestamp: msg.timestamp,
        sortKey: msg.timestamp * 1000 + i,
      });
    }

    // Check for selection-based requests (sent selection without a matching user message)
    if (session.selection && session.status === 'sent') {
      const sel = session.selection;
      const hasMatchingMessage = userMessages.some(
        (m) => m.selectionId === sel.id,
      );
      if (!hasMatchingMessage) {
        const targets = session.targets;
        const hasNotes = targets && targets.length > 0 && targets.some((t) => t.note);
        const syntheticContent = hasNotes
          ? `Browser selection sent without additional user text.\n\nTarget notes:\n${targets!.filter((t) => t.note).map((t) => `- ${t.note}`).join('\n')}`
          : 'Browser selection sent without additional user text.';

        candidates.push({
          session,
          message: {
            id: `synthetic-${sel.id}`,
            sessionId: session.id,
            role: 'user',
            content: syntheticContent,
            timestamp: sel.timestamp,
            selectionId: sel.id,
          },
          requestId: `selection:${sel.id}`,
          timestamp: sel.timestamp,
          sortKey: sel.timestamp * 1000 - 1,
        });
      }
    }
  }

  // Sort by timestamp then by insertion order
  candidates.sort((a, b) => a.sortKey - b.sortKey);

  // Filter by afterRequestId cursor
  if (afterRequestId) {
    const cursorIndex = candidates.findIndex((c) => c.requestId === afterRequestId);
    if (cursorIndex >= 0) {
      // Return the next candidate after the cursor
      const next = candidates[cursorIndex + 1];
      if (next && next.timestamp >= sinceTimestamp) {
        return {
          session: next.session,
          message: next.message,
          requestId: next.requestId,
        };
      }
      return null;
    }
    // Unknown cursor: fall back to sinceTimestamp filter
  }

  // Find the first candidate >= sinceTimestamp
  const result = candidates.find((c) => c.timestamp >= sinceTimestamp);
  if (!result) return null;

  return {
    session: result.session,
    message: result.message,
    requestId: result.requestId,
  };
}
