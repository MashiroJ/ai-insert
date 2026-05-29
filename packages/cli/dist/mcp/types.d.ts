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
export type FrontendRequestResponseMode = 'compact' | 'full';
export declare const DEFAULT_WAIT_TIMEOUT_MS: number;
export declare const MAX_WAIT_TIMEOUT_MS: number;
export declare const WAIT_POLL_INTERVAL_MS = 1000;
export declare const COMPLETE_FRONTEND_REQUEST_STATUSES: readonly ["done", "failed"];
export type CompleteFrontendRequestStatus = typeof COMPLETE_FRONTEND_REQUEST_STATUSES[number];
export interface NormalizedCompleteFrontendRequestArgs {
    sessionId: string;
    content: string;
    afterRequestId: string;
    status: CompleteFrontendRequestStatus;
    context: number;
    timeoutMs: number;
    sinceTimestamp: number;
    responseMode: FrontendRequestResponseMode;
}
