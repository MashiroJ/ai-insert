import type { ToolArgs } from './types.js';
import type { UiInspectMessage, UiInspectSession } from '@ui-inspect/protocol';
export declare function waitForFrontendRequest(args: ToolArgs, daemonUrl: string, sessionId: string | undefined): Promise<any>;
export declare function getLatestFrontendRequest(): any | null;
export declare function setLatestFrontendRequest(request: any): void;
export declare function clearLatestFrontendRequest(): void;
export declare function extractAfterRequestId(args: ToolArgs): string | undefined;
export declare function extractSinceTimestamp(args: ToolArgs, now?: number): number;
export declare function extractTimeoutMs(args: ToolArgs): number;
export declare function extractContext(args: ToolArgs): number;
export declare function extractResponseMode(args: ToolArgs): 'compact' | 'full';
interface FrontendRequest {
    session: UiInspectSession;
    message: UiInspectMessage;
    requestId: string;
    nextCursor?: {
        afterRequestId: string;
    };
}
export declare function latestFrontendRequest(data: {
    sessions: UiInspectSession[];
}, sinceTimestamp: number, afterRequestId?: string): FrontendRequest | null;
export declare function buildFrontendRequestResult(options: {
    session: UiInspectSession;
    message: UiInspectMessage;
    requestId: string;
    daemonUrl: string;
    context: number;
}): Promise<any>;
export {};
