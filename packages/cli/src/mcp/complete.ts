// Complete frontend request logic

import type {
  NormalizedCompleteFrontendRequestArgs,
  CompleteFrontendRequestStatus,
  ToolArgs,
} from './types.js';
import { extractAfterRequestId, extractContext, extractTimeoutMs, extractSinceTimestamp } from './wait.js';

export function normalizeCompleteFrontendRequestArgs(
  args: ToolArgs,
  defaultSessionId: string
): NormalizedCompleteFrontendRequestArgs {
  const sessionId = typeof args.sessionId === 'string' ? args.sessionId : defaultSessionId;
  const content = typeof args.content === 'string' ? args.content : '';
  const afterRequestId = typeof args.afterRequestId === 'string' 
    ? args.afterRequestId 
    : (() => { throw new Error('afterRequestId is required'); })();

  let status: CompleteFrontendRequestStatus = 'done';
  if (typeof args.status === 'string' && ['done', 'failed'].includes(args.status)) {
    status = args.status as CompleteFrontendRequestStatus;
  }

  return {
    sessionId,
    content,
    afterRequestId,
    status,
    context: extractContext(args),
    timeoutMs: extractTimeoutMs(args),
    sinceTimestamp: extractSinceTimestamp(args),
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
