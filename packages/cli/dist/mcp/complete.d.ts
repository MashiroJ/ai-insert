import type { NormalizedCompleteFrontendRequestArgs, ToolArgs } from './types.js';
export declare function normalizeCompleteFrontendRequestArgs(args: ToolArgs, defaultSinceTimestamp: number): NormalizedCompleteFrontendRequestArgs;
export declare function completeFrontendRequestFlow(normalizedArgs: NormalizedCompleteFrontendRequestArgs, daemonUrl: string): Promise<any>;
