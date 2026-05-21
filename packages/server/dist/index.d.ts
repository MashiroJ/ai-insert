import { type UiInspectHealthResponse, type UiInspectMessage, type UiInspectMessageRole, type UiInspectSelection, type UiInspectSelectionResponse, type UiInspectSessionsResponse, type UiInspectSourceResponse } from '@mashiro39/ui-inspect-protocol';
export interface StartServerOptions {
    host?: string;
    port?: number;
}
export declare function startServer(options?: StartServerOptions): Promise<void>;
export declare function fetchSelection(daemonUrl?: string): Promise<UiInspectSelectionResponse>;
export declare function fetchSessions(daemonUrl?: string): Promise<UiInspectSessionsResponse>;
export declare function postMessage(content: string, role?: UiInspectMessageRole, daemonUrl?: string, options?: {
    mode?: 'append';
}): Promise<UiInspectMessage>;
export declare function clearSelection(daemonUrl?: string): Promise<void>;
export declare function fetchHealth(daemonUrl?: string): Promise<UiInspectHealthResponse>;
export declare function shutdownDaemon(daemonUrl?: string): Promise<void>;
export declare function readSelectionSource(selection: UiInspectSelection, contextLines: number): Promise<UiInspectSourceResponse>;
export { delay } from './utils.js';
