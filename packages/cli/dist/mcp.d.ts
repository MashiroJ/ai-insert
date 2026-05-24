import { type UiInspectMessage, type UiInspectSession } from '@ui-inspect/protocol';
interface RunMcpOptions {
    daemonUrl: string;
}
declare const COMPLETE_FRONTEND_REQUEST_STATUSES: readonly ["done", "failed"];
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
export declare function getMcpToolDefinition(name: string): unknown;
export declare function runMcpStdio({ daemonUrl }: RunMcpOptions): Promise<void>;
export declare function normalizeCompleteFrontendRequestArgs(args: {
    sessionId?: unknown;
    content?: unknown;
    afterRequestId?: unknown;
    status?: unknown;
    context?: unknown;
    timeoutMs?: unknown;
    sinceTimestamp?: unknown;
}, now?: number): NormalizedCompleteFrontendRequestArgs;
export declare function latestFrontendRequest(payload: {
    sessions: UiInspectSession[];
}, sinceTimestamp: number, afterRequestId?: string): {
    session: UiInspectSession;
    message: UiInspectMessage;
    requestId: string;
} | null;
export {};
