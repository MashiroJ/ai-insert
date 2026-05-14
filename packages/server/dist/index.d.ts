import { type AiInspectHealthResponse, type AiInspectMessage, type AiInspectMessageRole, type AiInspectSelection, type AiInspectSelectionResponse, type AiInspectSessionsResponse, type AiInspectSourceResponse } from '@mashiro39/ai-inspect-protocol';
export interface StartServerOptions {
    host?: string;
    port?: number;
}
export declare function startServer(options?: StartServerOptions): Promise<void>;
export declare function fetchSelection(daemonUrl?: string): Promise<AiInspectSelectionResponse>;
export declare function fetchSessions(daemonUrl?: string): Promise<AiInspectSessionsResponse>;
export declare function postMessage(content: string, role?: AiInspectMessageRole, daemonUrl?: string, options?: {
    mode?: 'append';
}): Promise<AiInspectMessage>;
export declare function clearSelection(daemonUrl?: string): Promise<void>;
export declare function fetchHealth(daemonUrl?: string): Promise<AiInspectHealthResponse>;
export declare function readSelectionSource(selection: AiInspectSelection, contextLines: number): Promise<AiInspectSourceResponse>;
export { delay } from './utils.js';
