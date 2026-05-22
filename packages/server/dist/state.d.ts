import type { UiInspectSession } from '@ui-inspect/protocol';
import type { ServerResponse } from 'node:http';
export declare const SELECTION_TTL_MS: number;
export declare const CLEANUP_INTERVAL_MS: number;
export declare const MAX_SESSIONS = 100;
export declare const MAX_MESSAGES_PER_SESSION = 200;
export declare const PROJECT_STATE_DIR = ".ui-inspect";
export declare const SESSIONS_FILE = "sessions.json";
export declare class ServerState {
    currentSelection: import('@ui-inspect/protocol').UiInspectSelection | null;
    currentSelectionReceivedAt: number;
    projectRoot: string;
    sessions: Map<string, UiInspectSession>;
    sessionStreams: Map<string, Set<ServerResponse<import("http").IncomingMessage>>>;
    constructor();
    private startCleanupInterval;
    cleanupDeadStreams(): void;
    saveSessions(): void;
    setProjectRoot(root: string | null | undefined): void;
    private loadSessions;
    private sessionsFile;
}
export declare function isSession(value: unknown): value is UiInspectSession;
