import type { ToolArgs } from '../types.js';
import { waitForFrontendRequest } from '../wait.js';

export async function waitForFrontendRequestHandler(args: unknown, daemonUrl: string): Promise<unknown> {
  return await waitForFrontendRequest((args ?? {}) as ToolArgs, daemonUrl, undefined);
}
