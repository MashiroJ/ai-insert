export interface ToolArgs {
  context?: unknown;
  content?: unknown;
  project?: unknown;
  sessionId?: unknown;
  status?: unknown;
  timeoutMs?: unknown;
  sinceTimestamp?: unknown;
  afterRequestId?: unknown;
  responseMode?: unknown;
}

export const DEFAULT_WAIT_TIMEOUT_MS = 10 * 60 * 1000;
export const MAX_WAIT_TIMEOUT_MS = 10 * 60 * 1000;
export const WAIT_POLL_INTERVAL_MS = 1000;
export const COMPLETE_FRONTEND_REQUEST_STATUSES = ['done', 'failed'] as const;

export type CompleteFrontendRequestStatus = typeof COMPLETE_FRONTEND_REQUEST_STATUSES[number];

export interface NormalizedCompleteFrontendRequestArgs {
  sessionId: string;
  content: string;
  afterRequestId: string;
  status: CompleteFrontendRequestStatus;
  context: number;
  timeoutMs: number;
  sinceTimestamp: number;
}
