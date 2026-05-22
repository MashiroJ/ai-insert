import { type UiInspectHealthResponse, type UiInspectMessage, type UiInspectMessageRole, type UiInspectSelectionResponse, type UiInspectSessionsResponse } from '@ui-inspect/protocol';
export type { StartServerOptions } from './types.js';
export { readSelectionSource } from './source.js';
export { delay } from './utils.js';
export { getVersion } from './version.js';
export declare function startServer(options?: {
    host?: string;
    port?: number;
}): Promise<void>;
export declare function fetchSelection(daemonUrl?: string): Promise<UiInspectSelectionResponse>;
export declare function fetchSessions(daemonUrl?: string): Promise<UiInspectSessionsResponse>;
export declare function postMessage(content: string, role?: UiInspectMessageRole, daemonUrl?: string, options?: {
    mode?: 'append';
}): Promise<UiInspectMessage>;
export declare function clearSelection(daemonUrl?: string): Promise<void>;
export declare function fetchHealth(daemonUrl?: string): Promise<UiInspectHealthResponse>;
export declare function shutdownDaemon(daemonUrl?: string): Promise<void>;
