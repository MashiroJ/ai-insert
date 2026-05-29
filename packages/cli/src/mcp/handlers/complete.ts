import type { ToolArgs } from '../types.js';
import { completeFrontendRequestFlow, normalizeCompleteFrontendRequestArgs } from '../complete.js';

export async function completeFrontendRequestHandler(args: unknown, daemonUrl: string): Promise<unknown> {
  const normalized = normalizeCompleteFrontendRequestArgs((args ?? {}) as ToolArgs, Date.now());
  return await completeFrontendRequestFlow(normalized, daemonUrl);
}
