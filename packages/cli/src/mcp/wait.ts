// Wait loop and latest request tracking

import type { ToolArgs } from './types.js';
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
  // Implementation will be in handlers/wait.ts
  // This is just the signature
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

// Cursor-based pagination support
export function extractAfterRequestId(args: ToolArgs): string | undefined {
  return typeof args.afterRequestId === 'string' ? args.afterRequestId : undefined;
}

export function extractSinceTimestamp(args: ToolArgs): number {
  if (typeof args.sinceTimestamp === 'number') {
    return args.sinceTimestamp;
  }
  // Default to 30 seconds ago
  return Date.now() - 30 * 1000;
}

export function extractTimeoutMs(args: ToolArgs): number {
  if (typeof args.timeoutMs === 'number') {
    return Math.min(args.timeoutMs, 10 * 60 * 1000); // Cap at 10 minutes
  }
  return 10 * 60 * 1000; // Default 10 minutes
}

export function extractContext(args: ToolArgs): number {
  if (typeof args.context === 'number') {
    return args.context;
  }
  return 80; // Default 80 lines
}
