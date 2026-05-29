// Complete frontend request logic

import type {
  NormalizedCompleteFrontendRequestArgs,
  CompleteFrontendRequestStatus,
  ToolArgs,
} from './types.js';
import { extractContext, extractTimeoutMs, extractSinceTimestamp, extractResponseMode, waitForFrontendRequest } from './wait.js';
import { postMessage, updateSessionStatus } from '@ui-inspect/server';

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
  if (!sessionId) throw new Error('sessionId is required');
  if (!content) throw new Error('content is required');
  if (!afterRequestId) throw new Error('afterRequestId is required');

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
    responseMode: extractResponseMode(args),
  };
}

export async function completeFrontendRequestFlow(
  normalizedArgs: NormalizedCompleteFrontendRequestArgs,
  daemonUrl: string
): Promise<any> {
  const message = await postMessage(
    normalizedArgs.content,
    'assistant',
    daemonUrl,
    { sessionId: normalizedArgs.sessionId },
  );
  const session = await updateSessionStatus(normalizedArgs.sessionId, normalizedArgs.status, daemonUrl);
  const next = await waitForFrontendRequest({
    afterRequestId: normalizedArgs.afterRequestId,
    context: normalizedArgs.context,
    timeoutMs: normalizedArgs.timeoutMs,
    sinceTimestamp: normalizedArgs.sinceTimestamp,
    responseMode: normalizedArgs.responseMode,
  }, daemonUrl, undefined);

  return {
    ok: true,
    completed: {
      sessionId: normalizedArgs.sessionId,
      status: normalizedArgs.status,
      message,
      session,
    },
    next,
  };
}
