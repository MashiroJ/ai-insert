import { type UiInspectMessage, type UiInspectSession } from '@ui-inspect/protocol';
interface RunMcpOptions {
    daemonUrl: string;
}
export declare function runMcpStdio({ daemonUrl }: RunMcpOptions): Promise<void>;
export declare function latestFrontendRequest(payload: {
    sessions: UiInspectSession[];
}, sinceTimestamp: number): {
    session: UiInspectSession;
    message: UiInspectMessage;
} | null;
export {};
