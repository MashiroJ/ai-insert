// Complete frontend request logic

import type {
  NormalizedCompleteFrontendRequestArgs,
  CompleteFrontendRequestStatus,
  ToolArgs,
} from './types.js';
import { extractAfterRequestId, extractContext, extractTimeoutMs, extractSinceTimestamp } from './wait.js';

export function normalizeCompleteFrontendRequestArgs(
  args: ToolArgs,
  defaultSinceTimestamp: number
): NormalizedCompleteFrontendRequestArgs {
  const sessionId = typeof args.sessionId === 'string' ? args.sessionId.trim() : '';
  const content = typeof args.content === 'string' ? args.content.trim() : '';
  const afterRequestId = typeof args.afterRequestId === 'string'
    ? args.afterRequestId.trim()
    : (() => { throw new Error('afterRequestId is required'); })();

  if (typeof args.status === 'string' && !['done', 'failed'].includes(args.status)) {
    throw new Error('status must be done or failed');
  }

  const status: CompleteFrontendRequestStatus =
    typeof args.status === 'string' && ['done', 'failed'].includes(args.status)
      ? (args.status as CompleteFrontendRequestStatus)
      : 'done';

  return {
    sessionId,
    content,
    afterRequestId,
    status,
    context: extractContext(args),
    timeoutMs: extractTimeoutMs(args),
    sinceTimestamp: extractSinceTimestamp(args, defaultSinceTimestamp),
  };
}

export async function completeFrontendRequestFlow(
  normalizedArgs: NormalizedCompleteFrontendRequestArgs,
  daemonUrl: string
): Promise<any> {
  // This will:
  // 1. Call POST /ui-inspect/messages to complete the current request
  // 2. Call wait_for_frontend_request with the cursor to wait for next
  // Implementation will be in handlers/complete.ts
  
  throw new Error('Not implemented - will be in handlers/complete.ts');
}
