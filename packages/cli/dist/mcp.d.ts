import { type UiInspectMessage, type UiInspectSession } from '@ui-inspect/protocol';
interface RunMcpOptions {
    daemonUrl: string;
}
export declare function runMcpStdio({ daemonUrl }: RunMcpOptions): Promise<void>;
export declare function latestFrontendRequest(payload: {
    sessions: UiInspectSession[];
}, sinceTimestamp: number, afterRequestId?: string): {
    session: UiInspectSession;
    message: UiInspectMessage;
    requestId: string;
} | null;
export {};
